import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { SubmitAnswerDto, CompleteAttemptDto } from './dto/quiz.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/models/user.model';

@ApiTags('Quizzes & Revision')
@ApiBearerAuth()
@Controller('quizzes')
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  @Get('yesterday')
  @ApiOperation({ summary: "Get or generate yesterday's revision quiz" })
  async getYesterdayQuiz(@CurrentUser() user: User) {
    return this.quizzesService.getYesterdayQuiz(user.id);
  }

  @Post('submit-answer')
  @ApiOperation({ summary: 'Submit an answer to an active quiz question and get immediate feedback' })
  async submitAnswer(
    @CurrentUser() user: User,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.quizzesService.submitAnswer(user.id, dto);
  }

  @Post('complete')
  @ApiOperation({ summary: 'Complete a quiz attempt and view score breakdown' })
  async completeAttempt(
    @CurrentUser() user: User,
    @Body() dto: CompleteAttemptDto,
  ) {
    return this.quizzesService.completeAttempt(user.id, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user quiz attempt history' })
  async getQuizHistory(@CurrentUser() user: User) {
    return this.quizzesService.getQuizHistory(user.id);
  }
}
