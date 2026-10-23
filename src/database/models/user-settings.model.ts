import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';

@Table({
  tableName: 'user_settings',
  timestamps: true,
  underscored: true,
})
export class UserSettings extends Model {
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
    unique: true,
  })
  user_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 5,
    validate: {
      isIn: [[5, 10, 20, 30]],
    },
  })
  daily_target: number;

  @Column({
    type: DataType.STRING(64),
    allowNull: false,
    defaultValue: 'Asia/Kolkata',
  })
  timezone: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  notifications_enabled: boolean;

  @BelongsTo(() => User)
  user: User;
}
