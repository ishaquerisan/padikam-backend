import { IsIn, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkSentenceLearnedDto {
  @ApiProperty({ example: 42, description: 'Sentence ID to mark as learned' })
  @IsInt()
  @IsNotEmpty()
  sentenceId: number;
}

export class IncreaseTargetDto {
  @ApiProperty({ example: 10, enum: [10, 20, 30], description: 'New target count' })
  @IsIn([10, 20, 30], { message: 'Target can only be increased to 10, 20, or 30' })
  target: number;
}
