import * as os from 'os';
import * as path from 'path';
import { promises as fs } from 'fs';
import { ExtensionAgnosticMigrationSource } from './ExtensionAgnosticMigrationSource';

describe('ExtensionAgnosticMigrationSource', () => {
  let dir: string;

  beforeAll(async () => {
    dir = path.join(os.tmpdir(), `bigfin-migsrc-${process.pid}`);
    await fs.mkdir(dir, { recursive: true });
    // .ts-исходник (как в локальном dev-каталоге)
    await fs.writeFile(path.join(dir, '001_create_a.ts'), '// dummy ts\n');
    // .js с реальным телом миграции (как прод-артефакт) — его и будем загружать
    await fs.writeFile(
      path.join(dir, '002_create_b.js'),
      'exports.up = () => "UP-B"; exports.down = () => "DOWN-B";\n',
    );
    // артефакты сборки — должны игнорироваться
    await fs.writeFile(path.join(dir, '001_create_a.d.ts'), 'export {};\n');
    await fs.writeFile(path.join(dir, '002_create_b.js.map'), '{}\n');
    await fs.writeFile(path.join(dir, 'README.md'), '# nope\n');
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('перечисляет только файлы миграций, отсортированные по имени', async () => {
    const source = new ExtensionAgnosticMigrationSource(dir);
    const migrations = await source.getMigrations(['.js', '.ts']);
    expect(migrations.map((m) => m.file)).toEqual([
      '001_create_a.ts',
      '002_create_b.js',
    ]);
  });

  it('отдаёт имя миграции, нормализованное к .js', async () => {
    const source = new ExtensionAgnosticMigrationSource(dir);
    const migrations = await source.getMigrations(['.js', '.ts']);
    const names = migrations.map((m) => source.getMigrationName(m));
    expect(names).toEqual(['001_create_a.js', '002_create_b.js']);
  });

  it('загружает реальный модуль миграции (up/down)', async () => {
    const source = new ExtensionAgnosticMigrationSource(dir);
    const migrations = await source.getMigrations(['.js', '.ts']);
    const b = migrations.find((m) => m.file === '002_create_b.js')!;
    const mod = await source.getMigration(b);
    expect(typeof mod.up).toBe('function');
    expect((mod.up as any)()).toBe('UP-B');
  });
});

describe('ExtensionAgnosticMigrationSource — коллизия .ts и .js одной миграции', () => {
  let dir: string;

  beforeAll(async () => {
    dir = path.join(os.tmpdir(), `bigfin-migsrc-dup-${process.pid}`);
    await fs.mkdir(dir, { recursive: true });
    // одна и та же миграция и как исходник .ts, и как скомпилированный .js
    await fs.writeFile(path.join(dir, '001_same.ts'), '// dummy ts\n');
    await fs.writeFile(path.join(dir, '001_same.js'), 'exports.up = () => {};\n');
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('end-to-end getMigrations отдаёт ровно один файл, предпочитая .js', async () => {
    const source = new ExtensionAgnosticMigrationSource(dir);
    const migrations = await source.getMigrations(['.js', '.ts']);
    expect(migrations.map((m) => m.file)).toEqual(['001_same.js']);
    expect(migrations.map((m) => source.getMigrationName(m))).toEqual([
      '001_same.js',
    ]);
  });
});
