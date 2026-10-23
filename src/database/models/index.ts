import { User } from './user.model';
import { UserSettings } from './user-settings.model';
import { Category } from './category.model';
import { UserCategory } from './user-category.model';
import { Sentence } from './sentence.model';
import { DailyLesson } from './daily-lesson.model';
import { DailyLessonSentence } from './daily-lesson-sentence.model';
import { UserSentenceProgress } from './user-sentence-progress.model';
import { QuizAttempt } from './quiz-attempt.model';
import { QuizAnswer } from './quiz-answer.model';
import { Favorite } from './favorite.model';
import { ActivityLog } from './activity-log.model';

export {
  User,
  UserSettings,
  Category,
  UserCategory,
  Sentence,
  DailyLesson,
  DailyLessonSentence,
  UserSentenceProgress,
  QuizAttempt,
  QuizAnswer,
  Favorite,
  ActivityLog,
};

export const databaseModels = [
  User,
  UserSettings,
  Category,
  UserCategory,
  Sentence,
  DailyLesson,
  DailyLessonSentence,
  UserSentenceProgress,
  QuizAttempt,
  QuizAnswer,
  Favorite,
  ActivityLog,
];
