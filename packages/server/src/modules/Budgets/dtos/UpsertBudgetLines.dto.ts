import { ToNumber } from '@/common/decorators/Validators';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { SCENARIOS } from '../constants';

class BudgetLineInputDto {
  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 3, description: 'Article id' })
  articleId: number;

  @IsDateString()
  @ApiProperty({
    example: '2026-03-01',
    description: 'Period (first day of month)',
  })
  period: string;

  @IsIn(SCENARIOS as unknown as string[])
  @ApiProperty({ enum: SCENARIOS, example: 'realistic' })
  scenario: string;

  @ToNumber()
  @IsNumber()
  @ApiProperty({ example: 150000, description: 'Planned amount' })
  plannedAmount: number;
}

export class UpsertBudgetLinesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetLineInputDto)
  @ApiProperty({ type: [BudgetLineInputDto] })
  lines: BudgetLineInputDto[];
}

export { BudgetLineInputDto };
