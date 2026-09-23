// © 2026 Bigfin
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

import { parseBoolean } from '@/utils/parse-boolean';

import { FinancialSheetBranchesQueryDto } from '../../dtos/FinancialSheetBranchesQuery.dto';
import { CASHFLOW_DATE_GROUPS, CashFlowDateGroup } from './periodizeRows';

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

  /**
   * Масштаб колонок (FT-001 ТЗ-3). По умолчанию — месяцы: так отвечают на
   * самый частый вопрос «в каком месяце ушли деньги».
   */
  @ApiPropertyOptional({
    description: 'Масштаб колонок-периодов',
    enum: CASHFLOW_DATE_GROUPS,
    default: 'month',
  })
  @IsIn(CASHFLOW_DATE_GROUPS as unknown as string[])
  @IsOptional()
  dateGroup?: CashFlowDateGroup;

  @ApiPropertyOptional({
    description: 'Показывать колонку «Итого»',
    default: true,
    type: Boolean,
  })
  @Transform(({ value }) => parseBoolean(value, true))
  @IsBoolean()
  @IsOptional()
  showTotalColumn?: boolean;
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
