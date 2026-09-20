import { IsOptional } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsIn, IsString } from 'class-validator';
import { ARTICLE_KINDS } from '../constants';

export class GetManagementArticlesQueryDto {
  /**
   * Вид статьи. Перечисление проверяется СТРОГО (этап 17 ТЗ-2).
   *
   * ЗАЧЕМ. Без проверки опечатка в адресе (`?kind=liabilty`) возвращала бы
   * пустой список с кодом 200 — то есть «статей такого вида у вас нет».
   * Экран показал бы пустую вкладку, и человек поверил бы ей. Отказ с
   * понятной причиной лучше правдоподобной пустоты.
   */
  @IsString()
  @IsIn(ARTICLE_KINDS as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({
    example: 'income',
    enum: ARTICLE_KINDS,
    description: 'Filter by kind',
  })
  kind?: string;

  @IsBooleanString()
  @IsOptional()
  @ApiPropertyOptional({
    example: 'true',
    description: 'Return as nested tree instead of flat list',
  })
  tree?: string;
}
