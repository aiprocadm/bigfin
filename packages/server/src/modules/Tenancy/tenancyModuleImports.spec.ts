// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

/**
 * Грабля С4 (карта v14), повторившаяся в Р1 срезе 2 (карта v16): если в
 * службу внедрить `TenancyContext`, а её модуль не подключит `TenancyModule`,
 * приложение **не стартует** — «Nest can't resolve dependencies». Юнит-тесты
 * этого НЕ ловят: они собирают класс руками, минуя Nest.
 *
 * Сторож сверяет два берега по коду, до запуска.
 */
const MODULES = path.resolve(__dirname, '..');

/**
 * Законных способов дать модулю `TenancyContext` два, оба в ходу:
 * подключить `TenancyModule` (он его экспортирует) или объявить службу
 * прямо в `providers`. Точное слово важно: `ChromiumlyTenancyModule` и
 * `RegisterTenancyModel` — это другое.
 */
const PROVIDES_TENANCY =
  /(^|[^A-Za-z])TenancyModule([^A-Za-z]|$)|providers:[\s\S]*?\bTenancyContext\b/;

const collect = (dir: string, keep: (name: string) => boolean): string[] => {
  const out: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...collect(full, keep));
    } else if (keep(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

/** Папка модуля: у файла службы поднимаемся до каталога с *.module.ts. */
const moduleDirOf = (file: string): string | null => {
  let dir = path.dirname(file);

  while (dir.startsWith(MODULES)) {
    const hasModule = fs
      .readdirSync(dir)
      .some((name) => name.endsWith('.module.ts'));

    if (hasModule) return dir;
    dir = path.dirname(dir);
  }
  return null;
};

describe('внедрение TenancyContext подкреплено модулем', () => {
  const services = collect(
    MODULES,
    (name) => name.endsWith('.ts') && !name.includes('.spec.'),
  ).filter((file) => {
    const source = fs.readFileSync(file, 'utf8');

    // Именно внедрение в конструктор, а не любое упоминание типа.
    return /(private|public|protected)[^\n]*:\s*TenancyContext\b/.test(source);
  });

  it('службы с внедрением вообще нашлись', () => {
    expect(services.length).toBeGreaterThan(10);
  });

  it('у каждой её модуль даёт TenancyContext', () => {
    const broken: string[] = [];

    services.forEach((file) => {
      const dir = moduleDirOf(file);

      if (!dir) return;
      const moduleFiles = fs
        .readdirSync(dir)
        .filter((name) => name.endsWith('.module.ts'))
        .map((name) => fs.readFileSync(path.join(dir, name), 'utf8'));

      // Строки импорта не считаются: `import { TenancyModule } ...` есть и
      // тогда, когда модуль его не подключил. Именно на этом сторож едва не
      // остался ложно-зелёным.
      const withoutImports = moduleFiles.map((source) =>
        source.replace(/^import[\s\S]*?;$/gm, ''),
      );

      if (!withoutImports.some((source) => PROVIDES_TENANCY.test(source))) {
        broken.push(path.relative(MODULES, file));
      }
    });
    expect(broken).toEqual([]);
  });
});
