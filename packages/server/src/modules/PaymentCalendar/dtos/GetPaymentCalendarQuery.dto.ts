import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsString } from 'class-validator';
import { FinancialSheetBranchesQueryDto } from '@/modules/FinancialStatements/dtos/FinancialSheetBranchesQuery.dto';

export class GetPaymentCalendarQueryDto extends FinancialSheetBranchesQueryDto {
  @IsDateString()
  @ApiProperty({ example: '2026-06-01', description: 'Horizon start' })
  fromDate: string;

  @IsDateString()
  @ApiProperty({ example: '2026-06-30', description: 'Horizon end' })
  toDate: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 12, description: 'Limit to one cash account' })
  accountId?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'inflow', description: 'Filter by direction' })
  direction?: string;
}
