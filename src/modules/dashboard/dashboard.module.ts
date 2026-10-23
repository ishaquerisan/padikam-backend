import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DailyLesson } from '../../database/models/daily-lesson.model';
import { DailyLessonSentence } from '../../database/models/daily-lesson-sentence.model';
import { UserSettings } from '../../database/models/user-settings.model';
import { UserCategory } from '../../database/models/user-category.model';
import { Favorite } from '../../database/models/favorite.model';
import { QuizAttempt } from '../../database/models/quiz-attempt.model';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([
      DailyLesson,
      DailyLessonSentence,
      UserSettings,
      UserCategory,
      Favorite,
      QuizAttempt,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
