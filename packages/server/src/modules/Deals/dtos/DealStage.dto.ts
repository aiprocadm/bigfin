// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsString, Min } from 'class-validator';

class CommandDealStageDto {
  // Необязательно в базе: при изменении этапа название можно не присылать
  // (см. EditDealStageDto). Для создания оно обязательно — CreateDealStageDto.
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Проект' })
  name?: string;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 100000 })
  plannedRevenue?: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 40000 })
  plannedCost?: number;

  @ToNumber()
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ example: 1 })
  sortOrder?: number;

  @IsIn(['open', 'closed'])
  @IsOptional()
  @ApiPropertyOptional({ example: 'open', enum: ['open', 'closed'] })
  status?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-03-10', description: 'Close date (required when status=closed)' })
  closedDate?: string;
}

/** При создании этапа название обязательно. */
export class CreateDealStageDto extends CommandDealStageDto {
  @IsString()
  @ApiProperty({ example: 'Проект' })
  name: string;
}

/**
 * При изменении этапа название необязательно: «просто закрыть этап» — это
 * PUT {status, closedDate} без остальных полей. Раньше такой запрос падал
 * с 400, и частичное изменение через API было невозможно.
 */
export class EditDealStageDto extends CommandDealStageDto {}

/** Период выборки этапов: даты обязаны быть датами (раньше не проверялись). */
export class GetDealStagesQueryDto {
  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-01-01' })
  fromDate?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-12-31' })
  toDate?: string;
}
