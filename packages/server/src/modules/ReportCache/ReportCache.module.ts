// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { ReportCacheController } from './ReportCache.controller';
import { ReportCacheInterceptor } from './ReportCache.interceptor';
import { REPORT_CACHE_STORE, ReportCacheService } from './ReportCache.service';
import { RedisReportCacheStore } from './ReportCache.store';
import { ReportCacheInvalidationSubscriber } from './ReportCacheInvalidation.subscriber';
import { RebuildReportService } from './RebuildReport.service';

/**
 * Кэш отчётов и «Пересобрать» (FT-093 ТЗ-3). Перехватчик — на все запросы:
 * он и отдаёт отчёты из кэша, и сбрасывает кэш после изменений.
 */
@Module({
  controllers: [ReportCacheController],
  providers: [
    { provide: REPORT_CACHE_STORE, useClass: RedisReportCacheStore },
    ReportCacheService,
    RebuildReportService,
    ReportCacheInvalidationSubscriber,
    { provide: APP_INTERCEPTOR, useClass: ReportCacheInterceptor },
  ],
  exports: [ReportCacheService],
})
export class ReportCacheModule {}
