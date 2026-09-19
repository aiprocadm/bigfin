import { ToNumber } from '@/common/decorators/Validators';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBankTransactionDto {
  @ApiProperty({
    description: 'The date of the bank transaction',
    type: Date,
    example: '2023-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  date: Date;

  @ApiPropertyOptional({
    description: 'Optional transaction number or reference',
    type: String,
    example: 'TRX-001',
  })
  @IsString()
  @IsOptional()
  transactionNumber?: string;

  @ApiPropertyOptional({
    description: 'Optional external reference number',
    type: String,
    example: 'REF-001',
  })
  @IsString()
  @IsOptional()
  referenceNo?: string;

  @ApiProperty({
    description: 'Type of bank transaction (e.g., deposit, withdrawal)',
    type: String,
    example: 'deposit',
  })
  @IsNotEmpty()
  @IsString()
  transactionType: string;

  @ApiProperty({
    description: 'Description of the bank transaction',
    type: String,
    example: 'Monthly rent payment',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Transaction amount',
    type: Number,
    example: 1000.5,
  })
  @IsNotEmpty()
  @ToNumber()
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Exchange rate for currency conversion',
    type: Number,
    default: 1,
    example: 1.15,
  })
  @ToNumber()
  @IsNumber()
  exchangeRate: number = 1;

  @ApiPropertyOptional({
    description: 'Currency code for the transaction',
    type: String,
    example: 'USD',
  })
  @IsString()
  @IsOptional()
  currencyCode: string;

  @ApiProperty({
    description: 'ID of the credit account associated with this transaction',
    type: Number,
    example: 1001,
  })
  @IsNotEmpty()
  @ToNumber()
  @IsInt()
  creditAccountId: number;

  @ApiProperty({
    description: 'ID of the cashflow account associated with this transaction',
    type: Number,
    example: 2001,
  })
  @IsNotEmpty()
  @ToNumber()
  @IsInt()
  cashflowAccountId: number;

  @ApiProperty({
    description: 'Whether the transaction should be published',
    type: Boolean,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  publish: boolean = true;

  /**
   * Внутригрупповая операция (этап 7 ТЗ, §7.2, остаток К2).
   *
   * Автоматика помечает операцию сама, когда её ноги принадлежат разным
   * известным юрлицам. Но юрлицо она берёт со СЧЕТА, а «неизвестное юрлицо
   * не считается другим» — перевод собственной компании, оформленный
   * документом на контрагента, автоматика не увидит никогда.
   *
   * Этот выключатель только ДОБАВЛЯЕТ признак. Снять автоматический им
   * нельзя: если ноги и правда у разных юрлиц, операция внутригрупповая по
   * определению.
   */
  @ApiPropertyOptional({
    description: 'Отметить операцию как внутригрупповую',
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isIntercompany?: boolean;

  @ApiPropertyOptional({
    description: 'ID of the branch where the transaction occurred',
    type: Number,
    example: 101,
  })
  @IsOptional()
  @ToNumber()
  @IsInt()
  branchId?: number;

  @ApiPropertyOptional({
    description: 'Plaid transaction ID if imported from Plaid',
    type: String,
    example: 'plaid_trx_12345',
  })
  @IsOptional()
  @IsString()
  plaidTransactionId?: string;

  @ApiPropertyOptional({
    description: 'Plaid account ID if imported from Plaid',
    type: String,
    example: 'plaid_acc_67890',
  })
  @IsOptional()
  @IsString()
  plaidAccountId?: string;

  @ApiPropertyOptional({
    description:
      'ID of the uncategorized transaction if this is categorizing an existing transaction',
    type: Number,
    example: 5001,
  })
  @IsOptional()
  @IsInt()
  uncategorizedTransactionId?: number;

  @ApiPropertyOptional({
    description: 'ID of the linked contact (counterparty)',
    type: Number,
    example: 55,
  })
  @IsOptional()
  @ToNumber()
  @IsInt()
  contactId?: number;
}
