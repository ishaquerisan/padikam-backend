import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Favorite } from '../../database/models/favorite.model';
import { Sentence } from '../../database/models/sentence.model';
import { Category } from '../../database/models/category.model';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectModel(Favorite)
    private favoriteModel: typeof Favorite,
    @InjectModel(Sentence)
    private sentenceModel: typeof Sentence,
  ) {}

  async listFavorites(userId: number) {
    const favorites = await this.favoriteModel.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Sentence,
          include: [Category],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return favorites.map((f) => ({
      favoriteId: f.id,
      savedAt: (f as any).created_at || f.createdAt,
      sentence: {
        id: f.sentence?.id,
        word: f.sentence?.word || '',
        wordMeaning: f.sentence?.word_meaning || '',
        englishText: f.sentence?.english_text,
        malayalamMeaning: f.sentence?.malayalam_meaning,
        usageExample: f.sentence?.usage_example,
        difficulty: f.sentence?.difficulty,
        audioUrl: f.sentence?.audio_url,
        category: f.sentence?.category
          ? {
              id: f.sentence.category.id,
              name: f.sentence.category.name,
              slug: f.sentence.category.slug,
              icon: f.sentence.category.icon,
            }
          : null,
      },
    }));
  }

  async toggleFavorite(userId: number, sentenceId: number) {
    const sentence = await this.sentenceModel.findByPk(sentenceId);
    if (!sentence) {
      throw new NotFoundException('Sentence not found');
    }

    const existing = await this.favoriteModel.findOne({
      where: { user_id: userId, sentence_id: sentenceId },
    });

    if (existing) {
      await existing.destroy();
      return { sentenceId, isFavorite: false, message: 'Removed from favorites' };
    } else {
      await this.favoriteModel.create({
        user_id: userId,
        sentence_id: sentenceId,
      });
      return { sentenceId, isFavorite: true, message: 'Saved to favorites' };
    }
  }
}
