import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './user.model';
import { DailyLesson } from './daily-lesson.model';
import { QuizAnswer } from './quiz-answer.model';

export enum QuizType {
  YESTERDAY_QUIZ = 'YESTERDAY_QUIZ',
  CATEGORY_QUIZ = 'CATEGORY_QUIZ',
  PRACTICE_QUIZ = 'PRACTICE_QUIZ',
}

export enum QuizAttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Table({
  tableName: 'quiz_attempts',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id', 'quiz_date'] },
    { fields: ['status'] },
  ],
})
export class QuizAttempt extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  user_id: number;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  quiz_date: string;

  @Column({
    type: DataType.ENUM(...Object.values(QuizType)),
    defaultValue: QuizType.YESTERDAY_QUIZ,
    allowNull: false,
  })
  quiz_type: QuizType;

  @ForeignKey(() => DailyLesson)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  source_lesson_id: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    allowNull: false,
  })
  score: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    allowNull: false,
  })
  total_questions: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    allowNull: false,
  })
  correct_answers: number;

  @Column({
    type: DataType.ENUM(...Object.values(QuizAttemptStatus)),
    defaultValue: QuizAttemptStatus.IN_PROGRESS,
    allowNull: false,
  })
  status: QuizAttemptStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  started_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  completed_at: Date;

  @BelongsTo(() => User, 'user_id')
  user: User;

  @BelongsTo(() => DailyLesson, 'source_lesson_id')
  lesson: DailyLesson;

  @HasMany(() => QuizAnswer, { foreignKey: 'quiz_attempt_id', onDelete: 'CASCADE' })
  answers: QuizAnswer[];
}
