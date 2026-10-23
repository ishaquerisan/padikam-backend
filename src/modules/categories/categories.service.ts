import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Category, CategoryStatus } from '../../database/models/category.model';
import { Sentence, SentenceStatus } from '../../database/models/sentence.model';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category)
    private categoryModel: typeof Category,
    @InjectModel(Sentence)
    private sentenceModel: typeof Sentence,
  ) {}

  async findAllActive() {
    const categories = await this.categoryModel.findAll({
      where: { status: CategoryStatus.ACTIVE },
      order: [['sort_order', 'ASC'], ['name', 'ASC']],
      attributes: {
        include: [
          [
            Sequelize.literal(`(
              SELECT COUNT(*)
              FROM sentences AS s
              WHERE s.category_id = Category.id
                AND s.status = '${SentenceStatus.ACTIVE}'
            )`),
            'sentenceCount',
          ],
        ],
      },
    });

    return categories.map((cat) => {
      const plain = cat.toJSON();
      plain.sentenceCount = parseInt(plain.sentenceCount || '0', 10);
      return plain;
    });
  }

  async findOne(idOrSlug: string) {
    const isNum = !isNaN(Number(idOrSlug));
    const where = isNum ? { id: Number(idOrSlug) } : { slug: idOrSlug };

    const category = await this.categoryModel.findOne({
      where: { ...where, status: CategoryStatus.ACTIVE },
      include: [
        {
          model: Sentence,
          where: { status: SentenceStatus.ACTIVE },
          required: false,
          limit: 10,
        },
      ],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }
}
