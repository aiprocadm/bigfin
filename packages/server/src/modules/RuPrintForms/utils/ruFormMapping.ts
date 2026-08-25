// © 2026 Bigfin
/**
 * Общий маппинг данных счёта-продажи и реквизитов в props российских
 * печатных форм (счёт на оплату, акт, УПД, ТОРГ-12, счёт-фактура).
 */
import { amountToWordsRu, formatMoneyRu } from './amountToWordsRu';

/** Прочерк в незаполняемом реквизите унифицированного бланка. */
export const DASH = '—';

/** «Х» в ячейках итоговой строки, которые по форме не заполняются. */
export const CROSS = 'Х';

/** Подпись ставки/суммы налога для позиций без НДС. */
export const NO_VAT = 'Без НДС';

/** Части реквизитов через запятую, пустые — пропускаются. */
export const joinRequisites = (
  parts: Array<string | undefined | null | false>,
): string => parts.filter(Boolean).join(', ');

/** Количество: целое — без дроби, иначе до 3 знаков в русском формате. */
export const formatQuantity = (quantity: number): string => {
  if (Number.isInteger(quantity)) return String(quantity);
  return String(Math.round(quantity * 1000) / 1000).replace('.', ',');
};

/**
 * «ООО Ромашка, ИНН …, КПП …, адрес» из метаданных организации.
 *
 * Адрес берём через `buildOrganizationAddress`: сырой
 * `addressTextFormatted` — это РАЗМЕТКА (`<strong>…</strong><br />…`), и в
 * бланке она показывалась как есть, экранированная: «Организация:
 * Демо-организация, &lt;strong&gt;Демо-организация&lt;/strong&gt;…».
 * Нашлось живой пробой акта сверки на стенде; касается всех форм РФ.
 */
export const buildSellerLine = (metadata: any): string =>
  joinRequisites([
    metadata?.name,
    metadata?.inn && `ИНН ${metadata.inn}`,
    metadata?.kpp && `КПП ${metadata.kpp}`,
    buildOrganizationAddress(metadata),
  ]);

/**
 * Подписанты печатных форм из метаданных организации. Поля необязательны:
 * пустое ФИО оставляет линию подписи пустой, как в бланке без подписантов.
 */
export const buildSignerProps = (metadata: any) => ({
  signerDirectorName: metadata?.signerDirectorName ?? '',
  signerDirectorPosition: metadata?.signerDirectorPosition ?? '',
  signerAccountantName: metadata?.signerAccountantName ?? '',
});

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

/** Однострочный почтовый адрес контакта из billing-полей. */
export const buildContactAddress = (customer: any): string =>
  joinRequisites([
    customer?.billingAddressPostcode,
    customer?.billingAddressCountry,
    customer?.billingAddressState,
    customer?.billingAddressCity,
    customer?.billingAddress1,
    customer?.billingAddress2,
  ]);

export interface RuFormTotals {
  subtotal: string;
  vatLabel: string;
  vatAmount?: string;
  total: string;
  totalInWords: string;
}

/**
 * HTML → плоский текст: `addressTextFormatted` организации возвращает
 * разметку (`<strong>Название</strong><br />…`), а в бланки нужен текст.
 */
export const stripHtmlToText = (html: string): string =>
  String(html ?? '')
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s*,\s*/g, ', ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();

/**
 * Адрес организации одной строкой, без названия. Берём структурные поля
 * `metadata.address`; если они пусты — вытаскиваем текст из
 * `addressTextFormatted` и отрезаем название организации в начале.
 */
export const buildOrganizationAddress = (metadata: any): string => {
  const address = metadata?.address;
  const structured = joinRequisites([
    address?.postalCode,
    address?.stateProvince,
    address?.city,
    address?.address1,
    address?.address2,
  ]);
  if (structured) return structured;

  const text = stripHtmlToText(metadata?.addressTextFormatted ?? '');
  const name = metadata?.name ?? '';
  return name && text.startsWith(name)
    ? text.slice(name.length).replace(/^[,\s]+/, '')
    : text;
};

/** Адрес доставки контакта; если не заполнен — платёжный. */
export const buildContactShippingAddress = (customer: any): string =>
  joinRequisites([
    customer?.shippingAddressPostcode,
    customer?.shippingAddressCountry,
    customer?.shippingAddressState,
    customer?.shippingAddressCity,
    customer?.shippingAddress1,
    customer?.shippingAddress2,
  ]) || buildContactAddress(customer);

/** «ИНН / КПП»; у ИП КПП нет — печатаем только ИНН, без слэша. */
export const formatInnKpp = (inn?: string, kpp?: string): string => {
  const innValue = (inn ?? '').trim();
  const kppValue = (kpp ?? '').trim();

  if (!innValue) return kppValue;
  if (!kppValue) return innValue;
  return `${innValue} / ${kppValue}`;
};

/** Признак ИП: ИНН физлица состоит из 12 цифр (у организаций — 10). */
export const isSoleProprietorInn = (inn?: string): boolean =>
  /^\d{12}$/.test((inn ?? '').trim());

