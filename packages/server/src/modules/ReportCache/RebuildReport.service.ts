// © 2026 Bigfin
import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { REPORT_CACHE_STORE, ReportCacheService } from './ReportCache.service';
import { ReportCacheStore } from './ReportCache.store';
import { REPORT_CACHE_BYPASS_HEADER, reportPathOf } from './utils/reportCacheKey';

export type RebuildStatus = 'running' | 'done' | 'failed';

export interface RebuildProgress {
  id: string;
  status: RebuildStatus;
  /** 0–100: сброс → пересчёт → сохранение. */
  progress: number;
  step: 'reset' | 'compute' | 'store' | 'done';
  durationMs?: number;
  error?: string;
}

export interface RebuildCaller {
  authorization?: string;
  organizationId?: string;
  acceptLanguage?: string;
}

const progressKey = (id: string) => `report-rebuild:${id}`;
const PROGRESS_TTL_SECONDS = 10 * 60;

/**
 * «Пересобрать отчёт» (FT-093 ТЗ-3): сбросить кэш и посчитать заново В ФОНЕ,
 * показывая, где сейчас пересчёт. У Финтабло на этом месте — «может занять
 * несколько минут» без всякого знака, идёт ли что-то вообще.
 *
 * Пересчёт — это обычный запрос того же отчёта тем же входом (как у MCP): те
 * же права, те же ограничения роли, и результат сразу ложится в кэш.
 */
@Injectable()
export class RebuildReportService {
  private readonly logger = new Logger('RebuildReport');

  constructor(
    private readonly cache: ReportCacheService,
    @Inject(REPORT_CACHE_STORE) private readonly store: ReportCacheStore,
  ) {}

  private get apiBase(): string {
    return (process.env.REPORT_REBUILD_API_BASE_URL || `http://127.0.0.1:${process.env.PORT ?? 3000}`).replace(/\/+$/, '');
  }

  /** Проверить адрес, начать пересборку и сразу вернуть её номер. */
  public async start(path: string, query: Record<string, unknown>, caller: RebuildCaller) {
    const reportPath = reportPathOf(`/api/${String(path ?? '').replace(/^\/+|^api\//g, '')}`);
    if (!reportPath) {
      return { error: 'Пересобрать можно только отчёт из раздела «Отчёты».' };
    }
    const id = randomUUID();
    await this.save({ id, status: 'running', progress: 5, step: 'reset' });
    void this.run(id, reportPath, query ?? {}, caller);
    return { id };
  }

  public async progress(id: string): Promise<RebuildProgress | null> {
    const text = await this.store.get(progressKey(id));
    return text ? JSON.parse(text) : null;
  }

  private async run(id: string, path: string, query: Record<string, unknown>, caller: RebuildCaller) {
    const started = Date.now();
    try {
      await this.cache.invalidate(caller.organizationId);
      await this.save({ id, status: 'running', progress: 30, step: 'compute' });
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) value.forEach((v) => params.append(`${key}[]`, String(v)));
        else if (value !== undefined && value !== null) params.append(key, String(value));
      }
      const response = await fetch(`${this.apiBase}${path}${params.toString() ? `?${params}` : ''}`, {
        headers: {
          accept: 'application/json',
          [REPORT_CACHE_BYPASS_HEADER]: 'refresh',
          ...(caller.authorization ? { authorization: caller.authorization } : {}),
          ...(caller.organizationId ? { 'organization-id': caller.organizationId } : {}),
          ...(caller.acceptLanguage ? { 'accept-language': caller.acceptLanguage } : {}),
        },
      });
      await this.save({ id, status: 'running', progress: 90, step: 'store' });
      if (!response.ok) {
        await this.save({ id, status: 'failed', progress: 100, step: 'done', error: `Отчёт ответил ${response.status}` });
        return;
      }
      await response.arrayBuffer();
      await this.save({ id, status: 'done', progress: 100, step: 'done', durationMs: Date.now() - started });
    } catch (error: any) {
      this.logger.warn(`Пересборка ${id} не удалась: ${error?.message}`);
      await this.save({ id, status: 'failed', progress: 100, step: 'done', error: 'Не удалось пересчитать отчёт' });
    }
  }

  private save(progress: RebuildProgress) {
    return this.store.set(progressKey(progress.id), JSON.stringify(progress), PROGRESS_TTL_SECONDS);
  }
}
