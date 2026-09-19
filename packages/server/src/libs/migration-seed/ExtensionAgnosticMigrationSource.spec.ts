import * as path from 'path';
import {
  ExtensionAgnosticMigrationSource,
  normalizeMigrationName,
  selectMigrationFiles,
} from './ExtensionAgnosticMigrationSource';

describe('normalizeMigrationName', () => {
  it('приводит .ts к .js (чтобы dev-исходник совпал с .js-записью в журнале)', () => {
    expect(normalizeMigrationName('20190822_create_accounts.ts')).toBe(
      '20190822_create_accounts.js',
    );
  });

  it('оставляет .js как .js (прод-контекст без изменений)', () => {
    expect(normalizeMigrationName('20190822_create_accounts.js')).toBe(
      '20190822_create_accounts.js',
    );
  });

  it('возвращает только базовое имя, без каталога', () => {
    expect(normalizeMigrationName('some/dir/20190822_create_accounts.ts')).toBe(
      '20190822_create_accounts.js',
    );
  });
});

describe('selectMigrationFiles', () => {
  const exts = ['.js', '.ts'];

  it('оставляет только файлы миграций с допустимым расширением', () => {
    const files = ['001_a.ts', '002_b.js', 'README.md', 'notes.txt'];
    expect(selectMigrationFiles(files, exts)).toEqual(['001_a.ts', '002_b.js']);
  });

  it('исключает .d.ts и .map (артефакты сборки)', () => {
    const files = ['001_a.ts', '001_a.d.ts', '002_b.js', '002_b.js.map'];
    expect(selectMigrationFiles(files, exts)).toEqual(['001_a.ts', '002_b.js']);
  });

  it('дедуплицирует по нормализованному имени, предпочитая .js (прод-артефакт)', () => {
    const files = ['001_a.ts', '001_a.js'];
    expect(selectMigrationFiles(files, exts)).toEqual(['001_a.js']);
  });

  it('сортирует по имени миграции', () => {
    const files = ['003_c.ts', '001_a.ts', '002_b.ts'];
    expect(selectMigrationFiles(files, exts)).toEqual([
      '001_a.ts',
      '002_b.ts',
      '003_c.ts',
    ]);
  });

  it('в чистом dev-каталоге (только .ts) сохраняет .ts-файлы', () => {
    const files = ['001_a.ts', '002_b.ts'];
    expect(selectMigrationFiles(files, exts)).toEqual(['001_a.ts', '002_b.ts']);
  });

  /**
   * Рядом с миграциями лежат сторожевые спеки. Загрузчик читал и их — а спека
   * при загрузке сразу зовёт `describe(...)`, которого вне прогона тестов нет.
   * Из-за этого миграции тенантов не проходили ВООБЩЕ: все организации падали
   * с «describe is not defined».
   */
  it('НЕ берёт файлы тестов, лежащие рядом с миграциями', () => {
    const files = [
      '20260101000000_a.ts',
      'migrationsReversible.spec.ts',
      'legalEntityColumns.spec.ts',
      'somethingElse.test.ts',
      '20260102000000_b.js',
    ];
    expect(selectMigrationFiles(files, exts)).toEqual([
      '20260101000000_a.ts',
      '20260102000000_b.js',
    ]);
  });

  it('посторонний файл БЕЗ пометки теста по-прежнему берётся — падать он должен громко', () => {
    const files = ['20260101000000_a.ts', 'helpers.ts'];
    expect(selectMigrationFiles(files, exts)).toEqual([
      '20260101000000_a.ts',
      'helpers.ts',
    ]);
  });
});

/**
 * Проверка на НАСТОЯЩИХ каталогах, а не на выдуманном списке имён.
 *
 * Прошлая поломка выглядела именно так: разбор списка имён работал правильно,
 * а живой каталог всё равно не грузился, потому что в нём появились файлы,
 * которых в выдуманных примерах не было. Поэтому здесь читается диск.
 */
describe('настоящие каталоги миграций грузятся целиком', () => {
  const DIRS = [
    path.resolve(__dirname, '../../database/tenant/migrations'),
    path.resolve(__dirname, '../../database/system/migrations'),
  ];

  DIRS.forEach((dir) => {
    const name = path.basename(path.dirname(dir));

    it(`${name}: каждый отобранный файл загружается и имеет up и down`, async () => {
      const source = new ExtensionAgnosticMigrationSource(dir);
      const migrations = await source.getMigrations();

      expect(migrations.length).toBeGreaterThan(10);

      for (const migration of migrations) {
        const loaded = await source.getMigration(migration);

        expect(typeof loaded.up).toBe('function');
        expect(typeof loaded.down).toBe('function');
      }
    });

    it(`${name}: среди отобранного нет файлов тестов`, async () => {
      const source = new ExtensionAgnosticMigrationSource(dir);
      const migrations = await source.getMigrations();

      const tests = migrations
        .map((migration) => migration.file)
        .filter((file) => /\.(spec|test)\./.test(file));

      expect(tests).toEqual([]);
    });
  });
});
