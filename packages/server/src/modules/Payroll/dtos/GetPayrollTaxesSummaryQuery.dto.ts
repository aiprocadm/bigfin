// © 2026 Bigfin
import { ToNumber } from '@/common/decorators/Validators';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class GetPayrollTaxesSummaryQueryDto {
  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 2026, description: 'Год сводки' })
  year: number;
}
