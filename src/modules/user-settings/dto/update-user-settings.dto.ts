import { IsIn, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserSettingsDto {
  @ApiProperty({ example: 10, enum: [5, 10, 20, 30], required: false })
  @IsOptional()
  @IsIn([5, 10, 20, 30], { message: 'Daily target must be either 5, 10, 20, or 30' })
  daily_target?: number;

  @ApiProperty({ example: 'Asia/Kolkata', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  notifications_enabled?: boolean;
}
