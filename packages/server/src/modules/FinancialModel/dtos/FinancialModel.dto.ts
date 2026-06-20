// © 2026 Bigfin
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class FinancialOverviewQueryDto {
  @ApiPropertyOptional({ description: 'Начало периода YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Конец периода YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
