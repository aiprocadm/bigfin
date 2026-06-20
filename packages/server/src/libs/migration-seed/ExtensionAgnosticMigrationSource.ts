import * as path from 'path';
import { promises as fs } from 'fs';

interface MigrationSpec {
  file: string;
  directory: string;
}

interface LoadedMigration {
  up: (knex: any) => PromiseLike<any>;
  down?: (knex: any) => PromiseLike<any>;
}

/**
 * Нормализует имя файла миграции к виду `<name>.js`.
 *
 * В этом проекте журнал `knex_migrations` хранит имена с расширением `.js`
 * (наследие webpack/compiled-контекста), а локальные исходники — `.ts`. Сводя
 * оба к `.js`, мы позволяем knex сопоставлять уже применённые миграции с
 * найденными файлами независимо от расширения.
 */
export function normalizeMigrationName(file: string): string {
  const base = path.basename(file);
  const ext = path.extname(base);
  return `${base.slice(0, base.length - ext.length)}.js`;
}

/**
 * Из списка имён файлов каталога миграций выбирает реальные файлы миграций:
 * только с допустимым расширением, без артефактов сборки (`.d.ts`, `.map`),
 * дедуплицированные по нормализованному имени (при коллизии предпочитается
 * `.js` — прод-артефакт) и отсортированные по имени миграции.
 *
 * Возвращаются ИСХОДНЫЕ имена файлов (не нормализованные), чтобы загрузчик мог
 * прочитать настоящий файл.
 */
export function selectMigrationFiles(
  files: string[],
  loadExtensions: readonly string[],
): string[] {
  const valid = files.filter((file) => {
    if (file.endsWith('.d.ts')) return false;
    if (file.endsWith('.map')) return false;
    return loadExtensions.includes(path.extname(file));
  });

  const byNormalized = new Map<string, string>();
  for (const file of valid) {
    const key = normalizeMigrationName(file);
    const existing = byNormalized.get(key);
    if (!existing || path.extname(file) === '.js') {
      byNormalized.set(key, file);
    }
  }

  return Array.from(byNormalized.values()).sort((a, b) => {
    const na = normalizeMigrationName(a);
    const nb = normalizeMigrationName(b);
    return na < nb ? -1 : na > nb ? 1 : 0;
  });
}

/**
 * knex MigrationSource, который работает и в dev (исходники `.ts` под ts-node),
 * и в проде (скомпилированные `.js`): journal `knex_migrations` всегда хранит
 * `.js`-имена, а реальный файл грузится по своему расширению.
 *
 * Зачем: штатный knex-загрузчик сверяет применённые миграции с файлами по
 * полному имени с расширением. В этом репозитории все исходники тенантных
 * миграций — `.ts`, а записи в журнале — `.js`, поэтому дефолтный загрузчик
 * локально либо ничего не находит, либо считает все миграции непримененными.
 */
export class ExtensionAgnosticMigrationSource {
  constructor(
    private readonly directory: string,
    private readonly loadExtensions: string[] = ['.js', '.ts'],
  ) {}

  async getMigrations(
    _loadExtensions?: readonly string[],
  ): Promise<MigrationSpec[]> {
    const files = await fs.readdir(this.directory);
    return selectMigrationFiles(files, this.loadExtensions).map((file) => ({
      file,
      directory: this.directory,
    }));
  }

  getMigrationName(migration: MigrationSpec): string {
    return normalizeMigrationName(migration.file);
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  async getMigration(migration: MigrationSpec): Promise<LoadedMigration> {
    return require(path.join(migration.directory, migration.file));
  }
}
