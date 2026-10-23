import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { User, UserRole, UserStatus } from '../../database/models/user.model';
import { UserSettings } from '../../database/models/user-settings.model';
import { Category, CategoryStatus } from '../../database/models/category.model';
import { Sentence, SentenceStatus, SentenceDifficulty } from '../../database/models/sentence.model';
import { DailyLesson, LessonStatus } from '../../database/models/daily-lesson.model';
import { DailyLessonSentence } from '../../database/models/daily-lesson-sentence.model';
import { QuizAttempt, QuizAttemptStatus } from '../../database/models/quiz-attempt.model';
import { QuizAnswer } from '../../database/models/quiz-answer.model';
import { ActivityLog } from '../../database/models/activity-log.model';
import { UserSentenceProgress } from '../../database/models/user-sentence-progress.model';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateSentenceDto,
  UpdateSentenceDto,
  BulkImportSentencesDto,
  UpdateUserStatusDto,
  UpdateUserRoleDto,
} from './dto/admin.dto';
import { getLocalizedDateString } from '../../common/utils/date.utils';
import { DEFAULT_TIMEZONE } from '../../common/constants/app.constants';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(UserSettings)
    private userSettingsModel: typeof UserSettings,
    @InjectModel(Category)
    private categoryModel: typeof Category,
    @InjectModel(Sentence)
    private sentenceModel: typeof Sentence,
    @InjectModel(DailyLesson)
    private dailyLessonModel: typeof DailyLesson,
    @InjectModel(DailyLessonSentence)
    private lessonSentenceModel: typeof DailyLessonSentence,
    @InjectModel(QuizAttempt)
    private quizAttemptModel: typeof QuizAttempt,
    @InjectModel(ActivityLog)
    private activityLogModel: typeof ActivityLog,
    @InjectModel(UserSentenceProgress)
    private progressModel: typeof UserSentenceProgress,
    private sequelize: Sequelize,
  ) {}

  // ==========================================
  // 1. Executive Dashboard Analytics
  // ==========================================
  async getDashboardStats() {
    const todayStr = getLocalizedDateString(DEFAULT_TIMEZONE);

    // Counts
    const totalUsers = await this.userModel.count();
    const activeUsers = await this.userModel.count({ where: { status: UserStatus.ACTIVE } });
    const totalCategories = await this.categoryModel.count();
    const totalActiveSentences = await this.sentenceModel.count({
      where: { status: SentenceStatus.ACTIVE },
    });

    // Today's lesson metrics
    const lessonsTodayCount = await this.dailyLessonModel.count({
      where: { lesson_date: todayStr },
    });
    const lessonsCompletedTodayCount = await this.dailyLessonModel.count({
      where: { lesson_date: todayStr, status: LessonStatus.COMPLETED },
    });

    // Quiz activity
    const totalQuizAttempts = await this.quizAttemptModel.count();
    const completedQuizAttempts = await this.quizAttemptModel.count({
      where: { status: QuizAttemptStatus.COMPLETED },
    });

    // Content availability by category
    const categories = await this.categoryModel.findAll({
      attributes: [
        'id',
        'name',
        'slug',
        'icon',
        'status',
        [
          Sequelize.literal(`(
            SELECT COUNT(*)
            FROM sentences AS s
            WHERE s.category_id = Category.id
              AND s.status = '${SentenceStatus.ACTIVE}'
          )`),
          'sentenceCount',
        ],
      ],
      order: [['sort_order', 'ASC']],
    });

    // Recent system activity logs
    const recentActivity = await this.activityLogModel.findAll({
      limit: 15,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'role'],
        },
      ],
    });

    return {
      todayDate: todayStr,
      totalUsers,
      activeUsers,
      totalCategories,
      totalActiveSentences,
      lessonsStartedToday: lessonsTodayCount,
      lessonsCompletedToday: lessonsCompletedTodayCount,
      totalQuizAttempts,
      completedQuizAttempts,
      categoryContentAvailability: categories.map((c) => {
        const plain = c.toJSON();
        plain.sentenceCount = parseInt(plain.sentenceCount || '0', 10);
        return plain;
      }),
      recentActivity,
    };
  }

  // ==========================================
  // 2. User Management
  // ==========================================
  async getUsers(params: {
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 15;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (params.role) where.role = params.role;
    if (params.status) where.status = params.status;
    if (params.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${params.search}%` } },
        { email: { [Op.like]: `%${params.search}%` } },
      ];
    }

    const { rows: users, count: total } = await this.userModel.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      include: [UserSettings],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      users,
    };
  }

  async getUserDetail(userId: number) {
    const user = await this.userModel.findByPk(userId, {
      attributes: { exclude: ['password_hash'] },
      include: [UserSettings],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const totalLessons = await this.dailyLessonModel.count({ where: { user_id: userId } });
    const completedLessons = await this.dailyLessonModel.count({
      where: { user_id: userId, status: LessonStatus.COMPLETED },
    });
    const sentencesLearned = await this.progressModel.count({ where: { user_id: userId } });
    const quizAttempts = await this.quizAttemptModel.count({ where: { user_id: userId } });

    return {
      user,
      stats: {
        totalLessons,
        completedLessons,
        sentencesLearned,
        quizAttempts,
      },
    };
  }

  async updateUserStatus(userId: number, dto: UpdateUserStatusDto) {
    const user = await this.userModel.findByPk(userId);
    if (!user) throw new NotFoundException('User not found');

    user.status = dto.status;
    await user.save();

    await this.activityLogModel.create({
      user_id: userId,
      activity_type: 'ADMIN_UPDATED_USER_STATUS',
      details: { newStatus: dto.status },
    });

    return { message: `User status changed to ${dto.status}`, user: { id: user.id, status: user.status } };
  }

  async updateUserRole(userId: number, dto: UpdateUserRoleDto) {
    const user = await this.userModel.findByPk(userId);
    if (!user) throw new NotFoundException('User not found');

    user.role = dto.role;
    await user.save();

    await this.activityLogModel.create({
      user_id: userId,
      activity_type: 'ADMIN_UPDATED_USER_ROLE',
      details: { newRole: dto.role },
    });

    return { message: `User role changed to ${dto.role}`, user: { id: user.id, role: user.role } };
  }

  // ==========================================
  // 3. Category Management
  // ==========================================
  async getCategories() {
    const categories = await this.categoryModel.findAll({
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
      attributes: {
        include: [
          [
            Sequelize.literal(`(
              SELECT COUNT(*)
              FROM sentences AS s
              WHERE s.category_id = Category.id
            )`),
            'totalSentences',
          ],
          [
            Sequelize.literal(`(
              SELECT COUNT(*)
              FROM sentences AS s
              WHERE s.category_id = Category.id
                AND s.status = '${SentenceStatus.ACTIVE}'
            )`),
            'activeSentences',
          ],
        ],
      },
    });

    return categories.map((c) => {
      const p = c.toJSON();
      p.totalSentences = parseInt(p.totalSentences || '0', 10);
      p.activeSentences = parseInt(p.activeSentences || '0', 10);
      return p;
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.categoryModel.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`A category with slug '${dto.slug}' already exists`);
    }

    return this.categoryModel.create({
      name: dto.name.trim(),
      slug: dto.slug.trim().toLowerCase(),
      description: dto.description || '',
      icon: dto.icon || 'MessageCircle',
      sort_order: dto.sort_order || 0,
      status: dto.status || CategoryStatus.ACTIVE,
    });
  }

  async updateCategory(id: number, dto: UpdateCategoryDto) {
    const category = await this.categoryModel.findByPk(id);
    if (!category) throw new NotFoundException('Category not found');

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryModel.findOne({ where: { slug: dto.slug } });
      if (existing) {
        throw new ConflictException(`A category with slug '${dto.slug}' already exists`);
      }
      category.slug = dto.slug.trim().toLowerCase();
    }

    if (dto.name) category.name = dto.name.trim();
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.icon) category.icon = dto.icon;
    if (dto.sort_order !== undefined) category.sort_order = dto.sort_order;
    if (dto.status) category.status = dto.status;

    await category.save();
    return category;
  }

  async deleteCategory(id: number) {
    const category = await this.categoryModel.findByPk(id);
    if (!category) throw new NotFoundException('Category not found');

    // Safe deletion policy: check if sentences exist
    const sentenceCount = await this.sentenceModel.count({ where: { category_id: id } });
    if (sentenceCount > 0) {
      // Soft deactivate instead of crashing or cascade deleting history
      category.status = CategoryStatus.INACTIVE;
      await category.save();
      return {
        message: `Category deactivated rather than deleted because it contains ${sentenceCount} historical sentences.`,
        deactivated: true,
      };
    }

    await category.destroy();
    return { message: 'Category deleted successfully', deleted: true };
  }

  // ==========================================
  // 4. Sentence Management
  // ==========================================
  async getSentences(params: {
    search?: string;
    categoryId?: number;
    difficulty?: SentenceDifficulty;
    status?: SentenceStatus;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 15;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (params.categoryId) where.category_id = params.categoryId;
    if (params.difficulty) where.difficulty = params.difficulty;
    if (params.status) where.status = params.status;
    if (params.search) {
      where[Op.or] = [
        { word: { [Op.like]: `%${params.search}%` } },
        { word_meaning: { [Op.like]: `%${params.search}%` } },
        { english_text: { [Op.like]: `%${params.search}%` } },
        { malayalam_meaning: { [Op.like]: `%${params.search}%` } },
      ];
    }

    const { rows: sentences, count: total } = await this.sentenceModel.findAndCountAll({
      where,
      include: [Category],
      order: [['id', 'DESC']],
      limit,
      offset,
    });

    return {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      sentences,
    };
  }

  async createSentence(dto: CreateSentenceDto) {
    const category = await this.categoryModel.findByPk(dto.category_id);
    if (!category) throw new NotFoundException('Selected category does not exist');

    return this.sentenceModel.create({
      category_id: dto.category_id,
      word: dto.word.trim(),
      word_meaning: dto.word_meaning.trim(),
      english_text: dto.english_text.trim(),
      malayalam_meaning: dto.malayalam_meaning.trim(),
      usage_example: dto.usage_example ? dto.usage_example.trim() : null,
      difficulty: dto.difficulty || SentenceDifficulty.BEGINNER,
      audio_url: dto.audio_url || null,
      status: dto.status || SentenceStatus.ACTIVE,
    });
  }

  async updateSentence(id: number, dto: UpdateSentenceDto) {
    const sentence = await this.sentenceModel.findByPk(id);
    if (!sentence) throw new NotFoundException('Sentence not found');

    if (dto.category_id) {
      const category = await this.categoryModel.findByPk(dto.category_id);
      if (!category) throw new NotFoundException('Category does not exist');
      sentence.category_id = dto.category_id;
    }

    if (dto.word) sentence.word = dto.word.trim();
    if (dto.word_meaning) sentence.word_meaning = dto.word_meaning.trim();
    if (dto.english_text) sentence.english_text = dto.english_text.trim();
    if (dto.malayalam_meaning) sentence.malayalam_meaning = dto.malayalam_meaning.trim();
    if (dto.usage_example !== undefined) sentence.usage_example = dto.usage_example;
    if (dto.difficulty) sentence.difficulty = dto.difficulty;
    if (dto.audio_url !== undefined) sentence.audio_url = dto.audio_url;
    if (dto.status) sentence.status = dto.status;

    await sentence.save();
    return sentence;
  }

  async deleteSentence(id: number) {
    const sentence = await this.sentenceModel.findByPk(id);
    if (!sentence) throw new NotFoundException('Sentence not found');

    // Check if referenced in historical lessons
    const refCount = await this.lessonSentenceModel.count({ where: { sentence_id: id } });
    if (refCount > 0) {
      // Safe deactivation to preserve immutable history
      sentence.status = SentenceStatus.INACTIVE;
      await sentence.save();
      return {
        message: `Sentence has been deactivated to preserve ${refCount} historical lesson records.`,
        deactivated: true,
      };
    }

    await sentence.destroy();
    return { message: 'Sentence deleted successfully', deleted: true };
  }

  // ==========================================
  // 5. CSV Bulk Import with Validation & Duplicates
  // ==========================================
  async bulkImportSentences(dto: BulkImportSentencesDto) {
    const allCategories = await this.categoryModel.findAll();
    const categoryMap = new Map<string, number>();
    allCategories.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
      categoryMap.set(cat.slug.toLowerCase().trim(), cat.id);
    });

    const validRows: any[] = [];
    const duplicateRows: any[] = [];
    const errorRows: { rowNumber: number; reason: string; row: any }[] = [];

    // Pre-load all existing English text lowercased for duplicate check
    const existingSentences = await this.sentenceModel.findAll({
      attributes: ['english_text'],
    });
    const existingSet = new Set(
      existingSentences.map((s) => s.english_text.toLowerCase().trim()),
    );

    for (let i = 0; i < dto.rows.length; i++) {
      const row = dto.rows[i];
      const rowNum = i + 1;

      if (!row.english_text || !row.english_text.trim()) {
        errorRows.push({ rowNumber: rowNum, reason: 'Missing English text', row });
        continue;
      }
      if (!row.malayalam_meaning || !row.malayalam_meaning.trim()) {
        errorRows.push({ rowNumber: rowNum, reason: 'Missing Malayalam meaning', row });
        continue;
      }

      const catIdentifier = (row.category_name_or_slug || '').toLowerCase().trim();
      const categoryId = categoryMap.get(catIdentifier);
      if (!categoryId) {
        errorRows.push({
          rowNumber: rowNum,
          reason: `Category '${row.category_name_or_slug}' not recognized`,
          row,
        });
        continue;
      }

      const normalizedEnglish = row.english_text.trim().toLowerCase();
      if (existingSet.has(normalizedEnglish)) {
        duplicateRows.push({
          rowNumber: rowNum,
          english_text: row.english_text,
          reason: 'Sentence already exists in database',
        });
        continue;
      }

      validRows.push({
        category_id: categoryId,
        word: (row.word || '').trim(),
        word_meaning: (row.word_meaning || '').trim(),
        english_text: row.english_text.trim(),
        malayalam_meaning: row.malayalam_meaning.trim(),
        usage_example: row.usage_example ? row.usage_example.trim() : null,
        difficulty: row.difficulty || SentenceDifficulty.BEGINNER,
        audio_url: row.audio_url || null,
        status: SentenceStatus.ACTIVE,
      });

      // Avoid self-duplicates within the batch
      existingSet.add(normalizedEnglish);
    }

    // If preview mode, return validation report without database write
    if (dto.previewOnly) {
      return {
        previewOnly: true,
        totalSubmitted: dto.rows.length,
        validCount: validRows.length,
        duplicateCount: duplicateRows.length,
        errorCount: errorRows.length,
        validRows: validRows.slice(0, 10), // sample preview
        duplicateRows,
        errorRows,
      };
    }

    // Commit to database
    if (validRows.length > 0) {
      await this.sentenceModel.bulkCreate(validRows);
    }

    return {
      committed: true,
      totalSubmitted: dto.rows.length,
      importedCount: validRows.length,
      duplicateCount: duplicateRows.length,
      errorCount: errorRows.length,
      duplicateRows,
      errorRows,
    };
  }

  // ==========================================
  // 6. Lesson Inspection
  // ==========================================
  async getLessons(params: {
    userId?: number;
    date?: string;
    status?: LessonStatus;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 15;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (params.userId) where.user_id = params.userId;
    if (params.date) where.lesson_date = params.date;
    if (params.status) where.status = params.status;

    const { rows: lessons, count: total } = await this.dailyLessonModel.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
        {
          association: 'sentences',
          include: [{ association: 'sentence' }],
        },
      ],
      order: [['lesson_date', 'DESC']],
      limit,
      offset,
    });

    return {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      lessons,
    };
  }

  // ==========================================
  // 7. Quiz Inspection
  // ==========================================
  async getQuizzes(params: {
    userId?: number;
    date?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 15;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (params.userId) where.user_id = params.userId;
    if (params.date) where.quiz_date = params.date;

    const { rows: quizzes, count: total } = await this.quizAttemptModel.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
        {
          model: QuizAnswer,
          include: [Sentence],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      quizzes,
    };
  }

  // ==========================================
  // 8. System Activity Logs
  // ==========================================
  async getActivityLogs(params: {
    userId?: number;
    activityType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (params.userId) where.user_id = params.userId;
    if (params.activityType) where.activity_type = params.activityType;

    const { rows: logs, count: total } = await this.activityLogModel.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'role'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      logs,
    };
  }
}
