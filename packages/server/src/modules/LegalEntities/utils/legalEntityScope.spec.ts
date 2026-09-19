// © 2026 Bigfin
import {
  applyLegalEntityScope,
  describeLegalEntityScope,
} from './legalEntityScope';

/**
 * Этап 7 ТЗ, §7.1–7.2. Отбор отчёта по юрлицам.
 *
 * Тут две ловушки, и обе тихие: выкинуть строки без юрлица (отчёт опустеет
 * у всех, кто ещё не заполнил колонку) и убрать внутригрупповые обороты
 * там, где смотрят одно юрлицо (для него это настоящие доходы и расходы).
 */
const buildQuery = () => {
  const calls: any[] = [];

  const query: any = {
    where: (...args: any[]) => {
      if (typeof args[0] === 'function') {
        const builder: any = {
          whereIn: (column: string, values: any[]) => {
            calls.push({ kind: 'whereIn', column, values });
            return builder;
          },
          orWhereNull: (column: string) => {
            calls.push({ kind: 'orWhereNull', column });
            return builder;
          },
        };
        args[0](builder);
      } else {
        calls.push({ kind: 'where', column: args[0], value: args[1] });
      }
      return query;
    },
  };

  return { query, calls };
};

describe('applyLegalEntityScope', () => {
  it('без выбора юрлиц отбора нет, но внутригрупповые исключаются', () => {
    // Пусто = все юрлица. Это консолидация: перекладывание из кармана
    // в карман не должно попадать в доходы группы.
    const { query, calls } = buildQuery();

    applyLegalEntityScope(query, {});

    expect(calls.filter((c) => c.kind === 'whereIn')).toEqual([]);
    expect(calls).toContainEqual({
      kind: 'where',
      column: 'is_intercompany',
      value: false,
    });
  });

  it('одно юрлицо: отбор есть, внутригрупповые НЕ исключаются', () => {
    // Для этого юрлица перевод соседу — настоящий расход.
    const { query, calls } = buildQuery();

    applyLegalEntityScope(query, { legalEntityIds: [7] });

    expect(calls).toContainEqual({
      kind: 'whereIn',
      column: 'legal_entity_id',
      values: [7],
    });
    expect(
      calls.filter((c) => c.column === 'is_intercompany'),
    ).toEqual([]);
  });

  it('несколько юрлиц: и отбор, и исключение', () => {
    // «Только ООО, без ИП» — тоже консолидация, по части группы.
    const { query, calls } = buildQuery();

    applyLegalEntityScope(query, { legalEntityIds: [1, 2] });

    expect(calls).toContainEqual({
      kind: 'whereIn',
      column: 'legal_entity_id',
      values: [1, 2],
    });
    expect(calls).toContainEqual({
      kind: 'where',
      column: 'is_intercompany',
      value: false,
    });
  });

  it('строки БЕЗ юрлица остаются в отборе', () => {
    // Колонка заполняется отдельной задачей. Отбор, выкидывающий пустые,
    // показал бы пустой отчёт всем, кто ещё не заполнил данные.
    const { query, calls } = buildQuery();

    applyLegalEntityScope(query, { legalEntityIds: [7] });

    expect(calls).toContainEqual({
      kind: 'orWhereNull',
      column: 'legal_entity_id',
    });
  });

  it('префикс таблицы доходит до имён колонок', () => {
    // В запросах с join без префикса колонка неоднозначна, и запрос падает.
    const { query, calls } = buildQuery();

    applyLegalEntityScope(query, { legalEntityIds: [7] }, 'accounts_transactions');

    expect(calls).toContainEqual({
      kind: 'whereIn',
      column: 'accounts_transactions.legal_entity_id',
      values: [7],
    });
  });
});

describe('describeLegalEntityScope — что показать в шапке', () => {
  it('без выбора — сводный отчёт без внутренних оборотов', () => {
    expect(describeLegalEntityScope(undefined)).toEqual({
      isConsolidated: true,
      excludesIntercompany: true,
      selectedCount: 0,
      // В режиме всех юрлиц строки расчётов нет: обе ноги любого внутреннего
      // перевода уже внутри отчёта.
      hasIntercompanySettlement: false,
    });
  });

  it('одно юрлицо — не сводный, внутренние обороты видны', () => {
    expect(describeLegalEntityScope({ legalEntityIds: [3] })).toEqual({
      isConsolidated: false,
      excludesIntercompany: false,
      selectedCount: 1,
      // У одного юрлица появляется строка «Расчёты внутри группы»: вторая
      // нога внутреннего перевода лежит на счёте другого юрлица, и встречное
      // требование к своему же считается по перекосу отбора.
      hasIntercompanySettlement: true,
    });
  });

  it('несколько юрлиц — сводный по части группы', () => {
    expect(describeLegalEntityScope({ legalEntityIds: [3, 4] })).toEqual({
      isConsolidated: true,
      excludesIntercompany: true,
      selectedCount: 2,
      // Двух и больше юрлиц уже достаточно, чтобы внутренние обороты
      // исключались: обе ноги перевода внутри выбранной части группы.
      // Но строка расчётов НУЖНА и здесь: у выбранной части есть настоящие
      // требования к оставшейся.
      hasIntercompanySettlement: true,
    });
  });
});
