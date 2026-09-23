// © 2026 Bigfin
import {
  ArticlesCashflowRollupService,
  legDate,
} from '@/modules/ManagementArticles/queries/ArticlesCashflowRollup.service';
import { CashFlowArticlesService } from './CashFlowArticlesService';

/**
 * Общая фикстура проверок отчёта «Деньги»: 5 000 случайных операций с
 * контрагентами и направлениями, «база» в памяти и служба целиком — с
 * настоящей кассовой свёрткой и настоящей сцепкой остатков.
 *
 * Операции есть и до начала отчёта: нулевой остаток на начало прячет
 * ошибку «забыли прибавить начало».
 */

// Счета: 100 и 101 — денежные; 500 — расход «Аренда», 600 — доход
// «Выручка», 700 — расход, НЕ привязанный к статье (уходит в «не разнесено»).
export const ACCOUNTS = [
  { id: 100, name: 'Расчётный счёт', accountType: 'bank', accountNormal: 'debit' },
  { id: 101, name: 'Касса', accountType: 'cash', accountNormal: 'debit' },
  { id: 500, name: 'Аренда', accountType: 'expense', accountNormal: 'debit' },
  { id: 600, name: 'Выручка', accountType: 'income', accountNormal: 'credit' },
  { id: 700, name: 'Прочее', accountType: 'expense', accountNormal: 'debit' },
];

/** Контрагенты стоят на ноге «не деньги» — как на живых данных стенда. */
export const CONTACTS = [
  { id: 1, displayName: 'ООО «Ромашка»' },
  { id: 2, displayName: 'ИП Иванов' },
];
export const PROJECTS = [
  { id: 10, name: 'Кофейня' },
  { id: 11, name: 'Доставка' },
];
export const ARTICLES = [
  { id: 1, name: 'Расходы', kind: 'expense', parentId: null, sortOrder: 1 },
  { id: 3, name: 'Аренда', kind: 'expense', parentId: 1, sortOrder: 2 },
  { id: 2, name: 'Выручка', kind: 'income', parentId: null, sortOrder: 3 },
];
export const MAP = [
  { accountId: 500, articleId: 3 },
  { accountId: 600, articleId: 2 },
];

/** Повторяемый «случайный» ряд: упавший тест должен падать так же завтра. */
function prng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function makeLegs(count: number) {
  const random = prng(20260923);
  const pick = <T,>(options: T[]): T =>
    options[Math.floor(random() * options.length)];
  const legs: any[] = [];
  const day0 = new Date('2020-10-01T00:00:00').getTime();
  const days = 640; // по конец мая 2022

  for (let id = 1; id <= count; id += 1) {
    const date = new Date(day0 + Math.floor(random() * days) * 86400000);
    // Июль 2021 оставляем пустым: месяц без операций, но с остатком.
    if (date.getFullYear() === 2021 && date.getMonth() === 6) continue;

    const amount = Math.round(random() * 100000_00) / 100;
    const kind = random();
    const base = { referenceType: 'CashflowTransaction', referenceId: id, date };

    if (kind < 0.4) {
      legs.push({ ...base, accountId: 100, debit: amount, credit: 0 });
      legs.push({
        ...base,
        accountId: 600,
        debit: 0,
        credit: amount,
        contactId: pick([1, 2, null]),
        projectId: pick([10, 11, null]),
      });
    } else if (kind < 0.75) {
      legs.push({
        ...base,
        accountId: 500,
        debit: amount,
        credit: 0,
        contactId: pick([2, null]),
        projectId: pick([10, null]),
      });
      legs.push({ ...base, accountId: 100, debit: 0, credit: amount });
    } else if (kind < 0.85) {
      legs.push({ ...base, accountId: 700, debit: amount, credit: 0 });
      legs.push({ ...base, accountId: 100, debit: 0, credit: amount });
    } else {
      legs.push({
        ...base,
        accountId: 101,
        debit: amount,
        credit: 0,
        transactionType: 'TransferToAccount',
      });
      legs.push({
        ...base,
        accountId: 100,
        debit: 0,
        credit: amount,
        transactionType: 'TransferFromAccount',
      });
    }
  }
  return legs;
}

export const LEGS = makeLegs(5000);

/** Мини-исполнитель запроса: понимает ровно те условия, что ставит служба. */
function runQuery(rows: any[], build: (qb: any) => void) {
  const filters: Array<(row: any) => boolean> = [];
  let aggregate = false;
  const qb: any = {
    sum: () => {
      aggregate = true;
      return qb;
    },
    whereIn: (column: string, values: any[]) => {
      filters.push((row) => values.includes(row[column]));
      return qb;
    },
    where: (column: any, op?: string, value?: any) => {
      if (typeof column === 'function') return qb; // разрез: в фикстуре не задан
      const at = (row: any) => legDate(row);
      if (op === '<') filters.push((row) => at(row) < value);
      if (op === '<=') filters.push((row) => at(row) <= value);
      if (op === '>=') filters.push((row) => at(row) >= value);
      return qb;
    },
    modify: (name: string, from?: string, to?: string) => {
      if (name === 'filterDateRange') {
        if (from) filters.push((row) => legDate(row) >= from);
        if (to) filters.push((row) => legDate(row) <= to);
      }
      return qb;
    },
  };
  build(qb);

  const found = rows.filter((row) => filters.every((keep) => keep(row)));
  if (!aggregate) return found;

  return [
    {
      debit: found.reduce((sum, row) => sum + Number(row.debit || 0), 0),
      credit: found.reduce((sum, row) => sum + Number(row.credit || 0), 0),
    },
  ];
}

export function makeService() {
  const accountModel = () => ({
    query: () => ({
      whereIn: (column: string, values: any[]) => {
        const found = ACCOUNTS.filter((a: any) => values.includes(a[column]));
        return Object.assign(Promise.resolve(found), {
          select: () => Promise.resolve(found),
        });
      },
      onBuild: (build: (qb: any) => void) =>
        Promise.resolve(runQuery(ACCOUNTS, build)),
    }),
  });
  const accountTransactionModel = () => ({
    query: () => ({
      onBuild: (build: (qb: any) => void) =>
        Promise.resolve(runQuery(LEGS, build)),
    }),
  });
  const rollup = new ArticlesCashflowRollupService(
    (() => ({
      query: () => ({ orderBy: () => Promise.resolve(ARTICLES) }),
    })) as any,
    (() => ({ query: () => Promise.resolve(MAP) })) as any,
    accountModel as any,
    accountTransactionModel as any,
  );
  const meta = { meta: async () => ({}) };

  // Названия контрагентов и направлений — для вкладок группировок.
  const namedModel = (rows: any[]) => () => ({
    query: () => ({
      whereIn: (_column: string, ids: any[]) => ({
        select: () => Promise.resolve(rows.filter((row) => ids.includes(row.id))),
      }),
    }),
  });

  return new CashFlowArticlesService(
    rollup,
    meta as any,
    accountModel as any,
    accountTransactionModel as any,
    namedModel(CONTACTS) as any,
    namedModel(PROJECTS) as any,
  );
}

