// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

/**
 * Тот же класс ошибок, что уже дважды ронял сервер: служба берёт чужую
 * зависимость, а модуль её не подключает (или чужой модуль не отдаёт её в
 * `exports`). Приложение не поднимается вовсе, и ни типы, ни модульные
 * тесты этого не видят — они конструируют службу руками.
 *
 * Наполнение демо (С3 карты v29) добавило к покупателям, позициям и счетам
 * ещё две чужие службы: оплаты и расходы. Поэтому проверка здесь.
 */
const MODULES_DIR = path.resolve(__dirname, '..');
const SERVICE = path.resolve(__dirname, 'commands/SeedOneClickDemoData.service.ts');
const OWN_MODULE = path.resolve(__dirname, 'OneClickDemo.module.ts');

const moduleFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return moduleFiles(full);
    return entry.name.endsWith('.module.ts') ? [full] : [];
  });

/** Имена внутри секции: и многострочной, и записанной в одну строку. */
const section = (
  source: string,
  name: 'providers' | 'exports' | 'imports',
): string[] => {
  const match = source.match(new RegExp(`${name}:\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/([A-Z][A-Za-z0-9_]*)/g)].map((m) => m[1]);
};

describe('наполнение демо: чужие службы доступны', () => {
  const service = fs.readFileSync(SERVICE, 'utf8');
  const own = fs.readFileSync(OWN_MODULE, 'utf8');

  const types = [
    ...service.matchAll(/private readonly \w+:\s*([A-Z][A-Za-z0-9_]*)\s*,/g),
  ].map((m) => m[1]);

  const modules = moduleFiles(MODULES_DIR).map((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return {
      file: path.relative(MODULES_DIR, file).split(path.sep).join('/'),
      isGlobal: /@Global\(\)/.test(source),
      providers: section(source, 'providers'),
      exports: section(source, 'exports'),
    };
  });

  it('зависимости наполнения вообще нашлись', () => {
    expect(types.length).toBeGreaterThanOrEqual(5);
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

  it('модуль демо подключает оплаты и расходы', () => {
    // Иначе службы не резолвятся даже при верных exports, и сервер не
    // поднимается: «Nest can't resolve dependencies of
    // SeedOneClickDemoDataService».
    const imports = section(own, 'imports');

    expect(imports).toContain('PaymentsReceivedModule');
    expect(imports).toContain('ExpensesModule');
  });
});
