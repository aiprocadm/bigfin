export interface IExchangeRateService {
  latest(
    baseCurrency: string,
    toCurrency: string,
    /** Дата курса (YYYY-MM-DD); без неё — курс на сегодня. */
    date?: string,
  ): Promise<number>;
}

export enum ExchangeRateServiceType {
  OpenExchangeRate = 'OpenExchangeRate',
  CbrRu = 'CbrRu',
}

export enum EchangeRateErrors {
  EX_RATE_SERVICE_NOT_ALLOWED = 'EX_RATE_SERVICE_NOT_ALLOWED',
  EX_RATE_LIMIT_EXCEEDED = 'EX_RATE_LIMIT_EXCEEDED',
  EX_RATE_SERVICE_API_KEY_REQUIRED = 'EX_RATE_SERVICE_API_KEY_REQUIRED',
  EX_RATE_INVALID_BASE_CURRENCY = 'EX_RATE_INVALID_BASE_CURRENCY',
  // Служба курсов не ответила: сеть, таймаут, ошибка на их стороне.
  EX_RATE_SERVICE_UNAVAILABLE = 'EX_RATE_SERVICE_UNAVAILABLE',
  // Ответ пришёл, но курса запрошенной валюты в нём нет.
  EX_RATE_NOT_FOUND = 'EX_RATE_NOT_FOUND',
  // Поставщик не умеет курс на дату (исторический даёт только ЦБ РФ).
  EX_RATE_DATE_UNSUPPORTED = 'EX_RATE_DATE_UNSUPPORTED',
}

export const OPEN_EXCHANGE_RATE_LATEST_URL =
  'https://openexchangerates.org/api/latest.json';

/** Официальные дневные курсы Банка России (без ключа и предела запросов). */
export const CBR_XML_DAILY_URL = 'https://www.cbr.ru/scripts/XML_daily.asp';