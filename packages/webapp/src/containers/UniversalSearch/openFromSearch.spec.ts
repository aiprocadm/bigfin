// © 2026 Bigfin
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import { openIdFromSearch } from './openFromSearch';

/**
 * Карта v43. Найденная запись открывается, а не теряется в списке.
 *
 * У новых разделов нет выдвижной карточки: запись открывается прямо на
 * странице. Поиск ведёт на страницу и передаёт найденное адресом
 * (`?open=12`). Без второй половины — чтения этого адреса страницей —
 * человек попадал бы в общий список и искал бы глазами второй раз.
 */
const SRC = path.resolve(__dirname, '../..');

const read = (relative: string) =>
  fs.readFileSync(path.join(SRC, relative), 'utf8');

describe('открыть найденную запись', () => {
  it('читает номер записи из адреса', () => {
    expect(openIdFromSearch('?open=12')).toBe(12);
  });

  it('без параметра ничего не открывает', () => {
    expect(openIdFromSearch('')).toBeNull();
    expect(openIdFromSearch('?status=won')).toBeNull();
  });

  it('мусор вместо номера ничего не открывает', () => {
    // Иначе страница попыталась бы открыть запись «NaN» и показала пустую
    // карточку вместо списка.
    expect(openIdFromSearch('?open=abc')).toBeNull();
    expect(openIdFromSearch('?open=')).toBeNull();
    expect(openIdFromSearch('?open=-3')).toBeNull();
  });

  it.each([
    ['containers/Deals/DealsPage.tsx'],
    ['containers/PaymentRequests/PaymentRequestsPage.tsx'],
    ['containers/FixedAssets/FixedAssetsPage.tsx'],
  ])('%s открывает запись, пришедшую из поиска', (page) => {
    expect(read(page)).toContain('openIdFromSearch');
  });
});