/**
 * Есть ли среди позиций хоть один товар (не услуга) — от этого зависит,
 * заполнять ли грузоотправителя и грузополучателя в счёте-фактуре.
 */
export const hasGoodsEntries = (entries: any[]): boolean =>
  (entries || []).some(
    // Требуем положительного признака товара: у строки без справочной
    // позиции вид неизвестен, и заявлять отгрузку по ней нельзя.
    (entry: any) => !!entry?.item?.type && entry.item.type !== 'service',
  );

/** Полные реквизиты организации одной строкой (шапка ТОРГ-12). */
export const buildOrgRequisitesLine = (metadata: any): string =>
  joinRequisites([
    metadata?.name,
    metadata?.inn && `ИНН ${metadata.inn}`,
    metadata?.kpp && `КПП ${metadata.kpp}`,
    buildOrganizationAddress(metadata),
    metadata?.bankName && `банк ${metadata.bankName}`,
    metadata?.bankAccount && `р/с ${metadata.bankAccount}`,
    metadata?.bankBik && `БИК ${metadata.bankBik}`,
    metadata?.bankCorrespondentAccount &&
      `к/с ${metadata.bankCorrespondentAccount}`,
  ]);

/** Полные реквизиты контрагента одной строкой; адрес передаётся готовым. */
export const buildContactRequisitesLine = (
  customer: any,
  address: string,
): string =>
  joinRequisites([
    customer?.displayName,
    customer?.inn && `ИНН ${customer.inn}`,
    customer?.kpp && `КПП ${customer.kpp}`,
    address,
    customer?.bankName && `банк ${customer.bankName}`,
    customer?.bankAccount && `р/с ${customer.bankAccount}`,
    customer?.bankBik && `БИК ${customer.bankBik}`,
    customer?.bankCorrespondentAccount &&
      `к/с ${customer.bankCorrespondentAccount}`,
  ]);

export interface RuVatLine {
  index: number;
  title: string;
  /** Код товара из справочника (графа «код» ТОРГ-12). */
  code: string;
  quantity: number;
  quantityText: string;
  /** Цена за единицу без НДС. */
  priceExclVatText: string;
  amountExclVat: number;
  amountExclVatText: string;
  /** «20%» либо «Без НДС». */
  vatRateText: string;
  vatAmount: number;
  /** «600,00» либо «Без НДС». */
  vatAmountText: string;
  amountInclVat: number;
  amountInclVatText: string;
}

export interface RuVatMapped {
  lines: RuVatLine[];
  totalQuantity: number;
  totalQuantityText: string;
  totalExclVat: number;
  totalExclVatText: string;
  totalVat: number;
  /** «Без НДС», если налога нет ни в одной позиции. */
  totalVatText: string;
  totalInclVat: number;
  totalInclVatText: string;
  hasAnyVat: boolean;
}

/**
 * Ставка НДС позиции: число процентов либо null, если ставка к позиции
 * не привязана вовсе.
 *
 * Ставку нельзя определять по сумме налога: «НДС 0%» (экспорт, статья 164
 * НК — право на вычет есть) и «Без НДС» (освобождение, вычета нет) дают
 * одинаковый нулевой налог, но это юридически разные вещи, и продукт
 * заводит их отдельными ставками (VAT_0 и VAT_NONE).
 */
export const resolveVatRate = (entry: any): number | null => {
  const hasLinkedRate =
    entry?.taxRateId != null || entry?.tax != null || entry?.taxRate != null;
  if (!hasLinkedRate) return null;

  const rate = Number(entry.taxRate);
  return Number.isFinite(rate) ? rate : null;
};

interface RuVatLineAmounts {
  index: number;
  title: string;
  code: string;
  quantity: number;
  vatRate: number | null;
  amountExclVat: number;
  vatAmount: number;
  amountInclVat: number;
}

/** Суммы позиции с учётом скидки строки. */
const computeLineAmounts = (entries: any[]): RuVatLineAmounts[] =>
  (entries || []).map((entry: any, index: number) => {
    const quantity = Number(entry.quantity) || 0;
    const amount = quantity * (Number(entry.rate) || 0);
    const vatAmount = Number(entry.taxAmount) || 0;

    // `total` и `totalExcludingTax` модели учитывают скидку строки,
    // а `subtotal*` — нет. В документ идёт то, что реально к оплате.
    const grossBeforeDiscount =
      Number(entry.subtotalInclusingTax ?? amount + vatAmount) || 0;
    const discountAmount = Number(entry.discountAmount) || 0;
    const amountInclVat =
      Number(entry.total ?? grossBeforeDiscount - discountAmount) || 0;

    return {
      index: index + 1,
      title: entry.item?.name ?? entry.description ?? '',
      code: entry.item?.code ?? '',
      quantity,
      vatRate: resolveVatRate(entry),
      amountExclVat: amountInclVat - vatAmount,
      vatAmount,
      amountInclVat,
    };
  });

/** Округление до копеек — чтобы суммы не расходились на дробные доли. */
const roundKopecks = (amount: number): number => Math.round(amount * 100) / 100;

