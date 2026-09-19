// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { activeCode } from '../../testing/activeCode';

/**
 * Сторож: никто не спрашивает базу «есть ли таблица» напрямую.
 *
 * ЗАЧЕМ. Продукт отображает имена в ВЕРХНИЙ регистр
 * (`knexSnakeCaseMappers({ upperCase: true })`): в коде `accounts_transactions`,
 * в базе `ACCOUNTS_TRANSACTIONS`. К имени, переданному в
 * `knex.schema.hasTable(...)`, отображение НЕ применяется — оно уезжает
 * значением, а не именем. На MySQL под Linux имена таблиц чувствительны к
 * регистру, и ответ приходит «нет» про СУЩЕСТВУЮЩУЮ таблицу.
 *
 * Дальше всё тихо: «нет» читается как «этой таблицы у организации нет,
 * пропускаем». Ничего не падает. Так случилось трижды:
 *
 *   1. миграция этапа 6 прошла все 13 таблиц мимо и записалась выполненной —
 *      ни одной колонки `legal_entity_id` не появилось;
 *   2. проверка «юрлицо чем-то занято» отвечала «не занято» — удалить его
 *      дали бы вместе со всем, что на него ссылается;
 *   3. заполнение молча обходило все таблицы сразу.
 *
 * Капкан был описан ещё в августе, в миграции про демо «в один щелчок», —
 * и через месяц в него наступили снова. Одного пояснения в комментарии мало,
 * нужен сторож.
 *
 * Правильный способ — `hasTableAnyCase` / `hasColumnAnyCase` из
 * `common/utils/schemaAnyCase`, либо свой запрос к `information_schema` со
 * сравнением по нижнему регистру (так делают миграции: они самодостаточны).
 */
const SRC = path.resolve(__dirname, '../..');

/** Файл, где сама проверка и живёт. Ему можно. */
const ALLOWED = ['common/utils/schemaAnyCase.ts'];

const SKIP = /node_modules|\.spec\.|\.d\.ts$/;

/** Вызов, который отвечает неверно на базе с именами в другом регистре. */
const RAW_CHECK = /\.schema\s*\.\s*(hasTable|hasColumn)\s*\(/;

function collect(dir: string, acc: string[] = []): string[] {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    const unix = full.replace(/\\/g, '/');

    if (SKIP.test(unix)) return;
    if (entry.isDirectory()) {
      collect(full, acc);
      return;
    }
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
      acc.push(full);
    }
  });

  return acc;
}

describe('никто не спрашивает базу о таблице с учётом регистра', () => {
  const files = collect(SRC);

  it('файлы найдены', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('нет прямых вызовов schema.hasTable / schema.hasColumn', () => {
    const offenders = files
      .filter((file) => {
        const rel = path.relative(SRC, file).replace(/\\/g, '/');
        return !ALLOWED.includes(rel);
      })
      .filter((file) => {
        // Комментарии не в счёт: пояснить капкан словами не только можно,
        // но и нужно — иначе следующий не поймёт, почему нельзя.
        const source = activeCode(fs.readFileSync(file, 'utf-8'));
        return RAW_CHECK.test(source);
      })
      .map((file) => path.relative(SRC, file).replace(/\\/g, '/'));

    expect(offenders).toEqual([]);
  });

  it('проверка и правда ловит такой вызов', () => {
    // Без этого сторож мог бы «проходить» из-за ошибки в самом правиле.
    expect(RAW_CHECK.test("await knex.schema.hasTable('accounts')")).toBe(true);
    expect(
      RAW_CHECK.test("await knex.schema.hasColumn('accounts', 'name')"),
    ).toBe(true);
    expect(RAW_CHECK.test("await hasTableAnyCase(knex, 'accounts')")).toBe(
      false,
    );
  });
});
