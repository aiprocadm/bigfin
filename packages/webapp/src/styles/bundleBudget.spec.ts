import { describe, expect, it } from 'vitest';
import { firstLoadFiles, parseBudget, raisedLimits, BUDGET } from '../../../../scripts/bundle-budget.mjs';

/** Сторож размера сборки (UI-055-3 ТЗ-4): порог только вниз. */
describe('бюджет сборки', () => {
  it('пороги прочитаны из файла', () => {
    const text = `export const BUDGET = {\n  first: 990_000,\n  total: 2_620_000,\n  chunk: 432_000,\n};`;
    expect(parseBudget(text)).toEqual({ first: 990000, total: 2620000, chunk: 432000 });
    expect(Object.keys(BUDGET).sort()).toEqual(['chunk', 'first', 'total']);
  });

  it('поднятый порог ловится, опущенный — нет (подсаженная поломка)', () => {
    const base = { first: 100, total: 200, chunk: 50 };
    expect(raisedLimits({ first: 101, total: 200, chunk: 50 }, base)).toEqual(['first']);
    expect(raisedLimits({ first: 90, total: 150, chunk: 40 }, base)).toEqual([]);
    expect(raisedLimits({ first: 999 }, null)).toEqual([]);
  });

  it('до первого экрана — модульные скрипты и их предзагрузки, без legacy', () => {
    const html = `<script type="module" crossorigin src="/assets/index-a.js"></script>
      <link rel="modulepreload" crossorigin href="/assets/vendor-b.js">
      <script nomodule src="/assets/polyfills-legacy-c.js"></script>
      <link rel="preload" href="/assets/inter.woff2" as="font">`;
    expect(firstLoadFiles(html)).toEqual(['/assets/index-a.js', '/assets/vendor-b.js']);
  });
});