/**
 * Разносит скидку и корректировку всего документа по позициям
 * пропорционально их стоимости. Без этого «Всего к оплате» в форме
 * разойдётся с суммой, которую покупатель реально должен заплатить.
 * Остаток от округления добавляется к последней позиции, поэтому
 * сумма строк точно равна итогу счёта.
 */
const reconcileWithInvoiceTotal = (
  lines: RuVatLineAmounts[],
  invoice: any,
): RuVatLineAmounts[] => {
  const invoiceTotal = Number(invoice?.total);
  if (!lines.length || !Number.isFinite(invoiceTotal)) return lines;

  const linesTotal = lines.reduce((sum, line) => sum + line.amountInclVat, 0);
  if (!linesTotal || roundKopecks(linesTotal) === roundKopecks(invoiceTotal)) {
    return lines;
  }
  const ratio = invoiceTotal / linesTotal;

  const scaled = lines.map((line) => {
    const amountInclVat = roundKopecks(line.amountInclVat * ratio);
    const vatAmount = roundKopecks(line.vatAmount * ratio);
    return { ...line, amountInclVat, vatAmount, amountExclVat: amountInclVat - vatAmount };
  });

  // Расхождение от округления добавляем к последней позиции.
  const scaledTotal = scaled.reduce((sum, line) => sum + line.amountInclVat, 0);
  const remainder = roundKopecks(invoiceTotal - scaledTotal);
  if (remainder) {
    const last = scaled[scaled.length - 1];
    last.amountInclVat = roundKopecks(last.amountInclVat + remainder);
    last.amountExclVat = roundKopecks(last.amountInclVat - last.vatAmount);
  }
  return scaled;
};

/** Форматирование посчитанных сумм в строки формы. */
const formatVatLines = (lines: RuVatLineAmounts[]): RuVatMapped => {
  const formatted = lines.map((line) => ({
    index: line.index,
    title: line.title,
    code: line.code,
    quantity: line.quantity,
    quantityText: formatQuantity(line.quantity),
    priceExclVatText: formatMoneyRu(
      line.quantity ? line.amountExclVat / line.quantity : 0,
    ),
    amountExclVat: line.amountExclVat,
    amountExclVatText: formatMoneyRu(line.amountExclVat),
    vatRateText: line.vatRate === null ? NO_VAT : `${line.vatRate}%`,
    vatAmount: line.vatAmount,
    vatAmountText:
      line.vatRate === null ? NO_VAT : formatMoneyRu(line.vatAmount),
    amountInclVat: line.amountInclVat,
    amountInclVatText: formatMoneyRu(line.amountInclVat),
  }));

  const sum = (pick: (line: RuVatLineAmounts) => number) =>
    roundKopecks(lines.reduce((acc, line) => acc + pick(line), 0));

  const totalQuantity = lines.reduce((acc, line) => acc + line.quantity, 0);
  const totalExclVat = sum((line) => line.amountExclVat);
  const totalVat = sum((line) => line.vatAmount);
  const totalInclVat = sum((line) => line.amountInclVat);
  // «Без НДС» в итоге — только когда ставки нет ни у одной позиции.
  const hasAnyVat = lines.some((line) => line.vatRate !== null);

  return {
    lines: formatted,
    totalQuantity,
    totalQuantityText: formatQuantity(totalQuantity),
    totalExclVat,
    totalExclVatText: formatMoneyRu(totalExclVat),
    totalVat,
    totalVatText: hasAnyVat ? formatMoneyRu(totalVat) : NO_VAT,
    totalInclVat,
    totalInclVatText: formatMoneyRu(totalInclVat),
    hasAnyVat,
  };
};

/**
 * Разбор позиций с НДС для форм, где налог показывается построчно
 * (УПД, ТОРГ-12, счёт-фактура). Цена считается от суммы без НДС,
 * поэтому итоги сходятся по суммам, а не по произведению цены на количество.
 */
export const mapEntriesToRuVatLines = (entries: any[]): RuVatMapped =>
  formatVatLines(computeLineAmounts(entries));

/**
 * То же, но с приведением итога к сумме счёта: учитываются скидка
 * и корректировка всего документа. Формы должны использовать именно это.
 */
export const mapInvoiceToRuVatLines = (invoice: any): RuVatMapped =>
  formatVatLines(
    reconcileWithInvoiceTotal(computeLineAmounts(invoice?.entries || []), invoice),
  );

/**
 * Сумма прописью для печатной формы: только для рублёвых сумм и только
 * для неотрицательных. Отрицательный итог оставляем без расшифровки —
 * лучше пустая строка, чем «Ноль рублей» или падение генерации PDF.
 */
export const buildAmountInWords = (
  amount: number,
  currencyCode?: string,
): string => {
  if ((currencyCode ?? 'RUB') !== 'RUB') return '';
  if (!Number.isFinite(amount) || amount < 0) return '';
  return amountToWordsRu(amount);
};

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
    totalInWords: buildAmountInWords(total, invoice.currencyCode),
  };
};
