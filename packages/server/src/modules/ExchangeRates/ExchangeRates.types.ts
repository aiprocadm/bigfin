export interface ExchangeRateLatestDTO {
  fromCurrency?: string;
  toCurrency?: string;
  /** Дата курса (YYYY-MM-DD); без неё — курс на сегодня. */
  date?: string;
}

export interface EchangeRateLatestPOJO {
  baseCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  /** Курс из последнего успешного ответа: служба сейчас недоступна. */
  isStale?: boolean;
}
