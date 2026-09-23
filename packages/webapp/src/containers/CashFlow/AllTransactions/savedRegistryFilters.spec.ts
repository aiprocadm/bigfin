// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import { filtersFromSearch, searchFromFilters } from './allTransactionsFilters';
import {
  applySavedFilter,
  parseSavedFilters,
  removeSavedFilter,
  snapshotFilters,
  upsertSavedFilter,
} from './savedRegistryFilters';

/**
 * FT-021 ТЗ-3. AC: сохранённый фильтр восстанавливает период, тип, счёт,
 * статью, направление и поиск.
 */
describe('сохранённые фильтры реестра', () => {
  const full = {
    fromDate: '2026-07-01',
    toDate: '2026-07-31',
    flow: 'out' as const,
    accountId: 1000,
    articleId: 12,
    projectId: 3,
    search: 'аренда',
    tag: 'маркетинг',
    status: 'uncategorized' as const,
  };

  it('восстанавливает все поля AC — через сохранение, хранилище и адрес', () => {
    const list = upsertSavedFilter([], 'Аренда июля', full, false);
    // Хранилище отдаёт JSON — как настройки организации.
    const [restored] = parseSavedFilters(JSON.stringify(list), false);
    const applied = applySavedFilter(restored);
    const viaUrl = filtersFromSearch(searchFromFilters(applied));
    expect(viaUrl).toMatchObject({
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
      flow: 'out',
      accountId: 1000,
      articleId: 12,
      projectId: 3,
      search: 'аренда',
      tag: 'маркетинг',
    });
  });

  it('режим показа «ждут разноски» — не отбор и не запоминается', () => {
    expect(snapshotFilters(full)).not.toHaveProperty('status');
  });

  it('то же имя — замена, а не дубль; удаление по номеру', () => {
    let list = upsertSavedFilter([], 'Аренда', full, false);
    list = upsertSavedFilter(list, ' аренда ', { ...full, accountId: 1001 }, false);
    expect(list).toHaveLength(1);
    expect(list[0].filters.accountId).toBe(1001);
    expect(removeSavedFilter(list, list[0].id)).toEqual([]);
  });

  it('мусор в хранилище не роняет экран', () => {
    expect(parseSavedFilters('не json', true)).toEqual([]);
    expect(parseSavedFilters([{ name: '' }, null, { name: 'Ок', filters: { flow: 'in' } }], true)).toEqual([
      { id: 'Ок', name: 'Ок', shared: true, filters: { flow: 'in' } },
    ]);
  });
});
