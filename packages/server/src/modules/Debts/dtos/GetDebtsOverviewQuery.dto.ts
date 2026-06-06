// © 2026 Bigfin
import { IsOptional } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsString } from 'class-validator';
import { FinancialSheetBranchesQueryDto } from '@/modules/FinancialStatements/dtos/FinancialSheetBranchesQuery.dto';
import { DEBT_SIDES } from '../constants';

export class GetDebtsOverviewQueryDto extends FinancialSheetBranchesQueryDto {
  @IsString()
  @IsIn(DEBT_SIDES as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: DEBT_SIDES, description: 'Сторона; без неё — обе' })
  side?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    example: '2026-06-05',
    description: 'Дата отсчёта старения (по умолчанию сегодня)',
  })
  asDate?: string;
}
