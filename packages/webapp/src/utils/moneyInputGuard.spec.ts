import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * З1 карты v37. Деньги вводятся полем продукта, а не его начинкой.
 *
 * Денежное поле состоит из двух частей: `CurrencyInput` — начинка, которая
 * не знает ни валюты, ни страны, и `MoneyInputGroup` — поле, знающее
 * формат организации. Начинка по умолчанию считает копейки точкой, а
 * разряды запятой: американский формат. Пока экраны брали её напрямую,
 * напечатанное «1000,50» уходило в учёт как «100050».
 *
 * Правило: экраны берут `MoneyInputGroup` (или `FMoneyInputGroup` в
 * формах) и не назначают знаки разделителей руками.
 */
const SRC = path.resolve(__dirname, '..');

/** Папка самого поля: ей начинка и знаки разделителей положены по делу. */
const FIELD_DIR = path.join('components', 'Forms', 'MoneyInputGroup');

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (/\.spec\.tsx?$/.test(entry.name)) return [];
    return [full];
  });

const codeOf = (file: string): string =>
  fs
    .readFileSync(file, 'utf8')
    .split('\n')
    // Комментарии объясняют правило и упоминают запрещённое по имени.
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');

describe('денежные поля', () => {
  const files = sourceFiles(SRC).filter(
    (file) => !path.relative(SRC, file).startsWith(FIELD_DIR),
  );

  it('исходники витрины читаются', () => {
    // Иначе проверки ниже стали бы пустыми и зелёными.
    expect(files.length).toBeGreaterThan(100);
  });

  it('никто не берёт начинку поля в обход формата организации', () => {
    const offenders = files
      .filter((file) => /\bCurrencyInput\b/.test(codeOf(file)))
      .map((file) => path.relative(SRC, file));

    expect(offenders).toEqual([]);
  });

  it('знаки разделителей не назначаются руками', () => {
    const offenders = files
      .filter((file) =>
        /(decimalSeparator|groupSeparator)\s*=\s*[{'"]/.test(codeOf(file)),
      )
      .map((file) => path.relative(SRC, file));

    expect(offenders).toEqual([]);
  });
});
