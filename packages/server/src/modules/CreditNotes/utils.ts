// `@/interfaces` не существует: каталога с таким индексом в проекте нет,
// а `ICreditNote` не объявлен нигде — импорт был сломан.
import { CreditNotePdfTemplateAttributes } from './types/CreditNotes.types';
import { contactAddressTextFormat } from '@/utils/address-text-format';

/**
 * Кредит-нота, подготовленная к печати.
 *
 * Поля «formatted...» дописывает трансформер во время работы, в DTO ответа их
 * нет. Вид описан ровно тем, что читает эта функция.
 */
export interface ICreditNoteReadyForPrint {
  formattedCreditNoteDate?: string;
  creditNoteNumber?: string;
  formattedAmount?: string;
  formattedSubtotal?: string;

  note?: string;
  termsConditions?: string;

  entries?: Array<{
    item?: { name?: string };
    description?: string;
    rateFormatted?: string;
    quantityFormatted?: string;
    totalFormatted?: string;
  }>;

  customer?: any;
}

/**
 * Аргументы подстановки в тему и тело письма кредит-ноты (Р3б карты v18).
 * Имена переменных — контракт подстановки, как у чека и счёта: их видит
 * пользователь в редакторе письма, менять нельзя.
 */
export const transformCreditNoteToMailDataArgs = (creditNote: any) => {
  return {
    'Customer Name': creditNote.customer?.displayName,
    'Credit Note Number': creditNote.creditNoteNumber,
    'Credit Note Date': creditNote.formattedCreditNoteDate,
    'Credit Note Amount': creditNote.formattedAmount,
  };
};

export const transformCreditNoteToPdfTemplate = (
  creditNote: ICreditNoteReadyForPrint
): Partial<CreditNotePdfTemplateAttributes> => {
  return {
    creditNoteDate: creditNote.formattedCreditNoteDate,
    // Опечатка в имени поля — НЕ ошибка здесь: этим ключом печатная форма
    // читает номер, им же лежат сохранённые настройки шаблонов в базе.
    // Здесь поставщик и шаблон согласованы (в отличие от чека — см.
    // `SaleReceipts/utils.ts`).
    creditNoteNumebr: creditNote.creditNoteNumber,

    total: creditNote.formattedAmount,
    subtotal: creditNote.formattedSubtotal,

    lines: creditNote.entries?.map((entry) => ({
      item: entry.item.name,
      description: entry.description,
      rate: entry.rateFormatted,
      quantity: entry.quantityFormatted,
      total: entry.totalFormatted,
    })),
    customerNote: creditNote.note,
    termsConditions: creditNote.termsConditions,
    customerAddress: contactAddressTextFormat(creditNote.customer),
  };
};
