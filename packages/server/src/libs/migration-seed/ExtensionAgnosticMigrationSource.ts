import * as path from 'path';
import { promises as fs } from 'fs';

interface MigrationSpec {
  file: string;
  directory: string;
}

// knex в рантайме требует ОБЕ функции (up и down): _validateMigrationStructure
// бросает «must have both an up and down function» при migrate.latest(). Поэтому
// down обязателен, а не optional — иначе тип врал бы про контракт.
interface LoadedMigration {
  up: (knex: any) => PromiseLike<any>;
  down: (knex: any) => PromiseLike<any>;
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
 * Файл тестов, а не миграция.
 *
 * ЗАЧЕМ ЭТО ЗДЕСЬ. Рядом с миграциями лежат сторожевые спеки — они проверяют
 * сами миграции (обратимость, колонки юрлица), и стоять им правильно именно
 * там, где то, что они стерегут. Но загрузчик читает КАЖДЫЙ файл каталога,
 * а спека при загрузке сразу зовёт `describe(...)` — глобальное имя, которое
 * есть только под прогоном тестов.
 *
 * Из-за этого миграции тенантов не проходили ВООБЩЕ: все 20 организаций
 * стенда падали с «describe is not defined», и ни одна миграция этапа 6
 * не применилась. Поломка тихая по своей природе — она видна только тогда,
 * когда миграции и правда пробуют запустить.
 *
 * Отсекаем по общепринятому соглашению `.spec.` / `.test.`: оно однозначно
 * означает «это не рабочий код». Любой ДРУГОЙ посторонний файл по-прежнему
 * будет загружен и упадёт громко — knex скажет «нет up/down», — и это
 * правильно: каталог миграций не место для посторонних файлов.
 */
function isTestFile(file: string): boolean {
  const base = path.basename(file);
  return /\.(spec|test)\.[^.]+$/.test(base);
}

/**
 * Из списка имён файлов каталога миграций выбирает реальные файлы миграций:
 * только с допустимым расширением, без артефактов сборки (`.d.ts`, `.map`),
 * без файлов тестов (`.spec.*`, `.test.*`),
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
    if (isTestFile(file)) return false;
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
 *
 * Почему НЕ переиспользуем соседний FsMigrations/importWebpackSeedModule: тот
 * загрузчик webpack-aware (динамический import через require.context). Сервер
 * собирается обычным `tsc` (nest build, без webpack) → миграции это обычные
 * CJS-модули, и простой `require(абсолютный путь)` корректен и в dev (ts-node),
 * и в проде (скомпилированный `.js`). Если сервер когда-либо снова начнут
 * бандлить webpack'ом — этот `require` сломается, и сюда нужно будет вернуть
 * webpack-aware загрузку.
 */
export class ExtensionAgnosticMigrationSource {
  constructor(
    private readonly directory: string,
    private readonly loadExtensions: string[] = ['.js', '.ts'],
  ) {}

  // knex передаёт сюда config.migrations.loadExtensions; мы намеренно его
  // игнорируем — допустимые расширения фиксируются в конструкторе, чтобы
  // поведение source не зависело от внешнего конфига.
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

  // Миграции — CJS-модули (`exports.up`/`exports.down`), поэтому require даёт
  // объект напрямую. ESM-миграции с `default`-экспортом сюда не подойдут.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  async getMigration(migration: MigrationSpec): Promise<LoadedMigration> {
    return require(path.join(migration.directory, migration.file));
  }
}
