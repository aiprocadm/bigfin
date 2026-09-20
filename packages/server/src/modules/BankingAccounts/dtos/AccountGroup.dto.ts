// © 2026 Bigfin
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Создание и переименование группы счетов (FIN-017 ТЗ-2). */
export class CommandAccountGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @ApiProperty({ example: 'Операционные', description: 'Имя группы' })
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({ example: 1, description: 'Порядок в списке' })
  sortOrder?: number;
}

/**
 * Перенос счёта в группу.
 *
 * `null` — вынуть счёт из группы, то есть вернуть в «Нераспределённые».
 * Отдельного действия «убрать из группы» нет намеренно: это тот же перенос,
 * и два действия там, где достаточно одного, — два места для ошибки.
 */
export class AssignAccountGroupDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({ example: 3, description: 'Группа; пусто — убрать' })
  groupId?: number | null;
}
