// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import { columnLabel, matrixRowsView } from './calendarMatrixView';

/** FT-050 ТЗ-3: матрица план/факт на экране. */
describe('матрица календаря на экране', () => {
  const data = {
    columns: [
      {
        key: '2026-10',
        from: '2026-10-01',
        plan: { opening: 1_000_000, inflow: 0, outflow: 1_200_000, change: -1_200_000, closing: -200_000 },
        fact: { opening: 1_000_000, inflow: 10, outflow: 0, change: 10, closing: 1_000_010 },
        gap: true,
      },
    ],
    inflowGroups: [{ key: '2', name: 'Выручка', cells: [{ plan: 0, fact: 10 }] }],
    outflowGroups: [{ key: 'transfer', name: 'transfer', cells: [{ plan: 1_200_000, fact: 0 }] }],
    accounts: [{ accountId: 1000, name: 'Расчётный', cells: [{ planClosing: -200_000, factClosing: 1_000_010 }] }],
  };

  it('пять строк, в колонке план и факт; отрицательный плановый конец — разрыв', () => {
    const view = matrixRowsView(data);
    expect(view.rows.map((row) => row.key)).toEqual(['opening', 'inflow', 'outflow', 'change', 'closing']);
    const closing = view.rows[4];
    expect(closing.cells).toEqual([{ value: -200_000, gap: true }, { value: 1_000_010 }]);
    // Факт разрывом не подсвечивается — разрыв это про план.
    expect(view.rows[0].cells[1]).toEqual({ value: 1_000_000 });
  });

  it('раскрытия: группы поступлений и списаний, счета у остатка', () => {
    const view = matrixRowsView(data);
    expect(view.rows[1].children).toEqual([{ key: '2', name: 'Выручка', cells: [{ value: 0 }, { value: 10 }] }]);
    // Переводы между счетами подписываются экраном, а не служебным ключом.
    expect(view.rows[2].children[0].name).toBeNull();
    expect(view.rows[4].children[0].cells).toEqual([{ value: -200_000 }, { value: 1_000_010 }]);
  });

  it('подписи колонок', () => {
    expect(columnLabel({ key: '2026-10-05', from: '2026-10-05' })).toBe('05.10');
    expect(columnLabel({ key: '2026-Q4', from: '2026-10-01' })).toBe('2026 Q4');
  });
});
