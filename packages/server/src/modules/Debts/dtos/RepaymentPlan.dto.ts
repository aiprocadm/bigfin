// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { DEBT_SIDES, INSTALLMENT_STATUSES } from '../constants';

class InstallmentDto {
  @IsDateString()
  @ApiProperty({ example: '2026-07-01' })
  dueDate: string;

  @ToNumber()
  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 50000 })
  amount: number;

  @IsString()
  @IsIn(INSTALLMENT_STATUSES as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: INSTALLMENT_STATUSES, example: 'planned' })
  status?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Первый транш' })
  note?: string;
}

export class CommandRepaymentPlanDto {
  @IsString()
  @IsIn(DEBT_SIDES as unknown as string[])
  @ApiProperty({ enum: DEBT_SIDES })
  side: string;

  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 1, description: 'Contact id' })
  contactId: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'invoice' })
  sourceType?: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 12 })
  sourceId?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'RUB' })
  currencyCode?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Рассрочка на 3 месяца' })
  description?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  @ApiProperty({ type: [InstallmentDto] })
  installments: InstallmentDto[];
}

export class CreateRepaymentPlanDto extends CommandRepaymentPlanDto {}
export class EditRepaymentPlanDto extends CommandRepaymentPlanDto {}
export { InstallmentDto };
