// © 2026 Bigfin
import { IsOptional } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetFixedAssetsQueryDto {
  /** Запрос из поиска в шапке (Р4 карты v43). */
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Search keyword.' })
  keyword?: string;
}
