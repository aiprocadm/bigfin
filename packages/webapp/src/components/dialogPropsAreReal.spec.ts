import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Д16 карты v82. Свойства окон, написанные с опечаткой.
 *
 * В двадцати двух окнах стояло `canEscapeJeyClose` — «Jey» вместо «Key».
 * Blueprint такое свойство не читает, оно молча уходит в никуда. Видимого
 * вреда не было только потому, что закрытие по Esc и так включено по
 * умолчанию; но точно так же тихо пропало бы и `canEscapeKeyClose={false}`.
 *
 * Опечатка размножилась копированием: один файл, из него — все остальные.
 * Поэтому проверка стоит на **семействе**, а не на одном месте.
 *
 * Почему `tsc` молчит: окна витрины стоят под пометкой «не проверять типы», а
 * обёртка `Dialog` передаёт свойства насквозь.
 */
const SRC = path.resolve(__dirname, '..');

const sourceFiles = (): string[] =>
  fs
    .readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx$/.test(f))
    .map((f) => path.join(SRC, f))
    .filter((f) => fs.statSync(f).isFile());

/** Свойства окна, которые уже писали неправильно. */
const MISSPELLED: Array<{ wrong: RegExp; right: string }> = [
  { wrong: /\bcanEscapeJeyClose\b/, right: 'canEscapeKeyClose' },
  { wrong: /\bcanOutsideClickCloce\b/, right: 'canOutsideClickClose' },
  { wrong: /\bisCloseButtonShwon\b/, right: 'isCloseButtonShown' },
];

describe('свойства окон написаны правильно', () => {
  it('опечаток из известного списка нет', { timeout: 60_000 }, () => {
    const found: string[] = [];

    for (const file of sourceFiles()) {
      const code = fs.readFileSync(file, 'utf8');
      for (const { wrong, right } of MISSPELLED) {
        if (wrong.test(code)) {
          found.push(
            `${path.relative(SRC, file)}: ${wrong.source} → ${right}`,
          );
        }
      }
    }

    expect(found).toEqual([]);
  });

  // Без этой проверки сторож «зеленел» бы бесплатно, если бы список опустел
  // или разбор перестал читать файлы.
  it('сторож действительно читает витрину', { timeout: 60_000 }, () => {
    expect(MISSPELLED.length).toBeGreaterThan(0);
    expect(sourceFiles().length).toBeGreaterThan(1000);

    const dialogs = sourceFiles().filter((f) =>
      /\bcanEscapeKeyClose\b/.test(fs.readFileSync(f, 'utf8')),
    );
    // Правильное написание встречается в витрине десятками.
    expect(dialogs.length).toBeGreaterThan(30);
  });
});
