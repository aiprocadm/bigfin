// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

import {
  EXPENSE_PL_TYPES,
  INCOME_PL_TYPES,
  PL_TYPE_EXCLUDED,
} from './plTypes';

/**
 * Список ярусов на экране совпадает с серверным (FT-009 ТЗ-3).
 *
 * ЗАЧЕМ. Сервер отвергает неизвестный ярус ответом 422. Разойдись списки —
 * форма предложила бы ярус, который сервер не примет, и человек получил бы
 * «не удалось сохранить статью» без понятной причины. Или хуже: сервер
 * научился бы новому ярусу, а экран бы его не предлагал.
 *
 * Сверяется текст серверного файла — отдельного общего пакета для двух
 * списков заводить не стали: у сервера и витрины разные сборки.
 */
const SERVER_FILE = path.resolve(
  __dirname,
  '../../../../server/src/modules/ManagementArticles/utils/plTypes.ts',
);

/** Строки в кавычках внутри объявления `export const NAME = [ ... ]`. */
function serverList(source: string, name: string): string[] {
  const start = source.indexOf(`export const ${name} = [`);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf('] as const', start);
  const body = source
    .slice(start, end)
    // Комментарии внутри списка — не значения.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  return Array.from(body.matchAll(/'([a-z_]+)'/g)).map((match) => match[1]);
}

describe('ярусы витрины и сервера совпадают', () => {
  const source = fs.readFileSync(SERVER_FILE, 'utf8');

  it('ярусы доходов', () => {
    expect(serverList(source, 'INCOME_PL_TYPES')).toEqual([...INCOME_PL_TYPES]);
  });

  it('ярусы расходов — в том же порядке', () => {
    // Порядок важен: в нём ярусы уменьшают прибыль, и в нём же форма их
    // предлагает.
    expect(serverList(source, 'EXPENSE_PL_TYPES')).toEqual([
      ...EXPENSE_PL_TYPES,
    ]);
  });

  it('явное «не участвует»', () => {
    expect(source).toContain(`PL_TYPE_EXCLUDED = '${PL_TYPE_EXCLUDED}'`);
  });
});
