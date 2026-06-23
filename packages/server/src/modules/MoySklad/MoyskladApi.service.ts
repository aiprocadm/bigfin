import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceError } from '@/modules/Items/ServiceError';

export const MOYSKLAD_ERRORS = {
  INVALID_TOKEN: 'MOYSKLAD_INVALID_TOKEN',
  API_ERROR: 'MOYSKLAD_API_ERROR',
};

const BASE = 'https://api.moysklad.ru/api/remap/1.2';
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Тонкий клиент JSON API МойСклад (remap/1.2) с токеном (Bearer). Прямой axios.
 * Для превью тянем первую страницу сущности (limit) — без полной выгрузки.
 */
@Injectable()
export class MoyskladApiService {
  /**
   * Первая страница строк сущности ('product' | 'demand').
   * @param {string} token — токен доступа МойСклад.
   * @param {string} entity — сущность API.
   * @param {number} limit — лимит строк (≤100).
   */
  public async list(
    token: string,
    entity: 'product' | 'demand',
    limit = 100,
  ): Promise<any[]> {
    const data = await this.call(`${BASE}/entity/${entity}?limit=${limit}`, token);
    return Array.isArray(data?.rows) ? data.rows : [];
  }

  /** Лёгкая проверка токена (одна запись). Бросит INVALID_TOKEN при 401/403. */
  public async ping(token: string): Promise<void> {
    await this.call(`${BASE}/entity/product?limit=1`, token);
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
        throw new ServiceError(MOYSKLAD_ERRORS.INVALID_TOKEN);
      }
      throw new ServiceError(MOYSKLAD_ERRORS.API_ERROR);
    }
  }
}
