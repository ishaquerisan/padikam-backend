import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { DailyLesson } from './daily-lesson.model';
import { Sentence } from './sentence.model';

export enum LessonSentenceStatus {
  PENDING = 'PENDING',
  LEARNED = 'LEARNED',
}

@Table({
  tableName: 'daily_lesson_sentences',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['daily_lesson_id', 'sentence_id'],
    },
    {
      unique: true,
      fields: ['daily_lesson_id', 'position'],
    },
    { fields: ['status'] },
  ],
})
export class DailyLessonSentence extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => DailyLesson)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  daily_lesson_id: number;

  @ForeignKey(() => Sentence)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  sentence_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  position: number;

  @Column({
    type: DataType.ENUM(...Object.values(LessonSentenceStatus)),
    defaultValue: LessonSentenceStatus.PENDING,
    allowNull: false,
  })
  status: LessonSentenceStatus;

  @Column({
    type: DataType.STRING(150),
    allowNull: true,
  })
  word_snapshot: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  word_meaning_snapshot: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  english_text_snapshot: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  malayalam_meaning_snapshot: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  learned_at: Date;

  @BelongsTo(() => DailyLesson, 'daily_lesson_id')
  lesson: DailyLesson;

  @BelongsTo(() => Sentence, 'sentence_id')
  sentence: Sentence;
}
