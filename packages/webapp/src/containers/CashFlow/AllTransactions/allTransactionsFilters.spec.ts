import { describe, it, expect } from 'vitest';

import {
  countExtraFilters,
  defaultPeriod,
  filtersFromSearch,
  searchFromFilters,
} from './allTransactionsFilters';

/**
 * Этап 3 ТЗ, шаг 3.3. Отборы списка операций живут в адресной строке —
 * приёмка требует, чтобы ссылку можно было переслать коллеге и увидеть тот
 * же список.
 *
 * Здесь проверяется именно перевод «адрес ↔ отборы»: пустые значения не
 * должны попадать в запрос (пустой отбор отсёк бы все строки), а мусор из
 * чужой ссылки — превращаться в `NaN` и уезжать на сервер.
 */
describe('отборы списка операций', () => {
  it('период по умолчанию — текущий месяц', () => {
    expect(defaultPeriod('2026-03-17')).toEqual({
      fromDate: '2026-03-01',
      toDate: '2026-03-31',
    });
  });

  it('читает отборы из адреса', () => {
    expect(
      filtersFromSearch(
        '?fromDate=2026-01-01&toDate=2026-01-31&flow=out&accountId=12&search=аренда',
      ),
    ).toEqual({
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      flow: 'out',
      accountId: 12,
      search: 'аренда',
    });
  });

  it('мусор в адресе отборами не становится', () => {
    // Чужая ссылка или ручная правка: направление не из двух значений,
    // счёт — не число. И то и другое сервер отверг бы, а список выглядел бы
    // сломанным без объяснения.
    expect(filtersFromSearch('?flow=сюда&accountId=abc&contactId=')).toEqual({});
  });

  it('пустые отборы в адрес не пишутся', () => {
    expect(
      searchFromFilters({
        fromDate: '2026-01-01',
        search: '',
        accountId: undefined,
      }),
    ).toBe('?fromDate=2026-01-01');
  });

  it('адрес и отборы переводятся туда и обратно', () => {
    const filters = {
      fromDate: '2026-02-01',
      toDate: '2026-02-28',
      flow: 'in' as const,
      accountId: 3,
      minAmount: 1000,
      search: 'оплата',
    };

    expect(filtersFromSearch(searchFromFilters(filters))).toEqual(filters);
  });

  it('считает отборы сверх периода — для подписи на кнопке', () => {
    expect(
      countExtraFilters({ fromDate: '2026-01-01', toDate: '2026-01-31' }),
    ).toBe(0);
    expect(
      countExtraFilters({
        fromDate: '2026-01-01',
        flow: 'out',
        accountId: 5,
      }),
    ).toBe(2);
  });
});
