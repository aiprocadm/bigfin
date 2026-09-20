import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsString } from 'class-validator';
import { FinancialSheetBranchesQueryDto } from '@/modules/FinancialStatements/dtos/FinancialSheetBranchesQuery.dto';

export class GetPaymentCalendarQueryDto extends FinancialSheetBranchesQueryDto {
  @IsDateString()
  @ApiProperty({ example: '2026-06-01', description: 'Horizon start' })
  fromDate: string;

  @IsDateString()
  @ApiProperty({ example: '2026-06-30', description: 'Horizon end' })
  toDate: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 12, description: 'Limit to one cash account' })
  accountId?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'inflow', description: 'Filter by direction' })
  direction?: string;

  /**
   * Масштаб столбцов (FIN-019 ТЗ-2).
   *
   * Пусто — по дням, как было. Вопрос «что с деньгами на горизонте года» по
   * дневной таблице не читается: триста шестьдесят пять столбцов не
   * помещаются ни на экран, ни в голову.
   */
  @IsString()
  @IsIn(['day', 'week', 'month', 'quarter', 'year'])
  @IsOptional()
  @ApiPropertyOptional({
    example: 'month',
    enum: ['day', 'week', 'month', 'quarter', 'year'],
    description: 'Масштаб столбцов календаря',
  })
  granularity?: string;

  /**
   * Система координат (FIN-019 ТЗ-2).
   *
   * `cashflow` — движение денег (как было), `pnl` — доходы и расходы.
   * Остаток на счетах от выбора НЕ зависит: деньги на счёте одни и те же,
   * меняется лишь то, в каких строках их раскладывают.
   */
  @IsString()
  @IsIn(['cashflow', 'pnl'])
  @IsOptional()
  @ApiPropertyOptional({
    example: 'cashflow',
    enum: ['cashflow', 'pnl'],
    description: 'Источник строк: движение денег или доходы и расходы',
  })
  source?: string;
}
