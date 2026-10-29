import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DailyLesson } from '../../database/models/daily-lesson.model';
import { DailyLessonSentence } from '../../database/models/daily-lesson-sentence.model';
import { Sentence } from '../../database/models/sentence.model';
import { UserSettings } from '../../database/models/user-settings.model';
import { UserCategory } from '../../database/models/user-category.model';
import { Category } from '../../database/models/category.model';
import { UserSentenceProgress } from '../../database/models/user-sentence-progress.model';
import { ActivityLog } from '../../database/models/activity-log.model';
import { Favorite } from '../../database/models/favorite.model';
import { DailyLessonsService } from './daily-lessons.service';
import { DailyLessonsController } from './daily-lessons.controller';

import { User } from '../../database/models/user.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      User,
      DailyLesson,
      DailyLessonSentence,
      Sentence,
      UserSettings,
      UserCategory,
      Category,
      UserSentenceProgress,
      Favorite,
      ActivityLog,
    ]),
  ],
  controllers: [DailyLessonsController],
  providers: [DailyLessonsService],
  exports: [DailyLessonsService],
})
export class DailyLessonsModule {}
