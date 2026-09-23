import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { PNL_SOURCE_KEYS, PNL_SOURCES_WITHOUT_LEDGER } from './PnlSourcesPanel';

/**
 * Список источников ОПиУ на экране совпадает с серверным (FT-012 ТЗ-3), а
 * «модули без проводок» — ровно те, у которых на сервере пустой список
 * документов. Разойдись они — тумблер на экране выключал бы то, чего сервер
 * не знает, или молчал бы там, где сервер уже умеет.
 */
describe('источники ОПиУ: экран и сервер', () => {
  const server = fs.readFileSync(
    path.resolve(
      __dirname,
      '../../../../../server/src/modules/FinancialStatements/modules/ManagerialProfitLoss/pnlSources.ts',
    ),
    'utf8',
  );

  it('те же ключи в том же порядке', () => {
    const block = server.slice(server.indexOf('export const PNL_SOURCES = {'));
    const keys = [...block.matchAll(/^  (\w+):/gm)].map((m) => m[1]).slice(0, 6);
    expect(keys).toEqual([...PNL_SOURCE_KEYS]);
  });

  it('модули без проводок — с пустым списком документов на сервере', () => {
    PNL_SOURCES_WITHOUT_LEDGER.forEach((key) => {
      expect(server).toMatch(new RegExp(`${key}: \\[\\] as string\\[\\]`));
    });
  });
});
