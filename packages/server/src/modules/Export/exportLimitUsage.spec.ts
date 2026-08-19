// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { EXPORT_ROWS_LIMIT } from './exportRowsLimit';

/**
 * М3 срез 4 (карта v15): у выгрузки не было настоящего предела. В двенадцати
 * местах стояла «бесконечность» `EXPORT_SIZE_LIMIT = 9999999`, ещё в двух —
 * магическое 12000 (то есть молчаливое усечение на 12000-й строке), а в
 * четырёх предела не было вовсе.
 *
 * Сторож следит, чтобы выгрузки не заводили свой размер страницы: он должен
 * быть один на всех и настоящий.
 */
const SERVER_MODULES = path.resolve(__dirname, '..');

/** Сам сторож хранит искомые строки в коде — иначе он найдёт себя. */
const SELF = 'exportLimitUsage.spec.ts';

const collectFiles = (dir: string, keep: (name: string) => boolean) => {
  const out: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...collectFiles(full, keep));
    } else if (entry.name.endsWith('.ts') && entry.name !== SELF) {
      if (keep(entry.name)) {
        out.push(full);
      }
    }
  }
  return out;
};

const isExportable = (name: string) =>
  name.includes('Exportable') && !name.includes('.spec.');

const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const short = (file: string) => path.relative(SERVER_MODULES, file);

describe('предел выгрузки', () => {
  const exportables = collectFiles(SERVER_MODULES, isExportable);

  it('выгрузки вообще нашлись', () => {
    // Иначе переименование файлов сделало бы сторожа ложно-зелёным.
    expect(exportables.length).toBeGreaterThan(10);
  });

  it('старой константы EXPORT_SIZE_LIMIT в коде больше нет', () => {
    const offenders = collectFiles(SERVER_MODULES, () => true).filter((file) =>
      withoutComments(fs.readFileSync(file, 'utf8')).includes(
        'EXPORT_SIZE_LIMIT',
      ),
    );

    expect(offenders.map(short)).toEqual([]);
  });

  it('ни одна выгрузка не заводит свой размер страницы числом', () => {
    const offenders: string[] = [];

    exportables.forEach((file) => {
      const source = withoutComments(fs.readFileSync(file, 'utf8'));

      for (const m of source.matchAll(/pageSize:\s*(\d+)/g)) {
        offenders.push(`${short(file)}: pageSize ${m[1]}`);
      }
    });
    expect(offenders).toEqual([]);
  });

  it('потолок выгрузки — настоящее число', () => {
    expect(EXPORT_ROWS_LIMIT).toBeGreaterThan(1000);
    expect(EXPORT_ROWS_LIMIT).toBeLessThan(1000000);
  });
});
