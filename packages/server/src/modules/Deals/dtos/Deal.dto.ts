// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  MinLength,
} from 'class-validator';
import { DEAL_STATUSES } from '../constants';

class CommandDealDto {
  @IsString()
  @MinLength(1)
  @ApiProperty({ example: 'Сайт «Ромашка»', description: 'Deal name' })
  name: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 3, description: 'Client contact id' })
  contactId?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    example: 5,
    description: 'Responsible manager (employee id)',
    nullable: true,
  })
  managerId?: number | null;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-06-30', description: 'Deadline' })
  deadline?: string;

  @ToNumber()
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ example: 350000, description: 'Budget / cost estimate' })
  costEstimate?: number;

  @IsString()
  @IsIn(DEAL_STATUSES as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: DEAL_STATUSES })
  status?: string;
}

export class CreateDealDto extends CommandDealDto {}
export class EditDealDto extends CommandDealDto {}
