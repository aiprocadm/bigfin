import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { ARTICLE_KINDS, CASHFLOW_SECTIONS } from '../constants';

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
  @IsIn(CASHFLOW_SECTIONS as unknown as string[])
  @IsOptional()
  @ApiProperty({
    example: 'operating',
    enum: CASHFLOW_SECTIONS,
    description: 'Cash flow statement section (optional)',
  })
  cashflowSection?: string;

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
