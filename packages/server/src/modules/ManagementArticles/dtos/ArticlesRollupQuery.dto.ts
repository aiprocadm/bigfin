import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { ToNumber } from '@/common/decorators/Validators';
import { FinancialSheetBranchesQueryDto } from '@/modules/FinancialStatements/dtos/FinancialSheetBranchesQuery.dto';

export class ArticlesRollupQueryDto extends FinancialSheetBranchesQueryDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-01-01', description: 'From date' })
  fromDate?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-12-31', description: 'To date' })
  toDate?: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 5, description: 'Deal (project) id' })
  projectId?: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    example: true,
    description: 'Include only transactions not tied to any deal (projectId IS NULL)',
  })
  unassignedProject?: boolean;
}
