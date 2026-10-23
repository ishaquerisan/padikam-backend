import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active learning categories with sentence counts' })
  async getCategories() {
    return this.categoriesService.findAllActive();
  }

  @Public()
  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get category details by id or slug' })
  async getCategory(@Param('idOrSlug') idOrSlug: string) {
    return this.categoriesService.findOne(idOrSlug);
  }
}
