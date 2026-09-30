import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { preloadFontFiles } from '../../build-plugins/preloadFonts';

/** Шрифт: swap и предзагрузка латиницы с кириллицей (UI-055-4 ТЗ-4). */
describe('шрифт Inter', () => {
  it('из сборки предзагружаются ровно латиница и кириллица, прямое начертание', () => {
    expect(
      preloadFontFiles([
        'assets/index-abc.js',
        'assets/inter-latin-wght-normal-Dx4kXJAl.woff2',
        'assets/inter-latin-ext-wght-normal-1.woff2',
        'assets/inter-cyrillic-wght-normal-BJ3.woff2',
        'assets/inter-cyrillic-ext-wght-normal-2.woff2',
        'assets/inter-latin-wght-italic-3.woff2',
        'assets/inter-greek-wght-normal-4.woff2',
      ]),
    ).toEqual(['assets/inter-cyrillic-wght-normal-BJ3.woff2', 'assets/inter-latin-wght-normal-Dx4kXJAl.woff2']);
  });

  it('пакет шрифта объявляет font-display: swap для каждого начертания', () => {
    const css = fs.readFileSync(require.resolve('@fontsource-variable/inter/index.css'), 'utf8');
    const faces = css.match(/@font-face/g) ?? [];
    const swaps = css.match(/font-display:\s*swap/g) ?? [];
    expect(faces.length).toBeGreaterThan(0);
    expect(swaps.length).toBe(faces.length);
  });

  it('плагин предзагрузки подключён к сборке', () => {
    const config = fs.readFileSync(path.join(__dirname, '../../vite.config.mts'), 'utf8');
    expect(config).toMatch(/preloadFonts\(\)/);
  });
});
