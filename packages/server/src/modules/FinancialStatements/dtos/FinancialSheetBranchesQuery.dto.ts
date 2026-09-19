import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Разрезы, общие для всех отчётов: подразделения и юрлица.
 */
export class FinancialSheetBranchesQueryDto {
  @IsArray()
  @IsOptional()
  branchesIds: Array<number>;

  /**
   * Разрез по юрлицам (этап 7 ТЗ, §7.1).
   *
   * Пусто — ВСЕ юрлица, то есть сводный отчёт по группе. Именно так отчёт и
   * вёл себя до появления разреза, поэтому у тех, кто ничего не выбирал,
   * ничего не изменится.
   *
   * Один номер приходит строкой, несколько — списком строк. Приводим к
   * списку чисел здесь, чтобы отчёты не делали это каждый по-своему: разные
   * отчёты, отбирающие по-разному, расходятся цифрами между страницами.
   */
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : (Array.isArray(value) ? value : [value])
          .filter((item) => item !== '' && item !== null && item !== undefined)
          .map((item) => Number(item)),
  )
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ApiPropertyOptional({
    description: 'Номера юрлиц. Пусто — сводно по всей группе.',
    example: [1, 2],
    type: [Number],
  })
  legalEntityIds?: Array<number>;
}
