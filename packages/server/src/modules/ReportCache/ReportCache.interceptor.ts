// © 2026 Bigfin
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { from, Observable, of } from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';

import { ACCESS_PREVIEW_HEADER } from '@/modules/Roles/utils/accessPreview';
import { ReportCacheService } from './ReportCache.service';
import {
  isCacheableAccept,
  mutationInvalidates,
  REPORT_CACHE_BYPASS_HEADER,
  reportCacheKey,
  reportPathOf,
} from './utils/reportCacheKey';

export const REPORT_CACHED_AT_HEADER = 'x-bigfin-report-cached-at';

/**
 * Кэш отчётов на входе (FT-093 ТЗ-3) — одно место на все `GET /api/reports/*`.
 *
 * Перехватчик, а не пометка на каждом отчёте: отчётов два десятка, и новый не
 * должен остаться без кэша или — хуже — получить кэш без сброса.
 *
 * Права проверяются ДО кэша: стражи срабатывают раньше перехватчиков, так что
 * из кэша отдаётся только тому, кто и так видит этот отчёт.
 *
 * Здесь же первый слой сброса: успешный изменяющий запрос организации (кроме
 * настроек вида и т. п., см. `NON_FINANCIAL_MUTATIONS`) сбрасывает её кэш —
 * после ответа, то есть после записи в базу.
 */
@Injectable()
export class ReportCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cache: ReportCacheService,
    private readonly cls: ClsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest();
    const organizationId = this.cls.get('organizationId');
    const userId = this.cls.get('userId');
    if (!organizationId || !userId) return next.handle();

    const url = request.originalUrl ?? request.url;
    if (mutationInvalidates(request.method, url)) {
      // На ответ, а не на «поток завершён»: получатель вправе отписаться после
      // первого значения, и «завершения» тогда не будет вовсе.
      return next.handle().pipe(
        tap(() => void this.cache.invalidate(String(organizationId))),
      );
    }

    const path = reportPathOf(url);
    if (!path || request.method !== 'GET' || !isCacheableAccept(request.headers?.accept)) {
      return next.handle();
    }
    return from(this.lookup(request, path, String(organizationId), String(userId))).pipe(
      mergeMap(({ key, hit }) => {
        if (hit) {
          context.switchToHttp().getResponse()?.setHeader?.(REPORT_CACHED_AT_HEADER, hit.cachedAt);
          const value = hit.value as any;
          return of(value && typeof value === 'object' && !Array.isArray(value) ? { ...value, cached_at: hit.cachedAt } : value);
        }
        return next.handle().pipe(
          tap((value) => {
            if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
              void this.cache.put(key, value);
            }
          }),
        );
      }),
    );
  }

  private async lookup(request: any, path: string, organizationId: string, userId: string) {
    const generation = await this.cache.generation(organizationId);
    // Смотрит ли владелец глазами сотрудника (FT-081): у сотрудника свои
    // права и ограничения — значит, и свой кэш.
    const preview = request.headers?.[ACCESS_PREVIEW_HEADER] ?? '';
    const key = reportCacheKey({
      organizationId,
      generation,
      viewerId: `${userId}|${preview}`,
      path,
      query: request.query,
      accept: request.headers?.accept,
      locale: request.headers?.['accept-language'],
    });
    // «Пересобрать»: посчитать заново и перезаписать, не глядя в кэш.
    const bypass = request.headers?.[REPORT_CACHE_BYPASS_HEADER] === 'refresh';
    return { key, hit: bypass ? null : await this.cache.get(key) };
  }
}
