// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsString, Min } from 'class-validator';

class CommandDealStageDto {
  @IsString()
  @ApiProperty({ example: 'Проект' })
  name: string;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 100000 })
  plannedRevenue?: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 40000 })
  plannedCost?: number;

  @ToNumber()
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ example: 1 })
  sortOrder?: number;

  @IsIn(['open', 'closed'])
  @IsOptional()
  @ApiPropertyOptional({ example: 'open', enum: ['open', 'closed'] })
  status?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-03-10', description: 'Close date (required when status=closed)' })
  closedDate?: string;
}

export class CreateDealStageDto extends CommandDealStageDto {}
export class EditDealStageDto extends CommandDealStageDto {}
