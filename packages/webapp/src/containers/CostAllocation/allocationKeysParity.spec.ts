import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { ALLOCATION_KEYS, ALLOCATION_TARGET_TYPES } from './schemas';
import { SPREAD_BASES } from '../FinancialStatements/ManagerialPnl/managerialPnlRows';

/**
 * Базы распределения на экране и на сервере — один список (FT-011 ТЗ-3).
 * Разойдутся — окно правила предложит базу, которую сервер отвергнет, или
 * не предложит ту, что сервер умеет.
 */
describe('базы распределения: экран и сервер', () => {
  const server = fs.readFileSync(
    path.resolve(__dirname, '../../../../server/src/modules/CostAllocation/constants.ts'),
    'utf8',
  );
  const listOf = (name: string) => {
    const block = server.slice(server.indexOf(`export const ${name} = [`));
    return [...block.slice(0, block.indexOf(']')).matchAll(/'(\w+)'/g)].map((m) => m[1]);
  };

  it('ключи правил совпадают с серверными', () => {
    expect([...ALLOCATION_KEYS]).toEqual(listOf('ALLOCATION_KEYS'));
    expect([...ALLOCATION_TARGET_TYPES]).toEqual(listOf('ALLOCATION_TARGET_TYPES'));
  });

  it('базы распределения в ОПиУ — те же', () => {
    expect([...SPREAD_BASES]).toEqual(listOf('ALLOCATION_KEYS'));
  });
});
