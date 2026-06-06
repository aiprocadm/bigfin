// © 2026 Bigfin
import { IsOptional } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { DEAL_STATUSES } from '../constants';

export class GetDealsQueryDto {
  @IsString()
  @IsIn(DEAL_STATUSES as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: DEAL_STATUSES })
  status?: string;
}
