// © 2026 Bigfin
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsNumber, Min } from 'class-validator';

export class CapitalizationQueryDto {
  @IsOptional()
  @IsDateString()
  @ApiProperty({ required: false, example: '2026-01-01' })
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ required: false, example: '2026-12-31' })
  toDate?: string;
}

export class SetProfitMultipleDto {
  /**
   * Множитель прибыли.
   *
   * Наименьшее допустимое — чуть больше нуля, а не ноль: множитель ноль даёт
   * «стоимость 0 ₽», и это выглядит как расчёт, хотя означает «не настроено».
   * Чтобы СНЯТЬ настройку, поле оставляют пустым.
   */
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @ApiProperty({
    description: 'Profit multiple used to value the business',
    example: 4,
    required: false,
    minimum: 0.01,
  })
  profitMultiple?: number | null;
}
