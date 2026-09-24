import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * UI-043-2 ТЗ-4. Документация дизайн-системы полна.
 *
 * Токен, которого нет в описании, берут наугад: не зная, «для чего он»,
 * человек подставит ближайший похожий, и шкала расползётся. Поэтому
 * проверяется не только «упомянутое существует» (colorsDocMatchesTokens),
 * но и обратное — «существующее описано».
 */
const GLOBALS = fs.readFileSync(path.resolve(__dirname, '../../styles/globals.css'), 'utf8');
const TOKENS = fs.readFileSync(path.resolve(__dirname, '../../styles/tokens.css'), 'utf8');
const TYPOGRAPHY = fs.readFileSync(path.resolve(__dirname, 'typography.mdx'), 'utf8');
const COLORS = fs.readFileSync(path.resolve(__dirname, 'colors.mdx'), 'utf8');

/** Размеры шкалы из @theme: `--text-large-title: …` (без под-свойств `--…--line-height`). */
const scale = [
  ...GLOBALS.matchAll(/^\s*--text-([a-z0-9]+(?:-[a-z0-9]+)*):/gm),
].map((m) => m[1]);

/** Цветовые токены светлой темы: блок :root до первой закрывающей скобки. */
const rootBlock = TOKENS.slice(TOKENS.indexOf(':root'), TOKENS.indexOf('}', TOKENS.indexOf(':root')));
const colorTokens = [...rootBlock.matchAll(/^\s*(--c-[a-z0-9-]+):/gm)].map((m) => m[1]);
const otherTokens = [...rootBlock.matchAll(/^\s*(--(?:elev|motion|radius)[a-z0-9-]*):/gm)].map(
  (m) => m[1],
);

describe('документация дизайн-системы полна', () => {
  it('шкала и токены прочитаны', () => {
    // Иначе проверки ниже стали бы пустыми и зелёными.
    expect(scale.length).toBeGreaterThanOrEqual(10);
    expect(colorTokens.length).toBeGreaterThan(20);
    expect(otherTokens.length).toBeGreaterThanOrEqual(8);
  });

  it('каждый размер шкалы описан в typography.mdx', () => {
    expect(scale.filter((name) => !TYPOGRAPHY.includes(`text-${name}`))).toEqual([]);
  });

  it('каждый цветовой токен описан в colors.mdx', () => {
    // Оттенки наведения описываются вместе с основным цветом.
    const undocumented = colorTokens
      .filter((name) => !/-(hover|fg)$/.test(name))
      .filter((name) => !COLORS.includes(name));
    expect(undocumented).toEqual([]);
  });

  it('скругления, высоты и движение описаны в colors.mdx', () => {
    expect(otherTokens.filter((name) => !COLORS.includes(name))).toEqual([]);
  });
});
