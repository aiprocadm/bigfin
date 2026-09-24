// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';

import { ReportCacheStore } from './ReportCache.store';
import {
  generationKey,
  REPORT_CACHE_MAX_BYTES,
  REPORT_CACHE_TTL_SECONDS,
} from './utils/reportCacheKey';

export const REPORT_CACHE_STORE = 'REPORT_CACHE_STORE';

export interface CachedReport {
  /** Готовый текст ответа — ровно то, что ушло человеку в первый раз. */
  text: string;
  /** Когда посчитан — для плашки «Данные на …». */
  cachedAt: string;
}

/**
 * Кэш отчётов (FT-093 ТЗ-3): чтение, запись, сброс организации.
 */
@Injectable()
export class ReportCacheService {
  constructor(@Inject(REPORT_CACHE_STORE) private readonly store: ReportCacheStore) {}

  /** Текущее поколение кэша организации (растёт при каждом сбросе). */
  public async generation(organizationId: string): Promise<number> {
    return Number((await this.store.get(generationKey(organizationId))) ?? 0) || 0;
  }

  /**
   * Хранится ГОТОВЫЙ ТЕКСТ ответа, а не объект. Объект после кэша снова
   * прошёл бы общие преобразования сервера (переименование ключей, обход
   * значений) — у годового отчёта по дням это сотни тысяч полей, и выигрыш
   * кэша съедался почти целиком (живая проверка этапа 40: 853 → 693 мс).
   * Первая строка записи — время расчёта, дальше — сам ответ.
   */
  public async get(key: string): Promise<CachedReport | null> {
    const stored = await this.store.get(key);
    if (!stored) return null;
    const newline = stored.indexOf('\n');
    if (newline < 0) return null;
    return { cachedAt: stored.slice(0, newline), text: stored.slice(newline + 1) };
  }

  public async put(key: string, text: string, now = moment()): Promise<boolean> {
    if (typeof text !== 'string' || Buffer.byteLength(text) > REPORT_CACHE_MAX_BYTES) return false;
    await this.store.set(key, `${now.format('YYYY-MM-DD HH:mm:ss')}\n${text}`, REPORT_CACHE_TTL_SECONDS);
    return true;
  }

  /** Сбросить кэш всех отчётов организации: +1 к поколению. */
  public async invalidate(organizationId: string | undefined | null): Promise<void> {
    if (!organizationId) return;
    await this.store.incr(generationKey(organizationId));
  }
}
