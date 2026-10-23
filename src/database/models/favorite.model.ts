import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';
import { Sentence } from './sentence.model';

@Table({
  tableName: 'favorites',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'sentence_id'],
    },
  ],
})
export class Favorite extends Model {
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

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Sentence)
  sentence: Sentence;
}
