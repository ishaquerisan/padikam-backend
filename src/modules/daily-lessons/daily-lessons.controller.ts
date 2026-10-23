import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DailyLessonsService } from './daily-lessons.service';
import { MarkSentenceLearnedDto, IncreaseTargetDto } from './dto/daily-lesson.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/models/user.model';

@ApiTags('Daily Lessons')
@ApiBearerAuth()
@Controller('daily-lessons')
export class DailyLessonsController {
  constructor(private dailyLessonsService: DailyLessonsService) {}

  @Get('today')
  @ApiOperation({ summary: "Get or automatically create today's daily lesson" })
  async getTodayLesson(@CurrentUser() user: User) {
    return this.dailyLessonsService.getTodayLesson(user.id);
  }

  @Get('history/:date')
  @ApiOperation({ summary: 'Get past lesson by calendar date (YYYY-MM-DD)' })
  async getLessonByDate(
    @CurrentUser() user: User,
    @Param('date') date: string,
  ) {
    return this.dailyLessonsService.getLessonByDate(user.id, date);
  }

  @Post('mark-learned')
  @ApiOperation({ summary: 'Mark an individual sentence as learned in active daily lesson' })
  async markSentenceLearned(
    @CurrentUser() user: User,
    @Body() dto: MarkSentenceLearnedDto,
  ) {
    return this.dailyLessonsService.markSentenceLearned(user.id, dto.sentenceId);
  }

  @Post('increase-target')
  @ApiOperation({ summary: 'Increase daily target (5 -> 10, 20, 30) for today' })
  async increaseTarget(
    @CurrentUser() user: User,
    @Body() dto: IncreaseTargetDto,
  ) {
    return this.dailyLessonsService.increaseTarget(user.id, dto.target);
  }
}
