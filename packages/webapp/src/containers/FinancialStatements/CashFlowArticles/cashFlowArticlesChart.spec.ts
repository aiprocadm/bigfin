// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import {
  cashFlowChartSeries,
  hasChartMovement,
} from './cashFlowArticlesChart';
import { FlatReportRow } from './cashFlowArticlesRows';

/**
 * График над отчётом «Деньги» показывает ТЕ ЖЕ числа, что таблица (T-14).
 *
 * Требование из чек-листа приёмки (§15.3): «График над таблицей показывает
 * те же числа, что таблица». Расхождение здесь дороже отсутствия графика:
 * человек сверяет картинку с цифрами и перестаёт верить обеим.
 *
 * Равенство обеспечено устройством — ряд собирается ИЗ СТРОК ТАБЛИЦЫ. Эта
 * спека закрепляет устройство, чтобы завтра никто не завёл графику
 * собственный запрос.
 */
const row = (
  id: string,
  name: string,
  amount: number | null,
  rowType: string,
): FlatReportRow => ({
  id,
  name,
  amount,
  level: 0,
  rowType,
  hasChildren: false,
});

const ROWS: FlatReportRow[] = [
  row('opening', 'Остаток на начало', 200_000.33, 'OPENING'),
  row('s1', 'Операционная деятельность', 75_200.3, 'SECTION'),
  row('a1', 'Выручка', 120_300.55, 'ARTICLE'),
  row('s2', 'Инвестиционная деятельность', -30_000.1, 'SECTION'),
  row('s3', 'Финансовая деятельность', 0, 'SECTION'),
  row('head', 'Поступления', null, 'INFLOW'),
  row('net', 'Чистый поток', 45_200.2, 'NET'),
  row('closing', 'Остаток на конец', 245_200.53, 'CLOSING'),
];

describe('ряд графика отчёта «Деньги»', () => {
  it('берёт ИМЕННО разделы', () => {
    const series = cashFlowChartSeries(ROWS);

    expect(series.map((point) => point.name)).toEqual([
      'Операционная деятельность',
      'Инвестиционная деятельность',
      'Финансовая деятельность',
    ]);
  });

  it('СУММЫ СОВПАДАЮТ С ТАБЛИЦЕЙ ДО КОПЕЙКИ', () => {
    const series = cashFlowChartSeries(ROWS);

    expect(series.map((point) => point.amount)).toEqual([
      75_200.3,
      -30_000.1,
      0,
    ]);
  });

  it('статьи и итоги на график НЕ попадают', () => {
    // График отвечает на «откуда взялось движение», а не перечисляет всё
    // подряд; итоги на нём задвоили бы разделы.
    const names = cashFlowChartSeries(ROWS).map((point) => point.name);

    expect(names).not.toContain('Выручка');
    expect(names).not.toContain('Чистый поток');
  });

  it('заголовок без суммы не становится столбиком', () => {
    const series = cashFlowChartSeries([row('h', 'Поступления', null, 'SECTION')]);

    expect(series).toEqual([]);
  });

  it('движения нет — графика нет', () => {
    // Пустой график с подписью «0» выглядит поломкой, а не ответом
    // «движения за период не было».
    expect(hasChartMovement([{ name: 'Операционная', amount: 0 }])).toBe(false);
    expect(hasChartMovement([])).toBe(false);
    expect(hasChartMovement(cashFlowChartSeries(ROWS))).toBe(true);
  });

  it('пустые строки не роняют разбор', () => {
    expect(cashFlowChartSeries()).toEqual([]);
    expect(cashFlowChartSeries([])).toEqual([]);
  });

  it('у графика НЕТ своего запроса за данными', () => {
    // Второй источник тех же сумм — то, что прежнее ТЗ запретило прямо.
    // Сторож против возврата: ряд обязан собираться из строк таблицы.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const source = require('fs').readFileSync(
      require('path').resolve(__dirname, 'cashFlowArticlesChart.ts'),
      'utf8',
    );

    expect(source).not.toContain('useQuery');
    expect(source).not.toContain('apiRequest');
  });
});
