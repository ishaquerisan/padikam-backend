import { Controller, Get, Post, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/models/user.model';

@ApiTags('Favorites')
@ApiBearerAuth()
@Controller('favorites')
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all saved favorite sentences for user' })
  async getFavorites(@CurrentUser() user: User) {
    return this.favoritesService.listFavorites(user.id);
  }

  @Post('toggle/:sentenceId')
  @ApiOperation({ summary: 'Toggle favorite status for a sentence' })
  async toggleFavorite(
    @CurrentUser() user: User,
    @Param('sentenceId', ParseIntPipe) sentenceId: number,
  ) {
    return this.favoritesService.toggleFavorite(user.id, sentenceId);
  }
}
