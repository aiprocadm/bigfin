// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Плановая оплата внутри заявки (FT-053 ТЗ-3). */
export class PaymentRequestInstallmentDto {
  @IsDateString()
  @ApiProperty({ example: '2026-10-10' })
  dueDate: string;

  @ToNumber()
  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 600000 })
  amount: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1000, description: 'Счёт оплаты; пусто — счёт заявки' })
  accountId?: number;
}

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

  // Срок необязателен, если есть плановые оплаты: тогда он — первая из них.
  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-06-15', description: 'Due date' })
  dueDate?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Оплата аренды за июнь' })
  description?: string;

  // FT-053 ТЗ-3 (D17): ссылка на документ и обоснование платежа.
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  @ApiPropertyOptional({ example: 'https://disk.example/счёт-15.pdf' })
  documentUrl?: string;

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  @ApiPropertyOptional({ example: 'Предоплата поставщику по договору 12' })
  justification?: string;

  // FT-053 (D18): несколько плановых оплат — дата, сумма, счёт.
  @IsArray()
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => PaymentRequestInstallmentDto)
  @IsOptional()
  @ApiPropertyOptional({ type: [PaymentRequestInstallmentDto] })
  installments?: PaymentRequestInstallmentDto[];

  // Сохранить черновиком — без отправки на согласование.
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ example: false })
  asDraft?: boolean;
}

export class CreatePaymentRequestDto extends CommandPaymentRequestDto {}
export class EditPaymentRequestDto extends CommandPaymentRequestDto {}
