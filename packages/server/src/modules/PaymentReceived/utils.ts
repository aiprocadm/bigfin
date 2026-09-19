import {
  PaymentReceivedPdfTemplateAttributes,
} from './types/PaymentReceived.types';
import { contactAddressTextFormat } from '@/utils/address-text-format';

/**
 * Поступление в том виде, в каком оно И ПРАВДА приходит в печатную форму.
 *
 * Сюда попадает не сама запись из базы, а её ПРЕОБРАЗОВАННЫЙ вид: форматы
 * сумм и дат дописывает преобразователь ответа, а покупателя и оплаченные
 * счета подтягивает связями `getPaymentReceive`.
 *
 * Раньше довод был описан как запись из базы — то есть описание врало, и
 * проверка типов не могла сказать ни слова о печатной форме. Это ровно то
 * место, где однажды потерялся номер чека: имена полей расходились, и никто
 * этого не видел, пока покупатель не получил заглушку шаблона.
 */
interface PaymentReceivedForPdf {
  paymentReceiveNo: string;
  formattedAmount: string;
  subtotalFormatted: string;
  formattedPaymentDate: string;
  customer: Record<string, any>;
  entries: Array<{
    invoice: { invoiceNo: string; totalFormatted: string };
    paymentAmountFormatted: string;
  }>;
}

export const transformPaymentReceivedToPdfTemplate = (
  payment: PaymentReceivedForPdf,
): Partial<PaymentReceivedPdfTemplateAttributes> => {
  return {
    total: payment.formattedAmount,
    subtotal: payment.subtotalFormatted,
    paymentReceivedNumebr: payment.paymentReceiveNo,
    paymentReceivedDate: payment.formattedPaymentDate,
    // Имени покупателя отдельным полем здесь НЕТ намеренно: печатная форма
    // его не читает, она показывает блок адреса — а он собирается из тех же
    // реквизитов и уже начинается с названия. Отдельное поле раньше
    // передавалось и молча пропадало.
    lines: payment.entries.map((entry) => ({
      invoiceNumber: entry.invoice.invoiceNo,
      invoiceAmount: entry.invoice.totalFormatted,
      paidAmount: entry.paymentAmountFormatted,
    })),
    customerAddress: contactAddressTextFormat(payment.customer as any),
  };
};

export const transformPaymentReceivedToMailDataArgs = (payment: any) => {
  return {
    'Customer Name': payment.customer.displayName,
    'Payment Number': payment.paymentReceiveNo,
    'Payment Date': payment.formattedPaymentDate,
    'Payment Amount': payment.formattedAmount,
  };
};
