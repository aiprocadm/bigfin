import intl from 'react-intl-universal';

import {
  computeLineAmount,
  parseNumericInput,
} from '@/components/ui/line-items-editor';
import { ERROR } from '@/constants/errors';
import { formattedAmount } from '@/utils';
import type {
  EstimateEntryFormValues,
  EstimateFormValues,
} from './EstimateForm.zod';

/** Все вычисляемые итоги сметы (числа, без форматирования). */
export interface EstimateTotals {
  subtotal: number;
  discountAmount: number;
  adjustmentAmount: number;
  total: number;
}

/** Сумма строки сметы: количество × цена − скидка % (как в легаси). */
export const getEntryAmount = (
  entry: Partial<EstimateEntryFormValues>,
): number =>
  computeLineAmount(
    entry?.quantity as string | number | undefined,
    entry?.rate as string | number | undefined,
    entry?.discount as string | number | undefined,
  );

/** Подытог: сумма всех строк. */
export const computeEstimateSubtotal = (
  entries: ReadonlyArray<Partial<EstimateEntryFormValues> | undefined>,
): number =>
  entries.reduce((sum, entry) => sum + (entry ? getEntryAmount(entry) : 0), 0);

/** Скидка на всю смету: фиксированная сумма или процент от подытога. */
export const computeEstimateDiscountAmount = (
  discount: string | number | undefined,
  discountType: string | undefined,
  subtotal: number,
): number => {
  const value = parseNumericInput(discount);
  return discountType === 'percentage' ? (subtotal * value) / 100 : value;
};

/**
 * Полный расчёт итогов сметы (повторяет цепочку легаси useEstimateTotal):
 * итого = (подытог + корректировка) − скидка. Налогов у сметы нет.
 */
export const computeEstimateTotals = (
  values: Pick<
    EstimateFormValues,
    'entries' | 'discount' | 'discount_type' | 'adjustment'
  >,
): EstimateTotals => {
  const subtotal = computeEstimateSubtotal(values.entries ?? []);
  const discountAmount = computeEstimateDiscountAmount(
    values.discount,
    values.discount_type,
    subtotal,
  );
  const adjustmentAmount = parseNumericInput(
    values.adjustment as string | number | undefined,
  );
  const total = subtotal + adjustmentAmount - discountAmount;

  return { subtotal, discountAmount, adjustmentAmount, total };
};

/** Формат денег для итогов (легаси formattedAmount — 3 аргумента). */
export const formatEstimateAmount = (
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
): EstimateEntryFormValues[] =>
  entries.map(
    (entry): EstimateEntryFormValues => ({
      ...(entry as unknown as EstimateEntryFormValues),
      item_id: toInputString(entry.item_id),
      quantity: toInputString(entry.quantity),
      rate: toInputString(entry.rate),
      discount: toInputString(entry.discount),
      description: toInputString(entry.description),
    }),
  );

/**
 * Нормализация значений формы перед transfromsFormValuesToRequest:
 * идентификаторы и числа строк — числа (как отправлял легаси-редактор).
 */
export const normalizeValuesToRequest = (
  values: EstimateFormValues,
): EstimateFormValues => ({
  ...values,
  customer_id: toNumberOrEmpty(values.customer_id) || '',
  entries: (values.entries ?? []).map((entry) => ({
    ...entry,
    item_id: toNumberOrEmpty(entry.item_id),
    quantity: toNumberOrEmpty(entry.quantity),
    rate: toNumberOrEmpty(entry.rate),
    discount: toNumberOrEmpty(entry.discount),
  })) as EstimateEntryFormValues[],
});

/**
 * Раскладка серверных ошибок (повторяет легаси handleErrors):
 * обе известные ошибки — на поле номера сметы.
 */
export const applyEstimateServerErrors = (
  errors: Array<{ type: string }>,
  setEstimateNoError: (message: string) => void,
): void => {
  if (errors.some((e) => e.type === ERROR.ESTIMATE_NUMBER_IS_NOT_UNQIUE)) {
    setEstimateNoError(intl.get('estimate_number_is_not_unqiue'));
  }
  if (errors.some((e) => e.type === ERROR.SALE_ESTIMATE_NO_IS_REQUIRED)) {
    setEstimateNoError(
      intl.get('estimate.field.error.estimate_number_required'),
    );
  }
};
