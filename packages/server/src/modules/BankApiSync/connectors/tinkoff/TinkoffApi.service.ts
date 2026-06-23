import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceError } from '@/modules/Items/ServiceError';

export const TINKOFF_ERRORS = {
  INVALID_TOKEN: 'TINKOFF_INVALID_TOKEN',
  API_ERROR: 'TINKOFF_API_ERROR',
};

const BASE = 'https://business.tinkoff.ru/openapi';
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Тонкий клиент Statement API Тинькофф Бизнес. Авторизация — Bearer-токен.
 * Прямой axios (как остальные интеграции сессии).
 */
@Injectable()
export class TinkoffApiService {
  /**
   * Операции по счёту за период (`/api/v1/bank-statement`).
   * @param {string} token
   * @param {string} accountNumber
   * @param {string} from — ISO-дата.
   * @param {string} to — ISO-дата.
   */
  public async getOperations(
    token: string,
    accountNumber: string,
    from: string,
    to: string,
  ): Promise<any[]> {
    const url =
      `${BASE}/api/v1/bank-statement` +
      `?accountNumber=${encodeURIComponent(accountNumber)}` +
      `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const data = await this.call(url, token);
    return Array.isArray(data?.operations) ? data.operations : [];
  }

  /** Лёгкая проверка токена (список счетов). Бросит INVALID_TOKEN при 401/403. */
  public async ping(token: string): Promise<void> {
    await this.call(`${BASE}/api/v1/bank-accounts`, token);
  }

  private async call(url: string, token: string): Promise<any> {
    try {
      const res = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        throw new ServiceError(TINKOFF_ERRORS.INVALID_TOKEN);
      }
      throw new ServiceError(TINKOFF_ERRORS.API_ERROR);
    }
  }
}
