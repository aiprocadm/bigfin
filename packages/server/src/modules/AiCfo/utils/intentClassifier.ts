// © 2026 Bigfin
/**
 * Какой вопрос задал человек (FT-102 ТЗ-3) — БЕЗ модели.
 *
 * Вид вопроса определяет, какие расчёты позвать. Доверить это модели значило
 * бы, что от формулировки зависит, какие числа человек увидит, а модель ещё
 * и может «додумать» вопрос. Поэтому — закрытый список и признаки по словам:
 * предсказуемо, проверяемо, работает и без подключённой модели.
 */
export type AiCfoIntent =
  | 'cash_decrease'
  | 'pnl_vs_cash'
  | 'expense_growth'
  | 'cash_gap'
  | 'overdue_receivables'
  | 'period_diff'
  | 'reschedule'
  | 'ebitda_drop';

export interface IntentDefinition {
  key: AiCfoIntent;
  /** Пример вопроса — показывается человеку как подсказка. */
  example: string;
  /** Признаки: основы слов; вопрос «весит» числом совпавших признаков. */
  signals: RegExp[];
  /** Признаки, без которых вид не подходит вовсе. */
  required?: RegExp[];
}

const has = (pattern: string) => new RegExp(pattern, 'i');

export const INTENTS: IntentDefinition[] = [
  {
    key: 'pnl_vs_cash',
    example: 'Почему прибыль выросла, а денег нет?',
    required: [has('прибыл'), has('денег|деньг|остат')],
    signals: [has('прибыл'), has('денег|деньг'), has('а денег|но денег|а деньги|нет денег')],
  },
  {
    key: 'ebitda_drop',
    example: 'Почему EBITDA снизилась?',
    required: [has('ebitda|ебитда|операционн\\w* прибыл|опер\\. прибыл')],
    signals: [has('ebitda|ебитда'), has('операционн'), has('снизил|упал|меньше|сократил')],
  },
  {
    key: 'cash_gap',
    example: 'Когда возможен кассовый разрыв?',
    required: [has('разрыв|не хватит|нехватк|уйд\\w* в минус|кончатся')],
    signals: [has('разрыв'), has('кассов'), has('когда'), has('не хватит|нехватк')],
  },
  {
    key: 'reschedule',
    example: 'Какие платежи можно перенести?',
    required: [has('перенес|перенос|отложить|сдвинуть')],
    signals: [has('перенес|перенос'), has('платеж|платёж|выплат'), has('можно')],
  },
  {
    key: 'overdue_receivables',
    example: 'Какие клиенты задерживают оплату?',
    required: [has('клиент|покупател|должник|дебитор|задолж|просроч|задерживают')],
    signals: [has('клиент|покупател'), has('задерж|просроч'), has('долг|должн|задолж|дебитор'), has('оплат|платят')],
  },
  {
    key: 'expense_growth',
    example: 'Какие расходы выросли сильнее всего?',
    required: [has('расход|затрат|трат')],
    signals: [has('расход|затрат|трат'), has('вырос|увелич|больше|сильнее')],
  },
  {
    key: 'cash_decrease',
    example: 'Почему денег стало меньше?',
    required: [has('денег|деньг|остат|на счет|на счёт')],
    signals: [has('денег|деньг|остат'), has('меньше|уменьш|упал|сократил|ушл'), has('почему|куда')],
  },
  {
    key: 'period_diff',
    example: 'Что изменилось относительно прошлого месяца?',
    required: [has('изменил|измени|разниц|сравн|относительно|по сравнению')],
    signals: [has('изменил'), has('прошл|предыдущ'), has('месяц|квартал|период|год')],
  },
];

/**
 * Вид вопроса или null — «не понял». Порядок в списке важен: более узкие
 * виды («прибыль, а денег нет») стоят раньше общих («денег меньше»), и при
 * равном весе выигрывает узкий.
 */
export function classifyIntent(question: string): AiCfoIntent | null {
  const text = String(question ?? '').toLowerCase().replace(/ё/g, 'е');
  let best: { key: AiCfoIntent; score: number } | null = null;
  for (const intent of INTENTS) {
    if (intent.required && !intent.required.every((r) => r.test(text))) continue;
    const score = intent.signals.filter((s) => s.test(text)).length;
    if (score > 0 && (!best || score > best.score)) best = { key: intent.key, score };
  }
  return best?.key ?? null;
}
