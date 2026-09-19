// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const migration = require('./20260918100100_add_legal_entity_id_columns');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const repair = require('./20260919120000_repair_legal_entity_id_columns');

/**
 * Этап 6 ТЗ, §6.2. Колонка `legal_entity_id` во всех нужных таблицах.
 *
 * Сторож ловит ровно одну ошибку, но самую вероятную: **имя таблицы, которой
 * нет**. ТЗ перечисляет таблицы по смыслу, и часть имён в схеме другая
 * (`sale_estimates` → `sales_estimates`, `dividends` → `dividend_payouts`,
 * `payment_calendar_entries` → `planned_operations`, `expenses` →
 * `expenses_transactions`).
 *
 * Опечатка здесь не падает: миграция защищена проверкой `hasTable` и просто
 * ПРОПУСТИТ такую таблицу. Разрез по юрлицу в ней не появится никогда, и
 * никакой ошибки при этом не будет — заметят через месяц, когда отчёт по
 * юрлицу окажется неполным.
 *
 * Проверяем по моделям: настоящее имя таблицы живёт в `static get tableName`.
 */
const MODULES_DIR = path.resolve(__dirname, '../../../modules');

/** Все имена таблиц, объявленные моделями проекта. */
const modelTableNames = (): Set<string> => {
  const names = new Set<string>();

  const walk = (dir: string) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      // Модели лежат и в `*.model.ts`, и в файлах вида `Bill.ts` — фильтр
      // только по `.model.ts` давал ЛОЖНУЮ тревогу на настоящих таблицах,
      // а соблазн был выкинуть их из миграции.
      if (!/\.ts$/.test(entry.name)) return;
      if (/\.spec\.ts$/.test(entry.name)) return;

      const source = fs.readFileSync(full, 'utf-8');
      const match =
        /static get tableName\(\)\s*\{\s*return\s*['"`]([^'"`]+)['"`]/.exec(
          source,
        );
      if (match) names.add(match[1]);
    });
  };

  walk(MODULES_DIR);
  return names;
};

describe('колонка юрлица в таблицах', () => {
  it('список таблиц не пустой и покрывает требование ТЗ', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(migration.TABLES.length).toBeGreaterThanOrEqual(13);
  });

  it('догоняющая миграция знает ровно те же таблицы', () => {
    // Список продублирован НАМЕРЕННО: миграция должна работать одинаково и
    // через год, когда общий модуль переедет. Но две копии обязаны совпадать,
    // иначе в базе, которую догоняли, часть колонок так и не появится.
    expect(repair.TABLES).toEqual(migration.TABLES);
  });

  it('модели вообще читаются', () => {
    // Если разбор моделей сломается, проверка имён станет бессмысленной.
    expect(modelTableNames().size).toBeGreaterThan(50);
  });

  it('каждая таблица из списка существует в моделях', () => {
    const known = modelTableNames();
    const unknown = migration.TABLES.filter(
      (name: string) => !known.has(name),
    );

    expect(unknown).toEqual([]);
  });

  it('в списке нет повторов', () => {
    // Повтор не упадёт — вторая попытка отсечётся проверкой hasColumn,
    // но список перестанет читаться как перечень.
    expect(new Set(migration.TABLES).size).toBe(migration.TABLES.length);
  });

  it('проводки в списке есть — без них разреза в отчётах не будет', () => {
    expect(migration.TABLES).toContain('accounts_transactions');
  });
});
