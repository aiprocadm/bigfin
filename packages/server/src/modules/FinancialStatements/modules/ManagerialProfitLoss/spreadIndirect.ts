// © 2026 Bigfin
import { resolvePlType } from '@/modules/ManagementArticles/utils/plTypes';
import {
  allocateByBase,
  AllocationBase,
  AllocationTarget,
} from '@/modules/CostAllocation/utils/allocationBases';
import { PnlEntry } from './ManagerialPnlSource.service';

/**
 * Распределение косвенных расходов по направлениям (FT-011 ТЗ-3).
 *
 * Аренда офиса, бухгалтерия, реклама бренда не привязаны ни к одному
 * направлению — и без распределения нельзя ответить «сколько на самом деле
 * зарабатывает OZON». Здесь такие расходы раскладываются по направлениям по
 * выбранной базе.
 *
 * ЧТО РАСПРЕДЕЛЯЕТСЯ: только ярусы общепроизводственных, административных
 * и коммерческих расходов И только записи без направления. Выручка и прямые
 * производственные — никогда: они и так принадлежат направлению.
 *
 * ДЕНЬГИ НЕ СОЗДАЮТСЯ И НЕ ИСЧЕЗАЮТ: сумма долей строго равна пулу
 * (`allocatePool`), итоговые строки отчёта от распределения не меняются.
 * База нулевая у всех — пул остаётся нераспределённым, и отчёт об этом
 * говорит.
 */
export const SPREAD_TIERS = ['overhead_production', 'administrative', 'commercial'];

export interface SpreadResult {
  entriesByPeriod: PnlEntry[][];
  /** Колонок, где база оказалась нулевой и распределения не было. */
  zeroBasePeriods: number;
}

/** Статья и все её подстатьи. */
function subtreeOf(rootId: number | null | undefined, articles: any[]): Set<number> {
  const ids = new Set<number>();
  if (!rootId) return ids;
  const stack = [Number(rootId)];
  while (stack.length) {
    const id = stack.pop()!;
    if (ids.has(id)) continue;
    ids.add(id);
    articles.filter((a) => Number(a.parentId) === id).forEach((a) => stack.push(a.id));
  }
  return ids;
}

export function spreadIndirectCosts(input: {
  entriesByPeriod: PnlEntry[][];
  articles: any[];
  base: AllocationBase;
  projectName: (id: number) => string | undefined;
  payrollArticleId?: number | null;
  manualShares?: Record<string | number, number>;
}): SpreadResult {
  const { articles, base } = input;
  const tierOf = new Map<number, string | null>();
  articles.forEach((a) => tierOf.set(a.id, resolvePlType(a.id, articles).plType));
  const payroll = subtreeOf(input.payrollArticleId, articles);

  // Направления — все, что встречаются в отчёте: делим между ними, даже если
  // в этом месяце у направления не было выручки (тогда его доля по выручке —
  // ноль, а поровну — треть).
  const directionIds = [
    ...new Set(
      input.entriesByPeriod
        .flat()
        .map((e) => e.projectId)
        .filter((id): id is number => id !== null && id !== undefined),
    ),
  ];

  let zeroBasePeriods = 0;
  const entriesByPeriod = input.entriesByPeriod.map((entries) => {
    if (directionIds.length === 0) return entries;

    const metric = (id: number, pick: (tier: string | null, e: PnlEntry) => number) =>
      entries
        .filter((e) => e.projectId === id && e.articleId !== null)
        .reduce((sum, e) => sum + pick(tierOf.get(e.articleId!) ?? null, e), 0);
    const targets: AllocationTarget[] = directionIds.map((id) => ({
      id,
      name: input.projectName(id) ?? `№ ${id}`,
      revenue: metric(id, (tier, e) => (tier === 'revenue' ? e.amount : 0)),
      grossProfit1: metric(id, (tier, e) =>
        tier === 'revenue'
          ? e.amount
          : tier === 'direct_variable' || tier === 'direct_production'
            ? -e.amount
            : 0,
      ),
      productionPayroll: metric(id, (_tier, e) => (payroll.has(e.articleId!) ? e.amount : 0)),
    }));

    let zeroBase = false;
    const result: PnlEntry[] = [];
    entries.forEach((entry) => {
      const tier = entry.articleId !== null ? tierOf.get(entry.articleId) : null;
      if (entry.projectId !== null || !tier || !SPREAD_TIERS.includes(tier)) {
        result.push(entry);
        return;
      }
      const split = allocateByBase(entry.amount, base, targets, input.manualShares);
      if (split.zeroBase || split.amounts.length === 0) {
        zeroBase = zeroBase || split.zeroBase;
        result.push(entry);
        return;
      }
      split.amounts.forEach((share) =>
        result.push({ ...entry, projectId: share.dealId, amount: share.amount }),
      );
    });
    if (zeroBase) zeroBasePeriods += 1;
    return result;
  });

  return { entriesByPeriod, zeroBasePeriods };
}
