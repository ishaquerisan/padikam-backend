import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Sentence, SentenceStatus, SentenceDifficulty } from '../../database/models/sentence.model';
import { Category } from '../../database/models/category.model';

@Injectable()
export class SentencesService {
  constructor(
    @InjectModel(Sentence)
    private sentenceModel: typeof Sentence,
  ) {}

  async findSentences(params: {
    categoryId?: number;
    difficulty?: SentenceDifficulty;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const where: any = { status: SentenceStatus.ACTIVE };

    if (params.categoryId) {
      where.category_id = params.categoryId;
    }

    if (params.difficulty) {
      where.difficulty = params.difficulty;
    }

    if (params.search) {
      where[Op.or] = [
        { word: { [Op.like]: `%${params.search}%` } },
        { word_meaning: { [Op.like]: `%${params.search}%` } },
        { english_text: { [Op.like]: `%${params.search}%` } },
        { malayalam_meaning: { [Op.like]: `%${params.search}%` } },
      ];
    }

    const { rows: sentences, count: total } = await this.sentenceModel.findAndCountAll({
      where,
      include: [Category],
      order: [['id', 'DESC']],
      limit,
      offset,
    });

    return {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      sentences,
    };
  }

  async findOne(id: number) {
    const sentence = await this.sentenceModel.findByPk(id, {
      include: [Category],
    });
    if (!sentence || sentence.status !== SentenceStatus.ACTIVE) {
      throw new NotFoundException('Sentence not found');
    }
    return sentence;
  }
}
