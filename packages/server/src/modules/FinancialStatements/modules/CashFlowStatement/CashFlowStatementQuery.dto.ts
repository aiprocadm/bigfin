import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { FinancialSheetBranchesQueryDto } from '../../dtos/FinancialSheetBranchesQuery.dto';
import { NumberFormatQueryDto } from '@/modules/BankingTransactions/dtos/NumberFormatQuery.dto';
import { Transform, Type } from 'class-transformer';
import { parseBoolean } from '@/utils/parse-boolean';
import { ApiProperty } from '@nestjs/swagger';

export class CashFlowStatementQueryDto extends FinancialSheetBranchesQueryDto {
  /**
   * Сравнение с прошлым периодом (остаток О3 ТЗ).
   *
   * Три отдельных выключателя, как в Балансе и ОПиУ: показать сам прошлый
   * период, показать изменение в рублях, показать изменение в процентах.
   * Разделены не ради гибкости, а ради ширины экрана: три колонки на каждый
   * период превращают таблицу в простыню.
   */
  @ApiProperty({
    description: 'Показать колонку прошлого периода',
    required: false,
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value, false))
  previousPeriod: boolean = false;

  @ApiProperty({
    description: 'Показать изменение к прошлому периоду в деньгах',
    required: false,
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value, false))
  previousPeriodAmountChange: boolean = false;

  @ApiProperty({
    description: 'Показать изменение к прошлому периоду в процентах',
    required: false,
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value, false))
  previousPeriodPercentageChange: boolean = false;

  @ApiProperty({
    description: 'Start date for the cash flow statement period',
    required: false,
    type: Date,
  })
  @IsDateString()
  @IsOptional()
  fromDate: Date | string;

  @ApiProperty({
    description: 'End date for the cash flow statement period',
    required: false,
    type: Date,
  })
  @IsDateString()
  @IsOptional()
  toDate: Date | string;

  @ApiProperty({
    description: 'Display columns by time period',
    required: false,
    enum: ['day', 'month', 'year', 'quarter'],
    default: 'year',
  })
  @IsString()
  @IsOptional()
  @IsEnum(['day', 'month', 'year', 'quarter'])
  displayColumnsBy: 'day' | 'month' | 'year' | 'quarter' = 'year';

  @ApiProperty({
    description: 'Type of column display',
    required: false,
    enum: ['total', 'date_periods'],
    default: 'total',
  })
  @IsEnum(['total', 'date_periods'])
  @IsOptional()
  displayColumnsType: 'total' | 'date_periods' = 'total';

  @ApiProperty({
    description: 'Filter out zero values',
    required: false,
    type: Boolean,
    default: false,
  })
  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  noneZero: boolean;

  @ApiProperty({
    description: 'Filter out transactions',
    required: false,
    type: Boolean,
    default: false,
  })
  @Transform(({ value }) => parseBoolean(value, false))
  @IsBoolean()
  @IsOptional()
  noneTransactions: boolean;

  @ApiProperty({
    description: 'Number format configuration',
    required: true,
    type: NumberFormatQueryDto,
  })
  @ValidateNested()
  @Type(() => NumberFormatQueryDto)
  @IsOptional()
  numberFormat: NumberFormatQueryDto;

  @ApiProperty({
    description: 'Basis for the cash flow statement',
    required: false,
    type: String,
  })
  @IsString()
  @IsOptional()
  basis: string;
}
