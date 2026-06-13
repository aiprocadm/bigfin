// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreateCreditDto {
  @IsString()
  @ApiProperty({ example: 'Кредит Сбербанк' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'ПАО Сбербанк' })
  lender?: string;

  @ToNumber()
  @IsNumber()
  @Min(0.01)
  @ApiProperty({ example: 1000000 })
  principalAmount: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 18.5, description: 'Годовая ставка, %' })
  annualInterestRate: number;

  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 24, description: 'Срок, месяцев' })
  termMonths: number;

  @IsDateString()
  @ApiProperty({ example: '2026-06-15', description: 'Дата выдачи' })
  startDate: string;

  @IsIn(['annuity', 'differentiated'])
  @ApiProperty({ example: 'annuity', enum: ['annuity', 'differentiated'] })
  scheduleType: 'annuity' | 'differentiated';

  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 1, description: 'Счёт зачисления/списания (банк/касса)' })
  paymentAccountId: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Договор №123 от 15.06.2026' })
  note?: string;
}

export class EditCreditDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  lender?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
