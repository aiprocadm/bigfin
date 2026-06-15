// © 2026 Bigfin
import { Candidate } from '../utils/selectToFire';

export const overdueDecide = (
  invoices: { id: number; amount: number; dueDate: string }[],
): Candidate[] => {
  if (!invoices.length) return [];
  const total =
    Math.round(invoices.reduce((s, i) => s + Number(i.amount), 0) * 100) / 100;
  return [
    {
      eventType: 'overdue',
      dedupKey: 'overdue',
      title: 'overdue.title',
      body: 'overdue.body',
      payload: { count: invoices.length, total, top: invoices.slice(0, 5) },
    },
  ];
};
