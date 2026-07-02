import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { groupBy, keyBy } from 'lodash';

import { AppToaster } from '@/components';
import {
  computeLineAmount,
  parseNumericInput,
} from '@/components/ui/line-items-editor';
import { TaxType } from '@/interfaces/TaxRates';
import { formattedAmount } from '@/utils';
import { ERRORS } from '../utils';
import type { BillEntryFormValues, BillFormValues } from './BillForm.zod';
import type { BillTaxRateLike } from './BillFormV2.types';

/** Налог одной ставки в блоке итогов. */
export interface AggregatedTaxLine {
  taxRateId: string;
  label: string;
  taxAmount: number;
}

/** Все вычисляемые итоги счёта поставщика (числа, без форматирования). */
export interface BillTotals {
  subtotal: number;
  discountAmount: number;
  adjustmentAmount: number;
  taxes: AggregatedTaxLine[];
  totalTax: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
}

/** Сумма строки: количество × цена − скидка % (как в легаси). */
export const getEntryAmount = (entry: Partial<BillEntryFormValues>): number =>
  computeLineAmount(
    entry?.quantity as string | number | undefined,
    entry?.rate as string | number | undefined,
    entry?.discount as string | number | undefined,
  );

/** Подытог: сумма всех строк. */
export const computeBillSubtotal = (
  entries: ReadonlyArray<Partial<BillEntryFormValues> | undefined>,
): number =>
  entries.reduce((sum, entry) => sum + (entry ? getEntryAmount(entry) : 0), 0);

/** Скидка на весь счёт: фиксированная сумма или процент от подытога. */
export const computeBillDiscountAmount = (
  discount: string | number | undefined,
  discountType: string | undefined,
  subtotal: number,
): number => {
  const value = parseNumericInput(discount);
  return discountType === 'percentage' ? (subtotal * value) / 100 : value;
};

/** Налог строки: включён в цену → amount×r/(100+r), сверх цены → amount×r/100. */
export const computeEntryTaxAmount = (
  amount: number,
  taxRate: number,
  isInclusiveTax: boolean,
): number =>
  isInclusiveTax
    ? (amount * taxRate) / (100 + taxRate)
    : (amount * taxRate) / 100;

/** Сгруппированные по ставке налоги всех строк (как aggregateItemEntriesTaxRates). */
export const aggregateBillTaxes = (
  entries: ReadonlyArray<Partial<BillEntryFormValues> | undefined>,
  taxRates: BillTaxRateLike[],
  isInclusiveTax: boolean,
): AggregatedTaxLine[] => {
  const taxRatesById = keyBy(taxRates, 'id');
  const withTax = entries.filter(
    (entry): entry is Partial<BillEntryFormValues> =>
      !!entry && !!entry.tax_rate_id && !!taxRatesById[String(entry.tax_rate_id)],
  );
  const grouped = groupBy(withTax, (entry) => String(entry.tax_rate_id));

  return Object.keys(grouped).map((taxRateId) => {
    const taxRate = taxRatesById[taxRateId];
    const taxAmount = grouped[taxRateId].reduce(
      (sum, entry) =>
        sum +
        computeEntryTaxAmount(getEntryAmount(entry), taxRate.rate, isInclusiveTax),
      0,
    );
    return {
      taxRateId,
      label: `${taxRate.name} [${taxRate.rate}%]`,
      taxAmount,
    };
  });
};

/**
 * Полный расчёт итогов счёта поставщика (повторяет цепочку легаси useBillTotal):
 * итого = (подытог + корректировка) − скидка [+ налог, если сверх цены].
 */
export const computeBillTotals = (
  values: Pick<
    BillFormValues,
    'entries' | 'discount' | 'discount_type' | 'adjustment' | 'inclusive_exclusive_tax'
  >,
  taxRates: BillTaxRateLike[],
  paidAmount: number,
): BillTotals => {
  const isInclusiveTax = values.inclusive_exclusive_tax === TaxType.Inclusive;
  const subtotal = computeBillSubtotal(values.entries ?? []);
  const discountAmount = computeBillDiscountAmount(
    values.discount,
    values.discount_type,
    subtotal,
  );
  const adjustmentAmount = parseNumericInput(
    values.adjustment as string | number | undefined,
  );
  const taxes = aggregateBillTaxes(values.entries ?? [], taxRates, isInclusiveTax);
  const totalTax = taxes.reduce((sum, tax) => sum + tax.taxAmount, 0);
  const total =
    subtotal + adjustmentAmount - discountAmount + (isInclusiveTax ? 0 : totalTax);
  const dueAmount = Math.max(total - paidAmount, 0);

  return {
    subtotal,
    discountAmount,
    adjustmentAmount,
    taxes,
    totalTax,
    total,
    paidAmount,
    dueAmount,
  };
};

/** Формат денег для итогов (легаси formattedAmount — 3 аргумента). */
export const formatBillAmount = (
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
): BillEntryFormValues[] =>
  entries.map(
    (entry): BillEntryFormValues => ({
      ...(entry as unknown as BillEntryFormValues),
      item_id: toInputString(entry.item_id),
      quantity: toInputString(entry.quantity),
      rate: toInputString(entry.rate),
      discount: toInputString(entry.discount),
      description: toInputString(entry.description),
      tax_rate_id: toInputString(entry.tax_rate_id),
    }),
  );

/**
 * Нормализация значений формы перед transformFormValuesToRequest:
 * идентификаторы и числа строк — числа (как отправлял легаси-редактор).
 */
export const normalizeValuesToRequest = (
  values: BillFormValues,
): BillFormValues => ({
  ...values,
  vendor_id: toNumberOrEmpty(values.vendor_id) || '',
  entries: (values.entries ?? []).map((entry) => ({
    ...entry,
    item_id: toNumberOrEmpty(entry.item_id),
    quantity: toNumberOrEmpty(entry.quantity),
    rate: toNumberOrEmpty(entry.rate),
    discount: toNumberOrEmpty(entry.discount),
    tax_rate_id: toNumberOrEmpty(entry.tax_rate_id),
  })) as BillEntryFormValues[],
});

/**
 * Раскладка серверных ошибок (повторяет легаси handleErrors):
 * номер счёта — на поле, остальное — тостами.
 */
export const applyBillServerErrors = (
  errors: Array<{ type: string }>,
  setBillNumberError: (message: string) => void,
): void => {
  if (errors.some((e) => e.type === ERRORS.BILL_NUMBER_EXISTS)) {
    setBillNumberError(intl.get('bill_number_exists'));
  }
  if (
    errors.some(
      (e) => e.type === ERRORS.ENTRIES_ALLOCATED_COST_COULD_NOT_DELETED,
    )
  ) {
    AppToaster.show({
      message: intl.get(
        'bill_form.error.entries_allocated_cost_could_not_deleted',
      ),
      intent: Intent.DANGER,
    });
  }
  if (
    errors.some((e) => e.type === ERRORS.BILL_AMOUNT_SMALLER_THAN_PAID_AMOUNT)
  ) {
    AppToaster.show({
      message: intl.get('bill.total_smaller_than_paid_amount'),
      intent: Intent.DANGER,
    });
  }
};
