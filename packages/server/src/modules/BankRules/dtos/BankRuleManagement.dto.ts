// © 2026 Bigfin
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ToNumber } from '@/common/decorators/Validators';
import { MAX_RULE_CONDITIONS } from '../utils/matchRule';

/** Новый порядок правил сверху вниз (FT-035). */
export class ReorderBankRulesDto {
  @ApiProperty({ type: [Number], example: [3, 1, 2] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  ids: number[];
}

export class PauseBankRuleDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  paused: boolean;
}

class ConflictConditionDto {
  @IsString()
  field: string;

  @IsString()
  comparator: string;

  @IsOptional()
  value: string;
}

/**
 * Черновик правила для проверки конфликта (FT-035). Проверка идёт ДО
 * сохранения, поэтому название и действия не нужны — только охват.
 */
export class BankRuleConflictsDto {
  @ApiPropertyOptional({ description: 'Номер правила при правке: с собой не спорит' })
  @IsOptional()
  @ToNumber()
  @IsInt()
  id?: number;

  @IsOptional()
  @ToNumber()
  @IsInt()
  order?: number;

  @IsOptional()
  @ToNumber()
  @IsInt()
  applyIfAccountId?: number | null;

  @IsOptional()
  @IsIn(['deposit', 'withdrawal', null])
  applyIfTransactionType?: string | null;

  @IsOptional()
  @IsIn(['and', 'or'])
  conditionsType?: string;

  @IsArray()
  @ArrayMaxSize(MAX_RULE_CONDITIONS)
  @ValidateNested({ each: true })
  @Type(() => ConflictConditionDto)
  conditions: ConflictConditionDto[];
}
