import { IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Поля названы в camelCase намеренно: в Bigfin входящие параметры запроса
 * проходят через общий перехватчик, который переименовывает `from_currency`
 * в `fromCurrency`. Со snake_case полями значения не совпадали и молча
 * выбрасывались — запрос курса всегда считал «базовая к базовой»
 * (М3 карты v15). Снаружи адрес не меняется: `?from_currency=USD`.
 */
export class ExchangeRateLatestQueryDto {
  @ApiPropertyOptional({
    name: 'from_currency',
    description: 'The source currency code (ISO 4217)',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'Currency code must be 3 characters (ISO 4217)' })
  fromCurrency?: string;

  @ApiPropertyOptional({
    name: 'to_currency',
    description: 'The target currency code (ISO 4217)',
    example: 'EUR',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'Currency code must be 3 characters (ISO 4217)' })
  toCurrency?: string;
}
