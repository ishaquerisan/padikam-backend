import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { QuizAttempt } from './quiz-attempt.model';
import { Sentence } from './sentence.model';

export enum QuizQuestionType {
  MEANING_MCQ = 'MEANING_MCQ',
  MATCHING = 'MATCHING',
  FILL_BLANK = 'FILL_BLANK',
  WORD_ORDER = 'WORD_ORDER',
}

@Table({
  tableName: 'quiz_answers',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['quiz_attempt_id'] },
    { fields: ['sentence_id'] },
  ],
})
export class QuizAnswer extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => QuizAttempt)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  quiz_attempt_id: number;

  @ForeignKey(() => Sentence)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  sentence_id: number;

  @Column({
    type: DataType.STRING(64),
    allowNull: false,
    defaultValue: QuizQuestionType.MEANING_MCQ,
  })
  question_type: string;

  @Column({
    type: DataType.JSON,
    allowNull: false,
  })
  question_data: any;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  selected_answer: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  })
  is_correct: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  explanation: string;

  @BelongsTo(() => QuizAttempt, 'quiz_attempt_id')
  attempt: QuizAttempt;

  @BelongsTo(() => Sentence, 'sentence_id')
  sentence: Sentence;
}
