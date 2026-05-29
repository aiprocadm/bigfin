import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
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
}
