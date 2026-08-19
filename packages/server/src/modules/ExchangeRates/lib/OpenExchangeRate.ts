import Axios from 'axios';
import {
  EchangeRateErrors,
  IExchangeRateService,
  OPEN_EXCHANGE_RATE_LATEST_URL,
} from './types';
import { ServiceError } from '@/modules/Items/ServiceError';

/** Ждать ответа службы курсов дольше нет смысла: экран уже «висит». */
const REQUEST_TIMEOUT_MS = 10000;

export class OpenExchangeRate implements IExchangeRateService {
  private appId: string;

  constructor(appId?: string) {
    this.appId = appId || process.env.OPEN_EXCHANGE_RATE_APP_ID || '';
  }

  /**
   * Gets the latest exchange rate.
   * @param {string} baseCurrency
   * @param {string} toCurrency
   * @returns {Promise<number>}
   */
  public async latest(
    baseCurrency: string,
    toCurrency: string
  ): Promise<number> {
    // Validates the Open Exchange Rate api id early.
    this.validateApiIdExistance();

    try {
      const result = await Axios.get(OPEN_EXCHANGE_RATE_LATEST_URL, {
        // Без таймаута недоступная служба держала запрос бесконечно, а
        // календарь ходит сюда на каждую валютную операцию (М3 карты v15).
        timeout: REQUEST_TIMEOUT_MS,
        params: {
          app_id: this.appId,
          base: baseCurrency,
          symbols: toCurrency,
        },
      });
      const rate = result.data?.rates?.[toCurrency];

      // Раньше здесь стояло «|| 1»: отсутствующий курс превращался в единицу
      // и документ в чужой валюте молча считался один к одному.
      if (typeof rate !== 'number' || !(rate > 0)) {
        throw new ServiceError(
          EchangeRateErrors.EX_RATE_NOT_FOUND,
          'Курс запрошенной валюты не получен.',
        );
      }
      return rate;
    } catch (error) {
      this.handleLatestErrors(error);
    }
  }

  /**
   * Validates the Open Exchange Rate api id.
   * @throws {ServiceError}
   */
  private validateApiIdExistance() {
    if (!this.appId) {
      throw new ServiceError(
        EchangeRateErrors.EX_RATE_SERVICE_API_KEY_REQUIRED,
        'Invalid App ID provided. Please sign up at https://openexchangerates.org/signup, or contact support@openexchangerates.org.'
      );
    }
  }

  /**
   * Handles the latest errors.
   * @param {any} error
   * @throws {ServiceError}
   */
  private handleLatestErrors(error: any) {
    if (error.response?.data?.message === 'missing_app_id') {
      throw new ServiceError(
        EchangeRateErrors.EX_RATE_SERVICE_API_KEY_REQUIRED,
        'Invalid App ID provided. Please sign up at https://openexchangerates.org/signup, or contact support@openexchangerates.org.'
      );
    } else if (error.response?.data?.message === 'invalid_app_id') {
      throw new ServiceError(
        EchangeRateErrors.EX_RATE_SERVICE_API_KEY_REQUIRED,
        'Invalid App ID provided. Please sign up at https://openexchangerates.org/signup, or contact support@openexchangerates.org.'
      );
    } else if (error.response?.data?.message === 'not_allowed') {
      throw new ServiceError(
        EchangeRateErrors.EX_RATE_SERVICE_NOT_ALLOWED,
        'Getting the exchange rate from the given base currency to the given currency is not allowed.'
      );
    } else if (error.response?.data?.message === 'invalid_base') {
      throw new ServiceError(
        EchangeRateErrors.EX_RATE_INVALID_BASE_CURRENCY,
        'The given base currency is invalid.'
      );
    } else if (error.response?.status === 429) {
      throw new ServiceError(
        EchangeRateErrors.EX_RATE_LIMIT_EXCEEDED,
        'Превышен лимит запросов к службе курсов.',
      );
    }
    // Своя деловая ошибка (например «курса нет») уходит как есть; всё
    // остальное — сеть, таймаут, ошибка на их стороне — одним понятным кодом,
    // иначе наружу летит сырая сетевая ошибка и превращается в 500.
    if (error instanceof ServiceError) {
      throw error;
    }
    throw new ServiceError(
      EchangeRateErrors.EX_RATE_SERVICE_UNAVAILABLE,
      'Служба курсов валют не ответила.',
    );
  }
}
