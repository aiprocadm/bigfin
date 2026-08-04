import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceError } from '@/modules/Items/ServiceError';

export const MOYSKLAD_ERRORS = {
  INVALID_TOKEN: 'MOYSKLAD_INVALID_TOKEN',
  API_ERROR: 'MOYSKLAD_API_ERROR',
};

const DEFAULT_BASE = 'https://api.moysklad.ru/api/remap/1.2';
const REQUEST_TIMEOUT_MS = 15000;
/** Ограничение МойСклад на размер страницы. */
const PAGE_SIZE = 100;
/** Предохранитель от бесконечного обхода, если API вернёт странную разметку. */
const MAX_PAGES = 200;

/**
 * Адрес API читается ВНУТРИ вызова, а не на уровне модуля: переменные из .env
 * подгружаются позже импорта модулей, и константа получила бы пустое значение.
 */
const baseUrl = (): string => process.env.MOYSKLAD_API_BASE || DEFAULT_BASE;

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
    const data = await this.call(
      `${baseUrl()}/entity/${entity}?limit=${limit}`,
      token,
    );
    return Array.isArray(data?.rows) ? data.rows : [];
  }

  /**
   * Все строки сущности постранично — для импорта справочника целиком.
   * Превью обходится первой страницей, импорту нужен весь список.
   */
  public async listAll(
    token: string,
    entity: 'product' | 'demand',
  ): Promise<any[]> {
    const all: any[] = [];

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const url = `${baseUrl()}/entity/${entity}?limit=${PAGE_SIZE}&offset=${
        page * PAGE_SIZE
      }`;
      const data = await this.call(url, token);
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      all.push(...rows);

      if (rows.length < PAGE_SIZE) break;
    }
    return all;
  }

  /** Лёгкая проверка токена (одна запись). Бросит INVALID_TOKEN при 401/403. */
  public async ping(token: string): Promise<void> {
    await this.call(`${baseUrl()}/entity/product?limit=1`, token);
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
