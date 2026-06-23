import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { CRM_REQUEST_TIMEOUT_MS } from '../../constants';
import { ServiceError } from '@/modules/Items/ServiceError';

export const BITRIX_ERRORS = {
  INVALID_WEBHOOK: 'CRM_BITRIX_INVALID_WEBHOOK',
  API_ERROR: 'CRM_BITRIX_API_ERROR',
};

/** Безопасный потолок страниц (50 записей/стр) — защита от бесконечного цикла. */
const MAX_PAGES = 40;

/**
 * Тонкий клиент REST Битрикс24 поверх входящего webhook-URL
 * (`https://<portal>.bitrix24.ru/rest/<user>/<token>/`). Прямой axios (как Telegram).
 */
@Injectable()
export class Bitrix24ApiService {
  /**
   * Тянет все страницы списочного метода (`crm.contact.list`/`crm.deal.list`),
   * собирая `result` постранично по `next`.
   */
  public async listAll(
    webhookUrl: string,
    method: string,
    params: Record<string, any>,
  ): Promise<any[]> {
    const base = webhookUrl.endsWith('/') ? webhookUrl : `${webhookUrl}/`;
    const items: any[] = [];
    let start = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await this.call(`${base}${method}.json`, { ...params, start });
      const result = Array.isArray(data?.result) ? data.result : [];
      items.push(...result);

      if (data?.next === undefined || data?.next === null) break;
      start = data.next;
    }
    return items;
  }

  /**
   * Лёгкая проверка валидности webhook-URL: один запрос на одну запись.
   * Бросит INVALID_WEBHOOK при 401/403. НЕ пагинирует (в отличие от listAll).
   */
  public async ping(webhookUrl: string): Promise<void> {
    const base = webhookUrl.endsWith('/') ? webhookUrl : `${webhookUrl}/`;
    await this.call(`${base}crm.contact.list.json`, {
      select: ['ID'],
      start: 0,
    });
  }

  /** Одиночный POST-вызов метода Битрикс с маппингом ошибок. */
  private async call(url: string, body: Record<string, any>): Promise<any> {
    try {
      const res = await axios.post(url, body, {
        timeout: CRM_REQUEST_TIMEOUT_MS,
      });
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        throw new ServiceError(BITRIX_ERRORS.INVALID_WEBHOOK);
      }
      throw new ServiceError(BITRIX_ERRORS.API_ERROR);
    }
  }
}
