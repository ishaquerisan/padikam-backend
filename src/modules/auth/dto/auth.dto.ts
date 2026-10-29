import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SentenceDifficulty } from '../../../database/models/sentence.model';

export class RegisterDto {
  @ApiProperty({ example: 'Rahul Nair' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'rahul@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecretPass123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'rahul@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecretPass123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'rahul@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'some-reset-token-string' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewSecretPass123', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldSecretPass123', required: false })
  @IsString()
  @IsOptional()
  currentPassword?: string;

  @ApiProperty({ example: 'NewSecretPass123', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class UpdateProfileDto {
  @ApiProperty({ example: 'Rahul K. Nair', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'https://images.unsplash.com/...', required: false })
  @IsString()
  @IsOptional()
  avatar_url?: string;

  @ApiProperty({ example: SentenceDifficulty.BEGINNER, enum: SentenceDifficulty, required: false })
  @IsEnum(SentenceDifficulty, { message: 'Difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED' })
  @IsOptional()
  difficulty_level?: SentenceDifficulty;
}

export class GoogleAuthDto {
  @ApiProperty({ description: 'Firebase ID Token obtained from Firebase Client SDK' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
