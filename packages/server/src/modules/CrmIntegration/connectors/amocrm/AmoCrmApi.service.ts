import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { CRM_REQUEST_TIMEOUT_MS } from '../../constants';
import { ServiceError } from '@/modules/Items/ServiceError';

export const AMOCRM_ERRORS = {
  INVALID_CREDENTIALS: 'CRM_AMOCRM_INVALID_CREDENTIALS',
  API_ERROR: 'CRM_AMOCRM_API_ERROR',
};

/** Потолок страниц (250/стр) — защита от бесконечного цикла. */
const MAX_PAGES = 40;

/**
 * Тонкий клиент REST amoCRM v4 (`https://<subdomain>.amocrm.ru/api/v4/...`)
 * с долгоживущим токеном (Bearer). Прямой axios (как Битрикс/Telegram).
 */
@Injectable()
export class AmoCrmApiService {
  /**
   * Тянет все страницы ресурса ('contacts' | 'leads'), собирая `_embedded`.
   * amoCRM пагинирует через `_links.next.href`; 204 (пусто) → [].
   */
  public async listAll(
    subdomain: string,
    accessToken: string,
    resource: 'contacts' | 'leads',
  ): Promise<any[]> {
    const withParam = resource === 'leads' ? '?with=contacts&limit=250' : '?limit=250';
    let url = `https://${subdomain}.amocrm.ru/api/v4/${resource}${withParam}`;
    const items: any[] = [];

    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await this.call(url, accessToken);
      if (!data) break; // 204 No Content — больше нет данных.

      const batch = data?._embedded?.[resource];
      if (Array.isArray(batch)) items.push(...batch);

      const next = data?._links?.next?.href;
      if (!next) break;
      url = next;
    }
    return items;
  }

  /**
   * Лёгкая проверка кредов: один запрос на одну страницу контактов.
   * Бросит INVALID_CREDENTIALS при 401/403. НЕ пагинирует (в отличие от listAll).
   */
  public async ping(subdomain: string, accessToken: string): Promise<void> {
    const url = `https://${subdomain}.amocrm.ru/api/v4/contacts?limit=1`;
    await this.call(url, accessToken);
  }

  /** Одиночный GET с Bearer-токеном и маппингом ошибок. 204 → null. */
  private async call(url: string, accessToken: string): Promise<any> {
    try {
      const res = await axios.get(url, {
        timeout: CRM_REQUEST_TIMEOUT_MS,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.status === 204 ? null : res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        throw new ServiceError(AMOCRM_ERRORS.INVALID_CREDENTIALS);
      }
      throw new ServiceError(AMOCRM_ERRORS.API_ERROR);
    }
  }
}
