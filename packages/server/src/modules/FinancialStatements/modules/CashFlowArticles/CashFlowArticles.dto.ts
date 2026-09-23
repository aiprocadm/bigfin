// © 2026 Bigfin
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

import { parseBoolean } from '@/utils/parse-boolean';

import { FinancialSheetBranchesQueryDto } from '../../dtos/FinancialSheetBranchesQuery.dto';
import { CASHFLOW_DATE_GROUPS, CashFlowDateGroup } from './periodizeRows';
import {
  CASHFLOW_GROUPINGS,
  CashFlowGrouping,
} from './groupings/cashGroupNodes';

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
  /**
   * Группировка строк (FT-002 ТЗ-3). «Чистый поток» и остатки от неё не
   * зависят — меняются только строки.
   */
  @ApiPropertyOptional({
    description: 'Группировка строк',
    enum: CASHFLOW_GROUPINGS,
    default: 'articles',
  })
  @IsIn(CASHFLOW_GROUPINGS as unknown as string[])
  @IsOptional()
  group?: CashFlowGrouping;

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

  @ApiPropertyOptional({
    description: 'Показывать строки с нулём во всех колонках',
    default: false,
    type: Boolean,
  })
  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  showEmpty?: boolean;

  @ApiPropertyOptional({
    description: 'Показывать переводы между своими счетами',
    default: false,
    type: Boolean,
  })
  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  showTransfers?: boolean;
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
