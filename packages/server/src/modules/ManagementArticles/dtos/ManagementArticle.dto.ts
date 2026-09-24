import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import {
  ARTICLE_KINDS,
  ARTICLE_CASHFLOW_SECTIONS,
  COST_BEHAVIORS,
} from '../constants';
import { PL_TYPES } from '../utils/plTypes';

class CommandManagementArticleDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Выручка', description: 'The article name' })
  name: string;

  @ToNumber()
  @IsNumber()
  @IsOptional()
  @ApiProperty({ example: 1, description: 'Parent article id (nesting)' })
  parentId?: number;

  @IsString()
  @IsIn(ARTICLE_KINDS as unknown as string[])
  @ApiProperty({
    example: 'income',
    enum: ARTICLE_KINDS,
    description: 'Income or expense article',
  })
  kind: string;

  @IsString()
  @IsIn(ARTICLE_CASHFLOW_SECTIONS as unknown as string[])
  @IsOptional()
  @ApiProperty({
    example: 'operating',
    enum: ARTICLE_CASHFLOW_SECTIONS,
    description: 'Cash flow statement section (optional)',
  })
  cashflowSection?: string;

  @IsString()
  @IsIn(COST_BEHAVIORS as unknown as string[])
  @IsOptional()
  @ApiProperty({
    example: 'fixed',
    enum: COST_BEHAVIORS,
    description:
      'Постоянный или переменный расход. Только для расходных статей: ' +
      'у выручки постоянных и переменных не бывает.',
  })
  costBehavior?: string;

  /**
   * Ярус управленческого ОПиУ (FT-009 ТЗ-3).
   *
   * Домен и совместимость с видом статьи проверяет служба, а не DTO:
   * ТЗ требует на это ответ 422 с понятным кодом, а проверка DTO отвечает
   * общим 400. `null` — снять ярус (у дочерней статьи это «как у
   * родителя»).
   */
  // Пустая строка из формы — это «не выбрано», в базу она ложится как null.
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'direct_variable',
    enum: PL_TYPES,
    nullable: true,
    required: false,
    description:
      'Ярус в управленческом отчёте о прибыли. Только у доходных и ' +
      'расходных статей; пусто у дочерней — как у родителя.',
  })
  plType?: string | null;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiProperty({ example: 0, description: 'Sort order within the tree' })
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: true, description: 'Soft on/off switch' })
  active?: boolean;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @ApiProperty({
    example: [1001, 1002],
    description: 'Account ids rolled up into this article',
    type: [Number],
  })
  accountIds?: number[];
}

export class CreateManagementArticleDto extends CommandManagementArticleDto {}
export class EditManagementArticleDto extends CommandManagementArticleDto {}
