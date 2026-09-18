// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { activeCode } from '../../testing/activeCode';

/**
 * Тот же класс ошибок, что однажды уже уронил сервер: служба чужого модуля
 * не в его `exports` — приложение не поднимается вовсе, а ни типы, ни
 * модульные тесты этого не видят (они конструируют службу руками).
 *
 * Сводка о деньгах (Г2 карты v20) берёт долги из отчётов по срокам
 * задолженности — двух чужих модулей сразу, поэтому проверка здесь.
 */
const MODULES_DIR = path.resolve(__dirname, '..');
const SERVICE = path.resolve(__dirname, 'queries/GetMoneySummary.service.ts');
/**
 * Ручка главной (этап 2 ТЗ) зависит от тех же чужих служб плюс от
 * платёжного календаря: у неё та же болезнь при недоступном провайдере —
 * сервер не поднимается, а типы и модульные тесты молчат.
 */
const OVERVIEW_SERVICE = path.resolve(
  __dirname,
  'queries/GetDashboardOverview.service.ts',
);
const OWN_MODULE = path.resolve(__dirname, 'Dashboard.module.ts');

const moduleFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return moduleFiles(full);
    return entry.name.endsWith('.module.ts') ? [full] : [];
  });

/** Имена внутри секции: и многострочной, и записанной в одну строку. */
const section = (source: string, name: 'providers' | 'exports' | 'imports'): string[] => {
  const match = source.match(new RegExp(`${name}:\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/([A-Z][A-Za-z0-9_]*)/g)].map((m) => m[1]);
};

describe('сводка о деньгах: чужие службы доступны', () => {
  const service = activeCode(fs.readFileSync(SERVICE, 'utf8'));
  const own = activeCode(fs.readFileSync(OWN_MODULE, 'utf8'));

  const overview = activeCode(fs.readFileSync(OVERVIEW_SERVICE, 'utf8'));

  const typesOf = (source: string) =>
    [
      ...source.matchAll(/private readonly \w+:\s*([A-Z][A-Za-z0-9_]*)\s*,/g),
    ].map((m) => m[1]);

  const types = [...typesOf(service), ...typesOf(overview)];

  const modules = moduleFiles(MODULES_DIR).map((file) => {
    const source = activeCode(fs.readFileSync(file, 'utf8'));
    return {
      file: path.relative(MODULES_DIR, file).split(path.sep).join('/'),
      isGlobal: /@Global\(\)/.test(source),
      providers: section(source, 'providers'),
      exports: section(source, 'exports'),
    };
  });

  it('зависимости сводки вообще нашлись', () => {
    expect(types.length).toBeGreaterThan(1);
  });

  it('каждая зависимость доступна: своя, глобальная или экспортированная', () => {
    const ownProviders = section(own, 'providers');
    const unreachable: string[] = [];

    for (const type of types) {
      if (ownProviders.includes(type)) continue;

      const declaring = modules.filter((m) => m.providers.includes(type));
      if (declaring.length === 0) continue;
      if (declaring.some((m) => m.isGlobal || m.exports.includes(type))) continue;

      unreachable.push(`${type} (${declaring[0].file})`);
    }

    expect(unreachable).toEqual([]);
  });

  it('модуль главной подключает оба отчёта по срокам долга', () => {
    // Иначе службы не резолвятся даже при верных exports.
    const imports = section(own, 'imports');

    expect(imports).toContain('ARAgingSummaryModule');
    expect(imports).toContain('APAgingSummaryModule');
  });

  it('модуль главной подключает отчёт о прибылях и платёжный календарь', () => {
    // Ручка главной берёт из них доходы, расходы и кассовый разрыв.
    const imports = section(own, 'imports');

    expect(imports).toContain('ProfitLossSheetModule');
    expect(imports).toContain('PaymentCalendarModule');
  });

  it('зависимости ручки главной вообще нашлись', () => {
    expect(typesOf(overview).length).toBeGreaterThan(1);
  });
});
