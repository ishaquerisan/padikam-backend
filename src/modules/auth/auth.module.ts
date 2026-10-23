import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SequelizeModule } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../../database/models/user.model';
import { UserSettings } from '../../database/models/user-settings.model';
import { ActivityLog } from '../../database/models/activity-log.model';

import { FirebaseService } from './firebase.service';

@Module({
  imports: [
    SequelizeModule.forFeature([User, UserSettings, ActivityLog]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'padikam_jwt_secret_key_2026_super_secure_key_kerala',
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, FirebaseService],
  exports: [AuthService, JwtStrategy, FirebaseService, PassportModule],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger(AuthModule.name);

  constructor(private sequelize: Sequelize) {}

  async onModuleInit() {
    try {
      const queryInterface = this.sequelize.getQueryInterface();
      const tableDesc: any = await queryInterface.describeTable('users');

      if (!tableDesc.firebase_uid) {
        await this.sequelize.query('ALTER TABLE `users` ADD COLUMN `firebase_uid` VARCHAR(128) NULL AFTER `password_hash`;');
        this.logger.log('Added missing column: firebase_uid');
      }

      if (!tableDesc.avatar_url) {
        await this.sequelize.query('ALTER TABLE `users` ADD COLUMN `avatar_url` VARCHAR(500) NULL AFTER `firebase_uid`;');
        this.logger.log('Added missing column: avatar_url');
      }

      if (!tableDesc.auth_provider) {
        await this.sequelize.query("ALTER TABLE `users` ADD COLUMN `auth_provider` ENUM('local', 'google') NOT NULL DEFAULT 'local' AFTER `avatar_url`;");
        this.logger.log('Added missing column: auth_provider');
      }

      if (tableDesc.password_hash && !tableDesc.password_hash.allowNull) {
        await this.sequelize.query('ALTER TABLE `users` MODIFY `password_hash` VARCHAR(255) NULL;');
        this.logger.log('Modified password_hash to allow NULL');
      }
    } catch (err: any) {
      this.logger.warn(`Database schema check notice: ${err.message}`);
    }
  }
}
