import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { QuizAttempt } from '../../database/models/quiz-attempt.model';
import { QuizAnswer } from '../../database/models/quiz-answer.model';
import { DailyLesson } from '../../database/models/daily-lesson.model';
import { DailyLessonSentence } from '../../database/models/daily-lesson-sentence.model';
import { Sentence } from '../../database/models/sentence.model';
import { UserSettings } from '../../database/models/user-settings.model';
import { ActivityLog } from '../../database/models/activity-log.model';
import { UserSentenceProgress } from '../../database/models/user-sentence-progress.model';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([
      QuizAttempt,
      QuizAnswer,
      DailyLesson,
      DailyLessonSentence,
      Sentence,
      UserSettings,
      ActivityLog,
      UserSentenceProgress,
    ]),
  ],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
