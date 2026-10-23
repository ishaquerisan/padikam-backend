import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';

@Table({
  tableName: 'activity_logs',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id', 'activity_type'] },
    { fields: ['created_at'] },
  ],
})
export class ActivityLog extends Model {
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
    type: DataType.STRING(80),
    allowNull: false,
  })
  activity_type: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  details: any;

  @BelongsTo(() => User)
  user: User;
}
