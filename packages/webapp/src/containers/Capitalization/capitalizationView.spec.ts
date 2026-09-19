// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import {
  buildDriverRows,
  capitalizationWarning,
  primaryValuation,
} from './capitalizationView';

const base = {
  assets: 1_000_000,
  liabilities: 300_000,
  netAssets: 700_000,
  hasBalance: true,
  profit: 500_000,
  profitMultiple: 4,
  multipleValuation: { value: 2_000_000, applicable: true },
  ownershipSharePercent: 100,
  ownerValue: { value: 2_000_000, applicable: true },
  drivers: [],
};

describe('предупреждения на экране стоимости', () => {
  it('всё посчитано — предупреждать не о чем', () => {
    expect(capitalizationWarning(base as any)).toBeNull();
  });

  it('пустой баланс важнее всего остального', () => {
    // Организации без единой проводки незачем советовать настроить
    // множитель: ей это ничего не даст.
    const data = {
      ...base,
      hasBalance: false,
      profit: -1,
      profitMultiple: null,
    };

    expect(capitalizationWarning(data as any)).toBe('no_balance');
  });

  it('убыток важнее ненастроенного множителя', () => {
    // Настроив множитель, владелец всё равно не получит оценку — и решит,
    // что продукт сломан.
    const data = { ...base, profit: -100, profitMultiple: null };

    expect(capitalizationWarning(data as any)).toBe('loss');
  });

  it('прибыль есть, множителя нет — просим настроить', () => {
    const data = { ...base, profitMultiple: null };

    expect(capitalizationWarning(data as any)).toBe('no_multiple');
  });

  it('нет данных — молчим, а не выдумываем предупреждение', () => {
    expect(capitalizationWarning(undefined)).toBeNull();
  });
});

describe('какая оценка главная', () => {
  it('оценка по множителю, когда она применима', () => {
    expect(primaryValuation(base as any)).toEqual({
      key: 'multiple',
      value: 2_000_000,
    });
  });

  it('иначе чистые активы — они не зависят от допущений', () => {
    const data = {
      ...base,
      multipleValuation: { value: 0, applicable: false },
    };

    expect(primaryValuation(data as any)).toEqual({
      key: 'net_assets',
      value: 700_000,
    });
  });

  it('без данных показывается ноль чистых активов, а не оценка', () => {
    expect(primaryValuation(undefined)).toEqual({
      key: 'net_assets',
      value: 0,
    });
  });
});

describe('разложение стоимости', () => {
  it('сначала то, что увеличивает', () => {
    const rows = buildDriverRows([
      { key: 'liabilities', amount: 300_000, direction: 'down' },
      { key: 'assets', amount: 1_000_000, direction: 'up' },
    ]);

    expect(rows.map((row) => row.key)).toEqual(['assets', 'liabilities']);
  });

  it('нулевые строки не показываются', () => {
    // «Обязательства 0 ₽» намекает на проблему, которой нет.
    const rows = buildDriverRows([
      { key: 'assets', amount: 1000, direction: 'up' },
      { key: 'liabilities', amount: 0, direction: 'down' },
    ]);

    expect(rows).toHaveLength(1);
  });

  it('пусто, когда сервер ничего не прислал', () => {
    expect(buildDriverRows(undefined)).toEqual([]);
  });
});
