// © 2026 Bigfin

/**
 * Прогресс сделки по деньгам и по исполнению (FIN-024 ТЗ-2, формула 11.9).
 *
 * ЗАЧЕМ. Сделка показывает сумму и прибыль, но не показывает, насколько она
 * закрыта. «Деньги пришли, работа не сделана» и «работа сделана, денег нет» —
 * два совершенно разных положения, и оба не видны из суммы.
 *
 * ЧЕГО НЕТ У КОНКУРЕНТА. ПланФакт показывает две колонки процентов и
 * оставляет человека их сравнивать. Здесь при расхождении больше двадцати
 * пунктов рядом появляется пометка словами — прямое указание на риск.
 */

export interface DealAmounts {
  /** Сумма сделки по договору. */
  amount: number;
  /** Поступило денег по сделке. */
  paid: number;
  /** Отгружено или подписано актами. */
  shipped: number;
}

/** Что именно разошлось: работа впереди денег или деньги впереди работы. */
export type DealProgressFlag =
  | 'work_ahead'
  | 'money_ahead'
  | 'overpaid'
  | 'overdelivered';

export interface DealProgress {
  /** Оплачено, % от суммы сделки. `null` — суммы нет, делить не на что. */
  paidRatio: number | null;
  /** Отгружено, % от суммы сделки. `null` — делить не на что. */
  shippedRatio: number | null;
  /** Пометки: расхождение и превышение ста процентов. */
  flags: DealProgressFlag[];
}

/**
 * Потолок доли.
 *
 * Без него опечатка в сумме сделки печатает «1 200 000 %» и ломает вёрстку
 * строки таблицы. Само превышение при этом не скрывается — о нём говорит
 * пометка.
 */
export const MAX_RATIO = 999;

/** С какого расхождения долей это уже риск, а не текущая работа. */
export const DIVERGENCE_POINTS = 20;

/**
 * Считает прогресс сделки.
 *
 * @param {DealAmounts} deal суммы сделки
 * @returns {DealProgress}
 */
export function computeDealProgress(deal: DealAmounts): DealProgress {
  const amount = Number(deal?.amount ?? 0);

  // НУЛЕВАЯ СУММА — «н/о», а не ноль процентов. Ноль здесь означал бы
  // «ничего не оплачено», хотя оплачивать нечего.
  if (!amount) {
    return { paidRatio: null, shippedRatio: null, flags: [] };
  }

  const paidRatio = ratio(Number(deal?.paid ?? 0), amount);
  const shippedRatio = ratio(Number(deal?.shipped ?? 0), amount);

  const flags: DealProgressFlag[] = [];

  // Пометка появляется РОВНО при разнице больше двадцати пунктов: на
  // границе её ещё нет, иначе она загорается у половины обычных сделок и
  // перестаёт что-либо значить.
  const divergence = shippedRatio - paidRatio;
  if (divergence > DIVERGENCE_POINTS) flags.push('work_ahead');
  if (-divergence > DIVERGENCE_POINTS) flags.push('money_ahead');

  if (paidRatio > 100) flags.push('overpaid');
  if (shippedRatio > 100) flags.push('overdelivered');

  return { paidRatio, shippedRatio, flags };
}

/** Доля целым процентом, с потолком. */
function ratio(value: number, amount: number): number {
  const percent = Math.round((value / amount) * 100);

  return Math.min(Math.max(percent, 0), MAX_RATIO);
}
