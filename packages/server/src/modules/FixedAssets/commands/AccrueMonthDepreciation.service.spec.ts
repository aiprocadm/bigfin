// © 2026 Bigfin
import { entriesToAccrue } from './AccrueMonthDepreciation.service';

describe('entriesToAccrue', () => {
  const rows = [
    { id: 1, period: '2026-04', status: 'planned' },
    { id: 2, period: '2026-05', status: 'planned' },
    { id: 3, period: '2026-04', status: 'posted' },
  ];

  it('берёт только planned-строки с period <= целевого (catch-up)', () => {
    const sel = entriesToAccrue(rows as any, '2026-04');
    expect(sel.map((e) => e.id)).toEqual([1]);
  });

  it('повторный вызов за уже посчитанный месяц ничего не возвращает', () => {
    const posted = rows.map((r) =>
      r.period === '2026-04' ? { ...r, status: 'posted' } : r,
    );
    const sel = entriesToAccrue(posted as any, '2026-04');
    expect(sel).toHaveLength(0);
  });

  it('catch-up: целевой май захватывает и непосчитанный апрель', () => {
    const sel = entriesToAccrue(rows as any, '2026-05');
    expect(sel.map((e) => e.id)).toEqual([1, 2]);
  });
});
