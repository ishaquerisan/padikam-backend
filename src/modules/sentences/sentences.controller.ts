import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SentencesService } from './sentences.service';
import { SentenceDifficulty } from '../../database/models/sentence.model';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Sentences')
@Controller('sentences')
export class SentencesController {
  constructor(private sentencesService: SentencesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse or search sentences by category and difficulty' })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'difficulty', required: false, enum: SentenceDifficulty })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSentences(
    @Query('categoryId') categoryId?: string,
    @Query('difficulty') difficulty?: SentenceDifficulty,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sentencesService.findSentences({
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      difficulty,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get single sentence by ID' })
  async getSentence(@Param('id', ParseIntPipe) id: number) {
    return this.sentencesService.findOne(id);
  }
}
