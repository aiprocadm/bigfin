import { FinancialSheetBranchesQueryDto } from '../../dtos/FinancialSheetBranchesQuery.dto';
import { INumberFormatQuery } from '../../types/Report.types';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ToNumber } from '@/common/decorators/Validators';
import { parseBoolean } from '@/utils/parse-boolean';
import { NumberFormatQueryDto } from '@/modules/BankingTransactions/dtos/NumberFormatQuery.dto';

export class ProfitLossSheetQueryDto extends FinancialSheetBranchesQueryDto {
  /**
   * Какие ярусы прибыли показать (FIN-015 ТЗ-2).
   *
   * Пусто — прежний вид отчёта: ни одной дополнительной строки. Именно так
   * он выглядел до этого требования, и у тех, кто ничего не выбирал,
   * ничего не изменится.
   *
   * Домен проверяется строго: опечатка `ebidta` тихо дала бы отчёт без
   * строки, которую человек просил, и он решил бы, что она не считается.
   */
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : (Array.isArray(value) ? value : [value]).filter(Boolean),
  )
  @IsOptional()
  @IsArray()
  @IsIn(['operating', 'ebitda', 'ebit', 'ebt', 'net'], { each: true })
  @ApiPropertyOptional({
    description: 'Ярусы прибыли: operating | ebitda | ebit | ebt | net',
    example: ['operating', 'ebitda'],
    type: [String],
  })
  profitTiers?: string[];

  // Раньше basis не проверялся: опечатка вроде basis=cach молча считалась
  // «по начислению». Теперь только два допустимых значения (как в ОСВ/Балансе).
  @IsString()
  @IsIn(['cash', 'accrual'])
  @IsOptional()
  @ApiProperty({
    description: 'The basis for the profit and loss sheet',
    enum: ['cash', 'accrual'],
  })
  basis: 'cash' | 'accrual';

  @IsDateString()
  @IsOptional()
  @ApiProperty({ description: 'Start date for the profit and loss sheet' })
  fromDate: moment.MomentInput;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ description: 'End date for the profit and loss sheet' })
  toDate: moment.MomentInput;

  @ApiProperty({ description: 'Number format configuration' })
  @ValidateNested()
  @Type(() => NumberFormatQueryDto)
  @IsOptional()
  numberFormat: NumberFormatQueryDto;

  @IsBoolean()
  @Transform(({ value }) => parseBoolean(value, false))
  @IsOptional()
  @ApiPropertyOptional({ description: 'Whether to exclude zero values' })
  noneZero: boolean;

  @IsBoolean()
  @Transform(({ value }) => parseBoolean(value, false))
  @IsOptional()
  @ApiPropertyOptional({ description: 'Whether to exclude transactions' })
  noneTransactions: boolean;

  @IsArray()
  @IsOptional()
  @ToNumber()
  @ApiPropertyOptional({ description: 'Array of account IDs to include' })
  accountsIds: number[];

  @IsEnum(['total', 'date_periods'])
  @IsOptional()
  @ApiProperty({
    description: 'Type of columns to display',
    enum: ['total', 'date_periods'],
  })
  displayColumnsType: 'total' | 'date_periods';

  @IsString()
  @IsEnum(['day', 'month', 'year', 'quarter'])
  @IsOptional()
  @ApiProperty({ description: 'How to display columns' })
  displayColumnsBy: 'day' | 'month' | 'year' | 'quarter' = 'year';

  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Whether to show percentage column' })
  percentageColumn: boolean;

  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Whether to show percentage row' })
  percentageRow: boolean;

  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Whether to show income percentage' })
  percentageIncome: boolean;

  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Whether to show expense percentage' })
  percentageExpense: boolean;

  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Whether to include previous period' })
  previousPeriod: boolean;

  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Whether to show previous period amount change',
  })
  previousPeriodAmountChange: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Whether to show previous period percentage change',
  })
  @Transform(({ value }) => parseBoolean(value, false))
  previousPeriodPercentageChange: boolean;

  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Whether to include previous year' })
  previousYear: boolean;

  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Whether to show previous year amount change',
  })
  previousYearAmountChange: boolean;

  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Whether to show previous year percentage change',
  })
  previousYearPercentageChange: boolean;
}
