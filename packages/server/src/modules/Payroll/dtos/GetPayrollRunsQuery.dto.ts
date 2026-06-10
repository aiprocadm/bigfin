// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class GetPayrollRunsQueryDto {
  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 2026, description: 'Фильтр по году' })
  year?: number;
}
