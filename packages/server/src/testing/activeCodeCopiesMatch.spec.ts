// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

/**
 * Карта v46. Парные копии помощника не разъезжаются.
 *
 * `activeCode` живёт двумя копиями — у витрины и у сервера. Копия, а не
 * общий пакет: это утилита проверок, а у пакетов разные тестовые движки, и
 * тащить её в продуктовый `@bigfin/utils` значит везти тестовый код в
 * сборку продукта.
 *
 * Цена копии — расхождение: починят одну, забудут вторую, и сторожа одного
 * пакета останутся слепыми. Поэтому копии сверяются построчно, кроме
 * заголовочного пояснения, которое у них своё.
 */
const ROOT = path.resolve(__dirname, '../../../..');

const body = (relative: string): string =>
  fs
    .readFileSync(path.join(ROOT, relative), 'utf8')
    .slice(fs.readFileSync(path.join(ROOT, relative), 'utf8').indexOf('export function activeCode'));

describe('парные копии activeCode', () => {
  const server = 'packages/server/src/testing/activeCode.ts';
  const webapp = 'packages/webapp/src/testing/activeCode.ts';

  it('обе копии на месте', () => {
    // Иначе сравнение ниже стало бы пустым и зелёным.
    expect(body(server).length).toBeGreaterThan(200);
    expect(body(webapp).length).toBeGreaterThan(200);
  });

  it('код копий совпадает слово в слово', () => {
    expect(body(server)).toEqual(body(webapp));
  });
});
