import { ToNumber } from '@/common/decorators/Validators';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for categorizing a bank (cashflow) transaction as an expense.
 * The amount and the paying account are taken from the bank transaction
 * itself — the client only provides the expense account and optional overrides.
 */
export class CategorizeTransactionAsExpenseDto {
  @ApiProperty({
    description: 'The expense account id this transaction is categorized to',
    type: Number,
    example: 1001,
  })
  @IsInt()
  @ToNumber()
  @IsNotEmpty()
  expenseAccountId: number;

  @ApiPropertyOptional({
    description: 'Exchange rate for currency conversion',
    type: Number,
    default: 1,
    example: 1,
  })
  @IsNumber()
  @ToNumber()
  @IsOptional()
  exchangeRate: number = 1;

  @ApiPropertyOptional({
    description: 'Optional external reference number',
    type: String,
    example: 'REF-001',
  })
  @IsString()
  @IsOptional()
  referenceNo: string;

  @ApiPropertyOptional({
    description: 'Optional description of the expense',
    type: String,
    example: 'Monthly rent payment',
  })
  @IsString()
  @IsOptional()
  description: string;

  @ApiPropertyOptional({
    description: 'ID of the branch where the expense occurred',
    type: Number,
    example: 101,
  })
  @IsInt()
  @ToNumber()
  @IsOptional()
  branchId: number;
}

/**
 * Route DTO that also carries the bank (cashflow) transaction id to categorize.
 */
export class CategorizeTransactionAsExpenseRouteDto extends CategorizeTransactionAsExpenseDto {
  @ApiProperty({
    description: 'The bank (cashflow) transaction id to categorize as expense',
    type: Number,
    example: 1001,
  })
  @IsInt()
  @ToNumber()
  @IsNotEmpty()
  cashflowTransactionId: number;
}
