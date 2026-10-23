import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserSettings } from '../../database/models/user-settings.model';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

@Injectable()
export class UserSettingsService {
  constructor(
    @InjectModel(UserSettings)
    private userSettingsModel: typeof UserSettings,
  ) {}

  async getSettings(userId: number): Promise<UserSettings> {
    let settings = await this.userSettingsModel.findOne({ where: { user_id: userId } });
    if (!settings) {
      settings = await this.userSettingsModel.create({
        user_id: userId,
        daily_target: 5,
        timezone: 'Asia/Kolkata',
        notifications_enabled: true,
      });
    }
    return settings;
  }

  async updateSettings(userId: number, dto: UpdateUserSettingsDto): Promise<UserSettings> {
    let settings = await this.getSettings(userId);
    if (dto.daily_target !== undefined) {
      settings.daily_target = dto.daily_target;
    }
    if (dto.timezone !== undefined) {
      settings.timezone = dto.timezone;
    }
    if (dto.notifications_enabled !== undefined) {
      settings.notifications_enabled = dto.notifications_enabled;
    }
    await settings.save();
    return settings;
  }
}
