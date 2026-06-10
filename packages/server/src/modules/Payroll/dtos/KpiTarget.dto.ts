// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { KPI_METRICS } from '../constants';

class CommandKpiTargetDto {
  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 1, description: 'Employee id (менеджер)' })
  employeeId: number;

  @IsDateString()
  @ApiProperty({ example: '2026-06-01', description: 'Месяц плана' })
  periodMonth: string;

  @IsString()
  @IsIn(KPI_METRICS as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: KPI_METRICS, default: 'revenue' })
  metric?: string;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 1000000, description: 'План на месяц' })
  targetAmount: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @Max(100)
  @ApiProperty({ example: 5, description: '% бонуса от факта показателя' })
  bonusRate: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ example: false, description: 'Бонус только при выполнении плана' })
  onlyIfAchieved?: boolean;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'План на июнь' })
  note?: string;
}

export class CreateKpiTargetDto extends CommandKpiTargetDto {}
export class EditKpiTargetDto extends CommandKpiTargetDto {}

export class GetKpiTargetsQueryDto {
  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 2026, description: 'Фильтр по году' })
  year?: number;
}

export class GetKpiSummaryQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  @ApiProperty({ example: '2026-06', description: 'Месяц сводки (YYYY-MM)' })
  month: string;
}
