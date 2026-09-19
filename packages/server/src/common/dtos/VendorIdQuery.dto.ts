// © 2026 Bigfin
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Обязательный номер поставщика в доводах запроса.
 *
 * Раньше довод брался поштучно и не проверялся: без него в расчёт уходило
 * `undefined`, и список счетов к оплате оказывался пустым — как будто у
 * поставщика их нет. Пустота и «вы не указали поставщика» выглядят
 * одинаково, а означают разное.
 */
export class VendorIdQueryDto {
  @Type(() => Number)
  @IsInt()
  @ApiProperty({ description: 'Номер поставщика', example: 1001 })
  vendorId: number;
}
