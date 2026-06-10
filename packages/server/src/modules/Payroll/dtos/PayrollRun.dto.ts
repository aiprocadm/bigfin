// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PayrollRunLineDto {
  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 1, description: 'Employee id' })
  employeeId: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 100000, description: 'Оклад за месяц' })
  baseAmount: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 20000, description: 'Премия' })
  bonusAmount?: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 0, description: 'Удержание' })
  deductionAmount?: number;
}

export class CreatePayrollRunDto {
  @IsDateString()
  @ApiProperty({ example: '2026-06-01', description: 'Месяц начисления' })
  periodMonth: string;

  @IsDateString()
  @ApiProperty({ example: '2026-07-05', description: 'Дата выплаты' })
  payDate: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Июнь 2026' })
  note?: string;
}

export class EditPayrollRunDto {
  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-07-05', description: 'Дата выплаты' })
  payDate?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Июнь 2026' })
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollRunLineDto)
  @IsOptional()
  @ApiPropertyOptional({ type: [PayrollRunLineDto] })
  lines?: PayrollRunLineDto[];
}
