import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignStatus } from '@prisma/client';

export class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  subject!: string;

  @IsString()
  @MinLength(1)
  bodyTemplate!: string;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  bodyTemplate?: string;
}

export class CampaignQueryDto {
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
