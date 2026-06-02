export type ScenarioKey = 'optimistic' | 'realistic' | 'pessimistic';

/** Строка ответа эндпоинта план-факт (фронт использует это подмножество полей). */
export interface PlanFactRow {
  articleId: number;
  name: string;
  kind?: string;
  plan: number;
  fact: number;
}

export interface CompareRow {
  articleId: number;
  name: string;
  fact: number;
  plans: Record<ScenarioKey, number>;
  deviations: Record<ScenarioKey, number | null>;
  closest: ScenarioKey | null;
}

const SCENARIO_ORDER: ScenarioKey[] = ['optimistic', 'realistic', 'pessimistic'];

/**
 * Склеивает три набора план-факта (по одному сценарию каждый) в строки сравнения.
 * Факт от сценария не зависит — берётся из realistic, затем optimistic, затем pessimistic.
 * deviation% = round((plan - fact) / fact * 100); null, если fact === 0.
 * closest = сценарий с минимальным |plan - fact|; ничья — по SCENARIO_ORDER (первый);
 * null, если fact === 0.
 * @param {Record<ScenarioKey, PlanFactRow[]>} byScenario
 * @returns {CompareRow[]}
 */
export function mergePlanFactScenarios(
  byScenario: Record<ScenarioKey, PlanFactRow[]>,
): CompareRow[] {
  const index: Record<ScenarioKey, Map<number, PlanFactRow>> = {
    optimistic: new Map(),
    realistic: new Map(),
    pessimistic: new Map(),
  };
  SCENARIO_ORDER.forEach((s) => {
    (byScenario[s] ?? []).forEach((row) => index[s].set(row.articleId, row));
  });

  // Объединение статей: порядок первого появления (realistic → optimistic → pessimistic).
  const unionOrder: ScenarioKey[] = ['realistic', 'optimistic', 'pessimistic'];
  const seen = new Set<number>();
  const articleIds: number[] = [];
  unionOrder.forEach((s) => {
    (byScenario[s] ?? []).forEach((row) => {
      if (!seen.has(row.articleId)) {
        seen.add(row.articleId);
        articleIds.push(row.articleId);
      }
    });
  });

  return articleIds.map((articleId) => {
    const ref =
      index.realistic.get(articleId) ??
      index.optimistic.get(articleId) ??
      index.pessimistic.get(articleId);
    const fact = Number(ref?.fact ?? 0);
    const name = ref?.name ?? '';

    const plans: Record<ScenarioKey, number> = {
      optimistic: Number(index.optimistic.get(articleId)?.plan ?? 0),
      realistic: Number(index.realistic.get(articleId)?.plan ?? 0),
      pessimistic: Number(index.pessimistic.get(articleId)?.plan ?? 0),
    };

    const dev = (plan: number): number | null =>
      fact === 0 ? null : Math.round(((plan - fact) / fact) * 100);
    const deviations: Record<ScenarioKey, number | null> = {
      optimistic: dev(plans.optimistic),
      realistic: dev(plans.realistic),
      pessimistic: dev(plans.pessimistic),
    };

    let closest: ScenarioKey | null = null;
    if (fact !== 0) {
      let best = Infinity;
      SCENARIO_ORDER.forEach((s) => {
        const dist = Math.abs(plans[s] - fact);
        if (dist < best) {
          best = dist;
          closest = s;
        }
      });
    }

    return { articleId, name, fact, plans, deviations, closest };
  });
}
