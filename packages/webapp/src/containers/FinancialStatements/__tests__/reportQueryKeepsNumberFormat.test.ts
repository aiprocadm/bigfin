import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Д3 карты v83. Настройка, которую отчёт пишет, но не помнит.
 *
 * Экраны отчётов хранят состояние в адресе страницы. Записывают так:
 *
 *   setLocationQuery({ ...query, numberFormat });
 *
 * А читают через разбор, который **берёт только ключи из набора по
 * умолчанию**:
 *
 *   { ...defaultQuery, ...transformToForm(locationQuery, defaultQuery) }
 *
 * Если ключа в наборе нет, он молча выпадает: настройка вида чисел
 * записывалась в адрес и терялась на первом же обновлении страницы. Так было в
 * **восьми отчётах из пятнадцати** — и ни одна проверка этого не видела:
 * экраны стоят под пометкой «не проверять типы», а тестов на них нет.
 *
 * Правило: отчёт, который пишет `numberFormat`, обязан объявить его в своём
 * наборе по умолчанию.
 */
const REPORTS = path.resolve(__dirname, '..');

const reportDirs = (): string[] =>
  fs
    .readdirSync(REPORTS, { withFileTypes: true })
    // Папка `v2` — общие части нового оформления, а не отчёт: своего набора
    // по умолчанию у неё нет.
    .filter(
      (e) => e.isDirectory() && !e.name.startsWith('__') && e.name !== 'v2',
    )
    .map((e) => path.join(REPORTS, e.name));

/** Все файлы отчёта, кроме версии V2 и проверок. */
const filesOf = (dir: string): string[] =>
  fs
    .readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f))
    .filter((f) => !f.includes('v2') && !/\.(spec|test)\./.test(f))
    .map((f) => path.join(dir, f))
    .filter((f) => fs.statSync(f).isFile());

const readAll = (dir: string): string =>
  filesOf(dir)
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');

describe('отчёты помнят настройку вида чисел', () => {
  it('кто её пишет — тот объявил её в наборе по умолчанию', () => {
    const forgetful: string[] = [];

    for (const dir of reportDirs()) {
      const code = readAll(dir);
      // Пишет: кладёт `numberFormat` в состояние адреса.
      const writes = /numberFormat[:=]/.test(code);
      // Объявил: ключ есть в наборе по умолчанию.
      const declares = /numberFormat:\s*\{\}/.test(code);

      if (writes && !declares) forgetful.push(path.basename(dir));
    }

    expect(forgetful).toEqual([]);
  });

  // Без этой проверки сторож зеленел бы бесплатно: если разбор перестанет
  // находить отчёты, список нарушителей окажется пустым сам собой.
  it('сторож действительно читает отчёты', () => {
    const dirs = reportDirs();
    expect(dirs.length).toBeGreaterThan(10);

    const declaring = dirs.filter((d) => /numberFormat:\s*\{\}/.test(readAll(d)));
    // Настройка есть у большинства отчётов.
    expect(declaring.length).toBeGreaterThan(10);
  });
});
