import { Sequelize } from 'sequelize-typescript';
import * as fs from 'fs';
import * as path from 'path';
import { Category, CategoryStatus } from '../models/category.model';
import { Sentence, SentenceDifficulty, SentenceStatus } from '../models/sentence.model';
import { DailyLesson, LessonStatus } from '../models/daily-lesson.model';
import { DailyLessonSentence, LessonSentenceStatus } from '../models/daily-lesson-sentence.model';
import { UserSentenceProgress } from '../models/user-sentence-progress.model';
import { QuizAttempt, QuizAttemptStatus, QuizType } from '../models/quiz-attempt.model';
import { QuizAnswer, QuizQuestionType } from '../models/quiz-answer.model';
import { Favorite } from '../models/favorite.model';
import { User } from '../models/user.model';
import { databaseModels } from '../models';
import { getYesterdayDateString, getLocalizedDateString } from '../../common/utils/date.utils';
import { INITIAL_CATEGORIES } from '../../common/constants/app.constants';

export interface WordSentenceSeed {
  word: string;
  wordMeaning: string;
  englishText: string;
  malayalamMeaning: string;
  usageExample: string;
  difficulty: SentenceDifficulty;
}

/**
 * Loads vocabulary datasets across all 14 categories from the modular JSON files.
 * Each file contains exactly 300 curated everyday words, meanings, contextual sentences,
 * Malayalam translations, and difficulty tiers (BEGINNER -> INTERMEDIATE -> ADVANCED).
 */
export function loadAllVocabularyData(): Record<string, WordSentenceSeed[]> {
  const result: Record<string, WordSentenceSeed[]> = {};
  
  // Resolve category data directory
  const candidatePaths = [
    path.join(__dirname, '../data/categories'),
    path.join(process.cwd(), 'src/database/data/categories'),
    path.join(process.cwd(), 'backend/src/database/data/categories'),
  ];

  let dataDir = '';
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      dataDir = candidate;
      break;
    }
  }

  if (!dataDir) {
    console.error('❌ Could not locate categories data directory in candidate paths:', candidatePaths);
    return result;
  }

  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const slug = file.replace('.json', '');
    const filePath = path.join(dataDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const items: WordSentenceSeed[] = JSON.parse(content);
      result[slug] = items;
    } catch (err: any) {
      console.error(`⚠️ Failed to parse category data for ${slug} from ${filePath}:`, err.message);
    }
  }

  return result;
}

export const VOCABULARY_DATA: Record<string, WordSentenceSeed[]> = loadAllVocabularyData();

