import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/sequelize';
import { User, UserStatus } from '../../database/models/user.model';
import { UserSettings } from '../../database/models/user-settings.model';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          let token = null;
          if (req && req.cookies) {
            token = req.cookies['padikam_access_token'];
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'padikam_jwt_secret_key_2026_super_secure_key_kerala',
    });
  }

  async validate(payload: { sub: number; email: string; role: string }) {
    const user = await this.userModel.findByPk(payload.sub, {
      include: [UserSettings],
      attributes: { exclude: ['password_hash'] },
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Your account is currently inactive or suspended');
    }

    return user;
  }
}
