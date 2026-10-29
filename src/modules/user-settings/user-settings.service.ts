import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserSettings } from '../../database/models/user-settings.model';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { SentenceDifficulty } from '../../database/models/sentence.model';

@Injectable()
export class UserSettingsService implements OnModuleInit {
  constructor(
    @InjectModel(UserSettings)
    private userSettingsModel: typeof UserSettings,
  ) {}

  async onModuleInit() {
    try {
      await this.userSettingsModel.sequelize?.query(`
        ALTER TABLE user_settings 
        ADD COLUMN difficulty_level ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED') 
        NOT NULL DEFAULT 'BEGINNER';
      `);
    } catch {
      // Column already exists or table not ready, safely ignore
    }
  }

  async getSettings(userId: number): Promise<UserSettings> {
    let settings = await this.userSettingsModel.findOne({ where: { user_id: userId } });
    
    // Check user table fallback
    const [userRows] = (await this.userSettingsModel.sequelize?.query(
      'SELECT difficulty_level FROM users WHERE id = ?',
      { replacements: [userId] },
    )) as any[];
    const userDiff = userRows?.[0]?.difficulty_level || SentenceDifficulty.BEGINNER;

    if (!settings) {
      settings = await this.userSettingsModel.create({
        user_id: userId,
        daily_target: 5,
        difficulty_level: userDiff,
        timezone: 'Asia/Kolkata',
        notifications_enabled: true,
      });
    } else if (!settings.difficulty_level) {
      settings.difficulty_level = userDiff;
      await settings.save();
    }
    return settings;
  }

  async updateSettings(userId: number, dto: UpdateUserSettingsDto): Promise<UserSettings> {
    let settings = await this.getSettings(userId);
    if (dto.daily_target !== undefined) {
      settings.daily_target = dto.daily_target;
    }
    if (dto.difficulty_level !== undefined) {
      settings.difficulty_level = dto.difficulty_level;
      try {
        await this.userSettingsModel.sequelize?.query(
          'UPDATE users SET difficulty_level = ? WHERE id = ?',
          { replacements: [dto.difficulty_level, userId] },
        );
      } catch (err) {
        // Safe fallback
      }
    }
    if (dto.timezone !== undefined) {
      settings.timezone = dto.timezone;
    }
    if (dto.notifications_enabled !== undefined) {
      settings.notifications_enabled = dto.notifications_enabled;
    }
    await settings.save();
    return this.getSettings(userId);
  }
}
