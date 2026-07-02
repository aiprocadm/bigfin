import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { groupBy, keyBy } from 'lodash';

import { AppToaster } from '@/components';
import {
  computeLineAmount,
  parseNumericInput,
} from '@/components/ui/line-items-editor';
import { ERROR } from '@/constants/errors';
import { TaxType } from '@/interfaces/TaxRates';
import { formattedAmount } from '@/utils';
import type {
  InvoiceEntryFormValues,
  InvoiceFormValues,
} from './InvoiceForm.zod';
import type { InvoiceTaxRateLike } from './InvoiceFormV2.types';

/** Налог одной ставки в блоке итогов. */
export interface AggregatedTaxLine {
  taxRateId: string;
  label: string;
  taxAmount: number;
}

/** Все вычисляемые итоги счёта (числа, без форматирования). */
export interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  adjustmentAmount: number;
  taxes: AggregatedTaxLine[];
  totalTax: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
}

/** Сумма строки счёта: количество × цена − скидка % (как в легаси). */
export const getEntryAmount = (entry: Partial<InvoiceEntryFormValues>): number =>
  computeLineAmount(
    entry?.quantity as string | number | undefined,
    entry?.rate as string | number | undefined,
    entry?.discount as string | number | undefined,
  );

/** Подытог: сумма всех строк. */
export const computeInvoiceSubtotal = (
  entries: ReadonlyArray<Partial<InvoiceEntryFormValues> | undefined>,
): number =>
  entries.reduce((sum, entry) => sum + (entry ? getEntryAmount(entry) : 0), 0);

/** Скидка на весь счёт: фиксированная сумма или процент от подытога. */
export const computeInvoiceDiscountAmount = (
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
export const aggregateInvoiceTaxes = (
  entries: ReadonlyArray<Partial<InvoiceEntryFormValues> | undefined>,
  taxRates: InvoiceTaxRateLike[],
  isInclusiveTax: boolean,
): AggregatedTaxLine[] => {
  const taxRatesById = keyBy(taxRates, 'id');
  const withTax = entries.filter(
    (entry): entry is Partial<InvoiceEntryFormValues> =>
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
 * Полный расчёт итогов счёта (повторяет цепочку легаси useInvoiceTotal):
 * итого = (подытог + корректировка) − скидка [+ налог, если сверх цены].
 */
export const computeInvoiceTotals = (
  values: Pick<
    InvoiceFormValues,
    'entries' | 'discount' | 'discount_type' | 'adjustment' | 'inclusive_exclusive_tax'
  >,
  taxRates: InvoiceTaxRateLike[],
  paidAmount: number,
): InvoiceTotals => {
  const isInclusiveTax = values.inclusive_exclusive_tax === TaxType.Inclusive;
  const subtotal = computeInvoiceSubtotal(values.entries ?? []);
  const discountAmount = computeInvoiceDiscountAmount(
    values.discount,
    values.discount_type,
    subtotal,
  );
  const adjustmentAmount = parseNumericInput(
    values.adjustment as string | number | undefined,
  );
  const taxes = aggregateInvoiceTaxes(
    values.entries ?? [],
    taxRates,
    isInclusiveTax,
  );
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
export const formatInvoiceAmount = (
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
): InvoiceEntryFormValues[] =>
  entries.map(
    (entry): InvoiceEntryFormValues => ({
      ...(entry as unknown as InvoiceEntryFormValues),
      item_id: toInputString(entry.item_id),
      quantity: toInputString(entry.quantity),
      rate: toInputString(entry.rate),
      discount: toInputString(entry.discount),
      description: toInputString(entry.description),
      tax_rate_id: toInputString(entry.tax_rate_id),
    }),
  );

/**
 * Нормализация значений формы перед transformValueToRequest:
 * идентификаторы и числа строк — числа (как отправлял легаси-редактор).
 */
export const normalizeValuesToRequest = (
  values: InvoiceFormValues,
): InvoiceFormValues => ({
  ...values,
  customer_id: toNumberOrEmpty(values.customer_id) || '',
  entries: (values.entries ?? []).map((entry) => ({
    ...entry,
    item_id: toNumberOrEmpty(entry.item_id),
    quantity: toNumberOrEmpty(entry.quantity),
    rate: toNumberOrEmpty(entry.rate),
    discount: toNumberOrEmpty(entry.discount),
    tax_rate_id: toNumberOrEmpty(entry.tax_rate_id),
  })) as InvoiceEntryFormValues[],
});

/**
 * Раскладка серверных ошибок (повторяет легаси transformErrors):
 * номер счёта — на поле, остальное — тостами.
 */
export const applyInvoiceServerErrors = (
  errors: Array<{ type: string }>,
  setInvoiceNoError: (message: string) => void,
): void => {
  if (errors.some((e) => e.type === ERROR.SALE_INVOICE_NUMBER_IS_EXISTS)) {
    setInvoiceNoError(intl.get('sale_invoice_number_is_exists'));
  }
  if (
    errors.some(
      (e) => e.type === ERROR.SALE_ESTIMATE_IS_ALREADY_CONVERTED_TO_INVOICE,
    )
  ) {
    AppToaster.show({
      message: intl.get('sale_estimate_is_already_converted_to_invoice'),
      intent: Intent.DANGER,
    });
  }
  if (
    errors.some(
      (e) => e.type === ERROR.INVOICE_AMOUNT_SMALLER_THAN_PAYMENT_AMOUNT,
    )
  ) {
    AppToaster.show({
      message: intl.get('sale_invoice.total_smaller_than_paid_amount'),
      intent: Intent.DANGER,
    });
  }
  if (errors.some((e) => e.type === ERROR.SALE_INVOICE_NO_IS_REQUIRED)) {
    setInvoiceNoError(intl.get('invoice.field.error.invoice_no_required'));
  }
};
