// © 2026 Bigfin
import { IsOptional } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetCreditsQueryDto {
  /** Запрос из поиска в шапке (Ш1 карты v48). */
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Search keyword.' })
  keyword?: string;
}
