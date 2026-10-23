import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from '../../database/models/user.model';
import { UserSettings } from '../../database/models/user-settings.model';
import { Category } from '../../database/models/category.model';
import { Sentence } from '../../database/models/sentence.model';
import { DailyLesson } from '../../database/models/daily-lesson.model';
import { DailyLessonSentence } from '../../database/models/daily-lesson-sentence.model';
import { QuizAttempt } from '../../database/models/quiz-attempt.model';
import { QuizAnswer } from '../../database/models/quiz-answer.model';
import { ActivityLog } from '../../database/models/activity-log.model';
import { UserSentenceProgress } from '../../database/models/user-sentence-progress.model';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([
      User,
      UserSettings,
      Category,
      Sentence,
      DailyLesson,
      DailyLessonSentence,
      QuizAttempt,
      QuizAnswer,
      ActivityLog,
      UserSentenceProgress,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
