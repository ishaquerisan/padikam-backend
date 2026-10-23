import { IsInt, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  attemptId: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @IsNotEmpty()
  answerId: number;

  @ApiProperty({ example: 'നന്ദി' })
  @IsString()
  @IsNotEmpty()
  selectedAnswer: string;
}

export class CompleteAttemptDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  attemptId: number;
}
