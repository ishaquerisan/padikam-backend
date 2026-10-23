import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Sentence } from '../../database/models/sentence.model';
import { Category } from '../../database/models/category.model';
import { SentencesService } from './sentences.service';
import { SentencesController } from './sentences.controller';

@Module({
  imports: [SequelizeModule.forFeature([Sentence, Category])],
  controllers: [SentencesController],
  providers: [SentencesService],
  exports: [SentencesService],
})
export class SentencesModule {}
