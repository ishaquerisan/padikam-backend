import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { User } from '../../database/models/user.model';
import { DailyLesson, LessonStatus } from '../../database/models/daily-lesson.model';
import { DailyLessonSentence, LessonSentenceStatus } from '../../database/models/daily-lesson-sentence.model';
import { Sentence, SentenceStatus, SentenceDifficulty } from '../../database/models/sentence.model';
import { UserSettings } from '../../database/models/user-settings.model';
import { UserCategory } from '../../database/models/user-category.model';
import { Category, CategoryStatus } from '../../database/models/category.model';
import { UserSentenceProgress } from '../../database/models/user-sentence-progress.model';
import { ActivityLog } from '../../database/models/activity-log.model';
import { Favorite } from '../../database/models/favorite.model';
import { getLocalizedDateString, getYesterdayDateString } from '../../common/utils/date.utils';
import { MAX_DAILY_NEW_SENTENCES, DEFAULT_TIMEZONE } from '../../common/constants/app.constants';

@Injectable()
export class DailyLessonsService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(DailyLesson)
    private dailyLessonModel: typeof DailyLesson,
    @InjectModel(DailyLessonSentence)
    private lessonSentenceModel: typeof DailyLessonSentence,
    @InjectModel(Sentence)
    private sentenceModel: typeof Sentence,
    @InjectModel(UserSettings)
    private userSettingsModel: typeof UserSettings,
    @InjectModel(UserCategory)
    private userCategoryModel: typeof UserCategory,
    @InjectModel(Category)
    private categoryModel: typeof Category,
    @InjectModel(UserSentenceProgress)
    private progressModel: typeof UserSentenceProgress,
    @InjectModel(Favorite)
    private favoriteModel: typeof Favorite,
    @InjectModel(ActivityLog)
    private activityLogModel: typeof ActivityLog,
    private sequelize: Sequelize,
  ) {}

  /**
   * Get or automatically initialize today's daily lesson for user.
   */
  async getTodayLesson(userId: number) {
    const settings = await this.getUserSettings(userId);
    const timeZone = settings.timezone || DEFAULT_TIMEZONE;
    const todayStr = getLocalizedDateString(timeZone);

    // Look for existing lesson
    let lesson = await this.findLessonWithDetails(userId, todayStr);

    if (!lesson) {
      // Create atomically
      lesson = await this.generateDailyLesson(userId, todayStr, settings.daily_target);
    } else {
      // Realign pending sentences if user changed their difficulty level
      if (lesson.sentences && lesson.sentences.length > 0) {
        const targetTier = await this.getUserDifficultyLevel(userId);
        const pendingSentences = lesson.sentences.filter((s) => s.status === LessonSentenceStatus.PENDING);
        const hasWrongDifficulty = pendingSentences.some(
          (s) => !s.sentence?.difficulty || s.sentence.difficulty !== targetTier,
        );

        if (hasWrongDifficulty && pendingSentences.length > 0) {
          const learnedCount = lesson.sentences.length - pendingSentences.length;
          const neededCount = Math.max(0, settings.daily_target - learnedCount);
          if (neededCount > 0) {
            await this.regenerateLessonSentences(lesson, userId, neededCount);
            lesson = await this.findLessonWithDetails(userId, todayStr);
          }
        }
      }
    }

    return this.formatLessonResponse(userId, lesson);
  }

  /**
   * Retrieve a past lesson by calendar date (immutable snapshot history)
   */
  async getLessonByDate(userId: number, dateStr: string) {
    const lesson = await this.findLessonWithDetails(userId, dateStr);
    if (!lesson) {
      throw new NotFoundException(`No lesson record found for date ${dateStr}`);
    }
    return this.formatLessonResponse(userId, lesson);
  }

  /**
   * Mark an individual sentence as learned in today's lesson.
   */
  async markSentenceLearned(userId: number, sentenceId: number) {
    const settings = await this.getUserSettings(userId);
    const todayStr = getLocalizedDateString(settings.timezone || DEFAULT_TIMEZONE);

    const lesson = await this.dailyLessonModel.findOne({
      where: { user_id: userId, lesson_date: todayStr },
      include: [{ association: 'sentences' }],
    });

    if (!lesson) {
      throw new NotFoundException("Today's lesson has not been generated yet.");
    }

    const lessonSentence = await this.lessonSentenceModel.findOne({
      where: { daily_lesson_id: lesson.id, sentence_id: sentenceId },
    });

    if (!lessonSentence) {
      throw new BadRequestException('This sentence is not part of your active daily lesson.');
    }

    // Count already learned sentences today
    const currentlyLearned = lesson.sentences.filter(
      (s) => s.status === LessonSentenceStatus.LEARNED,
    ).length;

    if (currentlyLearned >= MAX_DAILY_NEW_SENTENCES && lessonSentence.status !== LessonSentenceStatus.LEARNED) {
      throw new BadRequestException(
        `You've reached today's maximum of ${MAX_DAILY_NEW_SENTENCES} sentences. You can revise or take quizzes.`,
      );
    }

    if (lessonSentence.status !== LessonSentenceStatus.LEARNED) {
      lessonSentence.status = LessonSentenceStatus.LEARNED;
      lessonSentence.learned_at = new Date();
      await lessonSentence.save();

      // Upsert UserSentenceProgress
      let progress = await this.progressModel.findOne({
        where: { user_id: userId, sentence_id: sentenceId },
      });

      if (!progress) {
        progress = await this.progressModel.create({
          user_id: userId,
          sentence_id: sentenceId,
          times_reviewed: 1,
          correct_count: 1,
          incorrect_count: 0,
          difficulty_rating: 1,
          last_reviewed_at: new Date(),
          next_review_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // Spaced review tomorrow
        });
      } else {
        progress.times_reviewed += 1;
        progress.last_reviewed_at = new Date();
        await progress.save();
      }

      // Check if target is now completed
      const newLearnedCount = currentlyLearned + 1;
      if (newLearnedCount >= lesson.target_count && lesson.status !== LessonStatus.COMPLETED) {
        lesson.status = LessonStatus.COMPLETED;
        lesson.completed_at = new Date();
        await lesson.save();

        await this.activityLogModel.create({
          user_id: userId,
          activity_type: 'DAILY_TARGET_COMPLETED',
          details: { date: todayStr, target: lesson.target_count },
        });
      }

      await this.activityLogModel.create({
        user_id: userId,
        activity_type: 'SENTENCE_LEARNED',
        details: { sentence_id: sentenceId, date: todayStr },
      });
    }

    // Return fresh state
    const refreshed = await this.findLessonWithDetails(userId, todayStr);
    return this.formatLessonResponse(userId, refreshed);
  }

  /**
   * Increase target for today (e.g. 5 -> 10, 10 -> 20, 20 -> 30)
   */
  async increaseTarget(userId: number, newTarget: number) {
    if (![10, 20, 30].includes(newTarget)) {
      throw new BadRequestException('Target can only be increased to 10, 20, or 30');
    }

    const settings = await this.getUserSettings(userId);
    const todayStr = getLocalizedDateString(settings.timezone || DEFAULT_TIMEZONE);

    let lesson = await this.findLessonWithDetails(userId, todayStr);
    if (!lesson) {
      lesson = await this.generateDailyLesson(userId, todayStr, newTarget);
      return this.formatLessonResponse(userId, lesson);
    }

    if (newTarget <= lesson.target_count) {
      throw new BadRequestException(`New target must be greater than current target (${lesson.target_count})`);
    }

    if (newTarget > MAX_DAILY_NEW_SENTENCES) {
      throw new BadRequestException(`Target cannot exceed the daily limit of ${MAX_DAILY_NEW_SENTENCES} sentences.`);
    }

    const currentCount = lesson.sentences.length;
    const additionalNeeded = newTarget - currentCount;

    if (additionalNeeded > 0) {
      // Find candidate sentences
      const alreadyAssignedIds = lesson.sentences.map((s) => s.sentence_id);
      const candidates = await this.pickEligibleSentences(userId, additionalNeeded, alreadyAssignedIds);

      if (candidates.length === 0) {
        throw new BadRequestException('Not enough active sentences available in your selected categories to expand target.');
      }

      const transaction = await this.sequelize.transaction();
      try {
        let pos = currentCount + 1;
        for (const sentence of candidates) {
          await this.lessonSentenceModel.create(
            {
              daily_lesson_id: lesson.id,
              sentence_id: sentence.id,
              position: pos++,
              status: LessonSentenceStatus.PENDING,
              word_snapshot: sentence.word,
              word_meaning_snapshot: sentence.word_meaning,
              english_text_snapshot: sentence.english_text,
              malayalam_meaning_snapshot: sentence.malayalam_meaning,
            },
            { transaction },
          );
        }

        lesson.target_count = newTarget;
        // If it was completed before, but now has unlearned sentences, update status
        const totalLearned = lesson.sentences.filter(s => s.status === LessonSentenceStatus.LEARNED).length;
        if (totalLearned < newTarget) {
          lesson.status = LessonStatus.IN_PROGRESS;
          lesson.completed_at = null;
        }
        await lesson.save({ transaction });

        // Also update user's default setting
        settings.daily_target = newTarget;
        await settings.save({ transaction });

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } else {
      lesson.target_count = newTarget;
      await lesson.save();
    }

    const refreshed = await this.findLessonWithDetails(userId, todayStr);
    return this.formatLessonResponse(userId, refreshed);
  }

  // --- Helper Methods ---

  private async generateDailyLesson(userId: number, dateStr: string, requestedTarget: number) {
    const target = Math.min(requestedTarget || 5, MAX_DAILY_NEW_SENTENCES);
    const eligibleSentences = await this.pickEligibleSentences(userId, target, []);

    if (eligibleSentences.length === 0) {
      throw new BadRequestException(
        'No active sentences found for your selected categories. Please select more categories or contact support.',
      );
    }

    const transaction = await this.sequelize.transaction();
    try {
      // Find or create safely to prevent race conditions
      const [lesson, created] = await this.dailyLessonModel.findOrCreate({
        where: { user_id: userId, lesson_date: dateStr },
        defaults: {
          user_id: userId,
          lesson_date: dateStr,
          target_count: Math.min(target, eligibleSentences.length),
          status: LessonStatus.IN_PROGRESS,
          started_at: new Date(),
        },
        transaction,
      });

      if (created) {
        // Sort eligible sentences: user's difficulty level comes FIRST, then upper levels
        const userLevel = await this.getUserDifficultyLevel(userId);
        let difficultyWeights: Record<string, number>;
        if (userLevel === SentenceDifficulty.ADVANCED) {
          difficultyWeights = { ADVANCED: 1, INTERMEDIATE: 2, BEGINNER: 3 };
        } else if (userLevel === SentenceDifficulty.INTERMEDIATE) {
          difficultyWeights = { INTERMEDIATE: 1, ADVANCED: 2, BEGINNER: 3 };
        } else {
          difficultyWeights = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 };
        }

        eligibleSentences.sort((a, b) => {
          const weightA = difficultyWeights[a.difficulty] ?? 99;
          const weightB = difficultyWeights[b.difficulty] ?? 99;
          if (weightA !== weightB) {
            return weightA - weightB;
          }
          return a.id - b.id;
        });

        let position = 1;
        for (const sentence of eligibleSentences) {
          await this.lessonSentenceModel.create(
            {
              daily_lesson_id: lesson.id,
              sentence_id: sentence.id,
              position: position++,
              status: LessonSentenceStatus.PENDING,
              word_snapshot: sentence.word,
              word_meaning_snapshot: sentence.word_meaning,
              english_text_snapshot: sentence.english_text,
              malayalam_meaning_snapshot: sentence.malayalam_meaning,
            },
            { transaction },
          );
        }

        await this.activityLogModel.create(
          {
            user_id: userId,
            activity_type: 'DAILY_LESSON_STARTED',
            details: { date: dateStr, sentence_count: eligibleSentences.length },
          },
          { transaction },
        );
      }

      await transaction.commit();
      return this.findLessonWithDetails(userId, dateStr);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Retrieves the learner's active difficulty level directly from User or UserSettings.
   * Defaults to BEGINNER if not specified.
   */
  async getUserDifficultyLevel(userId: number): Promise<SentenceDifficulty> {
    const user = await this.userModel.findByPk(userId, { attributes: ['id', 'difficulty_level'] });
    if (user?.difficulty_level) {
      return user.difficulty_level;
    }
    const settings = await this.getUserSettings(userId);
    return settings.difficulty_level || SentenceDifficulty.BEGINNER;
  }

  /**
   * Legacy alias for getUserDifficultyLevel ensuring backward compatibility.
   */
  private async determineUserDifficultyTier(
    userId: number,
    _categoryIds?: number[],
  ): Promise<SentenceDifficulty> {
    return this.getUserDifficultyLevel(userId);
  }

  private async pickEligibleSentences(userId: number, limit: number, excludeIds: number[] = []) {
    // 1. Get user selected categories
    const userCategories = await this.userCategoryModel.findAll({
      where: { user_id: userId },
      attributes: ['category_id'],
    });

    let categoryIds = userCategories.map((uc) => uc.category_id);

    // If none selected, take all active categories
    if (categoryIds.length === 0) {
      const allActive = await this.categoryModel.findAll({
        where: { status: CategoryStatus.ACTIVE },
        attributes: ['id'],
      });
      categoryIds = allActive.map((c) => c.id);
    }

    // 2. Active progression order based on user difficulty_level:
    // User's chosen level comes FIRST, then upper levels!
    const userLevel = await this.getUserDifficultyLevel(userId);
    let tierSequence: SentenceDifficulty[];
    if (userLevel === SentenceDifficulty.ADVANCED) {
      tierSequence = [SentenceDifficulty.ADVANCED];
    } else if (userLevel === SentenceDifficulty.INTERMEDIATE) {
      tierSequence = [SentenceDifficulty.INTERMEDIATE, SentenceDifficulty.ADVANCED];
    } else {
      tierSequence = [SentenceDifficulty.BEGINNER, SentenceDifficulty.INTERMEDIATE, SentenceDifficulty.ADVANCED];
    }

    // 3. Collect sentences already learned or assigned in other lessons to avoid repetition
    const learnedProgress = await this.progressModel.findAll({
      where: { user_id: userId },
      attributes: ['sentence_id'],
    });
    const learnedIds = new Set<number>(learnedProgress.map((p) => p.sentence_id));

    const allAssignedLessons = await this.dailyLessonModel.findAll({
      where: { user_id: userId },
      include: [{ association: 'sentences', attributes: ['sentence_id', 'status'] }],
    });

    const assignedIds = new Set<number>(excludeIds);
    allAssignedLessons.forEach((l) => {
      l.sentences?.forEach((s) => {
        assignedIds.add(s.sentence_id);
        if (s.status === LessonSentenceStatus.LEARNED) {
          learnedIds.add(s.sentence_id);
        }
      });
    });

    const combinedExcludeIds = new Set<number>([...assignedIds, ...learnedIds]);

    let pickedSentences: Sentence[] = [];

    // 4. Fill from tierSequence: user level first, then upper levels!
    for (const tier of tierSequence) {
      const remainingNeeded = limit - pickedSentences.length;
      if (remainingNeeded <= 0) break;

      const alreadyPickedIds = new Set<number>([
        ...Array.from(combinedExcludeIds),
        ...pickedSentences.map((s) => s.id),
      ]);

      const candidateWhere: any = {
        status: SentenceStatus.ACTIVE,
        category_id: { [Op.in]: categoryIds },
        difficulty: tier,
      };
      if (alreadyPickedIds.size > 0) {
        candidateWhere.id = { [Op.notIn]: Array.from(alreadyPickedIds) };
      }

      const sentences = await this.sentenceModel.findAll({
        where: candidateWhere,
        include: [Category],
        order: Sequelize.literal('RAND()'),
        limit: remainingNeeded,
      });

      pickedSentences = [...pickedSentences, ...sentences];
    }

    // 5. If pickedSentences is 0, check if all sentences in selected categories have been completed!
    if (pickedSentences.length === 0) {
      const totalInCategories = await this.sentenceModel.count({
        where: {
          status: SentenceStatus.ACTIVE,
          category_id: { [Op.in]: categoryIds },
          difficulty: { [Op.in]: tierSequence },
        },
      });

      if (totalInCategories > 0) {
        throw new BadRequestException(
          'You have completed all sentences based on your selected categories! Please select more categories in preferences to continue learning.',
        );
      }
    }

    // 6. If not completely filled to limit, fill remaining from spaced-repetition review of user level (excluding recent 14 days)
    if (pickedSentences.length > 0 && pickedSentences.length < limit) {
      const remainingNeeded = limit - pickedSentences.length;
      const alreadyPickedIds = new Set<number>([
        ...excludeIds,
        ...pickedSentences.map((s) => s.id),
      ]);

      const recentLessons = await this.dailyLessonModel.findAll({
        where: { user_id: userId },
        order: [['lesson_date', 'DESC']],
        limit: 14,
        include: [{ association: 'sentences', attributes: ['sentence_id'] }],
      });

      recentLessons.forEach((l) => {
        l.sentences?.forEach((s) => alreadyPickedIds.add(s.sentence_id));
      });

      const fallbackSentences = await this.sentenceModel.findAll({
        where: {
          status: SentenceStatus.ACTIVE,
          category_id: { [Op.in]: categoryIds },
          difficulty: userLevel,
          id: { [Op.notIn]: Array.from(alreadyPickedIds) },
        },
        include: [Category],
        order: Sequelize.literal('RAND()'),
        limit: remainingNeeded,
      });

      pickedSentences = [...pickedSentences, ...fallbackSentences];
    }

    return pickedSentences;
  }

  private async regenerateLessonSentences(
    lesson: DailyLesson,
    userId: number,
    target: number,
  ) {
    const transaction = await this.sequelize.transaction();
    try {
      await this.lessonSentenceModel.destroy({
        where: {
          daily_lesson_id: lesson.id,
          status: LessonSentenceStatus.PENDING,
        },
        transaction,
      });

      const existingLearned = await this.lessonSentenceModel.findAll({
        where: {
          daily_lesson_id: lesson.id,
          status: LessonSentenceStatus.LEARNED,
        },
        attributes: ['sentence_id', 'position'],
        transaction,
      });
      const excludeIds = existingLearned.map((s) => s.sentence_id);
      const maxPosition = existingLearned.reduce((max, s) => Math.max(max, s.position || 0), 0);

      const candidates = await this.pickEligibleSentences(userId, target, excludeIds);
      if (candidates.length === 0) {
        await transaction.rollback();
        return;
      }

      let position = maxPosition + 1;
      for (const sentence of candidates) {
        await this.lessonSentenceModel.create(
          {
            daily_lesson_id: lesson.id,
            sentence_id: sentence.id,
            position: position++,
            status: LessonSentenceStatus.PENDING,
            word_snapshot: sentence.word,
            word_meaning_snapshot: sentence.word_meaning,
            english_text_snapshot: sentence.english_text,
            malayalam_meaning_snapshot: sentence.malayalam_meaning,
          },
          { transaction },
        );
      }

      lesson.target_count = existingLearned.length + candidates.length;
      await lesson.save({ transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
    }
  }

  private async findLessonWithDetails(userId: number, dateStr: string) {
    return this.dailyLessonModel.findOne({
      where: { user_id: userId, lesson_date: dateStr },
      include: [
        {
          association: 'sentences',
          include: [
            {
              association: 'sentence',
              include: [{ association: 'category' }],
            },
          ],
        },
      ],
      order: [[{ model: DailyLessonSentence, as: 'sentences' }, 'position', 'ASC']],
    });
  }

  private async getUserSettings(userId: number): Promise<UserSettings> {
    let settings = await this.userSettingsModel.findOne({ where: { user_id: userId } });
    if (!settings) {
      settings = await this.userSettingsModel.create({
        user_id: userId,
        daily_target: 5,
        difficulty_level: SentenceDifficulty.BEGINNER,
        timezone: 'Asia/Kolkata',
        notifications_enabled: true,
      });
    }
    return settings;
  }

  private async formatLessonResponse(userId: number, lesson: DailyLesson) {
    if (!lesson) return null;

    const userDifficulty = await this.getUserDifficultyLevel(userId);

    // Fetch user favorites to tag sentences
    const userFavorites = await this.favoriteModel.findAll({
      where: { user_id: userId },
      attributes: ['sentence_id'],
    });
    const favSet = new Set(userFavorites.map((f) => f.sentence_id));

    const totalAssigned = lesson.sentences?.length || 0;
    const learnedSentences = lesson.sentences?.filter(
      (s) => s.status === LessonSentenceStatus.LEARNED,
    ) || [];
    const learnedCount = learnedSentences.length;
    const remainingCount = Math.max(0, lesson.target_count - learnedCount);
    const isTargetCompleted = learnedCount >= lesson.target_count;
    const isDailyMaxReached = learnedCount >= MAX_DAILY_NEW_SENTENCES;

    const items = (lesson.sentences || []).map((ls) => {
      const sentence = ls.sentence;
      return {
        id: ls.id,
        sentenceId: ls.sentence_id,
        position: ls.position,
        status: ls.status,
        learnedAt: ls.learned_at,
        // Snapshots guarantee historical integrity
        word: ls.word_snapshot || sentence?.word || '',
        wordMeaning: ls.word_meaning_snapshot || sentence?.word_meaning || '',
        englishText: ls.english_text_snapshot || sentence?.english_text,
        malayalamMeaning: ls.malayalam_meaning_snapshot || sentence?.malayalam_meaning,
        usageExample: sentence?.usage_example || null,
        difficulty: sentence?.difficulty || userDifficulty,
        audioUrl: sentence?.audio_url || null,
        category: sentence?.category
          ? {
              id: sentence.category.id,
              name: sentence.category.name,
              slug: sentence.category.slug,
              icon: sentence.category.icon,
            }
          : null,
        isFavorite: favSet.has(ls.sentence_id),
      };
    });

    // Order sentences: user's difficulty level comes FIRST, then upper levels!
    let difficultyWeights: Record<string, number>;
    if (userDifficulty === SentenceDifficulty.ADVANCED) {
      difficultyWeights = { ADVANCED: 1, INTERMEDIATE: 2, BEGINNER: 3 };
    } else if (userDifficulty === SentenceDifficulty.INTERMEDIATE) {
      difficultyWeights = { INTERMEDIATE: 1, ADVANCED: 2, BEGINNER: 3 };
    } else {
      difficultyWeights = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 };
    }

    items.sort((a, b) => {
      const weightA = difficultyWeights[a.difficulty] ?? 99;
      const weightB = difficultyWeights[b.difficulty] ?? 99;
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      return a.position - b.position;
    });

    items.forEach((item, index) => {
      item.position = index + 1;
    });

    return {
      id: lesson.id,
      date: lesson.lesson_date,
      status: lesson.status,
      targetCount: lesson.target_count,
      difficultyLevel: userDifficulty,
      totalAssigned,
      learnedCount,
      remainingCount,
      isTargetCompleted,
      isDailyMaxReached,
      maxAllowedDaily: MAX_DAILY_NEW_SENTENCES,
      startedAt: lesson.started_at,
      completedAt: lesson.completed_at,
      sentences: items,
    };
  }
}
