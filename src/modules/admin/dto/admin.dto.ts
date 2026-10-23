import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../../database/models/user.model';
import { CategoryStatus } from '../../../database/models/category.model';
import { SentenceDifficulty, SentenceStatus } from '../../../database/models/sentence.model';

// --- Category DTOs ---
export class CreateCategoryDto {
  @ApiProperty({ example: 'Airport & Flying' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'airport-and-flying' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'Essential phrases for boarding, flights, baggage claim and customs.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'Plane', default: 'MessageCircle' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ example: 15, default: 0 })
  @IsInt()
  @IsOptional()
  sort_order?: number;

  @ApiProperty({ enum: CategoryStatus, default: CategoryStatus.ACTIVE })
  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;
}

export class UpdateCategoryDto {
  @ApiProperty({ example: 'Airport & Flights', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'airport-and-flights', required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  sort_order?: number;

  @ApiProperty({ enum: CategoryStatus, required: false })
  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;
}

// --- Sentence DTOs ---
export class CreateSentenceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  category_id: number;

  @ApiProperty({ example: 'baggage' })
  @IsString()
  @IsNotEmpty()
  word: string;

  @ApiProperty({ example: 'ലഗേജ് / യാത്രാസാധനങ്ങൾ' })
  @IsString()
  @IsNotEmpty()
  word_meaning: string;

  @ApiProperty({ example: 'Where is the baggage claim area?' })
  @IsString()
  @IsNotEmpty()
  english_text: string;

  @ApiProperty({ example: 'ലഗേജ് എടുക്കുന്ന സ്ഥലം എവിടെയാണ്?' })
  @IsString()
  @IsNotEmpty()
  malayalam_meaning: string;

  @ApiProperty({ example: 'Excuse me, where is the baggage claim area?', required: false })
  @IsString()
  @IsOptional()
  usage_example?: string;

  @ApiProperty({ enum: SentenceDifficulty, default: SentenceDifficulty.BEGINNER })
  @IsEnum(SentenceDifficulty)
  @IsOptional()
  difficulty?: SentenceDifficulty;

  @ApiProperty({ example: 'https://example.com/audio/baggage.mp3', required: false })
  @IsString()
  @IsOptional()
  audio_url?: string;

  @ApiProperty({ enum: SentenceStatus, default: SentenceStatus.ACTIVE })
  @IsEnum(SentenceStatus)
  @IsOptional()
  status?: SentenceStatus;
}

export class UpdateSentenceDto {
  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  category_id?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  word?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  word_meaning?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  english_text?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  malayalam_meaning?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  usage_example?: string;

  @ApiProperty({ enum: SentenceDifficulty, required: false })
  @IsEnum(SentenceDifficulty)
  @IsOptional()
  difficulty?: SentenceDifficulty;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  audio_url?: string;

  @ApiProperty({ enum: SentenceStatus, required: false })
  @IsEnum(SentenceStatus)
  @IsOptional()
  status?: SentenceStatus;
}

// --- CSV Bulk Import DTO ---
export class CsvSentenceRowDto {
  @IsString()
  @IsNotEmpty()
  word: string;

  @IsString()
  @IsNotEmpty()
  word_meaning: string;

  @IsString()
  @IsNotEmpty()
  english_text: string;

  @IsString()
  @IsNotEmpty()
  malayalam_meaning: string;

  @IsString()
  @IsNotEmpty()
  category_name_or_slug: string;

  @IsOptional()
  @IsString()
  usage_example?: string;

  @IsOptional()
  @IsEnum(SentenceDifficulty)
  difficulty?: SentenceDifficulty;

  @IsOptional()
  @IsString()
  audio_url?: string;
}

export class BulkImportSentencesDto {
  @ApiProperty({ type: [CsvSentenceRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CsvSentenceRowDto)
  rows: CsvSentenceRowDto[];

  @ApiProperty({ example: false, description: 'If true, preview only without committing to database' })
  @IsOptional()
  previewOnly?: boolean;
}

// --- User Management DTOs ---
export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  @IsNotEmpty()
  status: UserStatus;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
