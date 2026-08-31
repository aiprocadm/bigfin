// © 2026 Bigfin
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { activeCode } from '../../testing/activeCode';

vi.mock('react-intl-universal', () => ({
  default: { get: (key: string) => key },
}));

/**
 * К2 карты v41. Расходы ищутся среди расходов.
 *
 * Вид записей «расход» объявлен в реестре видов, а сервер искать расходы
 * умеет (модель Expense ищет по ссылке и сумме). На витрине же у этого
 * вида не было ничего: ни адреса запроса, ни разбора ответа, ни привязки
 * к окну поиска — и ни один маршрут его не объявлял.
 *
 * Итог для человека: на экране расходов поиск искал «Клиентов». Из
 * четырнадцати видов записей это был единственный висячий.
 */
const SRC = path.resolve(__dirname, '../..');

const read = (relative: string) =>
  activeCode(fs.readFileSync(path.join(SRC, relative), 'utf8'));

describe('поиск по расходам', () => {
  it('поиск знает адрес запроса за расходами', () => {
    const code = read('hooks/query/GenericResource/index.tsx');
    const urls = code.slice(
      code.indexOf('function getResourceUrlFromType'),
      code.indexOf('transformInvoices'),
    );

    expect(urls).toMatch(/RESOURCES_TYPES\.EXPENSE\]:\s*'\/expenses'/);
  });

  it('поиск умеет разобрать ответ сервера по расходам', () => {
    // Сервер отдаёт расходы полем `expenses`; без разбора список остаётся
    // пустым, и поиск молча ничего не находит.
    const code = read('hooks/query/GenericResource/index.tsx');

    expect(code).toContain('response.data.expenses');
  });

  it('окно поиска предлагает вид «расходы»', () => {
    // Реестр привязок тянет за собой половину приложения, поэтому читаем
    // исходник. Проверяем ОБЕ половины: привязку можно объявить и забыть
    // включить в список — тогда окно поиска её не увидит.
    const registry = read('containers/UniversalSearch/DashboardUniversalSearchBinds.tsx');
    const bindsList = registry.slice(registry.indexOf('universalSearchBinds'));

    expect(registry).toContain(
      "import { universalSearchExpenseBind } from '../Expenses/ExpenseUniversalSearch'",
    );
    expect(bindsList).toContain('universalSearchExpenseBind,');
  });

  it('привязка расходов объявляет вид, действие и разбор строки', () => {
    const bind = read('containers/Expenses/ExpenseUniversalSearch.tsx');

    expect(bind).toContain('export const universalSearchExpenseBind');
    expect(bind).toContain('resourceType: RESOURCES_TYPES.EXPENSE');
    expect(bind).toContain('selectItemAction: ExpenseUniversalSearchItemSelect');
    expect(bind).toContain('itemSelect: expensesToSearch');
  });

  it('экран расходов говорит поиску искать среди расходов', () => {
    const routes = read('routes/dashboard.tsx');
    const expensesRoute = routes.slice(
      routes.indexOf('path: `/expenses`'),
      routes.indexOf('path: `/expenses`') + 400,
    );

    expect(expensesRoute).toContain('defaultSearchResource: RESOURCES_TYPES.EXPENSE');
  });
});
