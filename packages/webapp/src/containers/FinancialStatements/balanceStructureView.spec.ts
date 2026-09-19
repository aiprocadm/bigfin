import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';
import {
  drawableSlices,
  formatShare,
  negativeSlices,
  shouldShowStructure,
} from './balanceStructureView';

/**
 * Картинка структуры баланса (остаток О2 ТЗ).
 *
 * Главное правило: картинка не спорит с таблицей под ней. Всё остальное —
 * оформление.
 */
const slice = (id: string, total: number, share: number) => ({
  id,
  name: id,
  total,
  share,
});

describe('что рисуется на полосе', () => {
  it('рисуются только положительные группы', () => {
    const slices = [slice('CURRENT', 600_000, 1), slice('FIXED', -30_000, 0)];

    expect(drawableSlices(slices).map((item) => item.id)).toEqual(['CURRENT']);
  });

  it('отрицательные группы называются отдельно', () => {
    // Промолчать нельзя: сумма полос иначе не сойдётся с итогом в таблице,
    // и человек решит, что врут обе цифры.
    const slices = [slice('CURRENT', 600_000, 1), slice('FIXED', -30_000, 0)];

    expect(negativeSlices(slices).map((item) => item.id)).toEqual(['FIXED']);
  });

  it('пустой баланс не показывает пустую рамку', () => {
    // Пустая рамка сообщает только то, что что-то сломалось.
    expect(shouldShowStructure(undefined)).toBe(false);
    expect(
      shouldShowStructure({
        assets: [],
        liabilitiesEquity: [],
        assetsTotal: 0,
        liabilitiesEquityTotal: 0,
      }),
    ).toBe(false);
  });

  it('баланс с данными показывается', () => {
    expect(
      shouldShowStructure({
        assets: [slice('CURRENT', 600_000, 1)],
        liabilitiesEquity: [],
        assetsTotal: 600_000,
        liabilitiesEquityTotal: 600_000,
      }),
    ).toBe(true);
  });
});

describe('подпись доли', () => {
  it('округляется до целых процентов', () => {
    expect(formatShare(0.374)).toBe('37%');
    expect(formatShare(1)).toBe('100%');
  });

  it('очень малая доля не превращается в ноль', () => {
    // «0 %» читается как «группы нет», а она есть.
    expect(formatShare(0.003)).toBe('<1%');
  });

  it('настоящий ноль остаётся нулём', () => {
    expect(formatShare(0)).toBe('0%');
  });
});

describe('картинка подключена к Балансу', () => {
  const source = activeCode(
    fs.readFileSync(
      path.join(__dirname, 'BalanceSheet/BalanceSheetBody.tsx'),
      'utf8',
    ),
  );

  it('выводится над таблицей', () => {
    expect(source).toContain('<BalanceStructureChart');
  });

  it('получает период отчёта', () => {
    // Без дат картинка не запросится вовсе и молча не покажется.
    expect(source).toContain('fromDate={httpQuery?.fromDate}');
    expect(source).toContain('toDate={httpQuery?.toDate}');
  });

  it('проверка и правда читает файл', () => {
    expect(source.length).toBeGreaterThan(500);
  });
});
