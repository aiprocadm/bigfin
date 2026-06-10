// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsString, Min } from 'class-validator';
import { EMPLOYMENT_TYPES } from '../constants';

class CommandEmployeeDto {
  @IsString()
  @ApiProperty({ example: 'Иванова Мария Петровна', description: 'ФИО' })
  fullName: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Менеджер по продажам' })
  position?: string;

  @IsIn(EMPLOYMENT_TYPES as unknown as string[])
  @ApiProperty({ example: 'staff', description: 'staff|gph|npd|ip' })
  employmentType: string;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 100000, description: 'Оклад по умолчанию' })
  defaultSalary?: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ example: true })
  active?: boolean;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Работает с 2024 года' })
  note?: string;
}

export class CreateEmployeeDto extends CommandEmployeeDto {}
export class EditEmployeeDto extends CommandEmployeeDto {}
