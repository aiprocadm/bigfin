import { ServiceError } from '@/modules/Items/ServiceError';

export const EXCHANGE_RATE_ERRORS = {
  EXCHANGE_RATE_REQUIRED: 'EXCHANGE_RATE_REQUIRED',
};

/**
 * Документ в чужой валюте обязан нести настоящий курс (С4 карты v14).
 *
 * Раньше курс был необязательным полем, а «|| 1» в трансформерах молча
 * подставлял единицу — расход в EUR проводился по курсу 1 прямо в журнал.
 * Для документов в базовой валюте (или когда валюта неизвестна) поведение
 * прежнее — курс не требуется.
 */
export function assertValidExchangeRate({
  currencyCode,
  baseCurrency,
  exchangeRate,
}: {
  currencyCode?: string;
  baseCurrency?: string;
  exchangeRate?: number;
}): void {
  if (!currencyCode || !baseCurrency || currencyCode === baseCurrency) {
    return;
  }
  if (!(Number(exchangeRate) > 0)) {
    throw new ServiceError(EXCHANGE_RATE_ERRORS.EXCHANGE_RATE_REQUIRED);
  }
}
