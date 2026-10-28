import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
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
      // If today's lesson has not been started yet (0 learned words) and contains mixed difficulties
      // that violate the user's current progression tier, realign it with the user's active tier
      const learnedCount = lesson.sentences?.filter((s) => s.status === LessonSentenceStatus.LEARNED).length || 0;
      if (learnedCount === 0 && lesson.sentences && lesson.sentences.length > 0) {
        const userCategories = await this.userCategoryModel.findAll({
          where: { user_id: userId },
          attributes: ['category_id'],
        });
        let categoryIds = userCategories.map((uc) => uc.category_id);
        if (categoryIds.length === 0) {
          const allActive = await this.categoryModel.findAll({
            where: { status: CategoryStatus.ACTIVE },
            attributes: ['id'],
          });
          categoryIds = allActive.map((c) => c.id);
        }

        const targetTier = await this.determineUserDifficultyTier(userId, categoryIds);
        const hasWrongDifficulty = lesson.sentences.some(
          (s) => s.sentence?.difficulty && s.sentence.difficulty !== targetTier,
        );

        if (hasWrongDifficulty) {
          await this.regenerateLessonSentences(lesson, userId, settings.daily_target);
          lesson = await this.findLessonWithDetails(userId, todayStr);
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
        // Sort eligible sentences by difficulty (BEGINNER -> INTERMEDIATE -> ADVANCED)
        const difficultyWeights: Record<string, number> = {
          BEGINNER: 1,
          INTERMEDIATE: 2,
          ADVANCED: 3,
        };
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
   * Determines the learner's active difficulty tier based on selected categories.
   * A learner must complete all BEGINNER words in their categories before unlocking INTERMEDIATE,
   * and all INTERMEDIATE words before unlocking ADVANCED. No mixed combinations.
   */
  private async determineUserDifficultyTier(
    userId: number,
    categoryIds: number[],
  ): Promise<SentenceDifficulty> {
    // 1. Sentences already learned by this user in progress records
    const learnedProgress = await this.progressModel.findAll({
      where: { user_id: userId },
      attributes: ['sentence_id'],
    });
    const learnedSentenceIds = new Set<number>(learnedProgress.map((p) => p.sentence_id));

    // 2. Sentences marked LEARNED in user's daily lessons
    const userLessonIds = (
      await this.dailyLessonModel.findAll({
        where: { user_id: userId },
        attributes: ['id'],
      })
    ).map((l) => l.id);

    if (userLessonIds.length > 0) {
      const learnedLessonSentences = await this.lessonSentenceModel.findAll({
        where: {
          daily_lesson_id: { [Op.in]: userLessonIds },
          status: LessonSentenceStatus.LEARNED,
        },
        attributes: ['sentence_id'],
      });
      learnedLessonSentences.forEach((ls) => learnedSentenceIds.add(ls.sentence_id));
    }

    // 3. Check if user still has unlearned BEGINNER sentences in their selected categories
    const beginnerWhere: any = {
      status: SentenceStatus.ACTIVE,
      category_id: { [Op.in]: categoryIds },
      difficulty: SentenceDifficulty.BEGINNER,
    };
    if (learnedSentenceIds.size > 0) {
      beginnerWhere.id = { [Op.notIn]: Array.from(learnedSentenceIds) };
    }

    const unlearnedBeginners = await this.sentenceModel.count({ where: beginnerWhere });
    if (unlearnedBeginners > 0) {
      return SentenceDifficulty.BEGINNER;
    }

    // 4. If all BEGINNER sentences are completed, check INTERMEDIATE sentences
    const intermediateWhere: any = {
      status: SentenceStatus.ACTIVE,
      category_id: { [Op.in]: categoryIds },
      difficulty: SentenceDifficulty.INTERMEDIATE,
    };
    if (learnedSentenceIds.size > 0) {
      intermediateWhere.id = { [Op.notIn]: Array.from(learnedSentenceIds) };
    }

    const unlearnedIntermediates = await this.sentenceModel.count({ where: intermediateWhere });
    if (unlearnedIntermediates > 0) {
      return SentenceDifficulty.INTERMEDIATE;
    }

    // 5. If all INTERMEDIATE sentences are completed, check ADVANCED sentences
    const advancedWhere: any = {
      status: SentenceStatus.ACTIVE,
      category_id: { [Op.in]: categoryIds },
      difficulty: SentenceDifficulty.ADVANCED,
    };
    if (learnedSentenceIds.size > 0) {
      advancedWhere.id = { [Op.notIn]: Array.from(learnedSentenceIds) };
    }

    const unlearnedAdvanced = await this.sentenceModel.count({ where: advancedWhere });
    if (unlearnedAdvanced > 0) {
      return SentenceDifficulty.ADVANCED;
    }

    // 6. If everything in selected categories is completed, default to BEGINNER for revision cycle
    return SentenceDifficulty.BEGINNER;
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

    // 2. Determine active difficulty tier (strictly BEGINNER -> INTERMEDIATE -> ADVANCED)
    const targetTier = await this.determineUserDifficultyTier(userId, categoryIds);

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

    // 4. Query candidate sentences strictly matching the target tier
    const candidateWhere: any = {
      status: SentenceStatus.ACTIVE,
      category_id: { [Op.in]: categoryIds },
      difficulty: targetTier,
    };
    if (combinedExcludeIds.size > 0) {
      candidateWhere.id = { [Op.notIn]: Array.from(combinedExcludeIds) };
    }

    let candidateSentences = await this.sentenceModel.findAll({
      where: candidateWhere,
      include: [Category],
      order: Sequelize.literal('RAND()'),
      limit,
    });

    // 5. Fallback if not enough completely unassigned candidates exist in target tier:
    // Pick from unlearned sentences in target tier, excluding only recent 14 days
    if (candidateSentences.length < limit) {
      const remainingNeeded = limit - candidateSentences.length;
      const alreadyPickedIds = [
        ...excludeIds,
        ...candidateSentences.map((s) => s.id),
      ];

      const recentLessons = await this.dailyLessonModel.findAll({
        where: { user_id: userId },
        order: [['lesson_date', 'DESC']],
        limit: 14,
        include: [{ association: 'sentences', attributes: ['sentence_id'] }],
      });

      const recentIds = new Set<number>(alreadyPickedIds);
      recentLessons.forEach((l) => {
        l.sentences?.forEach((s) => recentIds.add(s.sentence_id));
      });

      const fallbackWhere: any = {
        status: SentenceStatus.ACTIVE,
        category_id: { [Op.in]: categoryIds },
        difficulty: targetTier, // STAY STRICTLY ON TARGET TIER! Never mix!
      };
      if (recentIds.size > 0) {
        fallbackWhere.id = { [Op.notIn]: Array.from(recentIds) };
      }

      const fallbackSentences = await this.sentenceModel.findAll({
        where: fallbackWhere,
        include: [Category],
        order: Sequelize.literal('RAND()'),
        limit: remainingNeeded,
      });

      candidateSentences = [...candidateSentences, ...fallbackSentences];
    }

    // 6. Extreme fallback: if category has very few sentences, pick any sentence in targetTier
    if (candidateSentences.length < limit) {
      const remainingNeeded = limit - candidateSentences.length;
      const alreadyPickedIds = candidateSentences.map((s) => s.id);

      const anyTierWhere: any = {
        status: SentenceStatus.ACTIVE,
        category_id: { [Op.in]: categoryIds },
        difficulty: targetTier,
      };
      if (alreadyPickedIds.length > 0) {
        anyTierWhere.id = { [Op.notIn]: alreadyPickedIds };
      }

      const anyTierSentences = await this.sentenceModel.findAll({
        where: anyTierWhere,
        include: [Category],
        order: Sequelize.literal('RAND()'),
        limit: remainingNeeded,
      });

      candidateSentences = [...candidateSentences, ...anyTierSentences];
    }

    return candidateSentences;
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

      const candidates = await this.pickEligibleSentences(userId, target, []);
      if (candidates.length === 0) {
        await transaction.rollback();
        return;
      }

      let position = 1;
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

      lesson.target_count = candidates.length;
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
        timezone: 'Asia/Kolkata',
        notifications_enabled: true,
      });
    }
    return settings;
  }

  private async formatLessonResponse(userId: number, lesson: DailyLesson) {
    if (!lesson) return null;

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
        difficulty: sentence?.difficulty || 'BEGINNER',
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

    // Order sentences based on difficulty (BEGINNER -> INTERMEDIATE -> ADVANCED)
    const difficultyWeights: Record<string, number> = {
      BEGINNER: 1,
      INTERMEDIATE: 2,
      ADVANCED: 3,
    };

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
