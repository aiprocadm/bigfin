import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Видимый фокус и подписи значков-кнопок (UI-055-2 ТЗ-4, P10).
 *
 * 1. Кто гасит рамку фокуса (`outline-none`), обязан нарисовать свою:
 *    кольцо, рамку, заливку. Иначе человек с клавиатурой не видит, где он.
 * 2. Кнопка-значок (`size="icon"`) обязана иметь подпись `aria-label` или
 *    `title`: читалка экрана иначе скажет просто «кнопка».
 *
 * Сторож смотрит кит (`components/ui`) и каркас (`components/Dashboard`) —
 * там живут общие органы управления — и все экраны на предмет значков-кнопок.
 */
const SRC = path.join(__dirname, '../..');

function tsxUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesOk(entry.name) ? tsxUnder(full) : [];
    return /\.tsx$/.test(entry.name) && !/\.(spec|test|stories)\.tsx$/.test(entry.name) ? [full] : [];
  });
}
const filesOk = (name: string) => name !== 'node_modules' && name !== '__tests__';

const FOCUS_REPLACEMENT =
  /focus(-visible|-within)?:(ring|border|bg|shadow|underline|outline-(?!none))|ring-action|data-\[highlighted\]|data-\[state=|aria-selected/;

/** Места, где рамку гасят без замены. */
export function focusWithoutReplacement(source: string): number[] {
  return [...source.matchAll(/outline-none/g)]
    .filter((m) => !FOCUS_REPLACEMENT.test(source.slice(Math.max(0, m.index! - 500), m.index! + 500)))
    .map((m) => source.slice(0, m.index).split('\n').length);
}

/** Кнопки-значки без подписи: номера строк. */
export function unlabelledIconButtons(source: string): number[] {
  const lines: number[] = [];
  for (const m of source.matchAll(/<(Button|IconButton)\b/g)) {
    // Конец тега — первый `>`, который не часть `=>`.
    let end = m.index!;
    do end = source.indexOf('>', end + 1);
    while (end !== -1 && source[end - 1] === '=');
    const tag = source.slice(m.index, end + 1);
    if (!/size="icon(-sm)?"/.test(tag)) continue;
    if (/aria-label|title=|\{\.\.\./.test(tag)) continue;
    lines.push(source.slice(0, m.index).split('\n').length);
  }
  return lines;
}

/**
 * Оправданные исключения. Командная строка: поле — вся строка окна, курсор в
 * нём виден всегда, рамке рисоваться негде (разбор в самом файле).
 */
const FOCUS_ALLOWED: Record<string, number> = {
  'components/ui/command-palette.tsx': 2,
};

describe('видимый фокус и подписи значков', () => {
  const shared = [...tsxUnder(path.join(SRC, 'components/ui')), ...tsxUnder(path.join(SRC, 'components/Dashboard'))];
  const all = tsxUnder(SRC);

  it('файлы найдены (иначе проверка пустая)', () => {
    expect(shared.length).toBeGreaterThan(50);
    expect(all.length).toBeGreaterThan(500);
  });

  it('кит и каркас не гасят рамку фокуса без замены', () => {
    const offenders = shared
      .map((file) => [path.relative(SRC, file), focusWithoutReplacement(fs.readFileSync(file, 'utf8'))] as const)
      .filter(([rel, lines]) => lines.length > (FOCUS_ALLOWED[rel] ?? 0))
      .map(([rel, lines]) => `${rel}:${lines.join(',')}`);
    expect(offenders).toEqual([]);
  });

  it('у каждой кнопки-значка есть подпись', () => {
    const offenders = all.flatMap((file) =>
      unlabelledIconButtons(fs.readFileSync(file, 'utf8')).map((line) => `${path.relative(SRC, file)}:${line}`),
    );
    expect(offenders).toEqual([]);
  });

  it('сторож ловит поломки (подсаженные)', () => {
    expect(focusWithoutReplacement('<button className="outline-none px-2" />')).toEqual([1]);
    expect(focusWithoutReplacement('<button className="outline-none focus-visible:ring-2" />')).toEqual([]);
    expect(unlabelledIconButtons('<Button size="icon" onClick={() => go()}>\n<X /></Button>')).toEqual([1]);
    expect(unlabelledIconButtons('<Button size="icon" aria-label={t}><X /></Button>')).toEqual([]);
  });

  it('FormControl оборачивает кнопку списка, а не сам Select', () => {
    // Select — не элемент страницы: id и связь с подписью, которые кладёт
    // FormControl, на нём терялись, и поле оставалось без имени.
    const offenders = all
      .filter((file) => /<FormControl>\s*<Select\b/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC, file));
    expect(offenders).toEqual([]);
    expect(/<FormControl>\s*<Select\b/.test('<FormControl>\n  <Select value={v}>')).toBe(true);
  });
});
