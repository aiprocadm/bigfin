import { IsOptional } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsString } from 'class-validator';
import { FinancialSheetBranchesQueryDto } from '@/modules/FinancialStatements/dtos/FinancialSheetBranchesQuery.dto';
import { SCENARIOS } from '../constants';

export class GetBudgetPlanFactQueryDto extends FinancialSheetBranchesQueryDto {
  @IsDateString()
  @ApiProperty({ example: '2026-03-01', description: 'Period start (month)' })
  fromDate: string;

  @IsDateString()
  @ApiProperty({ example: '2026-03-31', description: 'Period end (month)' })
  toDate: string;

  @IsString()
  @IsIn(SCENARIOS as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: SCENARIOS, example: 'realistic' })
  scenario?: string;
}
