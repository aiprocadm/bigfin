import { describe, expect, it } from 'vitest';

import { transactionsLinkFromDrillDown } from './drillDownRegisterLink';
import {
  filtersFromSearch,
} from '@/containers/CashFlow/AllTransactions/allTransactionsFilters';

/**
 * Переход «Открыть в Операциях» (FIN-005 ТЗ-2).
 *
 * Проверяется не форма строки, а КРУГ: адрес, собранный панелью, читается
 * реестром обратно теми же отборами. Проверь мы только строку — она могла
 * бы быть красивой и непонятной другой стороне.
 */
describe('переход из раскрытия в реестр операций', () => {
  it('собирает адрес реестра со статьёй и периодом', () => {
    const link = transactionsLinkFromDrillDown({
      articleId: 12,
      fromDate: '2026-04-01',
      toDate: '2026-09-30',
    });

    expect(link.startsWith('/cashflow-accounts/transactions?')).toBe(true);

    const params = new URLSearchParams(link.split('?')[1]);
    expect(params.get('articleId')).toBe('12');
    expect(params.get('fromDate')).toBe('2026-04-01');
    expect(params.get('toDate')).toBe('2026-09-30');
  });

  it('РЕЕСТР ЧИТАЕТ этот адрес теми же отборами', () => {
    // Круг замкнулся: то, что собрала панель, реестр понимает. Без этой
    // проверки ссылка может открывать список БЕЗ отбора — и человек решит,
    // что переход работает, глядя на чужие операции.
    const link = transactionsLinkFromDrillDown({
      articleId: 12,
      fromDate: '2026-04-01',
      toDate: '2026-09-30',
    });
    const filters = filtersFromSearch(link.split('?')[1]);

    expect(filters.articleId).toBe(12);
    expect(filters.fromDate).toBe('2026-04-01');
    expect(filters.toDate).toBe('2026-09-30');
  });

  it('юрлица уходят повторяющимся параметром, а не через запятую', () => {
    // Так их читает сервер и так же собирает шапка отчёта: один формат на
    // оба конца, иначе разрез из отчёта в реестре тихо потеряется.
    const link = transactionsLinkFromDrillDown({
      articleId: 12,
      fromDate: '2026-04-01',
      toDate: '2026-09-30',
      legalEntityIds: [3, 5],
    });
    const params = new URLSearchParams(link.split('?')[1]);

    expect(params.getAll('legalEntityIds')).toEqual(['3', '5']);
  });

  it('пустые поля в адрес не попадают', () => {
    // Пустой параметр в адресе сервер читает как отбор «ничего», и список
    // выходит пустым без всякой причины.
    const link = transactionsLinkFromDrillDown({
      accountId: 7,
      fromDate: '2026-04-01',
      toDate: '2026-04-30',
    });

    expect(link).not.toContain('articleId');
    expect(link).not.toContain('legalEntityIds');
  });

  it('раскрытие по счёту тоже умеет вести в реестр', () => {
    const link = transactionsLinkFromDrillDown({
      accountId: 1001,
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
    });
    const filters = filtersFromSearch(link.split('?')[1]);

    expect(filters.accountId).toBe(1001);
  });
});
