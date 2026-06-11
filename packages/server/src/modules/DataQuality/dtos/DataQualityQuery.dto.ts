// © 2026 Bigfin
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class DataQualityQueryDto {
  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-01-01', description: 'Начало периода (ISO дата)' })
  fromDate?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-12-31', description: 'Конец периода (ISO дата)' })
  toDate?: string;
}
