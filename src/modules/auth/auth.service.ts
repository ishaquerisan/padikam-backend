import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../../database/models/user.model';
import { UserSettings } from '../../database/models/user-settings.model';
import { ActivityLog } from '../../database/models/activity-log.model';
import { SentenceDifficulty } from '../../database/models/sentence.model';
import {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  GoogleAuthDto,
} from './dto/auth.dto';
import { FirebaseService } from './firebase.service';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(UserSettings)
    private userSettingsModel: typeof UserSettings,
    @InjectModel(ActivityLog)
    private activityLogModel: typeof ActivityLog,
    private jwtService: JwtService,
    private firebaseService: FirebaseService,
    private sequelize: Sequelize,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userModel.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(dto.password, salt);

    const transaction = await this.sequelize.transaction();
    try {
      const user = await this.userModel.create(
        {
          name: dto.name.trim(),
          email: dto.email.toLowerCase().trim(),
          password_hash,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        },
        { transaction },
      );

      await this.userSettingsModel.create(
        {
          user_id: user.id,
          daily_target: 5,
          difficulty_level: SentenceDifficulty.BEGINNER,
          timezone: 'Asia/Kolkata',
          notifications_enabled: true,
        },
        { transaction },
      );

      await this.activityLogModel.create(
        {
          user_id: user.id,
          activity_type: 'USER_REGISTERED',
          details: { email: user.email },
        },
        { transaction },
      );

      await transaction.commit();

      const token = this.generateToken(user);
      const userWithSettings = await this.userModel.findByPk(user.id, {
        include: [UserSettings],
        attributes: { exclude: ['password_hash'] },
      });

      return {
        token,
        user: userWithSettings,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({
      where: { email: dto.email.toLowerCase().trim() },
      include: [UserSettings],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.password_hash) {
      throw new UnauthorizedException(
        'This account was created using Google. Please log in with the "Sign in with Google" button.',
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Your account is inactive or has been suspended');
    }

    // Log login activity
    await this.activityLogModel.create({
      user_id: user.id,
      activity_type: 'USER_LOGGED_IN',
      details: { timestamp: new Date().toISOString() },
    });

    const token = this.generateToken(user);
    const safeUser = user.toJSON();
    delete safeUser.password_hash;

    return {
      token,
      user: safeUser,
    };
  }

  async googleLogin(dto: GoogleAuthDto) {
    const firebaseUser = await this.firebaseService.verifyIdToken(dto.idToken);
    const email = firebaseUser.email.toLowerCase().trim();

    let user = await this.userModel.findOne({
      where: { email },
      include: [UserSettings],
    });

    if (user) {
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Your account is inactive or has been suspended');
      }

      let modified = false;
      if (!user.firebase_uid && firebaseUser.uid) {
        user.firebase_uid = firebaseUser.uid;
        modified = true;
      }
      if (firebaseUser.picture && user.avatar_url !== firebaseUser.picture) {
        user.avatar_url = firebaseUser.picture;
        modified = true;
      }
      if (modified) {
        await user.save();
      }

      await this.activityLogModel.create({
        user_id: user.id,
        activity_type: 'USER_LOGGED_IN',
        details: { provider: 'google', timestamp: new Date().toISOString() },
      });
    } else {
      // Automatically register new learner via Google
      const transaction = await this.sequelize.transaction();
      try {
        user = await this.userModel.create(
          {
            name: (firebaseUser.name || email.split('@')[0]).trim(),
            email,
            password_hash: null,
            firebase_uid: firebaseUser.uid,
            avatar_url: firebaseUser.picture || null,
            auth_provider: 'google',
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
          },
          { transaction },
        );

        await this.userSettingsModel.create(
          {
            user_id: user.id,
            daily_target: 5,
            difficulty_level: SentenceDifficulty.BEGINNER,
            timezone: 'Asia/Kolkata',
            notifications_enabled: true,
          },
          { transaction },
        );

        await this.activityLogModel.create(
          {
            user_id: user.id,
            activity_type: 'USER_REGISTERED_GOOGLE',
            details: { email: user.email, provider: 'google' },
          },
          { transaction },
        );

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }

    const token = this.generateToken(user);
    const userWithSettings = await this.userModel.findByPk(user.id, {
      include: [UserSettings],
      attributes: { exclude: ['password_hash'] },
    });

    return {
      token,
      user: userWithSettings,
    };
  }

  async getProfile(userId: number) {
    let user = await this.userModel.findByPk(userId, {
      include: [UserSettings],
      attributes: { exclude: ['password_hash'] },
    });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (!user.settings) {
      const settings = await this.userSettingsModel.create({
        user_id: userId,
        daily_target: 5,
        difficulty_level: user.difficulty_level || SentenceDifficulty.BEGINNER,
        timezone: 'Asia/Kolkata',
        notifications_enabled: true,
      });
      user.settings = settings;
    } else if (!user.settings.difficulty_level) {
      user.settings.difficulty_level = user.difficulty_level || SentenceDifficulty.BEGINNER;
      await user.settings.save();
    }

    if (!user.difficulty_level) {
      user.difficulty_level = user.settings?.difficulty_level || SentenceDifficulty.BEGINNER;
      await user.save();
    }

    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (dto.name && dto.name.trim().length > 0) {
      user.name = dto.name.trim();
    }
    if (dto.avatar_url !== undefined) {
      user.avatar_url = dto.avatar_url.trim();
    }
    await user.save();

    if (dto.difficulty_level !== undefined) {
      user.difficulty_level = dto.difficulty_level;
      await user.save();

      let settings = await this.userSettingsModel.findOne({ where: { user_id: userId } });
      if (!settings) {
        await this.userSettingsModel.create({
          user_id: userId,
          daily_target: 5,
          difficulty_level: dto.difficulty_level,
          timezone: 'Asia/Kolkata',
          notifications_enabled: true,
        });
      } else {
        settings.difficulty_level = dto.difficulty_level;
        await settings.save();
      }
    }

    return this.getProfile(userId);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If account already has a password, verify the current password
    if (user.password_hash) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to change your password.');
      }
      const isMatch = await bcrypt.compare(dto.currentPassword, user.password_hash);
      if (!isMatch) {
        throw new BadRequestException('Current password does not match.');
      }
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(dto.newPassword, salt);
    await user.save();

    await this.activityLogModel.create({
      user_id: user.id,
      activity_type: 'PASSWORD_CHANGED',
      details: {},
    });

    return { message: 'Password updated successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userModel.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      // Don't leak user existence for security
      return { message: 'If this email is registered, password reset instructions have been generated.' };
    }

    // Generate short-lived reset token (15 mins)
    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'pwd_reset' },
      { expiresIn: '15m' },
    );

    await this.activityLogModel.create({
      user_id: user.id,
      activity_type: 'PASSWORD_RESET_REQUESTED',
      details: {},
    });

    return {
      message: 'Password reset instructions generated.',
      resetToken, // Returned in demo/dev mode for seamless verification
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.token);
    } catch (e) {
      throw new BadRequestException('Password reset token is invalid or has expired');
    }

    if (payload.type !== 'pwd_reset') {
      throw new BadRequestException('Invalid token type');
    }

    const user = await this.userModel.findByPk(payload.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(dto.newPassword, salt);
    await user.save();

    await this.activityLogModel.create({
      user_id: user.id,
      activity_type: 'PASSWORD_RESET_COMPLETED',
      details: {},
    });

    return { message: 'Password has been reset successfully. You can now login with your new password.' };
  }

  async deleteAccount(userId: number) {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft deactivate and anonymize for data retention compliance
    user.status = UserStatus.INACTIVE;
    user.email = `deleted_${user.id}_${Date.now()}@anonymized.padikam.internal`;
    user.name = 'Deleted Account';
    await user.save();

    await this.activityLogModel.create({
      user_id: user.id,
      activity_type: 'ACCOUNT_DELETED',
      details: { timestamp: new Date().toISOString() },
    });

    return { message: 'Account deleted successfully' };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      avatar_url: user.avatar_url,
    };
    return this.jwtService.sign(payload);
  }
}
