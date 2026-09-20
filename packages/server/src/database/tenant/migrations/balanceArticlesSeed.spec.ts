// © 2026 Bigfin
import {
  up as seedBalanceArticlesUp,
  down as seedBalanceArticlesDown,
} from './20260920140100_seed_balance_articles';
import {
  AllManagementArticlesData,
  BalanceManagementArticlesData,
  ManagementArticlesData,
} from '../seeds/data/managementArticles';
import {
  ARTICLE_KINDS,
  BALANCE_ARTICLE_KINDS,
  CASHFLOW_SECTIONS,
} from '@/modules/ManagementArticles/constants';

/**
 * Догоняющий сид балансовых статей (этап 17 ТЗ-2).
 *
 * ЧТО ЗДЕСЬ ВАЖНО ПРОВЕРИТЬ. Миграция данных, в отличие от миграции схемы,
 * ошибается ТИХО: она проходит, записывается выполненной, а в справочнике у
 * человека оказывается по два комплекта одинаковых статей. Половина
 * операций размечена одной, половина близнецом — и отчёт разъезжается на
 * две строки, причём обе выглядят правдоподобно.
 *
 * Поэтому идемпотентность проверяется не рассуждением, а ПОВТОРНЫМ ПРОГОНОМ
 * по поддельной базе.
 */

/** Минимальная подделка knex: ровно те приёмы, что зовёт миграция. */
function makeKnex(initialRows: any[] = [], withKeyColumn = false) {
  const tables: Record<string, any[]> = {
    management_articles: [...initialRows],
    management_article_accounts: [],
  };
  const columns = new Set<string>(
    withKeyColumn ? ['seed_key'] : [],
  );
  let nextId =
    initialRows.reduce((max, row) => Math.max(max, row.id ?? 0), 0) + 1;

  const builder = (table: string) => {
    const state: any = { where: null, whereIn: null };

    const rows = () => {
      let result = tables[table] ?? [];
      if (state.where) {
        result = result.filter(
          (row) => row[state.where.column] === state.where.value,
        );
      }
      if (state.whereIn) {
        result = result.filter((row) =>
          state.whereIn.values.includes(row[state.whereIn.column]),
        );
      }
      return result;
    };

    const api: any = {
      where(column: string, value: any) {
        state.where = { column, value };
        return api;
      },
      whereIn(column: string, values: any[]) {
        state.whereIn = { column, values };
        return api;
      },
      first() {
        return Promise.resolve(rows()[0]);
      },
      select() {
        return Promise.resolve(rows().map((row) => ({ ...row })));
      },
      distinct(column: string) {
        const seen = new Set(
          rows()
            .map((row) => row[column])
            .filter((value) => value != null),
        );
        return Promise.resolve([...seen].map((value) => ({ [column]: value })));
      },
      delete() {
        const doomed = new Set(rows().map((row) => row.id));
        tables[table] = tables[table].filter((row) => !doomed.has(row.id));
        return Promise.resolve(doomed.size);
      },
      insert(values: any) {
        const row = { id: nextId, ...values };
        nextId += 1;
        tables[table].push(row);
        return {
          returning: () => Promise.resolve([{ id: row.id }]),
        };
      },
    };

    return api;
  };

  const knex: any = (table: string) => builder(table);

  knex.raw = (sql: string, params: string[]) => {
    const isColumnCheck = sql.includes('information_schema.columns');
    const total = isColumnCheck
      ? Number(columns.has(String(params[1])))
      : Number(Boolean(tables[String(params[0])]));

    return Promise.resolve([[{ total }]]);
  };

  knex.schema = {
    alterTable: (_table: string, apply: (b: any) => void) => {
      const columnBuilder = {
        string: (name: string) => {
          columns.add(name);
          return columnBuilder;
        },
        nullable: () => columnBuilder,
        index: () => columnBuilder,
      };
      apply(columnBuilder);
      return Promise.resolve();
    },
  };

  knex.__tables = tables;
  knex.__columns = columns;

  return knex;
}

const articlesOf = (knex: any) => knex.__tables.management_articles;

