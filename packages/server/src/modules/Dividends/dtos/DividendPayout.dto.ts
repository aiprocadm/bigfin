// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsString, Min } from 'class-validator';

export class CreateDividendPayoutDto {
  @IsDateString()
  @ApiProperty({ example: '2026-06-11', description: 'Дата выплаты' })
  date: string;

  @ToNumber()
  @IsNumber()
  @Min(0.01)
  @ApiProperty({ example: 150000, description: 'Сумма выплаты' })
  amount: number;

  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 1, description: 'Счёт списания (банк/касса)' })
  paymentAccountId: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Дивиденды за II квартал' })
  note?: string;
}
