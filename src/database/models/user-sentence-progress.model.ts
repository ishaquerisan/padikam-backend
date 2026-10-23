import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';
import { Sentence } from './sentence.model';

@Table({
  tableName: 'user_sentence_progress',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'sentence_id'],
    },
    { fields: ['next_review_at'] },
  ],
})
export class UserSentenceProgress extends Model {
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

  @ForeignKey(() => Sentence)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  sentence_id: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    allowNull: false,
  })
  times_reviewed: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    allowNull: false,
  })
  correct_count: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    allowNull: false,
  })
  incorrect_count: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
    allowNull: false,
  })
  difficulty_rating: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  last_reviewed_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  next_review_at: Date;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Sentence)
  sentence: Sentence;
}
