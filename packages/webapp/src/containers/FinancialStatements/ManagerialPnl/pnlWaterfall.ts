/**
 * Водопад управленческой прибыли (FT-015 ТЗ-3): от выручки до чистой
 * прибыли — по ступеням.
 *
 * РЯДЫ ИЗ ТЕХ ЖЕ СТРОК, ЧТО ТАБЛИЦА (колонка «Итого» или единственная
 * колонка). Второго запроса нет: картинка, разошедшаяся с цифрами, хуже
 * отсутствия картинки.
 *
 * Ступень-расход висит от предыдущего уровня вниз, ступень-итог стоит от
 * нуля: так глазом видно, сколько «съел» каждый слой расходов.
 */

export interface WaterfallStep {
  id: string;
  /** Ключ подписи `managerial_pnl.row.<id>`. */
  labelKey: string;
  kind: 'start' | 'decrease' | 'increase' | 'total';
  /** Величина ступени со знаком (расход — минус). */
  value: number;
  /** Нижняя граница столбика — невидимая подставка. */
  base: number;
  /** Высота видимой части столбика. */
  height: number;
  /** Доля от выручки, %; `null` — выручка ноль или меньше. */
  shareOfRevenue: number | null;
}

/** Порядок лестницы: группа расхода — вниз, итог — от нуля. */
const LADDER: Array<{ id: string; kind: WaterfallStep['kind'] }> = [
  { id: 'revenue', kind: 'start' },
  { id: 'direct_variable', kind: 'decrease' },
  { id: 'md', kind: 'total' },
  { id: 'direct_production', kind: 'decrease' },
  { id: 'gp1', kind: 'total' },
  { id: 'overhead_production', kind: 'decrease' },
  { id: 'gp2', kind: 'total' },
  { id: 'administrative', kind: 'decrease' },
  { id: 'commercial', kind: 'decrease' },
  { id: 'op', kind: 'total' },
  { id: 'other_income_below_ebitda', kind: 'increase' },
  { id: 'below_ebitda', kind: 'decrease' },
  { id: 'np', kind: 'total' },
];

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Ступени водопада из значений строк одной колонки.
 *
 * @param valueOf значение строки по её ключу (число; нет строки — 0)
 */
export function pnlWaterfall(valueOf: (rowId: string) => number): WaterfallStep[] {
  const revenue = valueOf('revenue');
  let level = 0;

  return LADDER.map(({ id, kind }) => {
    const raw = valueOf(id);
    const value = kind === 'decrease' ? -raw : raw;
    let base: number;
    let height: number;

    if (kind === 'start' || kind === 'total') {
      level = raw;
      base = Math.min(0, raw);
      height = Math.abs(raw);
    } else {
      const next = level + value;
      base = Math.min(level, next);
      height = Math.abs(value);
      level = next;
    }

    return {
      id,
      labelKey: `managerial_pnl.row.${id}`,
      kind,
      value: round2(value),
      base: round2(base),
      height: round2(height),
      shareOfRevenue: revenue > 0 ? round2((value / revenue) * 100) : null,
    };
  });
}

/** Есть ли что рисовать: без выручки и расходов водопад — пустая картинка. */
export const hasWaterfall = (steps: WaterfallStep[]) =>
  steps.some((step) => step.height !== 0);
