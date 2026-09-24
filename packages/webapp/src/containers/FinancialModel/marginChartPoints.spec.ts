import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';
import { marginChartPoints } from './marginChartPoints';

/**
 * UI-042-7 ТЗ-4. НАЙДЕНО ЖИВЫМ ПРОХОДОМ: «Маржинальность в динамике» рисовала
 * волны 0 → 100 % → 0. Месяцы без выручки шли нулём, а сглаженная линия
 * придумывала плавные значения между ними.
 */
describe('точки графика маржинальности', () => {
  it('месяц без выручки — разрыв, а не ноль', () => {
    expect(
      marginChartPoints([
        { month: '2026-01', revenue: 0, profit: 0, margin: 0 },
        { month: '2026-02', revenue: 100000, profit: 94400, margin: 0.944 },
      ]),
    ).toEqual([
      { month: '2026-01', marginPct: null },
      { month: '2026-02', marginPct: 94.4 },
    ]);
  });

  it('отрицательная маржа при выручке остаётся числом', () => {
    expect(
      marginChartPoints([
        { month: '2026-03', revenue: 1000, profit: -500, margin: -0.5 },
      ]),
    ).toEqual([{ month: '2026-03', marginPct: -50 }]);
  });

  it('нет данных — пустой список', () => {
    expect(marginChartPoints(undefined)).toEqual([]);
  });

  it('линия ломаная и не соединяет разрывы', () => {
    const code = activeCode(
      fs.readFileSync(path.join(__dirname, 'MarginOverTimeChart.tsx'), 'utf8'),
    );

    expect(code).toContain('type="linear"');
    expect(code).not.toMatch(/type="(monotone|basis|natural)"/);
    expect(code).not.toContain('connectNulls');
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});
