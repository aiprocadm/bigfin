import { describe, expect, it } from 'vitest';
import { getLastReportResponse, isReportUrl, recordReportResponse, reportRequestOf } from './reportCacheState';
import { cachedAtLabel, isReportScreen } from '@/components/Dashboard/ReportCacheBar';

/** FT-093 ТЗ-3: плашка «Данные на …» и «Пересобрать». */
describe('последний ответ отчёта', () => {
  it('отчёт — только /reports/*, служебный кэш — нет', () => {
    expect(isReportUrl('/api/reports/balance-sheet')).toBe(true);
    expect(isReportUrl('reports/cash-flow-articles?x=1')).toBe(true);
    expect(isReportUrl('/api/reports/cache/rebuild/1')).toBe(false);
    expect(isReportUrl('/api/banking/transactions')).toBe(false);
  });

  it('параметры из адреса и из params собираются вместе', () => {
    expect(reportRequestOf('/api/reports/x?a=1&b[]=2&b[]=3', { c: 4 })).toEqual({
      path: '/reports/x',
      query: { a: '1', b: ['2', '3'], c: 4 },
    });
  });

  it('запоминает, из кэша ли пришёл отчёт', () => {
    recordReportResponse({ config: { url: '/api/reports/x', method: 'get' }, headers: { 'x-bigfin-report-cached-at': '2026-09-24 10:05:00' } });
    expect(getLastReportResponse()).toMatchObject({ path: '/reports/x', cachedAt: '2026-09-24 10:05:00' });
    recordReportResponse({ config: { url: '/api/reports/x', method: 'get' }, headers: {} });
    expect(getLastReportResponse()?.cachedAt).toBeNull();
    recordReportResponse({ config: { url: '/api/banking/transactions', method: 'get' }, headers: { 'x-bigfin-report-cached-at': 'x' } });
    expect(getLastReportResponse()?.path).toBe('/reports/x');
  });

  it('плашка — на экранах отчётов; время — коротко', () => {
    expect(isReportScreen('/financial-reports/balance-sheet')).toBe(true);
    expect(isReportScreen('/financial-reports')).toBe(false);
    expect(isReportScreen('/financial-reports/audit-log')).toBe(false);
    const now = new Date(2026, 8, 24, 12, 0);
    expect(cachedAtLabel('2026-09-24 10:05:00', now)).toBe('10:05');
    expect(cachedAtLabel('2026-09-23 23:59:00', now)).toBe('23.09 23:59');
  });
});
