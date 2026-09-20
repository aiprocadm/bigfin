// © 2026 Bigfin
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, ValidateIf } from 'class-validator';

import { DateRangeQueryDto } from '@/common/dtos/DateRangeQuery.dto';

/**
 * Отбор раскрытия суммы отчёта (FIN-004 ТЗ-2).
 *
 * ДВА ИЗМЕРЕНИЯ, А НЕ ЗАМЕНА ОДНОГО ДРУГИМ. Раскрытие по счёту осталось как
 * было — им пользуются Баланс, ОПиУ и прежний ДДС. Раскрытие по статье
 * добавлено рядом: человек, щёлкнувший по «Аренде», ждёт платежи за аренду,
 * а не выписку по бухгалтерскому счёту.
 *
 * Хотя бы одно из двух обязано быть: запрос без обоих вернул бы «операции
 * вообще», то есть бессмысленный список, который выглядит как ответ.
 */
export class DrillDownQueryDto extends DateRangeQueryDto {
  @ValidateIf((dto: DrillDownQueryDto) => dto.articleId === undefined)
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({ description: 'Номер счёта', example: 1001 })
  accountId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({ description: 'Номер статьи учёта', example: 12 })
  articleId?: number;
}
