// © 2026 Bigfin
/**
 * Общий маппинг данных счёта-продажи и реквизитов в props российских
 * печатных форм (используется формами «Счёт на оплату» и «Акт»).
 */
import { amountToWordsRu, formatMoneyRu } from './amountToWordsRu';

/** Части реквизитов через запятую, пустые — пропускаются. */
export const joinRequisites = (
  parts: Array<string | undefined | null | false>,
): string => parts.filter(Boolean).join(', ');

/** Количество: целое — без дроби, иначе до 3 знаков в русском формате. */
export const formatQuantity = (quantity: number): string => {
  if (Number.isInteger(quantity)) return String(quantity);
  return String(Math.round(quantity * 1000) / 1000).replace('.', ',');
};

/** «ООО Ромашка, ИНН …, КПП …, адрес» из метаданных организации. */
export const buildSellerLine = (metadata: any): string =>
  joinRequisites([
    metadata?.name,
    metadata?.inn && `ИНН ${metadata.inn}`,
    metadata?.kpp && `КПП ${metadata.kpp}`,
    metadata?.addressTextFormatted,
  ]);

/** «Название, ИНН …, КПП …» из контакта-покупателя. */
export const buildBuyerLine = (customer: any): string =>
  joinRequisites([
    customer?.displayName,
    customer?.inn && `ИНН ${customer.inn}`,
    customer?.kpp && `КПП ${customer.kpp}`,
  ]);

export interface RuFormLine {
  index: number;
  title: string;
  quantity: string;
  unit: string;
  price: string;
  amount: string;
}

/** Позиции документа из entries счёта. */
export const mapEntriesToRuFormLines = (entries: any[]): RuFormLine[] =>
  (entries || []).map((entry: any, index: number) => ({
    index: index + 1,
    title: entry.item?.name ?? entry.description ?? '',
    quantity: formatQuantity(Number(entry.quantity) || 0),
    unit: '',
    price: formatMoneyRu(Number(entry.rate) || 0),
    // total учитывает скидку строки; fallback — кол-во × цена.
    amount: formatMoneyRu(
      Number(
        entry.total ?? (Number(entry.quantity) || 0) * (Number(entry.rate) || 0),
      ) || 0,
    ),
  }));

export interface RuFormTotals {
  subtotal: string;
  vatLabel: string;
  vatAmount?: string;
  total: string;
  totalInWords: string;
}

/** Итоги: суммы, строка НДС и сумма прописью (только для рублей). */
export const buildRuFormTotals = (invoice: any): RuFormTotals => {
  const vatAmount = Number(invoice.taxAmountWithheld) || 0;
  const hasVat = vatAmount > 0;
  const total = Number(invoice.total) || 0;

  return {
    subtotal: formatMoneyRu(Number(invoice.subtotal) || 0),
    vatLabel: hasVat ? 'В том числе НДС' : 'Без налога (НДС)',
    vatAmount: hasVat ? formatMoneyRu(vatAmount) : undefined,
    total: formatMoneyRu(total),
    // Словесная форма жёстко привязана к «рублям/копейкам».
    totalInWords:
      (invoice.currencyCode ?? 'RUB') === 'RUB' ? amountToWordsRu(total) : '',
  };
};
