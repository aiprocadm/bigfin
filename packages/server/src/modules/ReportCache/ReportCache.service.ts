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
  value: unknown;
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

  public async get(key: string): Promise<CachedReport | null> {
    const text = await this.store.get(key);
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /**
   * Запомнить ответ. Снимок берётся СРАЗУ (JSON.stringify до первого await):
   * дальше по цепочке ответ переименовывается в snake_case, и в кэш не должна
   * попасть половина одного и половина другого.
   */
  public async put(key: string, value: unknown, now = moment()): Promise<boolean> {
    let text: string;
    try {
      text = JSON.stringify({ value, cachedAt: now.format('YYYY-MM-DD HH:mm:ss') });
    } catch {
      return false;
    }
    if (Buffer.byteLength(text) > REPORT_CACHE_MAX_BYTES) return false;
    await this.store.set(key, text, REPORT_CACHE_TTL_SECONDS);
    return true;
  }

  /** Сбросить кэш всех отчётов организации: +1 к поколению. */
  public async invalidate(organizationId: string | undefined | null): Promise<void> {
    if (!organizationId) return;
    await this.store.incr(generationKey(organizationId));
  }
}
