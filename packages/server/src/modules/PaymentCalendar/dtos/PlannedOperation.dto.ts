import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsPositive,
  IsString,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { DIRECTIONS, FREQUENCIES, STATUSES } from '../constants';

class RecurrenceDto {
  @IsString()
  @IsIn(FREQUENCIES as unknown as string[])
  @ApiProperty({ enum: FREQUENCIES, example: 'monthly' })
  frequency: string;

  @ToNumber()
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 1, description: 'Every N units of the frequency' })
  interval: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 5, description: 'Day of month (monthly)' })
  dayOfMonth?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Weekday 0-6 (weekly)' })
  weekday?: number;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-12-31', description: 'End date' })
  endDate?: string;
}

class CommandPlannedOperationDto {
  @IsString()
  @IsIn(DIRECTIONS as unknown as string[])
  @ApiProperty({ enum: DIRECTIONS, example: 'inflow' })
  direction: string;

  @ToNumber()
  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 200000, description: 'Amount (positive)' })
  amount: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'RUB', description: 'ISO currency code' })
  currencyCode?: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2026-06-15', description: 'Planned date' })
  plannedDate: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 3, description: 'Management article id' })
  articleId?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 12, description: 'Cash/bank account id' })
  accountId?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Branch (direction) id' })
  branchId?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Project id' })
  projectId?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Contact id' })
  contactId?: number;

  @IsString()
  @IsIn(STATUSES as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: STATUSES, example: 'planned' })
  status?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Аванс по договору' })
  description?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => RecurrenceDto)
  @IsOptional()
  @ApiPropertyOptional({ type: RecurrenceDto })
  recurrence?: RecurrenceDto;

  // Автоподтверждение фактом (FT-052 ТЗ-3).
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Закрыть план, когда появится совпадающая операция' })
  autoConfirm?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Сумма факта должна совпасть до копейки' })
  matchExactAmount?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Подтверждать фактом с любым контрагентом' })
  matchAnyContact?: boolean;
}

export class CreatePlannedOperationDto extends CommandPlannedOperationDto {}
export class EditPlannedOperationDto extends CommandPlannedOperationDto {}

/**
 * Материализация плана в реальную операцию (О3 карты v13).
 */
export class MaterializePlannedOperationDto {
  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    example: '2026-09-01',
    description:
      'Occurrence date to materialize (defaults to the planned date)',
  })
  date?: string;
}
export { RecurrenceDto };
