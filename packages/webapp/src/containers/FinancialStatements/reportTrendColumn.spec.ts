// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import {
  hasTrend,
  parsePrintedAmount,
  periodCellIndexes,
  trendValuesOfRow,
} from './reportTrendColumn';

/**
 * Колонка «Тренд» в отчётах по периодам (T-38 ТЗ-2).
 *
 * САМОЕ ОПАСНОЕ ЗДЕСЬ — РАЗБОР НАПЕЧАТАННОЙ СУММЫ. Сервер отдаёт ячейки
 * уже в русском виде: «1 749 839,09 ₽», где разряды разделены НЕРАЗРЫВНЫМ
 * пробелом, копейки — запятой, а минус бывает типографским. Наивный
 * `Number()` на таком возвращает `NaN`, и линия молча пропадает — или,
 * что хуже, показывает не те числа.
 */
describe('разбор напечатанной суммы', () => {
  it('русская сумма с неразрывными пробелами', () => {
    expect(parsePrintedAmount('1 749 839,09 ₽')).toBe(
      1_749_839.09,
    );
  });

  it('обычные пробелы тоже', () => {
    expect(parsePrintedAmount('120 300,55 ₽')).toBe(120_300.55);
  });

  it('ОТРИЦАТЕЛЬНАЯ сумма остаётся отрицательной', () => {
    expect(parsePrintedAmount('-45 100,25 ₽')).toBe(-45_100.25);
  });

  it('ТИПОГРАФСКИЙ МИНУС распознаётся', () => {
    // Он не тот же знак, что минус клавиатуры, и `Number()` на нём даёт
    // NaN — линия для расходов пропала бы целиком.
    expect(parsePrintedAmount('−45 100,25 ₽')).toBe(-45_100.25);
  });

  it('ноль — это ноль, а не пустота', () => {
    expect(parsePrintedAmount('0,00 ₽')).toBe(0);
  });

  it('пустая ячейка НЕ становится нулём', () => {
    // «Нет значения» и «ноль» на графике выглядят одинаково, а значат
    // разное.
    expect(parsePrintedAmount('')).toBeNull();
    expect(parsePrintedAmount('—')).toBeNull();
    expect(parsePrintedAmount('н/о')).toBeNull();
  });

  it('английский формат тоже читается', () => {
    // Организации бывают не только российские.
    expect(parsePrintedAmount('$1,234.50')).toBe(1234.5);
  });
});

describe('значения строки по периодам', () => {
  const row = {
    cells: [
      { key: 'name', value: 'Выручка' },
      { key: 'p1', value: '100 000,00 ₽' },
      { key: 'p2', value: '150 000,50 ₽' },
      { key: 'p3', value: '' },
    ],
  } as any;

  it('берёт только колонки периодов', () => {
    expect(trendValuesOfRow(row, [1, 2])).toEqual([100_000, 150_000.5]);
  });

  it('пустые ячейки пропускаются, а не становятся нулями', () => {
    expect(trendValuesOfRow(row, [1, 2, 3])).toEqual([100_000, 150_000.5]);
  });

  it('название в тренд не попадает', () => {
    // Иначе первая точка линии оказалась бы разбором слова.
    expect(trendValuesOfRow(row, [0, 1])).toEqual([100_000]);
  });
});

describe('когда тренд показывать', () => {
  it('одна точка — не тренд', () => {
    expect(hasTrend([100])).toBe(false);
  });

  it('все нули — не тренд', () => {
    // Ровная линия по нулю читается как «данные есть», хотя их нет.
    expect(hasTrend([0, 0, 0])).toBe(false);
  });

  it('две разные точки — тренд', () => {
    expect(hasTrend([0, 100])).toBe(true);
  });

  it('пусто не роняет проверку', () => {
    expect(hasTrend([])).toBe(false);
  });
});

describe('какие колонки считать периодами', () => {
  it('первая колонка (название) исключается', () => {
    const columns = [
      { key: 'name', label: 'Статья', cellIndex: 0 },
      { key: 'p1', label: 'Январь', cellIndex: 1 },
      { key: 'p2', label: 'Февраль', cellIndex: 2 },
    ] as any;

    expect(periodCellIndexes(columns)).toEqual([1, 2]);
  });

  it('вычисляемые колонки (план, отклонение) не периоды', () => {
    // У них нет индекса ячейки: значение считает экран, а не сервер.
    const columns = [
      { key: 'name', label: 'Статья', cellIndex: 0 },
      { key: 'p1', label: 'Январь', cellIndex: 1 },
      { key: 'plan-fact-plan', label: 'План' },
    ] as any;

    expect(periodCellIndexes(columns)).toEqual([1]);
  });
});
