// © 2026 Bigfin
import type { MarginPoint } from './MarginOverTimeChart';

export interface MarginChartPoint {
  month: string;
  /** Маржа в процентах с одним знаком; `null` — выручки не было, линия рвётся. */
  marginPct: number | null;
}

/**
 * Точки графика маржинальности (UI-042-7 ТЗ-4).
 *
 * Сервер отдаёт маржу 0, когда выручки нет, — делить не на что. Но на графике
 * такой 0 читается как «работали в ноль», и линия падала 100 % → 0 → 100 %.
 * Маржа без выручки не определена: точка пустая, линия прерывается.
 */
export function marginChartPoints(
  data: MarginPoint[] | undefined,
): MarginChartPoint[] {
  return (data ?? []).map((p) => ({
    month: p.month,
    marginPct: p.revenue ? Math.round((p.margin ?? 0) * 1000) / 10 : null,
  }));
}
