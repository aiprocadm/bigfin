// © 2026 Bigfin
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import { activeCode } from '../../testing/activeCode';

/**
 * Карта v50. Реестр поиска ввозит только то, что существует.
 *
 * Карта v48 добавила привязку с именем `universalSearchPlannedOperationBind`,
 * а в реестр её вписали как `...Plannedoperationbind` — одна буква. Продукт
 * от этого перестал собираться, и **стенд встал**: обновление откатилось на
 * старую версию, потому что витрина не собиралась.
 *
 * Почему промолчали все проверки разом:
 *
 * - реестр помечен `@ts-nocheck`, поэтому проверка типов его не смотрит;
 * - сторож карты v48 искал в исходнике ТЕКСТ и находил своё же ошибочное
 *   имя — в обоих файлах оно было написано одинаково неверно;
 * - сборка витрины не запускается ни в одном процессе проверок, а сами
 *   процессы выключены с августа.
 *
 * Правило: каждое имя, которое реестр ввозит, объявлено в том файле, из
 * которого ввозится.
 */
const SRC = path.resolve(__dirname, '../..');

const read = (relative: string): string =>
  activeCode(fs.readFileSync(path.join(SRC, relative), 'utf8'));

const REGISTRY = 'containers/UniversalSearch/DashboardUniversalSearchBinds.tsx';

/** Пары «что ввозим» → «откуда», как их видит реестр. */
const imports = (): Array<{ name: string; from: string }> => {
  const code = read(REGISTRY);

  return [...code.matchAll(/import\s*\{\s*(\w+)\s*\}\s*from\s*'([^']+)'/g)].map(
    (m) => ({ name: m[1], from: m[2] }),
  );
};

/** Путь модуля реестра → путь файла от корня исходников. */
const resolveFrom = (from: string): string =>
  path
    .join('containers/UniversalSearch', from)
    .split(path.sep)
    .join('/') + '.tsx';

describe('реестр поиска', () => {
  it('ввоз привязок прочитан', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(imports().length).toBeGreaterThan(10);
  });

  it('каждое ввезённое имя объявлено там, откуда ввозится', () => {
    const missing = imports().filter(({ name, from }) => {
      const source = read(resolveFrom(from));

      return !new RegExp(`export const ${name}\\b`).test(source);
    });

    expect(missing.map((m) => m.name)).toEqual([]);
  });

  it('в список привязок попадает только ввезённое', () => {
    // Обратная половина: имя можно ввезти и забыть включить в список —
    // тогда окно поиска раздел не увидит, а сборка промолчит.
    const code = read(REGISTRY);
    const list = code.slice(code.indexOf('universalSearchBinds'));
    const used = [...list.matchAll(/(universalSearch\w+Bind),/g)].map((m) => m[1]);
    const imported = imports().map((i) => i.name);

    expect(used.filter((name) => !imported.includes(name))).toEqual([]);
  });
});
