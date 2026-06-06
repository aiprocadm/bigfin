// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

class CommandPaymentRequestDto {
  @ToNumber()
  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 120000, description: 'Amount (positive)' })
  amount: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'RUB', description: 'ISO currency code' })
  currencyCode?: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 3, description: 'Management article id' })
  articleId?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Contact id (payee)' })
  contactId?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 12, description: 'Cash/bank account id' })
  accountId?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Branch id' })
  branchId?: number;

  @IsDateString()
  @ApiProperty({ example: '2026-06-15', description: 'Due date' })
  dueDate: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Оплата аренды за июнь' })
  description?: string;
}

export class CreatePaymentRequestDto extends CommandPaymentRequestDto {}
export class EditPaymentRequestDto extends CommandPaymentRequestDto {}
