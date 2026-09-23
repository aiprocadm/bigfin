// © 2026 Bigfin
import { Knex } from 'knex';

import { BalanceManagementArticlesData } from '../seeds/data/managementArticles';

/**
 * Догоняющий сид балансовых статей (D1 ТЗ-2, этап 17).
 *
 * КОМУ ЭТО НУЖНО. Новая организация получает пятивидовое дерево из сида.
 * Организации, заведённые раньше, остались бы с двумя видами: пять вкладок
 * на экране были бы, а три из них — пустыми навсегда. Человек решил бы, что
 * возможность не работает.
 *
 * ЧТО ДЕЛАЕТ.
 * 1. Заводит колонку `seed_key` — УСТОЙЧИВЫЙ КЛЮЧ системной статьи.
 * 2. Добавляет недостающие балансовые статьи, сверяясь по этому ключу.
 *
 * ПОЧЕМУ КЛЮЧ, А НЕ ИМЯ. Имя системной статьи разрешено менять (правило 4
 * FIN-001). Сверяйся миграция по имени — после переименования «Получения
 * кредита» в «Кредиты банка» повторный прогон завёл бы дубль, и половина
 * операций оказалась бы размечена одной статьёй, половина — близнецом.
 *
 * НИ ОДНА СУММА НИ В ОДНОМ ОТЧЁТЕ НЕ МЕНЯЕТСЯ. Статьи заводятся БЕЗ привязки
 * счетов: в `management_article_accounts` не пишется ничего. Пока счёт не
 * привязан, статья не собирает никаких сумм — она просто появляется в
 * справочнике и ждёт, когда ею разметят операцию.
 *
 * Проверки существования сделаны запросом к `information_schema`, а не через
 * `hasTable`/`hasColumn`: схема тенанта живёт в ВЕРХНЕМ регистре, имя уезжает
 * в `hasTable` значением, и на MySQL под Linux ответ «нет» приходит про
 * существующую таблицу.
 */
const TABLE = 'management_articles';
const KEY_COLUMN = 'seed_key';

async function balanceSeedHasTable(knex: Knex, table: string) {
  const result: any = await knex.raw(
    `SELECT COUNT(*) AS total
       FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?`,
    [table.toLowerCase()],
  );
  const rows = Array.isArray(result) ? result[0] : result;
  const first = Array.isArray(rows) ? rows[0] : rows;

  return Number(first?.total ?? first?.TOTAL ?? 0) > 0;
}

async function balanceSeedHasColumn(knex: Knex, table: string, column: string) {
  const result: any = await knex.raw(
    `SELECT COUNT(*) AS total
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?
        AND LOWER(column_name) = ?`,
    [table.toLowerCase(), column.toLowerCase()],
  );
  const rows = Array.isArray(result) ? result[0] : result;
  const first = Array.isArray(rows) ? rows[0] : rows;

  return Number(first?.total ?? first?.TOTAL ?? 0) > 0;
}

export async function up(knex: Knex): Promise<void> {
  if (!(await balanceSeedHasTable(knex, TABLE))) return;

  if (!(await balanceSeedHasColumn(knex, TABLE, KEY_COLUMN))) {
    await knex.schema.alterTable(TABLE, (builder) => {
      // Nullable намеренно: у статей, заведённых человеком, ключа нет и не
      // должно быть. Ключ есть только у системных — он же и делает их
      // системными.
      builder.string(KEY_COLUMN).nullable().index();
    });
  }

  const now = new Date();
  const keyToId: Record<string, number> = {};

  for (const article of BalanceManagementArticlesData) {
    const existing = await knex(TABLE)
      .where(KEY_COLUMN, article.key)
      .first('id');

    if (existing) {
      keyToId[article.key] = existing.id ?? existing.ID;
      continue;
    }

    const [row] = await knex(TABLE)
      .insert({
        name: article.name,
        parent_id: article.parent ? keyToId[article.parent] : null,
        kind: article.kind,
        cashflow_section: article.cashflow_section,
        sort_order: article.sort_order,
        [KEY_COLUMN]: article.key,
        active: true,
        created_at: now,
        updated_at: now,
      })
      .returning('id');

    keyToId[article.key] = typeof row === 'object' ? row.id : row;
  }
}

/**
 * Откат убирает ТОЛЬКО то, что завёл сам, и только пока оно нетронуто.
 *
 * ПОЧЕМУ НЕ УДАЛЯТЬ ВСЁ ПОДРЯД. За время жизни версии человек мог разметить
 * этими статьями операции и завести свои подстатьи. Снести такую статью
 * значит осиротить разметку — молча и без возможности восстановить. Поэтому
 * удаляются только статьи, у которых нет ни привязанных счетов, ни детей.
 *
 * ИМЕНА ПОЛЕЙ В ОТВЕТЕ. Продукт отображает имена в верхний регистр, а ответ
 * базы обратно — в camelCase: колонка `ARTICLE_ID` приезжает как `articleId`.
 * Первая версия читала только `article_id` и `ARTICLE_ID`, не видела ни одного
 * размеченного счёта и ни одного ребёнка — и удаляла ВСЕ балансовые статьи,
 * включая те, которыми уже размечены операции. Найдено 23.09, когда тенантные
 * миграции впервые начали накатываться на стенд.
 *
 * Колонка `seed_key` при откате НЕ УДАЛЯЕТСЯ. Если хоть одна статья
 * осталась, ключ — единственное, по чему её потом узнают: удалив колонку,
 * повторный накат завёл бы дубли.
 */
export async function down(knex: Knex): Promise<void> {
  if (!(await balanceSeedHasTable(knex, TABLE))) return;
  if (!(await balanceSeedHasColumn(knex, TABLE, KEY_COLUMN))) return;

  const keys = BalanceManagementArticlesData.map((article) => article.key);
  const rows = await knex(TABLE).whereIn(KEY_COLUMN, keys).select('id');
  const ids = rows.map((row: any) => row.id ?? row.ID);

  if (ids.length === 0) return;

  const hasAccountsTable = await balanceSeedHasTable(
    knex,
    'management_article_accounts',
  );
  const mappedIds = hasAccountsTable
    ? (
        await knex('management_article_accounts')
          .whereIn('article_id', ids)
          .distinct('article_id')
      ).map((row: any) => row.articleId ?? row.article_id ?? row.ARTICLE_ID)
    : [];

  const mapped = new Set<number>(mappedIds);

  // ДВА ПРОХОДА, А НЕ ОДИН. Сначала уходят листья, и только тогда корневая
  // статья («Активы», «Обязательства», «Капитал») становится бездетной и
  // удаляемой. Посчитай мы «кто с детьми» один раз — корни остались бы
  // висеть пустыми, и повторный накат завёл бы к ним вторые комплекты.
  // Цикл, а не ровно два шага: дерево может быть глубже, чем сейчас.
  let removedSomething = true;

  while (removedSomething) {
    removedSomething = false;

    const alive = (await knex(TABLE).whereIn('id', ids).select('id')).map(
      (row: any) => row.id ?? row.ID,
    );
    if (alive.length === 0) return;

    const stillParents = new Set<number>(
      (
        await knex(TABLE).whereIn('parent_id', alive).distinct('parent_id')
      ).map((row: any) => row.parentId ?? row.parent_id ?? row.PARENT_ID),
    );

    const removable = alive.filter(
      (id: number) => !mapped.has(id) && !stillParents.has(id),
    );

    if (removable.length > 0) {
      await knex(TABLE).whereIn('id', removable).delete();
      removedSomething = true;
    }
  }
}
