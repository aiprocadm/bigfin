// © 2026 Bigfin
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

import { FinancialSheetBranchesQueryDto } from '../../dtos/FinancialSheetBranchesQuery.dto';

/**
 * Отбор отчёта «Деньги (ДДС по статьям)».
 *
 * Метода учёта здесь НЕТ намеренно: движение денег кассово по определению
 * (правило 4 FIN-013). Переключатель, который ничего не меняет, хуже его
 * отсутствия — человек решит, что видит две разные картины.
 */
export class CashFlowArticlesQueryDto extends FinancialSheetBranchesQueryDto {
  @ApiPropertyOptional({
    description: 'Начало периода',
    example: '2026-01-01',
    type: String,
  })
  @IsDateString()
  @IsOptional()
  fromDate: Date | string;

  @ApiPropertyOptional({
    description: 'Конец периода',
    example: '2026-01-31',
    type: String,
  })
  @IsDateString()
  @IsOptional()
  toDate: Date | string;
}

export class CashFlowArticlesResponseDto {
  @ApiProperty({ description: 'Данные отчёта' })
  data: any;

  @ApiProperty({ description: 'Применённый отбор' })
  query: any;

  @ApiProperty({ description: 'Шапка отчёта' })
  meta: any;
}

export class CashFlowArticlesTableResponseDto {
  @ApiProperty({ description: 'Таблица отчёта' })
  table: any;

  @ApiProperty({ description: 'Применённый отбор' })
  query: any;

  @ApiProperty({ description: 'Шапка отчёта' })
  meta: any;
}
