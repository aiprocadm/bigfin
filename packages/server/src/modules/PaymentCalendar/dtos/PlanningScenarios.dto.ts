// © 2026 Bigfin
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ToNumber } from '@/common/decorators/Validators';
import { FORECAST_GRANULARITIES } from '../utils/aggregateForecast';
import { MATRIX_GROUPINGS } from '../queries/GetCalendarMatrix.service';

/** Матрица «план / факт» (FT-050 ТЗ-3). */
export class CalendarMatrixQueryDto {
  @IsDateString()
  @IsNotEmpty()
  fromDate: string;

  @IsDateString()
  @IsNotEmpty()
  toDate: string;

  @IsOptional()
  @IsIn(FORECAST_GRANULARITIES as unknown as string[])
  granularity?: string;

  @IsOptional()
  @IsIn(MATRIX_GROUPINGS as unknown as string[])
  groupBy?: string;

  @IsOptional()
  @ToNumber()
  @IsInt()
  accountId?: number;
}

/** Горизонт сценария «что можно перенести» (FT-051). */
export class GapScenariosQueryDto {
  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(7)
  @Max(365)
  horizonDays?: number;

  @IsOptional()
  @ToNumber()
  @IsInt()
  accountId?: number;
}

export class PlannedMoveDto {
  @ToNumber()
  @IsInt()
  plannedOperationId: number;

  @IsDateString()
  date: string;
}

/** «Что если перенести» — без сохранения (FT-051). */
export class WhatIfDto extends GapScenariosQueryDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PlannedMoveDto)
  moves: PlannedMoveDto[];
}

/** «Перенести» — новая дата разового плана (FT-051). */
export class ReschedulePlannedOperationDto {
  @IsDateString()
  @IsNotEmpty()
  plannedDate: string;
}
