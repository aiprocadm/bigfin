// © 2026 Bigfin
import { DayBalance, ForecastLine } from '../PaymentCalendar.interfaces';
import { computeRunningBalance } from './computeRunningBalance';

/**
 * «Что можно перенести» (FT-051 ТЗ-3): сценарий против кассового разрыва.
 *
 * В карточке разрыва — плановые выплаты до даты разрыва, крупные первыми.
 * Для каждой — НОВАЯ ДАТА, начиная с которой разрыва не будет вовсе, если
 * перенести туда этот платёж. Считается без сохранения: «Перенести» меняет
 * дату плана отдельным действием.
 *
 * Логика без базы — её держат тесты.
 */

export interface GapCandidate {
  plannedOperationId: number;
  date: string;
  amount: number;
  label: string;
  /** Самая ранняя дата без разрыва; null — перенос этого платежа не спасает. */
  suggestedDate: string | null;
}

export interface PlannedMove {
  plannedOperationId: number;
  /** Куда перенести; дата за горизонтом — платёж уходит из прогноза. */
  date: string;
}

type Day = Pick<DayBalance, 'date' | 'inflow' | 'outflow'> & { lines?: Array<{ date?: string } & ForecastLine> };

/**
 * Прогноз после переноса: выплаты перенесённых планов снимаются со своего
 * дня и ставятся на новый. Перенос за горизонт убирает платёж из прогноза —
 * так человек видит, что будет, если заплатить позже, чем видно.
 */
export function simulateMoves(openingBalance: number, days: Day[], moves: PlannedMove[]) {
  const target = new Map(moves.map((move) => [move.plannedOperationId, move.date]));
  const flows = days.map((day) => ({ date: day.date, inflow: day.inflow, outflow: day.outflow }));
  const byDate = new Map(flows.map((flow, index) => [flow.date, index]));
  days.forEach((day, index) => {
    for (const line of day.lines ?? []) {
      const moveTo = line.plannedOperationId ? target.get(line.plannedOperationId) : undefined;
      if (!moveTo || moveTo === day.date || line.source === 'recurring') continue;
      const signed = line.direction === 'inflow' ? 'inflow' : 'outflow';
      flows[index][signed] -= line.amount;
      const destination = byDate.get(moveTo);
      if (destination !== undefined) flows[destination][signed] += line.amount;
    }
  });
  return computeRunningBalance(openingBalance, flows);
}

export function gapScenarios(openingBalance: number, days: Day[]): {
  gapDate: string | null;
  candidates: GapCandidate[];
} {
  const base = computeRunningBalance(
    openingBalance,
    days.map((day) => ({ date: day.date, inflow: day.inflow, outflow: day.outflow })),
  );
  const gap = base.gaps[0];
  if (!gap) return { gapDate: null, candidates: [] };

  // Разовые выплаты по плану до даты разрыва. Повторяющиеся не предлагаются:
  // перенос одного повтора — это правка графика, а не переносимый платёж.
  const lines = days
    .filter((day) => day.date <= gap.from)
    .flatMap((day) =>
      (day.lines ?? [])
        .filter((line) => line.direction === 'outflow' && line.source === 'manual' && line.plannedOperationId)
        .map((line) => ({ ...line, date: day.date })),
    )
    .sort((a, b) => b.amount - a.amount);

  const candidates = lines.map((line) => {
    let suggestedDate: string | null = null;
    for (const day of days) {
      if (day.date <= line.date) continue;
      const result = simulateMoves(openingBalance, days, [
        { plannedOperationId: line.plannedOperationId as number, date: day.date },
      ]);
      if (result.gaps.length === 0) {
        suggestedDate = day.date;
        break;
      }
    }
    return {
      plannedOperationId: line.plannedOperationId as number,
      date: line.date,
      amount: line.amount,
      label: line.label,
      suggestedDate,
    };
  });
  return { gapDate: gap.from, candidates };
}
