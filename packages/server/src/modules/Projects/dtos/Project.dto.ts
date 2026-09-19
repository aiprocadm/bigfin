// © 2026 Bigfin
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { PROJECT_STATUS } from '../models/Project.model';

/**
 * Направление (проект) — разрез операций.
 *
 * Полей намеренно мало. Направление в Bigfin — это ярлык для раскладки денег
 * («розница», «опт», «объект на Ленина»), а не карточка проекта со сроками и
 * бюджетом: сроками и работами здесь заняты «Сделки». Лишние поля в форме —
 * это вопросы, на которые предприниматель не знает ответа и которые всё равно
 * останутся пустыми.
 */
export class CommandProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({ example: 'Розница', description: 'Название направления' })
  name: string;

  @IsOptional()
  @IsIn([PROJECT_STATUS.ACTIVE, PROJECT_STATUS.ARCHIVED])
  @ApiPropertyOptional({
    enum: [PROJECT_STATUS.ACTIVE, PROJECT_STATUS.ARCHIVED],
    default: PROJECT_STATUS.ACTIVE,
    description: 'Убранное направление не предлагается в новых операциях',
  })
  status?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Контрагент направления' })
  contactId?: number;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ description: 'Срок, YYYY-MM-DD' })
  deadline?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Оценка стоимости' })
  costEstimate?: number;
}

export class CreateProjectDto extends CommandProjectDto {}
export class EditProjectDto extends CommandProjectDto {}
