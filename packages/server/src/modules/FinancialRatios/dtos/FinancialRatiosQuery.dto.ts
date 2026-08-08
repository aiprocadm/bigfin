// © 2026 Bigfin
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/**
 * Период показателей. Раньше даты приходили сырыми строками без проверки:
 * мусор молча трактовался как «нет фильтра», а запрос без параметров считал
 * баланс по всем проводкам сразу, при этом ОПиУ — с начала года. Теперь
 * формат проверяется, а пустые значения подставляет сервис (единый период).
 */
export class FinancialRatiosQueryDto {
  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-01-01' })
  fromDate?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-12-31' })
  toDate?: string;
}
