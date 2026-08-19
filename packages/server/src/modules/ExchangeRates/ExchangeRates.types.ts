export interface ExchangeRateLatestDTO {
  fromCurrency?: string;
  toCurrency?: string;
}

export interface EchangeRateLatestPOJO {
  baseCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  /** Курс из последнего успешного ответа: служба сейчас недоступна. */
  isStale?: boolean;
}
