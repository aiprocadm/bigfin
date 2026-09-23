// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsString } from 'class-validator';
import { ALLOCATION_KEYS, ALLOCATION_TARGET_TYPES } from '../constants';

class CommandCostAllocationRuleDto {
  @IsString()
  @ApiProperty({ example: 'Аренда по выручке' })
  name: string;

  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 42, description: 'Source cost article id' })
  sourceArticleId: number;

  @IsIn(ALLOCATION_KEYS as unknown as string[])
  @ApiProperty({ example: 'revenue', enum: ALLOCATION_KEYS })
  allocationKey: string;

  @IsObject()
  @IsOptional()
  @ApiPropertyOptional({ example: { '1': 3, '2': 1 }, description: 'dealId→weight (manual_share)' })
  manualShares?: Record<string, number>;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ example: [1, 2], description: 'Restrict targets (revenue key)' })
  targetDealIds?: number[];

  /** Между кем делится пул (FT-011 ТЗ-3). По умолчанию — сделки, как было. */
  @IsIn(ALLOCATION_TARGET_TYPES as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: ALLOCATION_TARGET_TYPES, default: 'deal' })
  targetType?: 'deal' | 'direction';

  /** Цели; пусто — все цели своего вида. */
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ example: [1, 2], description: 'Цели распределения' })
  targetIds?: number[];

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-01-01' })
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-12-31' })
  validTo?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ example: true })
  isActive?: boolean;
}

export class CreateCostAllocationRuleDto extends CommandCostAllocationRuleDto {}
export class EditCostAllocationRuleDto extends CommandCostAllocationRuleDto {}
