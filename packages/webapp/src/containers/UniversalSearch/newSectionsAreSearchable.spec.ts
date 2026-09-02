// © 2026 Bigfin
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Карта v43. Разделы, в которых нельзя найти.
 *
 * Девять разделов, добавленных позже классических, не ищутся никак: своего
 * поля поиска у их экранов нет, а поиск в шапке о них не знает — он ищет
 * «Клиентов», где бы человек ни стоял.
 *
 * Эта карта закрывает три, где список растёт быстрее всего: сделки,
 * заявки на оплату, основные средства.
 */
const SRC = path.resolve(__dirname, '../..');

const read = (relative: string) =>
  fs.readFileSync(path.join(SRC, relative), 'utf8');

const SECTIONS = [
  { type: 'DEAL', url: '/deals', route: '/deals', bind: 'universalSearchDealBind' },
  {
    type: 'PAYMENT_REQUEST',
    url: '/payment-requests',
    route: '/payment-requests',
    bind: 'universalSearchPaymentRequestBind',
  },
  {
    type: 'FIXED_ASSET',
    url: '/fixed-assets',
    route: '/fixed-assets',
    bind: 'universalSearchFixedAssetBind',
  },
  // Карта v48 — последние разделы из задела карт v39 и v43.
  {
    type: 'CREDIT',
    url: '/credits',
    route: '/credits',
    bind: 'universalSearchCreditBind',
  },
  {
    type: 'EMPLOYEE',
    url: '/payroll/employees',
    route: '/payroll',
    bind: 'universalSearchEmployeeBind',
  },
  {
    type: 'BUDGET',
    url: '/budgets',
    route: '/budgets',
    bind: 'universalSearchBudgetBind',
  },
  {
    type: 'PLANNED_OPERATION',
    url: '/payment-calendar/planned-operations',
    route: '/payment-calendar',
    bind: 'universalSearchPlannedOperationBind',
  },
];

describe('поиск по новым разделам', () => {
  const types = read('constants/resourcesTypes.tsx');
  const generic = read('hooks/query/GenericResource/index.tsx');
  const registry = read('containers/UniversalSearch/DashboardUniversalSearchBinds.tsx');
  const routes = read('routes/dashboard.tsx');

  it.each(SECTIONS)('вид записей «$type» объявлен', ({ type }) => {
    expect(types).toMatch(new RegExp(`\\b${type}:\\s*'`));
  });

  it.each(SECTIONS)('поиск знает адрес запроса за «$type»', ({ type, url }) => {
    const urls = generic.slice(
      generic.indexOf('function getResourceUrlFromType'),
      generic.indexOf('transformInvoices'),
    );

    expect(urls).toMatch(
      new RegExp(`RESOURCES_TYPES\\.${type}\\]:\\s*'${url}'`),
    );
  });

  it.each(SECTIONS)('поиск умеет разобрать ответ по «$type»', ({ type }) => {
    const pairs = generic.slice(generic.indexOf('const pairs = {'));

    expect(pairs).toMatch(new RegExp(`RESOURCES_TYPES\\.${type}\\]:\\s*transform`));
  });

  it.each(SECTIONS)('окно поиска предлагает «$type»', ({ bind }) => {
    // Проверяем обе половины: привязку можно объявить и забыть включить в
    // список — тогда окно поиска её не увидит.
    const list = registry.slice(registry.indexOf('universalSearchBinds'));

    expect(registry).toContain(`import { ${bind} }`);
    expect(list).toContain(`${bind},`);
  });

  it.each(SECTIONS)('экран «$route» говорит поиску, где стоит человек', ({
    route,
    type,
  }) => {
    const entry = routes.slice(
      routes.indexOf(`path: \`${route}\``),
      routes.indexOf(`path: \`${route}\``) + 400,
    );

    expect(entry).toContain(`defaultSearchResource: RESOURCES_TYPES.${type}`);
  });
});
