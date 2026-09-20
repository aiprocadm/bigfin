// © 2026 Bigfin
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional } from 'class-validator';

/**
 * Отбор схемы «Куда попадает статья» (FIN-002 ТЗ-2).
 *
 * Статья необязательна: без неё схема показывается без подсветки и всё
 * равно полезна — она объясняет устройство трёх отчётов.
 */
export class GetArticleReportMapQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({ description: 'Номер статьи учёта', example: 12 })
  articleId?: number;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ description: 'Начало периода', example: '2026-01-01' })
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ description: 'Конец периода', example: '2026-01-31' })
  toDate?: string;
}
