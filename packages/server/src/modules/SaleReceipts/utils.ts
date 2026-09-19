// `@/interfaces` не существует, а `ISaleReceipt` не объявлен нигде — импорт
// был сломан. Настоящий вид того, что сюда приходит, описан ниже.
import { ISaleReceiptBrandingTemplateAttributes } from './types/SaleReceipts.types';
import { contactAddressTextFormat } from '@/utils/address-text-format';

/**
 * Чек, подготовленный к печати.
 *
 * Поля «...Formatted» не объявлены в DTO ответа: их дописывает трансформер
 * уже во время работы. Вид описан ровно тем, что читает эта функция.
 */
export interface IReceiptReadyForPrint {
  totalFormatted?: string;
  subtotalFormatted?: string;
  receiptNumber?: string;
  formattedReceiptDate?: string;
  adjustmentFormatted?: string;
  discountAmountFormatted?: string;
  discountPercentageFormatted?: string;

  entries?: Array<{
    item?: { name?: string };
    description?: string;
    rateFormatted?: string;
    quantityFormatted?: string;
    totalFormatted?: string;
  }>;

  customer?: any;
}

export const transformReceiptToBrandingTemplateAttributes = (
  saleReceipt: IReceiptReadyForPrint,
  // Базовый лейбл скидки приходит из шаблона организации (он переведён);
  // раньше хардкод «Discount» затирал перевод в клиентском PDF (Р3 v18).
  { discountLabel = 'Discount' }: { discountLabel?: string } = {}
): Partial<ISaleReceiptBrandingTemplateAttributes> => {
  return {
    total: saleReceipt.totalFormatted,
    subtotal: saleReceipt.subtotalFormatted,
    lines: saleReceipt.entries?.map((entry) => ({
      item: entry.item.name,
      description: entry.description,
      rate: entry.rateFormatted,
      quantity: entry.quantityFormatted,
      total: entry.totalFormatted,
    })),
    // ВНИМАНИЕ, ОПЕЧАТКА НАРОЧНО. Печатная форма читает поле `receiptNumebr`
    // (именно так, с перестановкой букв) — и в общем пакете шаблонов, и на
    // экране настройки чека. Здесь же отдавалось правильное `receiptNumber`,
    // поэтому номер до формы НЕ ДОХОДИЛ ВООБЩЕ: шаблон подставлял свою
    // заглушку «346D3D40-0001», и её видел покупатель на каждом чеке.
    //
    // Переименовать поле в шаблонах нельзя: этим же ключом лежат сохранённые
    // настройки шаблонов в базе (JSON-поле `pdf_templates.attributes`), и
    // переименование осиротило бы их молча. Поэтому чиним сторону, которая
    // ошибалась, а от повторного расхождения ставим сторожа
    // (`receiptNumberReachesTemplate.spec.ts`).
    receiptNumebr: saleReceipt.receiptNumber,
    receiptDate: saleReceipt.formattedReceiptDate,
    adjustment: saleReceipt.adjustmentFormatted,
    discount: saleReceipt.discountAmountFormatted,
    discountLabel: saleReceipt.discountPercentageFormatted
      ? `${discountLabel} [${saleReceipt.discountPercentageFormatted}]`
      : discountLabel,
    customerAddress: contactAddressTextFormat(saleReceipt.customer),
  };
};

export const transformReceiptToMailDataArgs = (saleReceipt: any) => {
  return {
    'Customer Name': saleReceipt.customer.displayName,
    'Receipt Number': saleReceipt.receiptNumber,
    'Receipt Date': saleReceipt.formattedReceiptDate,
    'Receipt Amount': saleReceipt.formattedAmount,
  };
};
