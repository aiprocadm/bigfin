import { describe, it, expect } from 'vitest';

import {
  actionConfirmValues,
  actionPlannedDate,
  drillTargetFromFigure,
  figureByKey,
  formatFigureValue,
  gapFromWhatIf,
  hasRejectedNumbers,
  memoPlainText,
  tableCellText,
  type FigureFormatters,
} from './aiCfoHelpers';

/** Форматы-заглушки: видно, какой из них выбран, без хранилища организации. */
const fmt: FigureFormatters = {
  money: (value) => `M(${value})`,
  percent: (value) => `P(${value})`,
  date: (iso) => `D(${iso})`,
  none: 'нет базы',
};

describe('AI CFO: «Показать операции» по числу ответа', () => {
  it('переносит фильтр сервера в панель раскрытия без своих добавок', () => {
    // Итог панели обязан совпасть с числом ответа (AC 2) — лишний фильтр
    // витрины его бы изменил.
    expect(
      drillTargetFromFigure({
        label: 'Аренда',
        drill: { articleId: 12, fromDate: '2026-09-01', toDate: '2026-09-24', basis: 'cash' },
      }),
    ).toEqual({
      articleId: 12,
      fromDate: '2026-09-01',
      toDate: '2026-09-24',
      basis: 'cash',
      title: 'Аренда',
    });
  });

  it('ярус ОПиУ раскрывается без статьи, заголовок — от сервера', () => {
    expect(
      drillTargetFromFigure({
        label: 'Коммерческие',
        drill: { plType: 'commercial', fromDate: '2026-08-01', toDate: '2026-08-31', basis: 'accrual', title: 'Коммерческие расходы' },
      }),
    ).toEqual({
      plType: 'commercial',
      fromDate: '2026-08-01',
      toDate: '2026-08-31',
      basis: 'accrual',
      title: 'Коммерческие расходы',
    });
  });

  it('без статьи, счёта и яруса кнопки нет — панели нечего показать', () => {
    expect(drillTargetFromFigure({ label: 'Итого', drill: { fromDate: '2026-09-01', toDate: '2026-09-30' } })).toBeNull();
    expect(drillTargetFromFigure({ label: 'Итого' })).toBeNull();
    expect(drillTargetFromFigure(undefined)).toBeNull();
  });

  it('причина находит своё число по ключу', () => {
    const reply = { figures: [{ key: 'rent', label: 'Аренда', value: 1, kind: 'money' as const }] };
    expect(figureByKey(reply, 'rent')?.label).toBe('Аренда');
    expect(figureByKey(reply, 'nope')).toBeUndefined();
    expect(figureByKey(reply, undefined)).toBeUndefined();
  });
});

describe('AI CFO: значения чисел', () => {
  it('каждый вид — своим форматом', () => {
    expect(formatFigureValue({ kind: 'money', value: 1500 }, fmt)).toBe('M(1500)');
    expect(formatFigureValue({ kind: 'percent', value: 12.5 }, fmt)).toBe('P(12.5)');
    expect(formatFigureValue({ kind: 'date', value: null, date: '2026-10-10' }, fmt)).toBe('D(2026-10-10)');
    expect(formatFigureValue({ kind: 'count', value: 3 }, fmt)).toBe('3');
  });

  it('нет базы — это «нет базы», а не ноль и не +100 %', () => {
    expect(formatFigureValue({ kind: 'percent', value: null }, fmt)).toBe('нет базы');
    expect(formatFigureValue({ kind: 'money', value: null }, fmt)).toBe('нет базы');
    expect(formatFigureValue({ kind: 'date', value: null }, fmt)).toBe('нет базы');
  });

  it('ячейки таблицы: процент в столбце с %, остальное — деньги', () => {
    expect(tableCellText('Δ %', 25, fmt)).toBe('P(25)');
    expect(tableCellText('Было', 1000, fmt)).toBe('M(1000)');
    expect(tableCellText('Статья', 'Аренда', fmt)).toBe('Аренда');
    expect(tableCellText('Δ %', null, fmt)).toBe('нет базы');
  });

  it('подмену чисел модели замечает только когда она была', () => {
    expect(hasRejectedNumbers({ explanation: { source: 'model', text: '', rejectedNumbers: [777] } })).toBe(true);
    expect(hasRejectedNumbers({ explanation: { source: 'model', text: '', rejectedNumbers: [] } })).toBe(false);
    expect(hasRejectedNumbers({})).toBe(false);
  });
});

describe('AI CFO: записка текстом', () => {
  it('заголовки и абзацы, между разделами — пустая строка', () => {
    const text = memoPlainText({
      sections: [
        { key: 'overview', title: 'Обзор', text: ['Выручка 100.', 'Прибыль 10.'], figures: [] },
        { key: 'risks', title: 'Риски', text: ['Рисков не видно.'], figures: [{ label: 'x', value: 1 }] },
      ],
    });
    expect(text).toBe('Обзор\nВыручка 100.\nПрибыль 10.\n\nРиски\nРисков не видно.');
  });

  it('пустая записка — пустой текст, без падения', () => {
    expect(memoPlainText(null)).toBe('');
    expect(memoPlainText({ sections: [] })).toBe('');
  });
});

describe('AI CFO: перенос платежа', () => {
  const action = {
    amount: 700000,
    fromDate: '2026-10-10',
    toDate: '2026-10-25',
    execute: { method: 'POST' as const, path: '/payment-calendar/planned-operations/5/reschedule', body: { plannedDate: '2026-10-25' } },
  };

  it('вопрос подтверждения называет сумму и обе даты', () => {
    expect(actionConfirmValues(action, fmt)).toEqual({
      amount: 'M(700000)',
      from: 'D(2026-10-10)',
      to: 'D(2026-10-25)',
    });
  });

  it('новая дата берётся из описания действия сервером', () => {
    expect(actionPlannedDate(action)).toBe('2026-10-25');
    expect(actionPlannedDate({ toDate: '2026-11-01', execute: { method: 'POST', path: '', body: {} } })).toBe('2026-11-01');
  });

  it('разрыв из ответа «что если»: глубина без знака, нет разрыва — null', () => {
    expect(gapFromWhatIf({ gap: { date: '2026-10-12', amount: 50000, daysFromStart: 18 } })).toEqual({
      date: '2026-10-12',
      amount: 50000,
    });
    expect(gapFromWhatIf({ gap: null, gaps: [] })).toBeNull();
    expect(gapFromWhatIf(undefined)).toBeNull();
  });
});
