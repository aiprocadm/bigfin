// © 2026 Bigfin
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Обязательный период в доводах запроса.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ВИД. Раньше такие доводы брались поштучно
 * (`@Query('from') from: string`) и не проверялись никем. Запрос без даты не
 * падал на проверке — он доходил до расчёта и падал ТАМ, а наружу уходило
 * «Internal server error»: ответ, который не говорит вызывающему ничего —
 * ни что не так, ни что чинить.
 *
 * Проверено вживую на стенде: `GET /api/vat-analysis` без дат отвечал
 * ровно этим. Для интеграции, которую пишет человек без доступа к нашим
 * журналам, такой ответ бесполезен.
 *
 * С видом-описанием тот же запрос получает 400 и текст «from must be a valid
 * ISO 8601 date string» — из него понятно, что делать.
 */
export class DateRangeQueryDto {
  @IsDateString()
  @ApiProperty({ description: 'Начало периода, YYYY-MM-DD', example: '2026-01-01' })
  from: string;

  @IsDateString()
  @ApiProperty({ description: 'Конец периода, YYYY-MM-DD', example: '2026-12-31' })
  to: string;
}

/** То же, но с именами `fromDate`/`toDate` — так их зовут часть ручек. */
export class DateRangeDatesQueryDto {
  @IsDateString()
  @ApiProperty({ description: 'Начало периода, YYYY-MM-DD', example: '2026-01-01' })
  fromDate: string;

  @IsDateString()
  @ApiProperty({ description: 'Конец периода, YYYY-MM-DD', example: '2026-12-31' })
  toDate: string;
}

/** Период плюс счёт — для выгрузок и раскрытия сумм. */
export class AccountDateRangeQueryDto extends DateRangeQueryDto {
  @Type(() => Number)
  @IsInt()
  @ApiProperty({ description: 'Номер счёта', example: 1001 })
  accountId: number;
}

/** Период плюс вид отчёта. */
export class ReportDateRangeQueryDto extends DateRangeQueryDto {
  @IsString()
  @MinLength(1)
  @ApiProperty({
    description: 'Какой отчёт: profit_loss | cash_flow',
    example: 'profit_loss',
  })
  report: string;
}
