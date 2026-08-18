import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Сторож М1 (карта v15): телефон не должен быть заблокирован легаси-CSS.
 * Три строки глушили готовый мобильный фундамент: жёсткая min-width 1100px,
 * body{overflow:hidden} без мобильного исключения и min-width 850px внутри
 * дашборда. Жёсткие ширины допустимы ТОЛЬКО под @media (min-width: ...).
 */
const styleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) =>
  fs.readFileSync(path.join(styleDir, rel), 'utf-8');

/** Строки файла вне каких-либо @media-блоков (грубый, но честный парс). */
const outsideMedia = (source: string): string => {
  let depth = 0;
  let inMedia = 0;
  const out: string[] = [];
  for (const line of source.split('\n')) {
    if (/@media/.test(line)) inMedia = depth + 1;
    depth += (line.match(/\{/g) ?? []).length;
    depth -= (line.match(/\}/g) ?? []).length;
    if (inMedia === 0) out.push(line);
    if (inMedia > 0 && depth < inMedia) inMedia = 0;
  }
  return out.join('\n');
};

describe('мобильная ширина не заблокирована', () => {
  it('App.scss: min-width 1100px — только под @media', () => {
    expect(outsideMedia(read('App.scss'))).not.toMatch(/min-width:\s*1100px/);
  });

  it('App.scss: у body{overflow:hidden} есть мобильное исключение', () => {
    const src = read('App.scss');
    if (/body[^{]*\{[^}]*overflow:\s*hidden/s.test(outsideMedia(src))) {
      expect(src).toMatch(/@media[^{]*max-width[^{]*\{[^]*?body[^{]*\{[^}]*overflow/);
    }
  });

  it('Dashboard.scss: min-width 850px — только под @media', () => {
    expect(outsideMedia(read('pages/Dashboard/Dashboard.scss'))).not.toMatch(
      /min-width:\s*850px/,
    );
  });

  it('оверлей поиска не шире экрана', () => {
    const src = read('pages/Dashboard/Dashboard.scss');
    const omnibar = src.slice(src.indexOf('.navbar--omnibar'));
    expect(omnibar).toMatch(/width:\s*min\(600px/);
  });
});
