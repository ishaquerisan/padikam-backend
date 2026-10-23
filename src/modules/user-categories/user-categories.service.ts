import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserCategory } from '../../database/models/user-category.model';
import { Category, CategoryStatus } from '../../database/models/category.model';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';

@Injectable()
export class UserCategoriesService {
  constructor(
    @InjectModel(UserCategory)
    private userCategoryModel: typeof UserCategory,
    @InjectModel(Category)
    private categoryModel: typeof Category,
    private sequelize: Sequelize,
  ) {}

  async getUserCategories(userId: number) {
    const userCategories = await this.userCategoryModel.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Category,
          as: 'category',
          where: { status: CategoryStatus.ACTIVE },
        },
      ],
      order: [[{ model: Category, as: 'category' }, 'sort_order', 'ASC']],
    });
    return userCategories.map((uc) => uc.category);
  }

  async updateUserCategories(userId: number, categoryIds: number[]) {
    // Validate that categories exist and are active
    const validCategories = await this.categoryModel.findAll({
      where: {
        id: { [Op.in]: categoryIds },
        status: CategoryStatus.ACTIVE,
      },
    });

    if (validCategories.length === 0) {
      throw new BadRequestException('At least one valid, active category must be selected');
    }

    const transaction = await this.sequelize.transaction();
    try {
      // Remove previous mapping
      await this.userCategoryModel.destroy({
        where: { user_id: userId },
        transaction,
      });

      // Insert new category mappings
      const records = validCategories.map((cat) => ({
        user_id: userId,
        category_id: cat.id,
      }));

      await this.userCategoryModel.bulkCreate(records, { transaction });
      await transaction.commit();

      return this.getUserCategories(userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
