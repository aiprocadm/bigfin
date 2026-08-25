// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

/**
 * Сторож на класс ошибок «служба чужого модуля не экспортирована».
 *
 * Акт сверки (К2 карты v19) берёт обороты из отчёта «Обороты по покупателю».
 * Служба отчёта была объявлена в своём модуле, но НЕ в его `exports` — и
 * сервер не поднимался вовсе: «Nest can't resolve dependencies of the
 * GetRuReconciliationActPdf». Ни типы, ни модульные тесты этого не видели
 * (они конструируют службу руками) — поймал только живой запуск.
 *
 * Проверка простая: всё, что печатные формы получают через конструктор,
 * должно быть доступно — либо это провайдер их собственного модуля, либо
 * экспорт того модуля, где объявлено.
 */
const MODULES_DIR = path.resolve(__dirname, '..');
const FORMS_DIR = path.resolve(__dirname, 'queries');

/** Все файлы модулей приложения. */
const moduleFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return moduleFiles(full);
    return entry.name.endsWith('.module.ts') ? [full] : [];
  });

/**
 * Список имён внутри секции `providers` / `exports` файла модуля.
 * Секция бывает и многострочной, и записанной в одну строку —
 * учитываем оба вида (на однострочной проверка сперва промахнулась).
 */
const section = (source: string, name: 'providers' | 'exports'): string[] => {
  const match = source.match(new RegExp(`${name}:\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/([A-Z][A-Za-z0-9_]*)/g)].map((m) => m[1]);
};

/** Типы, приходящие в конструктор службы печатной формы. */
const constructorTypes = (source: string): string[] =>
  [...source.matchAll(/private readonly \w+:\s*([A-Z][A-Za-z0-9_]*)\s*,/g)].map(
    (m) => m[1],
  );

describe('печатные формы: чужие службы доступны через exports', () => {
  const modules = moduleFiles(MODULES_DIR).map((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return {
      file: path.relative(MODULES_DIR, file).split(path.sep).join('/'),
      isGlobal: /@Global\(\)/.test(source),
      providers: section(source, 'providers'),
      exports: section(source, 'exports'),
    };
  });

  const ownModule = modules.find(
    (m) => m.file === 'RuPrintForms/RuPrintForms.module.ts',
  )!;

  const services = fs
    .readdirSync(FORMS_DIR)
    .filter((name) => name.endsWith('.service.ts'))
    .map((name) => ({
      name,
      types: constructorTypes(fs.readFileSync(path.join(FORMS_DIR, name), 'utf8')),
    }));

  it('службы форм вообще нашлись', () => {
    expect(services.length).toBeGreaterThan(3);
    expect(services.some((s) => s.types.length > 0)).toBe(true);
  });

  it('каждая зависимость доступна: своя, глобальная или экспортированная', () => {
    const unreachable: string[] = [];

    for (const service of services) {
      for (const type of service.types) {
        if (ownModule.providers.includes(type)) continue;

        const declaring = modules.filter((m) => m.providers.includes(type));
        // Тип, который нигде не объявлен провайдером, приходит из общей
        // инфраструктуры (например `ChromiumlyTenancy`) — не наш случай.
        if (declaring.length === 0) continue;
        if (declaring.some((m) => m.isGlobal || m.exports.includes(type))) {
          continue;
        }
        unreachable.push(`${service.name} → ${type} (${declaring[0].file})`);
      }
    }

    expect(unreachable).toEqual([]);
  });
});
