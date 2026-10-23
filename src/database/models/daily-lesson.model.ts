import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './user.model';
import { DailyLessonSentence } from './daily-lesson-sentence.model';
import { QuizAttempt } from './quiz-attempt.model';

export enum LessonStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Table({
  tableName: 'daily_lessons',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'lesson_date'],
    },
    { fields: ['lesson_date'] },
    { fields: ['status'] },
  ],
})
export class DailyLesson extends Model {
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
  lesson_date: string; // YYYY-MM-DD

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 5,
  })
  target_count: number;

  @Column({
    type: DataType.ENUM(...Object.values(LessonStatus)),
    defaultValue: LessonStatus.IN_PROGRESS,
    allowNull: false,
  })
  status: LessonStatus;

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

  @HasMany(() => DailyLessonSentence, { foreignKey: 'daily_lesson_id', onDelete: 'CASCADE' })
  sentences: DailyLessonSentence[];

  @HasMany(() => QuizAttempt, { foreignKey: 'source_lesson_id', onDelete: 'SET NULL' })
  quizzes: QuizAttempt[];
}