export async function seedCategorizedSentences(existingSequelize?: Sequelize) {
  console.log('🌱 Starting Vocabulary & Sentence Seeder across all 14 categories...');

  let sequelize = existingSequelize;
  let isStandalone = false;

  if (!sequelize) {
    isStandalone = true;
    sequelize = new Sequelize({
      dialect: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'padikam_db',
      models: databaseModels,
      logging: false,
      define: {
        timestamps: true,
        underscored: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      },
    });

    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('✅ Connected to database for standalone vocabulary seeding');
  } else {
    console.log('✅ Reusing active database connection for vocabulary seeding');
  }

  // Clear existing sentence lessons & test data to ensure clean word-based state
  try {
    await QuizAnswer.destroy({ where: {} });
    await QuizAttempt.destroy({ where: {} });
    await UserSentenceProgress.destroy({ where: {} });
    await DailyLessonSentence.destroy({ where: {} });
    await DailyLesson.destroy({ where: {} });
    await Favorite.destroy({ where: {} });
    await Sentence.destroy({ where: {} });
    console.log('🧹 Cleaned existing synthetic sentences & history.');
  } catch (err: any) {
    console.log('ℹ️ Clean note:', err.message);
  }

  // Ensure all 14 categories exist
  const categoryMap = new Map<string, Category>();
  for (let i = 0; i < INITIAL_CATEGORIES.length; i++) {
    const catData = INITIAL_CATEGORIES[i];
    const [category] = await Category.findOrCreate({
      where: { slug: catData.slug },
      defaults: {
        name: catData.name,
        slug: catData.slug,
        icon: catData.icon,
        description: catData.description,
        sort_order: i + 1,
        status: CategoryStatus.ACTIVE,
      },
    });
    categoryMap.set(catData.slug, category);
  }

  // Reload vocabulary data if not loaded or empty
  let vocabData = VOCABULARY_DATA;
  if (!vocabData || Object.keys(vocabData).length === 0) {
    vocabData = loadAllVocabularyData();
  }

  // Insert words & sentences per category
  let totalSeeded = 0;
  for (const [slug, items] of Object.entries(vocabData)) {
    const cat = categoryMap.get(slug);
    if (!cat) {
      console.warn(`⚠️ Category '${slug}' not found in database, skipping.`);
      continue;
    }

    const rows = items.map((item) => ({
      category_id: cat.id,
      word: item.word,
      word_meaning: item.wordMeaning,
      english_text: item.englishText,
      malayalam_meaning: item.malayalamMeaning,
      usage_example: item.usageExample,
      difficulty: item.difficulty,
      status: SentenceStatus.ACTIVE,
    }));

    await Sentence.bulkCreate(rows);
    totalSeeded += rows.length;
    console.log(`   ✓ ${cat.name}: Seeded ${rows.length} vocabulary words with sentences.`);
  }

  console.log(`\n✅ Total Seeded: ${totalSeeded} authentic words and sentences across ${Object.keys(vocabData).length} categories.`);

  // Seed sample lessons for demo accounts
  const learner = await User.findOne({ where: { email: 'learner@padikam.com' } });
  const admin = await User.findOne({ where: { email: 'admin@padikam.com' } });
  const targetUsers = [learner, admin].filter(Boolean) as User[];

  const todayStr = getLocalizedDateString('Asia/Kolkata');
  const yesterdayStr = getYesterdayDateString('Asia/Kolkata');

  const sampleSentences = await Sentence.findAll({
    where: { difficulty: SentenceDifficulty.BEGINNER },
    limit: 15,
  });

  if (sampleSentences.length >= 10 && targetUsers.length > 0) {
    for (const user of targetUsers) {
      // 1. Create yesterday's completed lesson with 5 words
      const yesterdayLesson = await DailyLesson.create({
        user_id: user.id,
        lesson_date: yesterdayStr,
        target_count: 5,
        status: LessonStatus.COMPLETED,
        started_at: new Date(Date.now() - 28 * 60 * 60 * 1000),
        completed_at: new Date(Date.now() - 26 * 60 * 60 * 1000),
      });

      for (let pos = 1; pos <= 5; pos++) {
        const s = sampleSentences[pos - 1];
        await DailyLessonSentence.create({
          daily_lesson_id: yesterdayLesson.id,
          sentence_id: s.id,
          position: pos,
          status: LessonSentenceStatus.LEARNED,
          word_snapshot: s.word,
          word_meaning_snapshot: s.word_meaning,
          english_text_snapshot: s.english_text,
          malayalam_meaning_snapshot: s.malayalam_meaning,
          learned_at: new Date(Date.now() - 26 * 60 * 60 * 1000),
        });

        await UserSentenceProgress.create({
          user_id: user.id,
          sentence_id: s.id,
          times_reviewed: 1,
          correct_count: 1,
          incorrect_count: 0,
          difficulty_rating: 1,
          last_reviewed_at: new Date(),
          next_review_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
      }

      // 2. Create today's active lesson with 5 new words
      const todayLesson = await DailyLesson.create({
        user_id: user.id,
        lesson_date: todayStr,
        target_count: 5,
        status: LessonStatus.IN_PROGRESS,
        started_at: new Date(),
      });

      for (let pos = 1; pos <= 5; pos++) {
        const s = sampleSentences[pos + 4];
        await DailyLessonSentence.create({
          daily_lesson_id: todayLesson.id,
          sentence_id: s.id,
          position: pos,
          status: LessonSentenceStatus.PENDING,
          word_snapshot: s.word,
          word_meaning_snapshot: s.word_meaning,
          english_text_snapshot: s.english_text,
          malayalam_meaning_snapshot: s.malayalam_meaning,
        });
      }

      // 3. Create completed quiz for yesterday's words
      const attempt = await QuizAttempt.create({
        user_id: user.id,
        quiz_date: yesterdayStr,
        quiz_type: QuizType.YESTERDAY_QUIZ,
        source_lesson_id: yesterdayLesson.id,
        score: 100,
        total_questions: 5,
        correct_answers: 5,
        status: QuizAttemptStatus.COMPLETED,
        started_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        completed_at: new Date(Date.now() - 23 * 60 * 60 * 1000),
      });

      for (let q = 0; q < 5; q++) {
        const s = sampleSentences[q];
        await QuizAnswer.create({
          quiz_attempt_id: attempt.id,
          sentence_id: s.id,
          question_type: QuizQuestionType.MEANING_MCQ,
          question_data: {
            question: `What is the Malayalam meaning of the new word: "${s.word}"?`,
            prompt: s.word,
            options: [s.word_meaning, 'മറ്റൊരു അർത്ഥം', 'സാധാരണ വാക്ക്', 'ലളിതമായ കാര്യം'],
            solution: s.word_meaning,
            explanation: `"${s.word}" means "${s.word_meaning}".`,
          },
          selected_answer: s.word_meaning,
          is_correct: true,
          explanation: `"${s.word}" means "${s.word_meaning}".`,
        });
      }

      // 4. Save a favorite item
      await Favorite.findOrCreate({
        where: { user_id: user.id, sentence_id: sampleSentences[0].id },
        defaults: { user_id: user.id, sentence_id: sampleSentences[0].id },
      });
    }
    console.log('✅ Sample daily lessons and quizzes initialized for demo accounts.');
  }

  if (isStandalone) {
    await sequelize.close();
  }
  console.log('\n🎉 Real Word-Based Sentences & Quiz Seeding completed successfully!');
}

if (require.main === module) {
  seedCategorizedSentences().catch((err) => {
    console.error('❌ Seeder execution error:', err);
    process.exit(1);
  });
}
