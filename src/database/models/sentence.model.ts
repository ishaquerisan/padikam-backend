import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Category } from './category.model';
import { DailyLessonSentence } from './daily-lesson-sentence.model';
import { UserSentenceProgress } from './user-sentence-progress.model';
import { Favorite } from './favorite.model';

export enum SentenceDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum SentenceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Table({
  tableName: 'sentences',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['category_id'] },
    { fields: ['status'] },
    { fields: ['difficulty'] },
    { fields: ['word'] },
  ],
})
export class Sentence extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => Category)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  category_id: number;

  @Column({
    type: DataType.STRING(150),
    allowNull: false,
  })
  word: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  word_meaning: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  english_text: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  malayalam_meaning: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  usage_example: string;

  @Column({
    type: DataType.ENUM(...Object.values(SentenceDifficulty)),
    defaultValue: SentenceDifficulty.BEGINNER,
    allowNull: false,
  })
  difficulty: SentenceDifficulty;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  audio_url: string;

  @Column({
    type: DataType.ENUM(...Object.values(SentenceStatus)),
    defaultValue: SentenceStatus.ACTIVE,
    allowNull: false,
  })
  status: SentenceStatus;

  @BelongsTo(() => Category, 'category_id')
  category: Category;

  @HasMany(() => DailyLessonSentence, { foreignKey: 'sentence_id', onDelete: 'RESTRICT' })
  lessonSentences: DailyLessonSentence[];

  @HasMany(() => UserSentenceProgress, { foreignKey: 'sentence_id', onDelete: 'CASCADE' })
  progress: UserSentenceProgress[];

  @HasMany(() => Favorite, { foreignKey: 'sentence_id', onDelete: 'CASCADE' })
  favorites: Favorite[];
}
