import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserSettingsService } from './user-settings.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/models/user.model';

@ApiTags('User Settings')
@ApiBearerAuth()
@Controller('user-settings')
export class UserSettingsController {
  constructor(private userSettingsService: UserSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user settings and learning preferences' })
  async getSettings(@CurrentUser() user: User) {
    return this.userSettingsService.getSettings(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update learning target, timezone, or notifications' })
  async updateSettings(
    @CurrentUser() user: User,
    @Body() dto: UpdateUserSettingsDto,
  ) {
    return this.userSettingsService.updateSettings(user.id, dto);
  }
}
