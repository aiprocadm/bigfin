import { ApiProperty } from '@nestjs/swagger';

export class ExchangeRateLatestResponseDto {
  @ApiProperty({
    description: 'The base currency code',
    example: 'USD',
  })
  baseCurrency: string;

  @ApiProperty({
    description: 'The target currency code',
    example: 'EUR',
  })
  toCurrency: string;

  @ApiProperty({
    description: 'The exchange rate value',
    example: 0.85,
  })
  exchangeRate: number;

  @ApiProperty({
    description:
      'True when the rate comes from the last successful response ' +
      'because the exchange rate service is currently unavailable.',
    example: false,
    required: false,
  })
  isStale?: boolean;
}
