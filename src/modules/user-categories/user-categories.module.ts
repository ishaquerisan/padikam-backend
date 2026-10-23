import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserCategory } from '../../database/models/user-category.model';
import { Category } from '../../database/models/category.model';
import { UserCategoriesService } from './user-categories.service';
import { UserCategoriesController } from './user-categories.controller';

@Module({
  imports: [SequelizeModule.forFeature([UserCategory, Category])],
  controllers: [UserCategoriesController],
  providers: [UserCategoriesService],
  exports: [UserCategoriesService],
})
export class UserCategoriesModule {}
