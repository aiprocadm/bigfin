import { describe, expect, it } from 'vitest';

import {
  REPORT_BASES,
  REPORT_BUILD_BY,
  REPORT_SCALES,
  controlsFromSearch,
  searchWithControls,
} from './reportControls';

/**
 * Переключатели отчёта в адресной строке (FIN-012 ТЗ-2).
 *
 * Отчёт печатают и пересылают: «посмотри нашу прибыль по кварталам кассовым
 * методом» должно быть ссылкой, а не инструкцией из четырёх шагов. Проверяем
 * не форму строки, а КРУГ — то, что записано, читается обратно.
 */
describe('переключатели отчёта в адресе', () => {
  it('набор значений закрыт и понятен', () => {
    expect([...REPORT_SCALES]).toEqual([
      'day',
      'week',
      'month',
      'quarter',
      'year',
      'total',
    ]);
    expect([...REPORT_BASES]).toEqual(['cash', 'accrual']);
    expect([...REPORT_BUILD_BY]).toEqual(['periods', 'projects', 'deals']);
  });

  it('записанное читается обратно', () => {
    const search = searchWithControls('', {
      scale: 'quarter',
      basis: 'cash',
      buildBy: 'projects',
    });

    expect(controlsFromSearch(search)).toEqual({
      scale: 'quarter',
      basis: 'cash',
      buildBy: 'projects',
    });
  });

  it('остальные параметры адреса СОХРАНЯЮТСЯ', () => {
    // Их мог поставить кто-то другой: период, разрез по юрлицу, подсветка
    // строки. Потерять их при смене масштаба — значит сломать ссылку.
    const search = searchWithControls('?fromDate=2026-01-01&legalEntityIds=3', {
      scale: 'year',
    });
    const params = new URLSearchParams(search);

    expect(params.get('fromDate')).toBe('2026-01-01');
    expect(params.get('legalEntityIds')).toBe('3');
    expect(params.get('scale')).toBe('year');
  });

  it('пустое значение УБИРАЕТ параметр, а не пишет пустоту', () => {
    // Пустой параметр в адресе сервер читает как отбор «ничего».
    const search = searchWithControls('?scale=year&basis=cash', {
      scale: undefined,
      basis: 'accrual',
    });

    expect(search).not.toContain('scale');
    expect(search).toContain('basis=accrual');
  });

  it('ОПЕЧАТКА молча отбрасывается, а не ломает отчёт', () => {
    // Опечатался тот, кто прислал ссылку, а смотрит её другой человек.
    // Отчёт строится по умолчанию — это честнее пустого экрана.
    expect(controlsFromSearch('?scale=quater&basis=kassa')).toEqual({});
  });

  it('пустой адрес не задаёт ничего', () => {
    expect(controlsFromSearch('')).toEqual({});
  });

  it('повторный выбор не плодит второй такой же параметр', () => {
    const once = searchWithControls('?scale=month', { scale: 'year' });

    expect(new URLSearchParams(once).getAll('scale')).toEqual(['year']);
  });
});
