// © 2026 Bigfin
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsOptional } from 'class-validator';

import { parseBoolean } from '@/utils/parse-boolean';
import { FinancialSheetBranchesQueryDto } from '../../dtos/FinancialSheetBranchesQuery.dto';
import { CASHFLOW_DATE_GROUPS, CashFlowDateGroup } from '../CashFlowArticles/periodizeRows';
import { PNL_GROUPINGS, PnlGrouping } from './buildManagerialPnlReport';
import {
  ALLOCATION_BASES,
  AllocationBase,
} from '@/modules/CostAllocation/utils/allocationBases';

/**
 * Отбор управленческого ОПиУ (FT-010 ТЗ-3).
 *
 * Метод учёта здесь ЕСТЬ, в отличие от «Денег»: прибыль по начислению и
 * прибыль по деньгам — два разных честных ответа, и собственнику нужны оба.
 */
export class ManagerialPnlQueryDto extends FinancialSheetBranchesQueryDto {
  @ApiPropertyOptional({ description: 'Начало периода', example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  fromDate: string;

  @ApiPropertyOptional({ description: 'Конец периода', example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  toDate: string;

  @ApiPropertyOptional({ enum: CASHFLOW_DATE_GROUPS, default: 'month' })
  @IsIn(CASHFLOW_DATE_GROUPS as unknown as string[])
  @IsOptional()
  dateGroup?: CashFlowDateGroup;

  @ApiPropertyOptional({ enum: ['accrual', 'cash'], default: 'accrual' })
  @IsIn(['accrual', 'cash'])
  @IsOptional()
  basis?: 'accrual' | 'cash';

  /** Раскрытие ярусов: до статей, до направлений или до обоих. */
  @ApiPropertyOptional({ enum: PNL_GROUPINGS, default: 'articles' })
  @IsIn(PNL_GROUPINGS as unknown as string[])
  @IsOptional()
  group?: PnlGrouping;

  @ApiPropertyOptional({ default: true, type: Boolean })
  @Transform(({ value }) => parseBoolean(value, true))
  @IsBoolean()
  @IsOptional()
  showTotalColumn?: boolean;

  @ApiPropertyOptional({ default: false, type: Boolean })
  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  showEmpty?: boolean;

  /**
   * Распределить косвенные расходы без направления по направлениям
   * (FT-011 ТЗ-3). Имеет смысл, когда ярусы раскрыты до направлений.
   */
  @ApiPropertyOptional({ default: false, type: Boolean })
  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  spreadIndirect?: boolean;

  @ApiPropertyOptional({ enum: ALLOCATION_BASES, default: 'revenue' })
  @IsIn(ALLOCATION_BASES as unknown as string[])
  @IsOptional()
  spreadBase?: AllocationBase;
}
