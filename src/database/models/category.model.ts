import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Sentence } from './sentence.model';
import { UserCategory } from './user-category.model';

export enum CategoryStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Table({
  tableName: 'categories',
  timestamps: true,
  underscored: true,
})
export class Category extends Model {
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
    type: DataType.STRING(120),
    allowNull: false,
    unique: true,
  })
  slug: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.STRING(64),
    allowNull: false,
    defaultValue: 'MessageCircle',
  })
  icon: string;

  @Column({
    type: DataType.ENUM(...Object.values(CategoryStatus)),
    defaultValue: CategoryStatus.ACTIVE,
    allowNull: false,
  })
  status: CategoryStatus;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    allowNull: false,
  })
  sort_order: number;

  @HasMany(() => Sentence, { foreignKey: 'category_id', onDelete: 'RESTRICT' })
  sentences: Sentence[];

  @HasMany(() => UserCategory, { foreignKey: 'category_id', onDelete: 'CASCADE' })
  userCategories: UserCategory[];
}
