import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsString } from 'class-validator';

export class GetPlannedOperationsQueryDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'inflow', description: 'Filter by direction' })
  direction?: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 12, description: 'Filter by account id' })
  accountId?: number;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-06-01' })
  fromDate?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-06-30' })
  toDate?: string;
}
