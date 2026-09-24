// © 2026 Bigfin

/**
 * Варианты контекста бизнеса (FT-101) — тот же закрытый перечень, что на
 * сервере (`utils/businessContext.ts`). Значение вне перечня сервер молча
 * заменил бы на «не задано», поэтому витрина других и не предлагает.
 */
export const CONTEXT_CHOICES = {
  stage: ['start', 'growth', 'mature'],
  size: ['micro', 'small', 'medium'],
  salesModel: ['b2b', 'b2c', 'mixed'],
} as const;

export type ContextChoiceField = keyof typeof CONTEXT_CHOICES;

/** Ключ перевода варианта: `ai_cfo.context.stage_growth`, `ai_cfo.context.sales_model_b2b`. */
export function contextOptionKey(field: ContextChoiceField, value: string): string {
  const prefix = field === 'salesModel' ? 'sales_model' : field;
  return `ai_cfo.context.${prefix}_${value}`;
}
