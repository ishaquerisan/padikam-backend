import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { DailyLesson, LessonStatus } from '../../database/models/daily-lesson.model';
import { DailyLessonSentence, LessonSentenceStatus } from '../../database/models/daily-lesson-sentence.model';
import { UserSentenceProgress } from '../../database/models/user-sentence-progress.model';
import { QuizAttempt, QuizAttemptStatus } from '../../database/models/quiz-attempt.model';
import { UserSettings } from '../../database/models/user-settings.model';
import { Sentence } from '../../database/models/sentence.model';
import { Category } from '../../database/models/category.model';
import {
  getLocalizedDateString,
  getYesterdayDateString,
  calculateStreaks,
} from '../../common/utils/date.utils';
import { DEFAULT_TIMEZONE } from '../../common/constants/app.constants';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(DailyLesson)
    private dailyLessonModel: typeof DailyLesson,
    @InjectModel(DailyLessonSentence)
    private lessonSentenceModel: typeof DailyLessonSentence,
    @InjectModel(UserSentenceProgress)
    private progressModel: typeof UserSentenceProgress,
    @InjectModel(QuizAttempt)
    private quizAttemptModel: typeof QuizAttempt,
    @InjectModel(UserSettings)
    private userSettingsModel: typeof UserSettings,
    @InjectModel(Category)
    private categoryModel: typeof Category,
    @InjectModel(Sentence)
    private sentenceModel: typeof Sentence,
    private sequelize: Sequelize,
  ) {}

  /**
   * Comprehensive learner progress analytics
   */
  async getLearnerProgress(userId: number) {
    const settings = await this.userSettingsModel.findOne({ where: { user_id: userId } });
    const timeZone = settings?.timezone || DEFAULT_TIMEZONE;
    const todayStr = getLocalizedDateString(timeZone);
    const yesterdayStr = getYesterdayDateString(timeZone);

    // 1. Fetch all completed lessons for streak calculation
    const allLessons = await this.dailyLessonModel.findAll({
      where: { user_id: userId },
      attributes: ['id', 'lesson_date', 'status', 'target_count'],
      include: [
        {
          association: 'sentences',
          attributes: ['id', 'status'],
        },
      ],
      order: [['lesson_date', 'DESC']],
    });

    // Qualifying dates: lessons where at least 1 sentence was learned or status is completed
    const qualifyingDates = allLessons
      .filter((l) => {
        const learned = l.sentences?.filter((s) => s.status === LessonSentenceStatus.LEARNED).length || 0;
        return learned > 0 || l.status === LessonStatus.COMPLETED;
      })
      .map((l) => l.lesson_date);

    const { currentStreak, longestStreak } = calculateStreaks(qualifyingDates, todayStr, yesterdayStr);

    // 2. Total unique sentences learned
    const totalUniqueSentencesLearned = await this.progressModel.count({
      where: { user_id: userId },
    });

    // 3. Completed daily targets count
    const completedTargetsCount = allLessons.filter(
      (l) => l.status === LessonStatus.COMPLETED,
    ).length;

    // 4. Quiz accuracy
    const quizStats = await this.quizAttemptModel.findAll({
      where: { user_id: userId, status: QuizAttemptStatus.COMPLETED },
      attributes: ['score', 'correct_answers', 'total_questions'],
    });

    let totalQuestions = 0;
    let totalCorrect = 0;
    quizStats.forEach((q) => {
      totalQuestions += q.total_questions;
      totalCorrect += q.correct_answers;
    });

    const averageQuizAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // 5. Weekly Activity (past 7 calendar days)
    const weeklyActivity = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = getLocalizedDateString(timeZone, d);
      const lessonOnDate = allLessons.find((l) => l.lesson_date === dStr);
      const learned = lessonOnDate?.sentences?.filter((s) => s.status === LessonSentenceStatus.LEARNED).length || 0;
      weeklyActivity.push({
        date: dStr,
        dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'short', timeZone }),
        sentencesLearned: learned,
        isCompleted: lessonOnDate?.status === LessonStatus.COMPLETED,
      });
    }

    // 6. Category-wise progress
    const categories = await this.categoryModel.findAll({
      include: [
        {
          model: Sentence,
          attributes: ['id'],
        },
      ],
    });

    const userProgress = await this.progressModel.findAll({
      where: { user_id: userId },
      include: [{ model: Sentence, attributes: ['category_id'] }],
    });

    const categoryProgressMap = new Map<number, number>();
    userProgress.forEach((p) => {
      if (p.sentence?.category_id) {
        categoryProgressMap.set(
          p.sentence.category_id,
          (categoryProgressMap.get(p.sentence.category_id) || 0) + 1,
        );
      }
    });

    const categoryBreakdown = categories.map((cat) => {
      const totalInCat = cat.sentences?.length || 0;
      const learnedInCat = categoryProgressMap.get(cat.id) || 0;
      return {
        categoryId: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        totalSentences: totalInCat,
        learnedSentences: learnedInCat,
        percentage: totalInCat > 0 ? Math.round((learnedInCat / totalInCat) * 100) : 0,
      };
    });

    return {
      currentStreak,
      longestStreak,
      totalUniqueSentencesLearned,
      totalLearningDays: qualifyingDates.length,
      completedTargetsCount,
      quizCount: quizStats.length,
      averageQuizAccuracy,
      weeklyActivity,
      categoryBreakdown,
    };
  }

  /**
   * History list of all lessons by date with quiz associations
   */
  async getLessonHistory(userId: number, page: number = 1, limit: number = 15) {
    const offset = (page - 1) * limit;

    const { rows: lessons, count: total } = await this.dailyLessonModel.findAndCountAll({
      where: { user_id: userId },
      order: [['lesson_date', 'DESC']],
      limit,
      offset,
      include: [
        {
          association: 'sentences',
          attributes: ['id', 'status', 'learned_at'],
        },
        {
          association: 'quizzes',
          attributes: ['id', 'score', 'status', 'completed_at'],
          required: false,
        },
      ],
    });

    return {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      lessons: lessons.map((l) => {
        const learned = l.sentences?.filter((s) => s.status === LessonSentenceStatus.LEARNED).length || 0;
        const latestQuiz = l.quizzes && l.quizzes.length > 0 ? l.quizzes[0] : null;
        return {
          id: l.id,
          date: l.lesson_date,
          targetCount: l.target_count,
          learnedCount: learned,
          status: l.status,
          isCompleted: l.status === LessonStatus.COMPLETED,
          quizScore: latestQuiz?.status === QuizAttemptStatus.COMPLETED ? latestQuiz.score : null,
          hasQuizAttempt: !!latestQuiz,
        };
      }),
    };
  }
}
