import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { BUDGET_TYPES, SCENARIOS } from '../constants';

class CommandBudgetDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Бюджет 2026', description: 'Budget name' })
  name: string;

  @IsString()
  @IsIn(BUDGET_TYPES as unknown as string[])
  @ApiProperty({ enum: BUDGET_TYPES, example: 'bdir' })
  type: string;

  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 2026, description: 'Fiscal year' })
  fiscalYear: number;

  @IsString()
  @IsIn(SCENARIOS as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: SCENARIOS, example: 'realistic' })
  activeScenario?: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Branch id (optional)' })
  branchId?: number;
}

export class CreateBudgetDto extends CommandBudgetDto {}
export class EditBudgetDto extends CommandBudgetDto {}
