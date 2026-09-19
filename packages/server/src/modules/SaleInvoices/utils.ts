import { pickBy } from 'lodash';
// `@/interfaces` не существует, а `ISaleInvoice` не объявлен нигде — импорт
// был сломан. Настоящий вид того, что сюда приходит, описан ниже.
import { InvoicePdfTemplateAttributes } from './SaleInvoice.types';
import { contactAddressTextFormat } from '@/utils/address-text-format';

/**
 * Счёт, подготовленный к печати.
 *
 * Поля «...Formatted» НЕ объявлены в DTO ответа: их дописывает трансформер
 * (`GetSaleInvoiceMailState.transformer`) уже во время работы. Поэтому вид
 * описан здесь — ровно тем, что эта функция читает. Так видно, что печатной
 * форме нужен именно подготовленный счёт, а не сырая запись из базы: подай
 * сырую, и в PDF встанут пустые строки вместо сумм и дат.
 */
export interface IInvoiceReadyForPrint {
  dueDateFormatted?: string;
  invoiceDateFormatted?: string;
  invoiceNo?: string;

  totalFormatted?: string;
  subtotalFormatted?: string;
  paymentAmountFormatted?: string;
  dueAmountFormatted?: string;

  termsConditions?: string;
  invoiceMessage?: string;

  entries?: Array<{
    item?: { name?: string };
    description?: string;
    rateFormatted?: string;
    quantityFormatted?: string;
    totalFormatted?: string;
  }>;
  // Налоги подгружаются запросом (`withGraphFetched('taxes.taxRate')`), но
  // в DTO ответа не объявлены. Поле необязательное, а обращение ниже —
  // безопасное: падать на печати счёта из-за отсутствующего списка нельзя.
  taxes?: Array<{ name?: string; taxRateAmountFormatted?: string }>;

  discountAmountFormatted?: string;
  discountPercentageFormatted?: string;

  customer?: any;
}

export const mergePdfTemplateWithDefaultAttributes = (
  brandingTemplate?: Record<string, any>,
  defaultAttributes: Record<string, any> = {}
) => {
  const brandingAttributes = pickBy(
    brandingTemplate,
    (val, key) => val !== null && Object.keys(defaultAttributes).includes(key)
  );
  return {
    ...defaultAttributes,
    ...brandingAttributes,
  };
};

export const transformInvoiceToPdfTemplate = (
  invoice: IInvoiceReadyForPrint,
  // Базовый лейбл скидки приходит из шаблона организации (он переведён);
  // раньше хардкод «Discount» затирал перевод в клиентском PDF (Р3 v18).
  { discountLabel = 'Discount' }: { discountLabel?: string } = {}
): Partial<InvoicePdfTemplateAttributes> => {
  return {
    dueDate: invoice.dueDateFormatted,
    dateIssue: invoice.invoiceDateFormatted,
    invoiceNumber: invoice.invoiceNo,

    total: invoice.totalFormatted,
    subtotal: invoice.subtotalFormatted,
    paymentMade: invoice.paymentAmountFormatted,
    dueAmount: invoice.dueAmountFormatted,

    termsConditions: invoice.termsConditions,
    statement: invoice.invoiceMessage,

    lines: (invoice.entries ?? []).map((entry) => ({
      item: entry.item.name,
      description: entry.description,
      rate: entry.rateFormatted,
      quantity: entry.quantityFormatted,
      total: entry.totalFormatted,
    })),
    taxes: (invoice.taxes ?? []).map((tax) => ({
      label: tax.name,
      amount: tax.taxRateAmountFormatted,
    })),
    discount: invoice.discountAmountFormatted,
    discountLabel: invoice.discountPercentageFormatted
      ? `${discountLabel} [${invoice.discountPercentageFormatted}]`
      : discountLabel,
    customerAddress: contactAddressTextFormat(invoice.customer),
  };
};
