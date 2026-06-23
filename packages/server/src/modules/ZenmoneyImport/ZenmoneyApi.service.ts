import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceError } from '@/modules/Items/ServiceError';

export const ZENMONEY_ERRORS = {
  INVALID_TOKEN: 'ZENMONEY_INVALID_TOKEN',
  API_ERROR: 'ZENMONEY_API_ERROR',
};

const DIFF_URL = 'https://api.zenmoney.ru/v8/diff/';
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Тонкий клиент diff-API Дзенмани. Авторизация — Bearer-токен. Прямой axios.
 */
@Injectable()
export class ZenmoneyApiService {
  /** Все транзакции (полная выгрузка через serverTimestamp=0). */
  public async getTransactions(token: string): Promise<any[]> {
    const data = await this.post(token, {
      currentClientTimestamp: Math.floor(Date.now() / 1000),
      serverTimestamp: 0,
    });
    return Array.isArray(data?.transaction) ? data.transaction : [];
  }

  /** Лёгкая проверка токена (минимальный diff). Бросит INVALID_TOKEN при 401/403. */
  public async ping(token: string): Promise<void> {
    await this.post(token, {
      currentClientTimestamp: Math.floor(Date.now() / 1000),
      serverTimestamp: Math.floor(Date.now() / 1000),
    });
  }

  private async post(token: string, body: Record<string, any>): Promise<any> {
    try {
      const res = await axios.post(DIFF_URL, body, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        throw new ServiceError(ZENMONEY_ERRORS.INVALID_TOKEN);
      }
      throw new ServiceError(ZENMONEY_ERRORS.API_ERROR);
    }
  }
}
