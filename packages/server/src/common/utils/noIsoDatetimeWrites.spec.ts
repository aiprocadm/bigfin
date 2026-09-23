// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

/**
 * Сторож: время не пишется в базу ISO-строкой.
 *
 * `moment().toISOString()` даёт «2026-09-23T22:30:12.367Z», а колонка
 * DATETIME в MySQL такое значение отвергает. Так одобрение заявки на оплату
 * и отметка «взнос оплачен» падали с ошибкой 500 с самого появления этих
 * модулей — а тесты на подделках базы были зелёными (живая проверка этапа 38
 * ТЗ-3). Писать время — `moment().format('YYYY-MM-DD HH:mm:ss')`.
 */
const ROOT = path.resolve(__dirname, '../../modules');

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [full] : [];
  });
}

describe('время пишется в базу в её формате', () => {
  it('нет полей «…At: moment().toISOString()» и «…At: new Date().toISOString()»', () => {
    const offenders = sources(ROOT).flatMap((file) =>
      fs
        .readFileSync(file, 'utf-8')
        .split('\n')
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => /[A-Za-z]At\s*:\s*(moment\(\)|new Date\(\))\.toISOString\(\)/.test(line))
        .map(({ index }) => `${path.relative(ROOT, file)}:${index + 1}`),
    );
    expect(offenders).toEqual([]);
  });
});
