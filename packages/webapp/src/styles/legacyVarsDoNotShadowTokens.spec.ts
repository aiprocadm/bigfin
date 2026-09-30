import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Старые стили не перебивают токены (этап 55 ТЗ-4).
 *
 * Tailwind 4 раздаёт цвета через переменные `--color-*` на корне. Старый
 * `style/_variables.scss` объявлял `--color-danger: red` там же — и позже по
 * порядку, так что `text-danger` на всех новых экранах был #FF0000, а не
 * токен #D92D20 (контраст 4:1 вместо 4.6:1). Глазом разница почти не видна —
 * её нашёл axe.
 *
 * Правило: одноимённая переменная в старых стилях допустима, только если она
 * — мост к токену (`var(--c-…)`), то есть значение одно и то же.
 */
const ROOT = path.join(__dirname, '..');

function filesUnder(dir: string, ext: RegExp): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : filesUnder(full, ext);
    return ext.test(entry.name) ? [full] : [];
  });
}

/** Переменные, которые объявляет блок `@theme` в globals.css. */
function themeVars(): Set<string> {
  const css = fs.readFileSync(path.join(__dirname, 'globals.css'), 'utf8');
  const start = css.indexOf('@theme');
  const block = css.slice(start, css.indexOf('\n}', start));
  return new Set([...block.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
}

export function shadowingDeclarations(source: string, tokens: Set<string>): string[] {
  return [...source.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gm)]
    .filter(([, name, value]) => tokens.has(name) && !/var\(--c-/.test(value))
    .map(([, name, value]) => `${name}: ${value.trim()}`);
}

describe('старые стили и токены', () => {
  const tokens = themeVars();

  it('токенов в @theme нашлось (иначе проверка пустая)', () => {
    expect(tokens.has('--color-danger')).toBe(true);
    expect(tokens.size).toBeGreaterThan(20);
  });

  it('ни один старый файл стилей не перебивает токен своим значением', () => {
    const offenders = filesUnder(ROOT, /\.(scss|css)$/)
      .filter((file) => !file.endsWith(path.join('styles', 'globals.css')))
      .filter((file) => !file.endsWith(path.join('styles', 'tokens.css')))
      .flatMap((file) =>
        shadowingDeclarations(fs.readFileSync(file, 'utf8'), tokens).map(
          (decl) => `${path.relative(ROOT, file)} → ${decl}`,
        ),
      );
    expect(offenders).toEqual([]);
  });

  it('сторож ловит подмену (подсаженная поломка)', () => {
    expect(shadowingDeclarations(':root {\n  --color-danger: red;\n}', tokens)).toEqual([
      '--color-danger: red',
    ]);
    expect(shadowingDeclarations(':root {\n  --color-danger: rgb(var(--c-danger));\n}', tokens)).toEqual([]);
  });
});
