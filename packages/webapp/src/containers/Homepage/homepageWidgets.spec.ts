import { describe, expect, it } from 'vitest';

import {
  HOMEPAGE_WIDGETS,
  orderWidgets,
  sameOrder,
  visibleWidgets,
} from './homepageWidgets';

/**
 * Порядок блоков главной (FT-064 ТЗ-3).
 *
 * Настройка лежит годами, а продукт меняется: блоки появляются и уходят.
 * Сохранённый порядок не должен ни ронять главную, ни прятать новые блоки.
 */
const DEFAULTS = ['a', 'b', 'c', 'd'] as const;

describe('orderWidgets', () => {
  it('без сохранённого порядка — порядок по умолчанию', () => {
    expect(orderWidgets(DEFAULTS, [])).toEqual(['a', 'b', 'c', 'd']);
    expect(orderWidgets(DEFAULTS, null)).toEqual(['a', 'b', 'c', 'd']);
    expect(orderWidgets(DEFAULTS, undefined)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('полный сохранённый порядок соблюдается', () => {
    expect(orderWidgets(DEFAULTS, ['d', 'c', 'b', 'a'])).toEqual(['d', 'c', 'b', 'a']);
  });

  it('незнакомые имена молча отбрасываются', () => {
    // Блок убрали из продукта — его имя осталось в настройке.
    expect(orderWidgets(DEFAULTS, ['x', 'b', 'a', 'gone', 'c', 'd'])).toEqual([
      'b',
      'a',
      'c',
      'd',
    ]);
  });

  it('новый блок встаёт за своим соседом по умолчанию', () => {
    // «c» добавили в продукт уже после настройки: по умолчанию он стоит
    // за «b» — туда и встаёт, а не в конец и не пропадает.
    expect(orderWidgets(DEFAULTS, ['d', 'b', 'a'])).toEqual(['d', 'b', 'c', 'a']);
  });

  it('новый первый блок встаёт в начало', () => {
    expect(orderWidgets(DEFAULTS, ['c', 'b', 'd'])).toEqual(['a', 'c', 'b', 'd']);
  });

  it('несколько новых блоков подряд держат свой порядок', () => {
    expect(orderWidgets(DEFAULTS, ['a'])).toEqual(['a', 'b', 'c', 'd']);
    expect(orderWidgets(DEFAULTS, ['d'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('повторы считаются один раз', () => {
    expect(orderWidgets(DEFAULTS, ['b', 'b', 'a', 'c', 'd', 'a'])).toEqual([
      'b',
      'a',
      'c',
      'd',
    ]);
  });

  it('каждый блок главной ровно один раз при любой настройке', () => {
    const result = orderWidgets(HOMEPAGE_WIDGETS, ['plan', 'nope', 'overview']);
    expect([...result].sort()).toEqual([...HOMEPAGE_WIDGETS].sort());
    expect(result.indexOf('plan')).toBeLessThan(result.indexOf('overview'));
  });
});

describe('visibleWidgets', () => {
  it('скрытые убираются, порядок сохраняется', () => {
    expect(visibleWidgets(['d', 'a', 'c'], ['a', 'unknown'])).toEqual(['d', 'c']);
    expect(visibleWidgets(['a', 'b'], null)).toEqual(['a', 'b']);
  });
});

describe('sameOrder', () => {
  it('сравнивает порядок, а не состав', () => {
    expect(sameOrder(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameOrder(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(sameOrder(['a'], ['a', 'b'])).toBe(false);
  });
});
