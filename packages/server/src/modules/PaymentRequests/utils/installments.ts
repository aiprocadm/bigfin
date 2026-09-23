// © 2026 Bigfin
import { HttpStatus } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';

/**
 * Плановые оплаты заявки (FT-053 ТЗ-3): несколько дат, сумм и счетов внутри
 * одной заявки. Логика без базы — её держат тесты.
 */

export interface InstallmentInput {
  dueDate: string;
  amount: number;
  accountId?: number | null;
}

export const INSTALLMENT_ERRORS = {
  NOT_BALANCED: 'PAYMENT_REQUEST_INSTALLMENTS_NOT_BALANCED',
  NON_POSITIVE: 'PAYMENT_REQUEST_INSTALLMENT_NON_POSITIVE',
  DUE_DATE_REQUIRED: 'PAYMENT_REQUEST_DUE_DATE_REQUIRED',
} as const;

const cents = (value: number) => Math.round(Number(value) * 100);

/**
 * Оплаты по порядку дат. Сумма оплат обязана сойтись с суммой заявки до
 * копейки: иначе в календарь ушло бы больше или меньше, чем одобрили.
 */
export function normalizeInstallments(amount: number, installments: InstallmentInput[]) {
  if (installments.some((item) => !(Number(item.amount) > 0))) {
    throw new ServiceError(
      INSTALLMENT_ERRORS.NON_POSITIVE,
      'Сумма каждой оплаты должна быть больше нуля',
      undefined,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
  const total = installments.reduce((sum, item) => sum + cents(item.amount), 0);
  if (total !== cents(amount)) {
    throw new ServiceError(
      INSTALLMENT_ERRORS.NOT_BALANCED,
      'Сумма оплат не сходится с суммой заявки',
      { amount, installmentsTotal: total / 100 },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
  return [...installments]
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))
    .map((item, index) => ({
      dueDate: item.dueDate,
      amount: Number(item.amount),
      accountId: item.accountId ?? null,
      sortOrder: index,
    }));
}

/** Срок заявки: указанный или дата первой оплаты. */
export function requestDueDate(dueDate: string | undefined | null, installments: InstallmentInput[]): string {
  const due = dueDate || [...installments].map((item) => item.dueDate).sort()[0];
  if (!due) {
    throw new ServiceError(
      INSTALLMENT_ERRORS.DUE_DATE_REQUIRED,
      'Укажите срок оплаты или хотя бы одну плановую оплату',
      undefined,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
  return due;
}

/** Итоги по каждой валюте — суммы разных валют не складываются. */
export function totalsByCurrency(requests: Array<{ amount: number; currencyCode?: string | null }>) {
  const totals = new Map<string, { currencyCode: string; amount: number; count: number }>();
  for (const request of requests) {
    const code = request.currencyCode || 'RUB';
    const entry = totals.get(code) ?? { currencyCode: code, amount: 0, count: 0 };
    entry.amount = Math.round((entry.amount + Number(request.amount)) * 1000) / 1000;
    entry.count += 1;
    totals.set(code, entry);
  }
  return [...totals.values()];
}
