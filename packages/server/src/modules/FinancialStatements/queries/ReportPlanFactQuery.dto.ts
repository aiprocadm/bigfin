// © 2026 Bigfin
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { ReportDateRangeQueryDto } from '@/common/dtos/DateRangeQuery.dto';

/**
 * Запрос плана по строкам отчёта (этап 4 ТЗ, п. 4.4 + остаток О4).
 *
 * К периоду и виду отчёта добавлен МЕТОД УЧЁТА. Без него колонка
 * «Отклонение» считала факт по начислению даже тогда, когда сам отчёт был
 * переключён на кассовый, — и сравнивала план с числом, которого на экране
 * нет. Ничего при этом не падало.
 */
export class ReportPlanFactQueryDto extends ReportDateRangeQueryDto {
  @ApiPropertyOptional({
    description:
      'Метод учёта отчёта: `cash` (по оплате) или `accrual` (по начислению). ' +
      'Факт для колонки «Отклонение» считается тем же методом.',
    enum: ['cash', 'accrual'],
  })
  @IsOptional()
  @IsIn(['cash', 'accrual'])
  basis?: string;
}
