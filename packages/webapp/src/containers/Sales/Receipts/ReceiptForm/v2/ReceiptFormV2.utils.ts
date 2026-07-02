import intl from 'react-intl-universal';

import {
  computeLineAmount,
  parseNumericInput,
} from '@/components/ui/line-items-editor';
import { ERROR } from '@/constants/errors';
import { formattedAmount } from '@/utils';
import type {
  ReceiptEntryFormValues,
  ReceiptFormValues,
} from './ReceiptForm.zod';

/** Все вычисляемые итоги чека (числа, без форматирования). */
export interface ReceiptTotals {
  subtotal: number;
  discountAmount: number;
  adjustmentAmount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
}

/** Сумма строки чека: количество × цена − скидка % (как в легаси). */
export const getEntryAmount = (entry: Partial<ReceiptEntryFormValues>): number =>
  computeLineAmount(
    entry?.quantity as string | number | undefined,
    entry?.rate as string | number | undefined,
    entry?.discount as string | number | undefined,
  );

/** Подытог: сумма всех строк. */
export const computeReceiptSubtotal = (
  entries: ReadonlyArray<Partial<ReceiptEntryFormValues> | undefined>,
): number =>
  entries.reduce((sum, entry) => sum + (entry ? getEntryAmount(entry) : 0), 0);

/** Скидка на весь чек: фиксированная сумма или процент от подытога. */
export const computeReceiptDiscountAmount = (
  discount: string | number | undefined,
  discountType: string | undefined,
  subtotal: number,
): number => {
  const value = parseNumericInput(discount);
  return discountType === 'percentage' ? (subtotal * value) / 100 : value;
};

/**
 * Полный расчёт итогов чека (повторяет цепочку легаси-хуков
 * useReceiptSubtotal/useReceiptTotal и др.):
 * итого = подытог − скидка + корректировка. Налогов у чека нет,
 * оплачено — всегда 0 (как в легаси useReceiptPaidAmount).
 */
export const computeReceiptTotals = (
  values: Pick<
    ReceiptFormValues,
    'entries' | 'discount' | 'discount_type' | 'adjustment'
  >,
): ReceiptTotals => {
  const subtotal = computeReceiptSubtotal(values.entries ?? []);
  const discountAmount = computeReceiptDiscountAmount(
    values.discount,
    values.discount_type,
    subtotal,
  );
  const adjustmentAmount = parseNumericInput(
    values.adjustment as string | number | undefined,
  );
  const total = subtotal - discountAmount + adjustmentAmount;
  const paidAmount = 0;
  const dueAmount = total - paidAmount;

  return {
    subtotal,
    discountAmount,
    adjustmentAmount,
    total,
    paidAmount,
    dueAmount,
  };
};

/** Формат денег для итогов (легаси formattedAmount — 3 аргумента). */
export const formatReceiptAmount = (
  amount: number,
  currencyCode: string | undefined,
): string => formattedAmount(amount, currencyCode ?? '', undefined);

/** Число или '' (пустые значения не превращаем в 0 — как слал легаси). */
const toNumberOrEmpty = (value: unknown): number | '' =>
  value === '' || value == null ? '' : parseNumericInput(value as string);

/** Строка для инпута или '' (числа из режима редактирования → строки). */
const toInputString = (value: unknown): string =>
  value == null || value === '' ? '' : String(value);

/** Нормализация строк-позиций к строкам-значениям инпутов (init формы). */
export const normalizeEntriesToForm = (
  entries: ReadonlyArray<Record<string, unknown>>,
): ReceiptEntryFormValues[] =>
  entries.map(
    (entry): ReceiptEntryFormValues => ({
      ...(entry as unknown as ReceiptEntryFormValues),
      item_id: toInputString(entry.item_id),
      quantity: toInputString(entry.quantity),
      rate: toInputString(entry.rate),
      discount: toInputString(entry.discount),
      description: toInputString(entry.description),
    }),
  );

/**
 * Нормализация значений формы перед transformFormValuesToRequest:
 * идентификаторы и числа строк — числа (как отправлял легаси-редактор).
 */
export const normalizeValuesToRequest = (
  values: ReceiptFormValues,
): ReceiptFormValues => ({
  ...values,
  customer_id: toNumberOrEmpty(values.customer_id) || '',
  deposit_account_id: toNumberOrEmpty(values.deposit_account_id) || '',
  entries: (values.entries ?? []).map((entry) => ({
    ...entry,
    item_id: toNumberOrEmpty(entry.item_id),
    quantity: toNumberOrEmpty(entry.quantity),
    rate: toNumberOrEmpty(entry.rate),
    discount: toNumberOrEmpty(entry.discount),
  })) as ReceiptEntryFormValues[],
});

/**
 * Раскладка серверных ошибок (повторяет легаси handleErrors):
 * обе известные ошибки — на поле номера чека.
 */
export const applyReceiptServerErrors = (
  errors: Array<{ type: string }>,
  setReceiptNumberError: (message: string) => void,
): void => {
  if (errors.some((e) => e.type === ERROR.SALE_RECEIPT_NUMBER_NOT_UNIQUE)) {
    setReceiptNumberError(intl.get('sale_receipt_number_not_unique'));
  }
  if (errors.some((e) => e.type === ERROR.SALE_RECEIPT_NO_IS_REQUIRED)) {
    setReceiptNumberError(
      intl.get('receipt.field.error.receipt_number_required'),
    );
  }
};
