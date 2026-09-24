import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * Сторож: сырой токен `--c-*` не отдаётся браузеру как цвет (UI-042-6 ТЗ-4).
 *
 * Как это случилось. В `tokens.css` цвета лежат тройками чисел («21 24 31»),
 * чтобы работала прозрачность `bg-action/10`. Цвет из тройки получается только
 * через `rgb(var(--c-…))` или готовый `var(--color-…)`. График «Топ
 * контрагентов» на главной брал `fill="var(--c-action)"` — браузер такой цвет
 * не понимает и молча рисует чёрным по умолчанию. Сборка зелёная, ошибок нет.
 */
const SRC = path.resolve(__dirname, '../..');
const BARE = /(?<!rgb\()var\(--c-[\w-]+\)/g;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' || entry.name === '__tests__'
        ? []
        : sourceFiles(full);
    }
    return /\.(tsx?|jsx?)$/.test(entry.name) &&
      !/\.(spec|test|stories)\./.test(entry.name)
      ? [full]
      : [];
  });
}

describe('сырые токены цвета не уходят в браузер', () => {
  const files = sourceFiles(SRC);

  it('файлы витрины читаются', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(files.length).toBeGreaterThan(1000);
  });

  it('var(--c-…) встречается только внутри rgb(…)', () => {
    const offenders = files.flatMap((file) =>
      (activeCode(fs.readFileSync(file, 'utf8')).match(BARE) ?? []).map(
        (hit) => `${path.relative(SRC, file)}: ${hit}`,
      ),
    );

    expect(offenders).toEqual([]);
  });
});
