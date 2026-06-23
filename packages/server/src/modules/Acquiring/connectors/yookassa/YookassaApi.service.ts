import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceError } from '@/modules/Items/ServiceError';

export const YOOKASSA_ERRORS = {
  INVALID_CREDENTIALS: 'YOOKASSA_INVALID_CREDENTIALS',
  API_ERROR: 'YOOKASSA_API_ERROR',
};

const BASE = 'https://api.yookassa.ru/v3';
const REQUEST_TIMEOUT_MS = 20000;
const MAX_PAGES = 40;

/**
 * Тонкий клиент API YooKassa. Авторизация — Basic (shopId:secretKey). Прямой axios.
 */
@Injectable()
export class YookassaApiService {
  /** Платежи за период (пагинация по `next_cursor`). */
  public async listPayments(
    shopId: string,
    secretKey: string,
    from: string,
    to: string,
  ): Promise<any[]> {
    const items: any[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const params: Record<string, any> = {
        'created_at.gte': from,
        'created_at.lt': to,
        limit: 100,
      };
      if (cursor) params.cursor = cursor;

      const data = await this.get(`${BASE}/payments`, shopId, secretKey, params);
      if (Array.isArray(data?.items)) items.push(...data.items);

      cursor = data?.next_cursor;
      if (!cursor) break;
    }
    return items;
  }

  /** Лёгкая проверка кредов (одна запись). Бросит INVALID_CREDENTIALS при 401. */
  public async ping(shopId: string, secretKey: string): Promise<void> {
    await this.get(`${BASE}/payments`, shopId, secretKey, { limit: 1 });
  }

  private async get(
    url: string,
    shopId: string,
    secretKey: string,
    params: Record<string, any>,
  ): Promise<any> {
    try {
      const res = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        params,
        auth: { username: shopId, password: secretKey },
      });
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        throw new ServiceError(YOOKASSA_ERRORS.INVALID_CREDENTIALS);
      }
      throw new ServiceError(YOOKASSA_ERRORS.API_ERROR);
    }
  }
}
