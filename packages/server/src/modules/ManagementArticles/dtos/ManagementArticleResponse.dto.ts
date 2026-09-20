import { ApiProperty } from '@nestjs/swagger';

export class ManagementArticleResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Выручка' })
  name: string;

  @ApiProperty({ example: null, nullable: true })
  parentId: number | null;

  @ApiProperty({ example: 'income' })
  kind: string;

  @ApiProperty({ example: 'operating', nullable: true })
  cashflowSection: string | null;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty({ example: true })
  active: boolean;

  /**
   * Устойчивый ключ системной статьи; у заведённых человеком — `null`.
   *
   * Отдаётся наружу, потому что по нему экран отличает системную статью:
   * её можно переименовать, но нельзя удалить и нельзя сменить ей вид.
   * Считать «системность» на витрине по имени нельзя — имя меняется.
   */
  @ApiProperty({ example: 'loan_received', nullable: true })
  seedKey: string | null;
}
