import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceError } from '@/modules/Items/ServiceError';

export const WB_ERRORS = {
  INVALID_KEY: 'WB_INVALID_KEY',
  API_ERROR: 'WB_API_ERROR',
};

const BASE = 'https://statistics-api.wildberries.ru';
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Тонкий клиент Statistics API Wildberries. Авторизация — API-ключ в заголовке
 * `Authorization`. Прямой axios (как остальные интеграции сессии).
 */
@Injectable()
export class WildberriesApiService {
  /**
   * Детализация отчёта за период (`reportDetailByPeriod`).
   * @param {string} apiKey
   * @param {string} dateFrom — ISO-дата.
   * @param {string} dateTo — ISO-дата.
   */
  public async reportDetailByPeriod(
    apiKey: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<any[]> {
    const url =
      `${BASE}/api/v1/supplier/reportDetailByPeriod` +
      `?dateFrom=${encodeURIComponent(dateFrom)}` +
      `&dateTo=${encodeURIComponent(dateTo)}&limit=100000&rrdid=0`;
    const data = await this.call(url, apiKey);
    return Array.isArray(data) ? data : [];
  }

  /** Лёгкая проверка ключа (короткий период). Бросит INVALID_KEY при 401/403. */
  public async ping(apiKey: string): Promise<void> {
    const url =
      `${BASE}/api/v1/supplier/reportDetailByPeriod` +
      `?dateFrom=2024-01-01&dateTo=2024-01-02&limit=1&rrdid=0`;
    await this.call(url, apiKey);
  }

  private async call(url: string, apiKey: string): Promise<any> {
    try {
      const res = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { Authorization: apiKey },
      });
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        throw new ServiceError(WB_ERRORS.INVALID_KEY);
      }
      throw new ServiceError(WB_ERRORS.API_ERROR);
    }
  }
}
