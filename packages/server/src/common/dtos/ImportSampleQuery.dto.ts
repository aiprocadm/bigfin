// © 2026 Bigfin
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Какой образец для загрузки скачать.
 *
 * Название справочника обязательно: без него раньше уходило `undefined`, и
 * человек получал пустой файл вместо образца — вместе с уверенностью, что
 * загрузка сломана.
 */
export class ImportSampleQueryDto {
  @IsString()
  @MinLength(1)
  @ApiProperty({ description: 'Какой справочник', example: 'customers' })
  resource: string;

  @IsOptional()
  @IsIn(['csv', 'xlsx'])
  @ApiPropertyOptional({ enum: ['csv', 'xlsx'] })
  format?: 'csv' | 'xlsx';
}
