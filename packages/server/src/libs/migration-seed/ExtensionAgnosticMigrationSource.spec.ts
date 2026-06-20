import {
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
});
