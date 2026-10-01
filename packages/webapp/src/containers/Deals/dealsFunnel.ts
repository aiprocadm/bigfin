/**
 * Воронка сделок (C17, UI-051-3 ТЗ-4) — без React, чтобы проверять тестом.
 *
 * Считается из того же ответа `deals/summary`, что и итоги экрана: у каждой
 * сделки там есть статус и выручка. Новой ручки не нужно — правило этапов Б6
 * «ручки не меняются».
 *
 * Порядок ступеней — путь сделки: в работе → завершена; отменённые — отдельной
 * ступенью в конце, чтобы потери были видны, но не выглядели шагом вперёд.
 */
export const FUNNEL_STATUSES = ['in_progress', 'completed', 'cancelled'] as const;
export type FunnelStatus = (typeof FUNNEL_STATUSES)[number];

export interface FunnelDeal {
  status?: string | null;
  revenue?: number | null;
  profit?: number | null;
}

export interface FunnelStep {
  status: FunnelStatus;
  count: number;
  revenue: number;
  profit: number;
}

export function dealsFunnel(deals: FunnelDeal[]): FunnelStep[] {
  const steps = new Map<FunnelStatus, FunnelStep>(
    FUNNEL_STATUSES.map((status) => [status, { status, count: 0, revenue: 0, profit: 0 }]),
  );
  for (const deal of deals ?? []) {
    const step = steps.get(deal.status as FunnelStatus);
    // Статус, которого нет в воронке (старые данные), не придумываем куда
    // отнести — такая сделка просто не попадает в ступени.
    if (!step) continue;
    step.count += 1;
    step.revenue += Number(deal.revenue ?? 0);
    step.profit += Number(deal.profit ?? 0);
  }
  return FUNNEL_STATUSES.map((status) => steps.get(status)!);
}

/** Рентабельность по выручке; при нулевой выручке — нет (не «0 %»). */
export function marginOf(revenue: number, profit: number): number | null {
  return revenue > 0 ? profit / revenue : null;
}
