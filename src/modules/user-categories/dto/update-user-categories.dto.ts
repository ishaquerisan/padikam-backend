import { IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserCategoriesDto {
  @ApiProperty({ example: [1, 2, 3], description: 'Array of category IDs' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Please select at least one learning category' })
  @IsInt({ each: true })
  category_ids: number[];
}
