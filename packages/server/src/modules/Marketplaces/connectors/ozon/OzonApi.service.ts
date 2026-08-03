import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceError } from '@/modules/Items/ServiceError';

export const OZON_ERRORS = {
  INVALID_KEY: 'OZON_INVALID_KEY',
  API_ERROR: 'OZON_API_ERROR',
};

const BASE = 'https://api-seller.ozon.ru';
const REQUEST_TIMEOUT_MS = 30000;
const PAGE_SIZE = 1000;
// Предохранитель: у крупного продавца операций за месяц — десятки тысяч,
// но бесконечно листать нельзя (зависший ответ повесил бы запрос).
const MAX_PAGES = 50;

/**
 * Тонкий клиент Seller API Ozon (⑱). Авторизация — пара заголовков
 * `Client-Id` + `Api-Key` (выдаются в кабинете продавца).
 *
 * ⚠️ Контракт СВЕРИТЬ с документацией продавца при подключении: путь и имена
 * полей взяты из публичного описания `v3/finance/transaction/list`.
 */
@Injectable()
export class OzonApiService {
  /**
   * Финансовые операции за период. Ответ постраничный — собираем все страницы.
   * @param {string} clientId — Client-Id кабинета продавца.
   * @param {string} apiKey — Api-Key кабинета продавца.
   * @param {string} fromDate — ISO-дата начала.
   * @param {string} toDate — ISO-дата конца.
   */
  public async financeTransactions(
    clientId: string,
    apiKey: string,
    fromDate: string,
    toDate: string,
  ): Promise<any[]> {
    const operations: any[] = [];

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const data = await this.call(
        '/v3/finance/transaction/list',
        clientId,
        apiKey,
        {
          filter: {
            date: {
              from: `${fromDate}T00:00:00.000Z`,
              to: `${toDate}T23:59:59.999Z`,
            },
            transaction_type: 'all',
          },
          page,
          page_size: PAGE_SIZE,
        },
      );

      const chunk = data?.result?.operations;
      if (!Array.isArray(chunk) || chunk.length === 0) break;

      operations.push(...chunk);

      const pageCount = Number(data?.result?.page_count ?? 0);
      if (pageCount && page >= pageCount) break;
      if (chunk.length < PAGE_SIZE) break;
    }
    return operations;
  }

  /** Лёгкая проверка ключей (одна операция за один день). */
  public async ping(clientId: string, apiKey: string): Promise<void> {
    await this.call('/v3/finance/transaction/list', clientId, apiKey, {
      filter: {
        date: { from: '2024-01-01T00:00:00.000Z', to: '2024-01-02T00:00:00.000Z' },
        transaction_type: 'all',
      },
      page: 1,
      page_size: 1,
    });
  }

  private async call(
    path: string,
    clientId: string,
    apiKey: string,
    body: Record<string, unknown>,
  ): Promise<any> {
    try {
      const res = await axios.post(`${BASE}${path}`, body, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'Client-Id': clientId,
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
      });
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        throw new ServiceError(OZON_ERRORS.INVALID_KEY);
      }
      throw new ServiceError(OZON_ERRORS.API_ERROR);
    }
  }
}
