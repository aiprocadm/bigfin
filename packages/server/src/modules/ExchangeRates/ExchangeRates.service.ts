import { Injectable } from '@nestjs/common';
import { ExchangeRate } from './lib/ExchangeRate';
import { ExchangeRateServiceType, IExchangeRateService } from './lib/types';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import {
  ExchangeRateLatestDTO,
  EchangeRateLatestPOJO,
} from './ExchangeRates.types';

/**
 * Курсы валют меняются раз в сутки, а спрашивают их пачками: платёжный
 * календарь зовёт службу на каждый счёт и каждую плановую операцию. Час
 * жизни в памяти убирает десятки одинаковых внешних запросов на одно
 * открытие экрана (М3 карты v15).
 */
const RATE_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Валюты приходят из запроса пользователя, поэтому пар может быть сколько
 * угодно. Потолок держит память в узде; реальной организации хватает
 * десятка пар, так что вытеснение в жизни не сработает.
 */
const RATE_CACHE_MAX_ENTRIES = 1000;

interface CachedRate {
  exchangeRate: number;
  fetchedAt: number;
}

@Injectable()
export class ExchangeRatesService {
  /** Служба — синглтон, поэтому кэш живёт вместе с приложением. */
  private readonly cache = new Map<string, CachedRate>();

  constructor(private readonly tenancyContext?: TenancyContext) {}

  /**
   * Gets the latest exchange rate.
   * @param {number} tenantId
   * @param {ExchangeRateLatestDTO} exchangeRateLatestDTO
   * @returns {EchangeRateLatestPOJO}
   */
  public async latest(
    tenantId: number,
    exchangeRateLatestDTO: ExchangeRateLatestDTO,
  ): Promise<EchangeRateLatestPOJO> {
    // Assign the organization base currency as a default currency
    // if no currency is provided.
    // Спрашиваем базу только если валюта не названа: календарь зовёт службу
    // в цикле, и лишний запрос стоил бы десятков обращений к базе на экран.
    const needsBaseCurrency =
      !exchangeRateLatestDTO.fromCurrency || !exchangeRateLatestDTO.toCurrency;
    const baseCurrency = needsBaseCurrency
      ? await this.getBaseCurrency()
      : null;

    const fromCurrency = exchangeRateLatestDTO.fromCurrency || baseCurrency;
    const toCurrency = exchangeRateLatestDTO.toCurrency || baseCurrency;

    const key = `${tenantId}:${fromCurrency}:${toCurrency}`;
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && now - cached.fetchedAt < RATE_CACHE_TTL_MS) {
      return {
        baseCurrency: fromCurrency,
        toCurrency: exchangeRateLatestDTO.toCurrency || toCurrency,
        exchangeRate: cached.exchangeRate,
      };
    }
    try {
      const exchangeRate = await this.createProvider().latest(
        fromCurrency,
        toCurrency,
      );
      this.rememberRate(key, { exchangeRate, fetchedAt: now });

      return {
        baseCurrency: fromCurrency,
        toCurrency: exchangeRateLatestDTO.toCurrency || toCurrency,
        exchangeRate,
      };
    } catch (error) {
      // Служба не ответила. Последний известный курс честнее отказа — но
      // помечаем его несвежим, чтобы вызывающий мог сказать это человеку.
      if (cached) {
        return {
          baseCurrency: fromCurrency,
          toCurrency: exchangeRateLatestDTO.toCurrency || toCurrency,
          exchangeRate: cached.exchangeRate,
          isStale: true,
        };
      }
      throw error;
    }
  }

  /** Кладёт курс в кэш, вытесняя самый старый при переполнении. */
  private rememberRate(key: string, value: CachedRate): void {
    if (!this.cache.has(key) && this.cache.size >= RATE_CACHE_MAX_ENTRIES) {
      // Map хранит ключи в порядке добавления, поэтому первый — самый старый.
      const oldest = this.cache.keys().next().value;

      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(key, value);
  }

  /** Точка подмены в тестах: иначе они полезли бы в сеть. */
  protected createProvider(): IExchangeRateService {
    return new ExchangeRate(ExchangeRateServiceType.OpenExchangeRate);
  }

  /**
   * Базовая валюта организации — из контекста запроса, как во всех остальных
   * службах. Прямой запрос по `tenantId` здесь падал: это поле приходило
   * пустым, и запрос курса всегда отвечал 500 (М3 карты v15).
   */
  protected async getBaseCurrency(): Promise<string> {
    const metadata: any = await this.tenancyContext?.getTenantMetadata();

    return metadata?.baseCurrency;
  }
}
