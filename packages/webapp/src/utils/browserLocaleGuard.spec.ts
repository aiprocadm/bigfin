import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Ф2 карты v25. Продукт не форматирует числа и даты по локали браузера.
 *
 * `value.toLocaleString()` без указания локали берёт язык БРАУЗЕРА. В форме
 * счёта из-за этого одна и та же сумма показывалась двумя способами: в
 * строке позиции `100,000.00` (по-английски), в итогах `100 000,00 ₽` (по
 * правилам организации). У человека с русским браузером всё выглядело
 * прилично, у человека с английским — запятая означала копейки.
 *
 * У организации есть свой язык и своя валюта — от браузера это зависеть не
 * должно. Для денег есть `formattedAmount`, для дат — формат организации.
 */
const SRC = path.resolve(__dirname, '..');

/** Папки, которые не показывают ничего человеку. */
const SKIP = /(\/|^)(__tests__|lang)(\/|$)/;

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return SKIP.test(full) ? [] : sourceFiles(full);
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (/\.spec\.tsx?$/.test(entry.name)) return [];
    return [full];
  });

/**
 * Вызовы `toLocaleString()` и `toLocaleString(undefined, …)` — то есть без
 * явной локали. Вариант с локалью (`toLocaleString('ru-RU', …)`) допустим.
 */
const BROWSER_LOCALE = /toLocale(?:String|DateString|TimeString)\(\s*(\)|undefined)/;

describe('форматирование по локали браузера', () => {
  const files = sourceFiles(SRC);

  it('исходники витрины читаются', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(files.length).toBeGreaterThan(100);
  });

  it('нигде не форматируем без явной локали', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (!BROWSER_LOCALE.test(line)) return;
          // Упоминание в комментарии — это объяснение, а не вызов: сами
          // комментарии как раз и рассказывают, почему так делать нельзя.
          if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
          offenders.push(`${path.relative(SRC, file)}:${index + 1}`);
        });
    });

    expect(offenders).toEqual([]);
  });
});
