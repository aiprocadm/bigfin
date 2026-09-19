// © 2026 Bigfin
import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Список номеров неразнесённых операций в доводах запроса.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ВИД. Раньше довод брался поштучно и не проверялся: запрос
 * без него доходил до расчёта с `[undefined]`, из которого получался `NaN`, и
 * действие МОЛЧА не делало ничего. Ни ошибки, ни следа — человек нажимал
 * кнопку, а операции оставались как были.
 *
 * Один номер в запросе приходит строкой, несколько — массивом строк. Приводим
 * к массиву чисел здесь, чтобы каждая ручка не делала это по-своему.
 */
export class UncategorizedTransactionIdsQueryDto {
  @Transform(({ value }) =>
    (Array.isArray(value) ? value : [value])
      .filter((item) => item !== undefined && item !== null && item !== '')
      .map((item) => Number(item)),
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @ApiProperty({
    description: 'Номера неразнесённых операций',
    example: [11, 12],
    type: [Number],
  })
  uncategorizedTransactionIds: number[];
}
