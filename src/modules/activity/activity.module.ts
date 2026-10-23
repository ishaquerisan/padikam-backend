import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DailyLesson } from '../../database/models/daily-lesson.model';
import { DailyLessonSentence } from '../../database/models/daily-lesson-sentence.model';
import { UserSentenceProgress } from '../../database/models/user-sentence-progress.model';
import { QuizAttempt } from '../../database/models/quiz-attempt.model';
import { UserSettings } from '../../database/models/user-settings.model';
import { Category } from '../../database/models/category.model';
import { Sentence } from '../../database/models/sentence.model';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([
      DailyLesson,
      DailyLessonSentence,
      UserSentenceProgress,
      QuizAttempt,
      UserSettings,
      Category,
      Sentence,
    ]),
  ],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
