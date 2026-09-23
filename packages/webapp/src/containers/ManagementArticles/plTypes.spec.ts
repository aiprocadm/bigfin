// © 2026 Bigfin
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import intl from 'react-intl-universal';

import ru from '@/lang/ru/index.json';
import en from '@/lang/en/index.json';
import {
  describeTier,
  PL_TYPES,
  plTypeOptions,
  PL_TYPE_EXCLUDED,
} from './plTypes';

/**
 * Подписи яруса управленческого ОПиУ (FT-009 ТЗ-3).
 *
 * Проверяется на НАСТОЯЩЕМ русском словаре: критерий приёмки говорит
 * дословной фразой, и сверять её с подставленными строками значило бы
 * проверять саму проверку.
 */
const dictionary: Record<string, string> = ru as any;

beforeEach(() => {
  vi.spyOn(intl, 'get').mockImplementation(
    ((key: string) => dictionary[key] ?? '') as any,
  );
});
afterEach(() => vi.restoreAllMocks());

describe('ярусы в форме статьи', () => {
  it('доходной статье — ярусы доходов и «не участвует»', () => {
    expect(plTypeOptions('income')).toEqual([
      'revenue',
      'other_income_below_ebitda',
      PL_TYPE_EXCLUDED,
    ]);
  });

  it('расходной — семь ярусов расходов и «не участвует»', () => {
    const options = plTypeOptions('expense');
    expect(options).toHaveLength(8);
    expect(options).not.toContain('revenue');
    expect(options[options.length - 1]).toBe(PL_TYPE_EXCLUDED);
  });

  it('балансовым статьям ярусов нет — поле не показывается', () => {
    ['asset', 'liability', 'equity', undefined].forEach((kind) => {
      expect(plTypeOptions(kind)).toEqual([]);
    });
  });
});

describe('подпись яруса', () => {
  it('критерий приёмки 3: «Прямые переменные → уменьшает маржинальный доход»', () => {
    expect(describeTier('direct_variable', false).sentence).toBe(
      'Прямые переменные → уменьшает маржинальный доход',
    );
  });

  it('унаследованный ярус помечен', () => {
    const tier = describeTier('administrative', true);
    expect(tier.inherited).toBe(true);
    expect(tier.label).toBe('Административные');
  });

  it('незаданный ярус назван словами, а не пустотой', () => {
    const tier = describeTier(null, false);
    expect(tier.unassigned).toBe(true);
    expect(tier.label).toBe('Не отнесено к ярусу');
    expect(tier.sentence).toContain('Не отнесено к ярусу');
  });

  it('мусор вместо яруса — как незаданный, а не как ярус', () => {
    expect(describeTier('marketing', false).unassigned).toBe(true);
  });
});

describe('у каждого яруса есть все подписи на обоих языках', () => {
  // Ярус без подписи на экране выглядел бы ключом перевода. Проверяем
  // словари напрямую, а не через подменённый intl.
  const dictionaries = { ru, en } as Record<string, Record<string, string>>;

  Object.entries(dictionaries).forEach(([lang, dict]) => {
    it(`${lang}: название, пример и действие для каждого яруса`, () => {
      PL_TYPES.forEach((type) => {
        expect(dict[`management_articles.pl_type.${type}`]).toBeTruthy();
        expect(dict[`management_articles.pl_type_hint.${type}`]).toBeTruthy();
        expect(dict[`management_articles.pl_type_effect.${type}`]).toBeTruthy();
      });
    });
  });
});
