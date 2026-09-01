import * as fs from 'fs';
import * as path from 'path';
import { activeCode } from '../testing/activeCode';

/**
 * Ловушка, на которой сломалось создание новой организации (найдено живой
 * пробой 25.08).
 *
 * `table.text('channels').notNullable().defaultTo('["email"]')` выглядит
 * безобидно, но **MariaDB и MySQL не принимают значения по умолчанию для
 * колонок типа TEXT/BLOB** — просто игнорируют их. Колонка остаётся
 * обязательной и без умолчания, и любая вставка без неё падает с
 * «ER_NO_DEFAULT_FOR_FIELD». В нашем случае это ломало не одну запись, а
 * сборку организации целиком.
 *
 * Менять уже применённые миграции нельзя, поэтому сторож не запрещает такие
 * колонки, а замораживает их список: новая такая колонка — красный тест и
 * повод либо взять `string`/`json`, либо писать значение явно в коде.
 */
const MIGRATION_DIRS = [
  path.resolve(__dirname, 'tenant/migrations'),
  path.resolve(__dirname, 'system/migrations'),
];

/** Колонки, о которых мы знаем и чьи значения пишем явно. */
const KNOWN = [
  '20260615120000_create_notification_preferences_table.ts: channels',
];

const findTextDefaults = (): string[] =>
  MIGRATION_DIRS.flatMap((dir) =>
    fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'))
      .flatMap((file) => {
        const content = activeCode(fs.readFileSync(path.join(dir, file), 'utf8'));

        return content
          .split('\n')
          .filter(
            (line) => /\.text\(/.test(line) && /\.defaultTo\(/.test(line),
          )
          .map((line) => {
            const column = /\.text\(['"]([^'"]+)['"]\)/.exec(line)?.[1] ?? '?';
            return `${file}: ${column}`;
          });
      }),
  );

describe('колонки TEXT со значением по умолчанию', () => {
  it('миграции вообще читаются', () => {
    // Иначе сломанный обход сделал бы проверку ниже пустой и зелёной.
    const files = MIGRATION_DIRS.flatMap((dir) => fs.readdirSync(dir));

    expect(files.length).toBeGreaterThan(20);
  });

  it('новых таких колонок не появилось', () => {
    expect(findTextDefaults().sort()).toEqual([...KNOWN].sort());
  });
});
