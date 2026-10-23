import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/models/user.model';

@ApiTags('Learner Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get quick learner home summary including today lesson progress and streak' })
  async getSummary(@CurrentUser() user: User) {
    return this.dashboardService.getLearnerSummary(user.id);
  }
}