describe('догоняющий сид балансовых статей', () => {
  describe('состав сида', () => {
    it('в новой организации есть статья каждого из пяти видов', () => {
      // Приёмка 4 FIN-001.
      const kinds = new Set(AllManagementArticlesData.map((a) => a.kind));

      ARTICLE_KINDS.forEach((kind) => expect(kinds.has(kind)).toBe(true));
    });

    it('в сиде нет посторонних видов', () => {
      // Замена CHECK-ограничения, которого в MySQL надёжно не сделать.
      const strays = AllManagementArticlesData.filter(
        (a) => !(ARTICLE_KINDS as readonly string[]).includes(a.kind),
      );

      expect(strays).toEqual([]);
    });

    it('все имена — по-русски', () => {
      // Продукт российский; английское имя в справочнике заметит каждый.
      const notRussian = AllManagementArticlesData.filter(
        (a) => !/[а-яё]/i.test(a.name),
      );

      expect(notRussian).toEqual([]);
    });

    it('у каждой балансовой статьи есть раздел движения денег', () => {
      // Без раздела статья не попадёт ни в один отчёт: в ОПиУ балансовых
      // нет, а в ДДС строка встаёт именно по разделу.
      const sectionless = BalanceManagementArticlesData.filter(
        (a) =>
          !a.cashflow_section ||
          !(CASHFLOW_SECTIONS as readonly string[]).includes(
            a.cashflow_section,
          ),
      );

      expect(sectionless).toEqual([]);
    });

    it('ключи уникальны', () => {
      const keys = AllManagementArticlesData.map((a) => a.key);

      expect(keys).toHaveLength(new Set(keys).size);
    });

    it('балансовые виды и виды ОПиУ в сиде не перепутаны', () => {
      const wrong = BalanceManagementArticlesData.filter(
        (a) => !(BALANCE_ARTICLE_KINDS as readonly string[]).includes(a.kind),
      );

      expect(wrong).toEqual([]);
    });
  });

  describe('прогон миграции', () => {
    it('на пустой организации заводит всё дерево балансовых статей', async () => {
      const knex = makeKnex();
      await seedBalanceArticlesUp(knex);

      expect(articlesOf(knex)).toHaveLength(
        BalanceManagementArticlesData.length,
      );
      expect(knex.__columns.has('seed_key')).toBe(true);
    });

    it('ПОВТОРНЫЙ прогон не добавляет ни одной строки', async () => {
      const knex = makeKnex();
      await seedBalanceArticlesUp(knex);
      const afterFirst = articlesOf(knex).length;

      await seedBalanceArticlesUp(knex);
      await seedBalanceArticlesUp(knex);

      expect(articlesOf(knex)).toHaveLength(afterFirst);
    });

    it('переименованную системную статью узнаёт по ключу, а не по имени', async () => {
      // Правило 4 FIN-001: системную статью переименовывают. Сверяйся
      // миграция по имени — завела бы дубль.
      const knex = makeKnex();
      await seedBalanceArticlesUp(knex);

      const renamed = articlesOf(knex).find(
        (row: any) => row.seed_key === 'loan_received',
      );
      renamed.name = 'Кредиты банка';

      await seedBalanceArticlesUp(knex);

      const withKey = articlesOf(knex).filter(
        (row: any) => row.seed_key === 'loan_received',
      );
      expect(withKey).toHaveLength(1);
      expect(withKey[0].name).toBe('Кредиты банка');
    });

    it('не трогает статьи, которые уже были у организации', async () => {
      // «Ни одна сумма ни в одном отчёте не изменилась» начинается здесь.
      const existing = ManagementArticlesData.map((article, index) => ({
        id: index + 1,
        name: article.name,
        kind: article.kind,
        parent_id: null,
        seed_key: null,
      }));
      const knex = makeKnex(existing);

      await seedBalanceArticlesUp(knex);

      const untouched = articlesOf(knex).filter(
        (row: any) => row.seed_key == null,
      );
      expect(untouched).toEqual(existing);
    });

    it('НЕ привязывает счета: суммы отчётов остаются прежними', async () => {
      // Пока счёт не привязан, статья не собирает ничего. Это и есть
      // причина, по которой догоняющий сид безопасен для отчётов.
      const knex = makeKnex();
      await seedBalanceArticlesUp(knex);

      expect(knex.__tables.management_article_accounts).toEqual([]);
    });
  });

  describe('откат', () => {
    it('убирает всё, что завёл, включая корневые статьи', async () => {
      const knex = makeKnex();
      await seedBalanceArticlesUp(knex);
      await seedBalanceArticlesDown(knex);

      expect(articlesOf(knex)).toEqual([]);
    });

    it('НЕ трогает статью, которой уже размечены операции', async () => {
      // Снести её значит осиротить разметку — молча и без восстановления.
      const knex = makeKnex();
      await seedBalanceArticlesUp(knex);

      const used = articlesOf(knex).find(
        (row: any) => row.seed_key === 'owner_contribution',
      );
      knex.__tables.management_article_accounts.push({
        article_id: used.id,
        account_id: 500,
      });

      await seedBalanceArticlesDown(knex);

      const left = articlesOf(knex).map((row: any) => row.seed_key);
      expect(left).toContain('owner_contribution');
      // Родитель занятой статьи тоже остаётся: удалив его, мы порвали бы
      // ссылку у оставшегося ребёнка.
      expect(left).toContain('equity');
      expect(left).not.toContain('loan_received');
    });

    it('после отката повторный накат снова полон и без дублей', async () => {
      const knex = makeKnex();
      await seedBalanceArticlesUp(knex);
      await seedBalanceArticlesDown(knex);
      await seedBalanceArticlesUp(knex);

      expect(articlesOf(knex)).toHaveLength(
        BalanceManagementArticlesData.length,
      );
    });
  });
});
