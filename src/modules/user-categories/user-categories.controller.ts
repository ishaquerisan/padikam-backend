import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserCategoriesService } from './user-categories.service';
import { UpdateUserCategoriesDto } from './dto/update-user-categories.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/models/user.model';

@ApiTags('User Categories')
@ApiBearerAuth()
@Controller('user-categories')
export class UserCategoriesController {
  constructor(private userCategoriesService: UserCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user selected learning categories' })
  async getUserCategories(@CurrentUser() user: User) {
    return this.userCategoriesService.getUserCategories(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update selected categories (e.g. during onboarding or settings)' })
  async updateUserCategories(
    @CurrentUser() user: User,
    @Body() dto: UpdateUserCategoriesDto,
  ) {
    return this.userCategoriesService.updateUserCategories(user.id, dto.category_ids);
  }
}
