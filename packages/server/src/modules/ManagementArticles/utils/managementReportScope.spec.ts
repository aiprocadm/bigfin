// © 2026 Bigfin
import { applyManagementReportScope } from './managementReportScope';

/**
 * Общий отбор управленческих отчётов (FT-008 ТЗ-3).
 *
 * Запрос подменён записывающим объектом: проверяется не SQL-диалект, а то,
 * КАКИЕ условия отбор ставит при каждом выборе — ровно то, что раньше молча
 * терялось.
 */
type Call = [string, ...any[]];

function recorder() {
  const calls: Call[] = [];
  const query: any = {
    calls,
    modify: (...args: any[]) => (calls.push(['modify', ...args]), query),
    whereIn: (...args: any[]) => (calls.push(['whereIn', ...args]), query),
    whereNull: (...args: any[]) => (calls.push(['whereNull', ...args]), query),
    orWhereNull: (...args: any[]) => (calls.push(['orWhereNull', ...args]), query),
    where: (...args: any[]) => {
      // Условие-группа (юрлицо ИЛИ пусто) раскрывается во вложенный запрос.
      if (typeof args[0] === 'function') {
        const inner = recorder();
        args[0](inner);
        calls.push(['whereGroup', inner.calls]);
      } else {
        calls.push(['where', ...args]);
      }
      return query;
    },
  };
  return query;
}

const run = (scope: any) => {
  const query = recorder();
  applyManagementReportScope(query, scope);
  return query.calls as Call[];
};

describe('общий отбор управленческих отчётов', () => {
  it('без выбора: сводно по группе, внутригрупповые обороты убраны', () => {
    // Консолидация по §7.2 ТЗ-1: перевод от своего ООО своему ИП не доход
    // группы. Раньше управленческие своды этого не делали.
    expect(run({})).toEqual([['where', 'is_intercompany', false]]);
  });

  it('без выбора и без объекта отбора ведёт себя так же', () => {
    expect(run(undefined)).toEqual([['where', 'is_intercompany', false]]);
  });

  it('одно юрлицо: его операции и операции без юрлица, переводы остаются', () => {
    // Строки без юрлица остаются — иначе отчёт опустеет у всех, кто ещё не
    // заполнил колонку. Внутренние переводы остаются: для одного юрлица это
    // настоящие деньги пришли или ушли.
    expect(run({ legalEntityIds: [7] })).toEqual([
      [
        'whereGroup',
        [
          ['whereIn', 'legal_entity_id', [7]],
          ['orWhereNull', 'legal_entity_id'],
        ],
      ],
    ]);
  });

  it('несколько юрлиц: их операции, внутригрупповые обороты убраны', () => {
    const calls = run({ legalEntityIds: [1, 2] });

    expect(calls).toContainEqual(['where', 'is_intercompany', false]);
    expect(calls[0][0]).toBe('whereGroup');
  });

  it('подразделения — тем же модификатором, что у бухгалтерских отчётов', () => {
    expect(run({ branchesIds: [3] })).toContainEqual([
      'modify',
      'filterByBranches',
      [3],
    ]);
  });

  it('направления: только выбранные', () => {
    expect(run({ projectsIds: [4, 5] })).toContainEqual([
      'whereIn',
      'project_id',
      [4, 5],
    ]);
  });

  it('пустые списки ничего не отбирают', () => {
    expect(
      run({ branchesIds: [], legalEntityIds: [], projectsIds: [] }),
    ).toEqual([['where', 'is_intercompany', false]]);
  });
});
