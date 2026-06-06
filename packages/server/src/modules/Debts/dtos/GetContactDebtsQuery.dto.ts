// © 2026 Bigfin
import { IsOptional } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsString } from 'class-validator';
import { DEBT_SIDES } from '../constants';

export class GetContactDebtsQueryDto {
  @IsString()
  @IsIn(DEBT_SIDES as unknown as string[])
  @ApiProperty({ enum: DEBT_SIDES })
  side: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-06-05' })
  asDate?: string;
}
