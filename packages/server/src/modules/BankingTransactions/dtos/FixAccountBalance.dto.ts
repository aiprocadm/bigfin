// © 2026 Bigfin
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, Matches } from 'class-validator';
import { ToNumber } from '@/common/decorators/Validators';

/**
 * Фиксация остатка денежного счёта на конец дня (FT-071 ТЗ-3).
 *
 * Дата — строкой `ГГГГ-ММ-ДД`, без времени: остаток фиксируется «на конец
 * дня», и время с часовым поясом здесь только сдвигали бы день.
 */
export class FixAccountBalanceDto {
  @ApiProperty({ description: 'Денежный счёт', example: 12 })
  @IsNotEmpty()
  @ToNumber()
  @IsInt()
  accountId: number;

  @ApiProperty({ description: 'День, на конец которого фиксируется остаток', example: '2026-09-23' })
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Дата — в виде ГГГГ-ММ-ДД, например 2026-09-23',
  })
  date: string;

  @ApiProperty({ description: 'Остаток по выписке, в валюте счёта', example: 125000.5 })
  @IsNotEmpty()
  @ToNumber()
  @IsNumber()
  amount: number;

  // Счёт в чужой валюте требует курса для проводки корректировки — как и
  // любая денежная операция по такому счёту.
  @ApiPropertyOptional({ description: 'Курс валюты счёта к базовой', example: 1 })
  @IsOptional()
  @ToNumber()
  @IsNumber()
  exchangeRate?: number;
}
