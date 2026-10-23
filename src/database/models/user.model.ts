import { Table, Column, Model, DataType, HasOne, HasMany } from 'sequelize-typescript';
import { UserSettings } from './user-settings.model';
import { UserCategory } from './user-category.model';
import { DailyLesson } from './daily-lesson.model';
import { UserSentenceProgress } from './user-sentence-progress.model';
import { QuizAttempt } from './quiz-attempt.model';
import { Favorite } from './favorite.model';
import { ActivityLog } from './activity-log.model';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Table({
  tableName: 'users',
  timestamps: true,
  underscored: true,
})
export class User extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.STRING(120),
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING(180),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  })
  email: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  password_hash: string;

  @Column({
    type: DataType.STRING(128),
    allowNull: true,
  })
  firebase_uid: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  avatar_url: string;

  @Column({
    type: DataType.ENUM('local', 'google'),
    defaultValue: 'local',
    allowNull: false,
  })
  auth_provider: string;

  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    defaultValue: UserRole.USER,
    allowNull: false,
  })
  role: UserRole;

  @Column({
    type: DataType.ENUM(...Object.values(UserStatus)),
    defaultValue: UserStatus.ACTIVE,
    allowNull: false,
  })
  status: UserStatus;

  @HasOne(() => UserSettings, { onDelete: 'CASCADE' })
  settings: UserSettings;

  @HasMany(() => UserCategory, { foreignKey: 'user_id', onDelete: 'CASCADE' })
  userCategories: UserCategory[];

  @HasMany(() => DailyLesson, { onDelete: 'CASCADE' })
  lessons: DailyLesson[];

  @HasMany(() => UserSentenceProgress, { onDelete: 'CASCADE' })
  sentenceProgress: UserSentenceProgress[];

  @HasMany(() => QuizAttempt, { onDelete: 'CASCADE' })
  quizAttempts: QuizAttempt[];

  @HasMany(() => Favorite, { onDelete: 'CASCADE' })
  favorites: Favorite[];

  @HasMany(() => ActivityLog, { onDelete: 'CASCADE' })
  activityLogs: ActivityLog[];
}
