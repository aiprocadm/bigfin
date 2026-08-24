// © 2026 Bigfin
import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RuReconciliationActQueryDto {
  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Начало периода сверки',
    example: '2026-07-01',
  })
  fromDate: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Конец периода сверки',
    example: '2026-09-30',
  })
  toDate: string;
}
