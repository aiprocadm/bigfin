// © 2026 Bigfin
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  ValidateIf,
} from 'class-validator';

import { MANAGERIAL_PL_TYPES } from '../modules/ManagerialProfitLoss/computeManagerialTiers';

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
/** Номер строкой, несколько — списком строк: приводим к списку чисел. */
function toIdList({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === '') return undefined;
  return (Array.isArray(value) ? value : [value])
    .filter((item) => item !== '' && item !== null && item !== undefined)
    .map((item) => Number(item));
}

export class DrillDownQueryDto extends DateRangeQueryDto {
  // Счёт нужен, только когда не пришли ни статья, ни ярус.
  @ValidateIf(
    (dto: DrillDownQueryDto) =>
      dto.articleId === undefined && dto.plType === undefined,
  )
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({ description: 'Номер счёта', example: 1001 })
  accountId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({ description: 'Номер статьи учёта', example: 12 })
  articleId?: number;

  /**
   * Отбор отчёта, из ячейки которого раскрывают сумму (FT-004 ТЗ-3).
   *
   * Без него панель показала бы операции всей группы, а ячейка — одного
   * юрлица, и итог панели не сошёлся бы с числом, по которому щёлкнули.
   */
  @Transform(toIdList)
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ApiPropertyOptional({ type: [Number], description: 'Подразделения' })
  branchesIds?: number[];

  @Transform(toIdList)
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ApiPropertyOptional({ type: [Number], description: 'Юрлица; пусто — сводно' })
  legalEntityIds?: number[];

  @Transform(toIdList)
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ApiPropertyOptional({ type: [Number], description: 'Направления' })
  projectsIds?: number[];

  /**
   * Границы ВСЕГО отчёта, а не кликнутой колонки. По ним считается признак
   * «оплачено деньгами» — ровно как в отчёте: документ, оплаченный 31
   * января и проведённый в расходы 1 февраля, стоит в февральской колонке.
   */
  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ description: 'Начало всего отчёта' })
  reportFrom?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ description: 'Конец всего отчёта' })
  reportTo?: string;

  /** Метод учёта отчёта (FT-010): по начислению — все проводки, не только оплаченные. */
  @IsOptional()
  @IsIn(['cash', 'accrual'])
  @ApiPropertyOptional({ enum: ['cash', 'accrual'] })
  basis?: 'cash' | 'accrual';

  /** Ярус прибыли: раскрыть весь ярус или статью только в её ярусе. */
  @IsOptional()
  @IsIn(MANAGERIAL_PL_TYPES as unknown as string[])
  @ApiPropertyOptional({ enum: MANAGERIAL_PL_TYPES })
  plType?: string;
}
