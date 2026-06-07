// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsString } from 'class-validator';
import { ALLOCATION_KEYS } from '../constants';

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

  @IsOptional()
  @ApiPropertyOptional({ example: [1, 2], description: 'Restrict targets (revenue key)' })
  targetDealIds?: number[];

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
