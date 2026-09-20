// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PLAN_FACT_COLUMNS,
  isColumnEnabled,
  togglePlanFactColumn,
  visibleColumnsCount,
} from './planFactColumns';

/**
 * Состав колонок план-факта (FIN-021 ТЗ-2).
 *
 * Правило «Факт управляет остальными тремя» неочевидное, и проверять его
 * глазами дорого: выполнение плана, отклонение и отклонение в процентах
 * считаются ОТ ФАКТА, и без него это следствие без причины.
 */
describe('колонки план-факта', () => {
  it('по умолчанию факт показан', () => {
    expect(DEFAULT_PLAN_FACT_COLUMNS.fact).toBe(true);
  });

  it('СНЯТИЕ ФАКТА СНИМАЕТ ОСТАЛЬНЫЕ ТРИ', () => {
    // Приёмка 1 FIN-021. Не прячет их выбор, а именно снимает: иначе
    // человек вернёт факт и получит колонки, которых уже не ждал.
    const result = togglePlanFactColumn(
      { fact: true, completion: true, varianceAbs: true, variancePct: true },
      'fact',
    );

    expect(result).toEqual({
      fact: false,
      completion: false,
      varianceAbs: false,
      variancePct: false,
    });
  });

  it('без факта зависимая колонка НЕ ВКЛЮЧАЕТСЯ', () => {
    const off = {
      fact: false,
      completion: false,
      varianceAbs: false,
      variancePct: false,
    };

    expect(togglePlanFactColumn(off, 'varianceAbs')).toEqual(off);
    expect(isColumnEnabled(off, 'varianceAbs')).toBe(false);
  });

  it('факт снять можно всегда', () => {
    expect(isColumnEnabled(DEFAULT_PLAN_FACT_COLUMNS, 'fact')).toBe(true);
  });

  it('возврат факта не возвращает снятые колонки сам', () => {
    const off = togglePlanFactColumn(
      { fact: true, completion: true, varianceAbs: true, variancePct: true },
      'fact',
    );
    const back = togglePlanFactColumn(off, 'fact');

    expect(back.fact).toBe(true);
    expect(back.varianceAbs).toBe(false);
  });

  it('зависимая колонка переключается при включённом факте', () => {
    const result = togglePlanFactColumn(
      { fact: true, completion: false, varianceAbs: true, variancePct: true },
      'completion',
    );

    expect(result.completion).toBe(true);
  });

  it('название и план показываются ВСЕГДА', () => {
    // Таблица без них ни о чём: нечего сравнивать и непонятно, с чем.
    const none = {
      fact: false,
      completion: false,
      varianceAbs: false,
      variancePct: false,
    };

    expect(visibleColumnsCount(none)).toBe(2);
  });

  it('счётчик колонок растёт вместе с выбором', () => {
    expect(visibleColumnsCount(DEFAULT_PLAN_FACT_COLUMNS)).toBe(5);
  });
});
