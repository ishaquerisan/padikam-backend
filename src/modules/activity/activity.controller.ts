import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/models/user.model';

@ApiTags('Activity & Progress')
@ApiBearerAuth()
@Controller('activity')
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get('progress')
  @ApiOperation({ summary: 'Get learner streaks, mastery analytics, and weekly breakdown' })
  async getProgress(@CurrentUser() user: User) {
    return this.activityService.getLearnerProgress(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get paginated daily lesson history with quiz results' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHistory(
    @CurrentUser() user: User,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '15',
  ) {
    return this.activityService.getLessonHistory(
      user.id,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 15,
    );
  }
}
