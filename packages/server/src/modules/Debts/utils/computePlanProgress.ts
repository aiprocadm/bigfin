// © 2026 Bigfin
import { PlanProgress } from '../Debts.interfaces';

type Installment = { amount: number; status: string; dueDate: string };
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Прогресс плана погашения по списку платежей.
 * @param asDate дата отсчёта (YYYY-MM-DD) для «просрочки» и «следующего платежа».
 */
export function computePlanProgress(
  installments: Installment[],
  asDate: string,
): PlanProgress {
  const plannedTotal = round3(
    installments.reduce((s, i) => s + Number(i.amount), 0),
  );
  const paidTotal = round3(
    installments
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + Number(i.amount), 0),
  );
  const remaining = round3(plannedTotal - paidTotal);
  const percentPaid =
    plannedTotal > 0 ? round3((paidTotal / plannedTotal) * 100) : 0;

  const pending = installments
    .filter((i) => i.status !== 'paid')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const nextDueDate = pending.length ? pending[0].dueDate : null;
  const isOverdue = pending.some((i) => i.dueDate < asDate);

  return {
    plannedTotal,
    paidTotal,
    remaining,
    percentPaid,
    nextDueDate,
    isOverdue,
  };
}
