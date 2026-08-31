// © 2026 Bigfin
import { IsOptional } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { REQUEST_STATUSES } from '../constants';

export class GetPaymentRequestsQueryDto {
  @IsString()
  @IsIn(REQUEST_STATUSES as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: REQUEST_STATUSES })
  status?: string;

  /** Запрос из поиска в шапке (Р3 карты v43). */
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Search keyword.' })
  keyword?: string;
}
