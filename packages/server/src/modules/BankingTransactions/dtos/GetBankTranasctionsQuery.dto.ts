import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NumberFormatQueryDto } from './NumberFormatQuery.dto';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetBankTransactionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    type: Number,
    example: 1,
  })
  page: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    type: Number,
    example: 10,
  })
  pageSize: number;

  /**
   * Счёт больше не обязателен: без него отдаём операции по ВСЕМ счетам
   * организации — это список «Операции» из этапа 3 ТЗ, где счёт лишь один из
   * фильтров. Со счётом поведение прежнее, включая входящий остаток и
   * бегущий остаток по строкам.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({
    description:
      'Bank account ID. Leave empty to get transactions of all accounts.',
    required: false,
    type: Number,
    example: 1,
  })
  accountId?: number;

  /** Начало периода, `YYYY-MM-DD`. */
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Filter transactions from this date (YYYY-MM-DD).',
    required: false,
    type: String,
    example: '2026-01-01',
  })
  fromDate?: string;

  /** Конец периода, `YYYY-MM-DD`. */
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Filter transactions to this date (YYYY-MM-DD).',
    required: false,
    type: String,
    example: '2026-01-31',
  })
  toDate?: string;

  /**
   * Направление движения денег: приход (`in`) или расход (`out`).
   * У прихода заполнен `debit`, у расхода — `credit`.
   */
  @IsOptional()
  @IsIn(['in', 'out'])
  @ApiProperty({
    description: 'Money direction: `in` (deposit) or `out` (withdrawal).',
    required: false,
    enum: ['in', 'out'],
  })
  flow?: 'in' | 'out';

  /** Контрагент операции. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({
    description: 'Filter by contact id.',
    required: false,
    type: Number,
  })
  contactId?: number;

  /** Поиск по номеру документа, номеру-ссылке и примечанию. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    description: 'Search in transaction number, reference number and note.',
    required: false,
    type: String,
  })
  search?: string;

  /** Сумма от. Сравнивается с большей из сторон операции. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({
    description: 'Minimum transaction amount.',
    required: false,
    type: Number,
  })
  minAmount?: number;

  /** Сумма до. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({
    description: 'Maximum transaction amount.',
    required: false,
    type: Number,
  })
  maxAmount?: number;

  @IsOptional()
  @ApiProperty({
    description: 'Number format options',
    required: false,
    type: NumberFormatQueryDto,
  })
  numberFormat: NumberFormatQueryDto;
}
