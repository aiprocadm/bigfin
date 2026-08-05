import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceError } from '@/modules/Items/ServiceError';

export const ZENMONEY_ERRORS = {
  INVALID_TOKEN: 'ZENMONEY_INVALID_TOKEN',
  API_ERROR: 'ZENMONEY_API_ERROR',
};

const DEFAULT_DIFF_URL = 'https://api.zenmoney.ru/v8/diff/';
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Адрес читается ВНУТРИ вызова, а не на уровне модуля: переменные из .env
 * подгружаются позже импорта модулей, и константа получила бы пустое значение.
 */
const diffUrl = (): string => process.env.ZENMONEY_API_URL || DEFAULT_DIFF_URL;

export interface ZenmoneyDiff {
  transactions: any[];
  /** Метка сервера этой выгрузки — с неё продолжим в следующий раз. */
  serverTimestamp: number;
}

/**
 * Тонкий клиент diff-API Дзенмани. Авторизация — Bearer-токен. Прямой axios.
 */
@Injectable()
export class ZenmoneyApiService {
  /**
   * Операции, изменившиеся с указанной метки сервера.
   *
   * Первый импорт идёт с нуля (полная история), последующие — только новое:
   * ради этого diff-API и существует, иначе у активного пользователя каждый
   * импорт заново тянет годы операций.
   *
   * @param {string} token — токен доступа Дзенмани.
   * @param {number} sinceTimestamp — метка прошлой выгрузки (0 — с начала).
   */
  public async getTransactions(
    token: string,
    sinceTimestamp = 0,
  ): Promise<ZenmoneyDiff> {
    const data = await this.post(token, {
      currentClientTimestamp: Math.floor(Date.now() / 1000),
      serverTimestamp: Math.max(0, Math.floor(Number(sinceTimestamp) || 0)),
    });
    return {
      transactions: Array.isArray(data?.transaction) ? data.transaction : [],
      serverTimestamp: Number(data?.serverTimestamp) || 0,
    };
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
      const res = await axios.post(diffUrl(), body, {
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
