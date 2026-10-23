import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DailyLesson, LessonStatus } from '../../database/models/daily-lesson.model';
import { DailyLessonSentence, LessonSentenceStatus } from '../../database/models/daily-lesson-sentence.model';
import { UserSettings } from '../../database/models/user-settings.model';
import { UserCategory } from '../../database/models/user-category.model';
import { Favorite } from '../../database/models/favorite.model';
import { QuizAttempt, QuizAttemptStatus } from '../../database/models/quiz-attempt.model';
import { getLocalizedDateString, getYesterdayDateString, calculateStreaks } from '../../common/utils/date.utils';
import { DEFAULT_TIMEZONE } from '../../common/constants/app.constants';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(DailyLesson)
    private dailyLessonModel: typeof DailyLesson,
    @InjectModel(UserSettings)
    private userSettingsModel: typeof UserSettings,
    @InjectModel(UserCategory)
    private userCategoryModel: typeof UserCategory,
    @InjectModel(Favorite)
    private favoriteModel: typeof Favorite,
    @InjectModel(QuizAttempt)
    private quizAttemptModel: typeof QuizAttempt,
  ) {}

  async getLearnerSummary(userId: number) {
    const settings = await this.userSettingsModel.findOne({ where: { user_id: userId } });
    const timeZone = settings?.timezone || DEFAULT_TIMEZONE;
    const todayStr = getLocalizedDateString(timeZone);
    const yesterdayStr = getYesterdayDateString(timeZone);

    // 1. Today's lesson summary
    const todayLesson = await this.dailyLessonModel.findOne({
      where: { user_id: userId, lesson_date: todayStr },
      include: [{ association: 'sentences', attributes: ['id', 'status'] }],
    });

    const targetCount = todayLesson ? todayLesson.target_count : settings?.daily_target || 5;
    const learnedCount = todayLesson?.sentences?.filter((s) => s.status === LessonSentenceStatus.LEARNED).length || 0;
    const totalAssigned = todayLesson?.sentences?.length || 0;
    const isTargetCompleted = learnedCount >= targetCount;
    const isDailyMaxReached = learnedCount >= 30;

    // 2. Streaks
    const allLessons = await this.dailyLessonModel.findAll({
      where: { user_id: userId },
      attributes: ['lesson_date', 'status'],
      include: [{ association: 'sentences', attributes: ['status'] }],
    });

    const qualifyingDates = allLessons
      .filter((l) => {
        const learned = l.sentences?.filter((s) => s.status === LessonSentenceStatus.LEARNED).length || 0;
        return learned > 0 || l.status === LessonStatus.COMPLETED;
      })
      .map((l) => l.lesson_date);

    const { currentStreak, longestStreak } = calculateStreaks(qualifyingDates, todayStr, yesterdayStr);

    // 3. Yesterday's quiz status
    const yesterdayLesson = await this.dailyLessonModel.findOne({
      where: { user_id: userId, lesson_date: yesterdayStr },
    });

    const yesterdayQuizAttempt = yesterdayLesson
      ? await this.quizAttemptModel.findOne({
          where: { user_id: userId, quiz_date: yesterdayStr },
        })
      : null;

    const yesterdayQuizAvailable = !!yesterdayLesson;
    const yesterdayQuizCompleted = yesterdayQuizAttempt?.status === QuizAttemptStatus.COMPLETED;

    // 4. Favorites count
    const favoriteCount = await this.favoriteModel.count({ where: { user_id: userId } });

    // 5. Selected categories count
    const categoryCount = await this.userCategoryModel.count({ where: { user_id: userId } });

    return {
      todayDate: todayStr,
      hasTodayLesson: !!todayLesson,
      targetCount,
      learnedCount,
      totalAssigned,
      remainingCount: Math.max(0, targetCount - learnedCount),
      isTargetCompleted,
      isDailyMaxReached,
      currentStreak,
      longestStreak,
      yesterdayQuiz: {
        available: yesterdayQuizAvailable,
        completed: yesterdayQuizCompleted,
        score: yesterdayQuizAttempt?.score ?? null,
      },
      favoriteCount,
      categoryCount,
    };
  }
}
