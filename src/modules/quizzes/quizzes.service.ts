import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { QuizAttempt, QuizType, QuizAttemptStatus } from '../../database/models/quiz-attempt.model';
import { QuizAnswer, QuizQuestionType } from '../../database/models/quiz-answer.model';
import { DailyLesson } from '../../database/models/daily-lesson.model';
import { DailyLessonSentence } from '../../database/models/daily-lesson-sentence.model';
import { Sentence, SentenceStatus } from '../../database/models/sentence.model';
import { UserSettings } from '../../database/models/user-settings.model';
import { ActivityLog } from '../../database/models/activity-log.model';
import { UserSentenceProgress } from '../../database/models/user-sentence-progress.model';
import { getYesterdayDateString, getLocalizedDateString } from '../../common/utils/date.utils';
import { DEFAULT_TIMEZONE } from '../../common/constants/app.constants';
import { SubmitAnswerDto, CompleteAttemptDto } from './dto/quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectModel(QuizAttempt)
    private quizAttemptModel: typeof QuizAttempt,
    @InjectModel(QuizAnswer)
    private quizAnswerModel: typeof QuizAnswer,
    @InjectModel(DailyLesson)
    private dailyLessonModel: typeof DailyLesson,
    @InjectModel(Sentence)
    private sentenceModel: typeof Sentence,
    @InjectModel(UserSettings)
    private userSettingsModel: typeof UserSettings,
    @InjectModel(ActivityLog)
    private activityLogModel: typeof ActivityLog,
    @InjectModel(UserSentenceProgress)
    private progressModel: typeof UserSentenceProgress,
    private sequelize: Sequelize,
  ) {}

  /**
   * Generates or fetches yesterday's quiz for the user.
   */
  async getYesterdayQuiz(userId: number) {
    const settings = await this.userSettingsModel.findOne({ where: { user_id: userId } });
    const timeZone = settings?.timezone || DEFAULT_TIMEZONE;
    const yesterdayStr = getYesterdayDateString(timeZone);

    // 1. Find yesterday's daily lesson
    const yesterdayLesson = await this.dailyLessonModel.findOne({
      where: { user_id: userId, lesson_date: yesterdayStr },
      include: [
        {
          association: 'sentences',
          include: [{ association: 'sentence' }],
        },
      ],
    });

    if (!yesterdayLesson || !yesterdayLesson.sentences || yesterdayLesson.sentences.length === 0) {
      return {
        available: false,
        message: 'No lesson completed yesterday. Try a practice quiz or revise your favorites!',
        date: yesterdayStr,
      };
    }

    // 2. Check for recent in-progress attempt or create a new attempt
    let attempt = await this.quizAttemptModel.findOne({
      where: {
        user_id: userId,
        quiz_date: yesterdayStr,
        source_lesson_id: yesterdayLesson.id,
        status: QuizAttemptStatus.IN_PROGRESS,
      },
      include: [QuizAnswer],
    });

    if (!attempt) {
      attempt = await this.createQuizAttempt(
        userId,
        yesterdayStr,
        yesterdayLesson.id,
        yesterdayLesson.sentences,
        QuizType.YESTERDAY_QUIZ,
      );
    }

    return this.formatQuizForClient(attempt);
  }

  /**
   * Submit an answer to a question in an active quiz.
   */
  async submitAnswer(userId: number, dto: SubmitAnswerDto) {
    const attempt = await this.quizAttemptModel.findOne({
      where: { id: dto.attemptId, user_id: userId },
    });

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found.');
    }

    if (attempt.status === QuizAttemptStatus.COMPLETED) {
      throw new BadRequestException('This quiz attempt is already completed.');
    }

    const answer = await this.quizAnswerModel.findOne({
      where: { id: dto.answerId, quiz_attempt_id: attempt.id },
      include: [Sentence],
    });

    if (!answer) {
      throw new NotFoundException('Question not found in this attempt.');
    }

    const qData = answer.question_data;
    const expected = (qData.solution || '').trim().toLowerCase();
    const actual = (dto.selectedAnswer || '').trim().toLowerCase();

    // Check correctness
    const isCorrect = expected === actual;

    answer.selected_answer = dto.selectedAnswer;
    answer.is_correct = isCorrect;
    answer.explanation = qData.explanation || `The correct meaning is: "${qData.solution}"`;
    await answer.save();

    // Update user sentence progress stats
    if (answer.sentence_id) {
      let progress = await this.progressModel.findOne({
        where: { user_id: userId, sentence_id: answer.sentence_id },
      });
      if (progress) {
        if (isCorrect) {
          progress.correct_count += 1;
        } else {
          progress.incorrect_count += 1;
        }
        await progress.save();
      }
    }

    return {
      answerId: answer.id,
      isCorrect,
      correctAnswer: qData.solution,
      explanation: answer.explanation,
    };
  }

  /**
   * Finalize and score a quiz attempt.
   */
  async completeAttempt(userId: number, dto: CompleteAttemptDto) {
    const attempt = await this.quizAttemptModel.findOne({
      where: { id: dto.attemptId, user_id: userId },
      include: [
        {
          model: QuizAnswer,
          include: [Sentence],
        },
      ],
    });

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found.');
    }

    const totalQuestions = attempt.answers.length;
    const correctCount = attempt.answers.filter((a) => a.is_correct).length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    attempt.status = QuizAttemptStatus.COMPLETED;
    attempt.total_questions = totalQuestions;
    attempt.correct_answers = correctCount;
    attempt.score = score;
    attempt.completed_at = new Date();
    await attempt.save();

    await this.activityLogModel.create({
      user_id: userId,
      activity_type: 'QUIZ_COMPLETED',
      details: {
        attemptId: attempt.id,
        score,
        correctCount,
        totalQuestions,
      },
    });

    return {
      attemptId: attempt.id,
      score,
      correctAnswers: correctCount,
      totalQuestions,
      status: attempt.status,
      completedAt: attempt.completed_at,
      breakdown: attempt.answers.map((ans) => ({
        id: ans.id,
        questionType: ans.question_type,
        englishText: ans.sentence?.english_text || ans.question_data?.prompt,
        selectedAnswer: ans.selected_answer,
        correctAnswer: ans.question_data?.solution,
        isCorrect: ans.is_correct,
        explanation: ans.explanation,
      })),
    };
  }

  /**
   * Get user quiz history.
   */
  async getQuizHistory(userId: number) {
    return this.quizAttemptModel.findAll({
      where: { user_id: userId, status: QuizAttemptStatus.COMPLETED },
      order: [['completed_at', 'DESC']],
      limit: 30,
    });
  }

  // --- Helper Methods ---

  private async createQuizAttempt(
    userId: number,
    quizDate: string,
    sourceLessonId: number,
    lessonSentences: DailyLessonSentence[],
    quizType: QuizType,
  ) {
    // Collect all distractors from active sentences
    const allDistractors = await this.sentenceModel.findAll({
      where: { status: SentenceStatus.ACTIVE },
      attributes: ['id', 'word', 'word_meaning', 'english_text', 'malayalam_meaning'],
      order: Sequelize.literal('RAND()'),
      limit: 40,
    });

    const transaction = await this.sequelize.transaction();
    try {
      const attempt = await this.quizAttemptModel.create(
        {
          user_id: userId,
          quiz_date: quizDate,
          quiz_type: quizType,
          source_lesson_id: sourceLessonId,
          status: QuizAttemptStatus.IN_PROGRESS,
          started_at: new Date(),
          total_questions: lessonSentences.length,
        },
        { transaction },
      );

      // Question types cycle across the sentences
      const questionTypes = [
        QuizQuestionType.MEANING_MCQ,
        QuizQuestionType.FILL_BLANK,
        QuizQuestionType.WORD_ORDER,
        QuizQuestionType.MATCHING,
      ];

      for (let i = 0; i < lessonSentences.length; i++) {
        const ls = lessonSentences[i];
        const sentence = ls.sentence;
        const qType = questionTypes[i % questionTypes.length];

        const questionData = this.buildQuestion(sentence, qType, allDistractors);

        await this.quizAnswerModel.create(
          {
            quiz_attempt_id: attempt.id,
            sentence_id: sentence.id,
            question_type: qType,
            question_data: questionData,
            is_correct: false,
          },
          { transaction },
        );
      }

      await transaction.commit();

      return this.quizAttemptModel.findByPk(attempt.id, {
        include: [QuizAnswer],
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  private buildQuestion(
    sentence: Sentence,
    type: QuizQuestionType,
    distractorPool: Sentence[],
  ) {
    const word = sentence.word || '';
    const wordMeaning = sentence.word_meaning || '';
    const english = sentence.english_text;
    const malayalam = sentence.malayalam_meaning;

    if (type === QuizQuestionType.MEANING_MCQ) {
      // Test word meaning with 3 distractor word meanings
      const distractors = distractorPool
        .filter((d) => d.id !== sentence.id && d.word_meaning && d.word_meaning !== wordMeaning)
        .slice(0, 3)
        .map((d) => d.word_meaning);

      const options = [wordMeaning, ...distractors].sort(() => Math.random() - 0.5);

      return {
        prompt: word,
        question: `What is the Malayalam meaning of the new word: "${word}"?`,
        meaning: `Used in sentence: "${english}"`,
        options,
        solution: wordMeaning,
        explanation: `"${word}" means "${wordMeaning}". Example: "${english}" (${malayalam})`,
      };
    }

    if (type === QuizQuestionType.FILL_BLANK) {
      // Hide the target word in the sentence
      const targetWord = word || english.split(' ')[0].replace(/[^a-zA-Z]/g, '');
      const regex = new RegExp(`\\b${targetWord}\\b`, 'i');
      const promptWithBlank = regex.test(english)
        ? english.replace(regex, '______')
        : `${english} (Word: ______)`;

      // Distractor words
      const distractorOptions = distractorPool
        .filter((d) => d.id !== sentence.id && d.word && d.word.toLowerCase() !== targetWord.toLowerCase())
        .slice(0, 3)
        .map((d) => d.word);

      // Fallback distractors if pool is small
      const fallbackWords = ['always', 'today', 'really', 'together', 'important', 'already'];
      while (distractorOptions.length < 3) {
        const fw = fallbackWords[distractorOptions.length];
        if (fw.toLowerCase() !== targetWord.toLowerCase()) distractorOptions.push(fw);
      }

      const options = [targetWord, ...distractorOptions].sort(() => Math.random() - 0.5);

      return {
        prompt: promptWithBlank,
        question: `Complete the sentence with the learned word: "${promptWithBlank}"`,
        meaning: `Meaning (${word}): ${wordMeaning || malayalam}`,
        options,
        solution: targetWord,
        explanation: `The correct word is "${targetWord}" (${wordMeaning}). Full sentence: "${english}" (${malayalam}).`,
      };
    }

    if (type === QuizQuestionType.WORD_ORDER) {
      // Shuffled words
      const words = english.split(' ');
      const shuffledChips = [...words].sort(() => Math.random() - 0.5);

      return {
        prompt: malayalam,
        question: `Arrange the English words for: "${malayalam}" (Target word: ${word})`,
        chips: shuffledChips,
        solution: english,
        explanation: `The correct sentence is: "${english}" (${malayalam}).`,
      };
    }

    // Default to Matching: Sentence to Malayalam meaning
    const distractors = distractorPool
      .filter((d) => d.id !== sentence.id && d.malayalam_meaning !== malayalam)
      .slice(0, 3)
      .map((d) => d.malayalam_meaning);

    const options = [malayalam, ...distractors].sort(() => Math.random() - 0.5);

    return {
      prompt: english,
      question: `Select the correct translation: "${english}"`,
      meaning: `Word: ${word} - ${wordMeaning}`,
      options,
      solution: malayalam,
      explanation: `"${english}" means "${malayalam}". Key word learned: "${word}" (${wordMeaning}).`,
    };
  }

  private formatQuizForClient(attempt: QuizAttempt) {
    return {
      available: true,
      attemptId: attempt.id,
      date: attempt.quiz_date,
      type: attempt.quiz_type,
      status: attempt.status,
      totalQuestions: attempt.answers?.length || 0,
      // Strictly OMIT correct solution from output to prevent cheating!
      questions: (attempt.answers || []).map((ans) => ({
        id: ans.id,
        questionType: ans.question_type,
        question: ans.question_data?.question,
        prompt: ans.question_data?.prompt,
        meaning: ans.question_data?.meaning,
        options: ans.question_data?.options,
        chips: ans.question_data?.chips,
        isAnswered: !!ans.selected_answer,
        selectedAnswer: ans.selected_answer,
      })),
    };
  }
}
