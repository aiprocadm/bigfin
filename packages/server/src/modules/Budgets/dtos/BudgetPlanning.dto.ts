// © 2026 Bigfin
import { IsIn, IsInt, IsNumber, IsString, Max, Min } from 'class-validator';
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { SCENARIOS } from '../constants';

/** Автозаполнение бюджета из истории (FT-054 ТЗ-3). */
export class BudgetAutofillDto {
  /** Год истории; пусто — год перед годом бюджета. */
  @ToNumber()
  @IsInt()
  @IsOptional()
  sourceYear?: number;

  /** Коэффициент, %: +10 — на десять процентов больше факта. */
  @ToNumber()
  @IsNumber()
  @Min(-100)
  @Max(1000)
  @IsOptional()
  coefficientPercent?: number;

  @IsString()
  @IsIn(SCENARIOS as unknown as string[])
  @IsOptional()
  scenario?: string;
}

/** Денежный план по месяцам (FT-056 ТЗ-3). */
export class BudgetCashPlanQueryDto {
  @IsString()
  @IsIn(SCENARIOS as unknown as string[])
  @IsOptional()
  scenario?: string;

  /** Пусто — привязка из настроек бюджета. */
  @IsString()
  @IsIn(['fact', 'plan'])
  @IsOptional()
  anchor?: string;
}
