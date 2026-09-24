import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * UI-043-4 ТЗ-4. Вид собирается из токенов, а не «на месте».
 *
 * Размер `text-[13px]`, скругление `rounded-[7px]`, тень `shadow-[…]`, цвет
 * `text-red-600` или `#e0a800` в разметке не знают о дизайн-системе: не
 * переключаются в тёмную тему, не меняются вместе со шкалой и не находятся
 * поиском, когда палитру поправят. Так 13 графиков оказались раскрашены 13
 * способами (ТЗ-4 §4.3).
 *
 * Сразу вычистить всё старое нельзя — это сотни мест. Поэтому сторож —
 * «храповик»: число нарушений в каждом файле записано в
 * `rawDesignValues.baseline.json` и может только уменьшаться. Новый файл —
 * ноль нарушений. Убрали нарушения — уменьшите число в списке (вторая
 * проверка этого требует, иначе запас молча вернулся бы).
 *
 * Пересобрать список после чистки: `UPDATE_RAW_DESIGN_BASELINE=1 npx vitest run
 * src/style/__tests__/noRawDesignValues.spec.ts` — и проверить глазами, что
 * числа только уменьшились.
 */
const SRC = path.resolve(__dirname, '../..');
const BASELINE = path.join(__dirname, 'rawDesignValues.baseline.json');

export const RAW_PATTERNS: [string, RegExp][] = [
  ['размер шрифта на месте', /\btext-\[\d[^\]]*\]/g],
  ['своё скругление', /\brounded(?:-[a-z]+)?-\[[^\]]+\]/g],
  ['своя тень', /\bshadow-\[[^\]]+\]/g],
  [
    'цвет палитры Tailwind в обход токенов',
    /\b(?:text|bg|border|fill|stroke|ring)-(?:red|green|blue|yellow|orange|amber|emerald|gray|slate|zinc|neutral|sky|indigo|rose)-\d{2,3}\b/g,
  ],
  [
    'цвет значением',
    /\b(?:fill|stroke|color|background|backgroundColor|borderColor)(?:=|:\s*)["'`]#[0-9a-fA-F]{3,8}\b/g,
  ],
];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return ['node_modules', '__tests__'].includes(entry.name) ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) && !/\.(spec|test|stories)\./.test(entry.name)
      ? [full]
      : [];
  });
}

function countRaw(code: string): number {
  return RAW_PATTERNS.reduce((sum, [, re]) => sum + (code.match(re) ?? []).length, 0);
}

const actual: Record<string, number> = {};
for (const file of sourceFiles(SRC)) {
  const count = countRaw(activeCode(fs.readFileSync(file, 'utf8')));
  if (count > 0) actual[path.relative(SRC, file).split(path.sep).join('/')] = count;
}

if (process.env.UPDATE_RAW_DESIGN_BASELINE) {
  const sorted = Object.fromEntries(Object.entries(actual).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`);
}

const baseline: Record<string, number> = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

describe('вид из токенов, а не «на месте»', () => {
  it('шаблоны ловят то, что должны', () => {
    // Иначе сторож стал бы пустым и зелёным.
    expect(countRaw('className="text-[13px] rounded-[7px] shadow-[0_1px] text-red-600"')).toBe(4);
    expect(countRaw('<Line stroke="#e0a800" />')).toBe(1);
    expect(countRaw('className="text-subhead rounded-default shadow-elev-1 text-danger"')).toBe(0);
  });

  it('нарушений не прибавилось ни в одном файле', () => {
    const grown = Object.entries(actual)
      .filter(([file, count]) => count > (baseline[file] ?? 0))
      .map(([file, count]) => `${file}: ${baseline[file] ?? 0} → ${count}`);

    expect(grown).toEqual([]);
  });

  it('список нарушений не отстаёт от чистки', () => {
    // Убрали нарушения — число в списке уменьшается вместе с ними, иначе
    // запас молча вернулся бы следующему, кто их добавит.
    const stale = Object.entries(baseline)
      .filter(([file, count]) => (actual[file] ?? 0) < count)
      .map(([file, count]) => `${file}: в списке ${count}, на деле ${actual[file] ?? 0}`);

    expect(stale).toEqual([]);
  });
});
