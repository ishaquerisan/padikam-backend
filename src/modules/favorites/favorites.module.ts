import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Favorite } from '../../database/models/favorite.model';
import { Sentence } from '../../database/models/sentence.model';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';

@Module({
  imports: [SequelizeModule.forFeature([Favorite, Sentence])],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
