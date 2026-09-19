// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { activeCode } from '../../../../testing/activeCode';
import {
  attachPreviousPeriod,
  changePercentage,
  flattenTotals,
} from './cashFlowPreviousPeriod';
import {
  previousPeriodDiffDays,
  previousPeriodTotalRange,
} from '../../common/previousPeriodRange';

/**
 * Сравнение с прошлым периодом в Движении денег (остаток О3 ТЗ).
 *
 * Это был единственный из трёх главных отчётов без сравнения.
 */
const format = (amount: number) => ({
  amount,
  formattedAmount: `${amount.toFixed(2)} RUB`,
});
const formatPercent = (amount: number) => ({
  amount,
  formattedAmount: `${amount.toFixed(1)}%`,
});

const options = {
  showPrevious: true,
  showChange: true,
  showPercentage: true,
  formatAmount: format,
  formatPercentage: formatPercent,
};

const section = (id: string, amount: number, children?: any[]) => ({
  id,
  label: id,
  total: { amount, formattedAmount: `${amount}` },
  ...(children ? { children } : {}),
});

describe('прошлый период: отрезок той же длины', () => {
  it('длина считается включая оба конца', () => {
    // «С 1 по 31 марта» это 31 день, а не 30. Без единицы прошлый период
    // наезжал бы на текущий одним днём.
    expect(previousPeriodDiffDays('2026-03-01', '2026-03-31')).toBe(31);
  });

  it('март сравнивается с февралём', () => {
    const range = previousPeriodTotalRange('2026-03-01', '2026-03-31');

    expect(range.fromDate.toISOString().slice(0, 10)).toBe('2026-01-29');
    expect(range.toDate.toISOString().slice(0, 10)).toBe('2026-02-28');
  });

  it('прошлый период не пересекается с текущим', () => {
    // Пересечение означало бы, что одни и те же операции попали в обе
    // колонки, и «изменение» показывало бы разницу с самим собой.
    const range = previousPeriodTotalRange('2026-03-01', '2026-03-31');

    expect(range.toDate.toISOString().slice(0, 10) < '2026-03-01').toBe(true);
  });

  it('правило живёт в одном месте на все отчёты', () => {
    // Своя копия в примеси означала бы, что Баланс и Движение денег могут
    // однажды сравнивать с разными отрезками, оба выглядя правильными.
    const mixin = activeCode(
      fs.readFileSync(
        path.join(__dirname, '../../common/FinancialDateRanges.ts'),
        'utf-8',
      ),
    );

    expect(mixin).toContain('previousPeriodTotalRange');
    expect(mixin).toContain('previousPeriodDiffDays');
  });
});

describe('изменение в процентах', () => {
  it('считается от прошлого периода', () => {
    expect(changePercentage(150, 100)).toBe(50);
  });

  it('падение показывается минусом', () => {
    expect(changePercentage(50, 100)).toBe(-50);
  });

  it('прошлый период отрицательный — знак изменения не переворачивается', () => {
    // Делим на МОДУЛЬ: был минус 100, стал минус 50 — это улучшение на 50%,
    // а не ухудшение. Деление на само отрицательное число дало бы минус.
    expect(changePercentage(-50, -100)).toBe(50);
  });

  it('прошлого периода не было — процента не существует', () => {
    // Рост с нуля до миллиона это не «плюс 100%». Ноль здесь означал бы
    // «ничего не изменилось» ровно там, где изменилось всё.
    expect(changePercentage(1_000_000, 0)).toBeNull();
  });
});

describe('развешивание по секциям', () => {
  const current = [
    section('OPERATING', 300, [section('SALES', 500), section('RENT', -200)]),
  ];
  const previous = flattenTotals([
    section('OPERATING', 200, [section('SALES', 400), section('RENT', -200)]),
  ]);

  it('значения находят свою секцию по номеру', () => {
    const result: any = attachPreviousPeriod(current, previous, options);

    expect(result[0].previousPeriod.amount).toBe(200);
    expect(result[0].children[0].previousPeriod.amount).toBe(400);
  });

  it('вложенные секции тоже получают сравнение', () => {
    const result: any = attachPreviousPeriod(current, previous, options);

    expect(result[0].children[1].previousPeriodChange.amount).toBe(0);
  });

  it('изменение — это текущий минус прошлый', () => {
    const result: any = attachPreviousPeriod(current, previous, options);

    expect(result[0].previousPeriodChange.amount).toBe(100);
  });

  it('секции, которой раньше не было, ставится ноль', () => {
    // Это честный ответ на вопрос «сколько было раньше»: нисколько.
    const result: any = attachPreviousPeriod(
      [section('NEW_ONE', 700)],
      previous,
      options,
    );

    expect(result[0].previousPeriod.amount).toBe(0);
  });

  it('выключенная колонка не появляется вовсе', () => {
    // Три колонки сразу на узком экране прячут сами числа — ради этого
    // выключатели и разделены.
    const result: any = attachPreviousPeriod(current, previous, {
      ...options,
      showChange: false,
      showPercentage: false,
    });

    expect(result[0].previousPeriod).toBeDefined();
    expect(result[0].previousPeriodChange).toBeUndefined();
    expect(result[0].previousPeriodPercentage).toBeUndefined();
  });

  it('оформление чисел приходит снаружи', () => {
    // Свой способ оформлять число означал бы «1 200,00 ₽» в одной колонке
    // и «1200» в соседней.
    const result: any = attachPreviousPeriod(current, previous, options);

    expect(result[0].previousPeriod.formattedAmount).toBe('200.00 RUB');
  });

  it('исходные секции не портятся', () => {
    attachPreviousPeriod(current, previous, options);

    expect((current[0] as any).previousPeriod).toBeUndefined();
  });
});

describe('второй отчёт считается тем же кодом', () => {
  const service = activeCode(
    fs.readFileSync(path.join(__dirname, 'CashFlowService.ts'), 'utf-8'),
  );

  it('прошлый период берётся повторным вызовом отчёта', () => {
    // Второй способ считать те же числа однажды разойдётся с первым,
    // и оба будут выглядеть правильными.
    expect(service).toContain('this.cashFlow({');
  });

  it('у повторного вызова сравнение выключено', () => {
    // Иначе он потребовал бы третий, и так без конца.
    expect(service).toContain('previousPeriod: false');
  });

  it('без выключателей повторного запроса нет', () => {
    // Сравнение стоит второго прохода по проводкам — но только когда его
    // и правда попросили.
    expect(service).toContain('return data;');
  });
});

describe('колонки таблицы', () => {
  const table = activeCode(
    fs.readFileSync(path.join(__dirname, 'CashFlowTable.ts'), 'utf-8'),
  );

  it('каждая колонка приходит по своему выключателю', () => {
    expect(table).toContain('previousPeriodColumns');
    expect(table).toContain('previousPeriodAccessors');
  });

  it('итоговая строка не теряет колонки сравнения', () => {
    // Итог собирается здесь же, уже после развешивания значений. Без этих
    // полей его ячейки сравнения остались бы пустыми.
    expect(table).toContain('previousPeriod: section.previousPeriod');
  });
});
