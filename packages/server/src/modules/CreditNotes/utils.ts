// @ts-nocheck
import { CreditNotePdfTemplateAttributes, ICreditNote } from '@/interfaces';
import { contactAddressTextFormat } from '@/utils/address-text-format';

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
  creditNote: ICreditNote
): Partial<CreditNotePdfTemplateAttributes> => {
  return {
    creditNoteDate: creditNote.formattedCreditNoteDate,
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
