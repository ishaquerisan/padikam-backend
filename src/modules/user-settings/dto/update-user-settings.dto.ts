import { IsIn, IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SentenceDifficulty } from '../../../database/models/sentence.model';

export class UpdateUserSettingsDto {
  @ApiProperty({ example: 10, enum: [5, 10, 20, 30], required: false })
  @IsOptional()
  @IsIn([5, 10, 20, 30], { message: 'Daily target must be either 5, 10, 20, or 30' })
  daily_target?: number;

  @ApiProperty({ example: SentenceDifficulty.BEGINNER, enum: SentenceDifficulty, required: false })
  @IsOptional()
  @IsEnum(SentenceDifficulty, { message: 'Difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED' })
  difficulty_level?: SentenceDifficulty;

  @ApiProperty({ example: 'Asia/Kolkata', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  notifications_enabled?: boolean;
}
