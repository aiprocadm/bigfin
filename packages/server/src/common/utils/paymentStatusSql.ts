// © 2026 Bigfin
/**
 * Единая формула «сколько по документу осталось заплатить» для SQL.
 *
 * Зачем это нужно. Карточка документа считает долг по геттерам модели:
 * `dueAmount = total − (оплачено + списано + зачтено)`, где `total` — итог
 * документа: подытог **плюс налог** (когда он не в цене), минус скидка, плюс
 * корректировка. А списки сравнивали оплату с колонкой подытога
 * (`BALANCE` у счёта покупателю, `AMOUNT` у счёта поставщика) — без налога,
 * скидки, корректировки и без учёта списаний и зачётов.
 *
 * Из-за этого счёт на 100 000 + НДС 20 % при оплате 100 000 попадал в фильтр
 * «оплачен», хотя в карточке честно висел долг 20 000. Здесь собрана одна
 * формула, чтобы список и карточка отвечали одинаково.
 *
 * Имена колонок берутся без имени таблицы — ровно так же, как это делали
 * прежние выражения в моделях: модификаторы применяются и к запросам с
 * присоединёнными таблицами, а те по своим колонкам с этими не пересекаются.
 */
export interface PaymentAmountColumns {
  /** Колонка подытога документа: BALANCE у счёта покупателю, AMOUNT у счёта поставщика. */
  subtotalColumn: string;
  /** Колонки, которые гасят долг: оплата, списание, зачёт кредит-нот. */
  settledColumns: string[];
}

const num = (column: string) => `COALESCE(${column}, 0)`;

/** Скидка документа: сумма — как есть, процент — от подытога. */
export const discountAmountSql = ({
  subtotalColumn,
}: PaymentAmountColumns): string =>
  `(CASE WHEN DISCOUNT_TYPE = 'amount' THEN ${num('DISCOUNT')} ` +
  `ELSE ${num(subtotalColumn)} * ${num('DISCOUNT')} / 100 END)`;

/** Налог, который прибавляется к итогу (когда он НЕ включён в цену). */
export const addedTaxSql = (): string =>
  `(CASE WHEN IS_INCLUSIVE_TAX = 1 THEN 0 ELSE ${num(
    'TAX_AMOUNT_WITHHELD',
  )} END)`;

/**
 * Итог документа — то же, что геттер `total` модели:
 * подытог + налог (если он сверху) − скидка + корректировка.
 */
export const documentTotalSql = (columns: PaymentAmountColumns): string =>
  `(${num(columns.subtotalColumn)} + ${addedTaxSql()} - ${discountAmountSql(
    columns,
  )} + ${num('ADJUSTMENT')})`;

/** Сколько по документу уже погашено: оплата + списание + зачёт. */
export const settledAmountSql = ({
  settledColumns,
}: PaymentAmountColumns): string =>
  `(${settledColumns.map(num).join(' + ')})`;

/** Остаток к оплате: итог минус погашенное (без ухода в минус — как в карточке). */
export const dueAmountSql = (columns: PaymentAmountColumns): string =>
  `GREATEST(${documentTotalSql(columns)} - ${settledAmountSql(columns)}, 0)`;

// Условия отдаются в скобках: они попадают в `where(raw(...))` рядом с другими
// условиями запроса, и без скобок составное «И» могло бы склеиться не так.

/** Документ полностью погашен (переплата тоже считается погашением). */
export const fullyPaidSql = (columns: PaymentAmountColumns): string =>
  `(${settledAmountSql(columns)} >= ${documentTotalSql(columns)})`;

/** Документ погашен частично: что-то заплачено, но не всё. */
export const partiallyPaidSql = (columns: PaymentAmountColumns): string =>
  `(${settledAmountSql(columns)} > 0 AND ${settledAmountSql(
    columns,
  )} < ${documentTotalSql(columns)})`;

/** По документу не заплачено ничего, и платить есть что. */
export const unpaidSql = (columns: PaymentAmountColumns): string =>
  `(${settledAmountSql(columns)} <= 0 AND ${documentTotalSql(columns)} > 0)`;

/** По документу остался долг (оплачен частично или вовсе не оплачен). */
export const hasDueSql = (columns: PaymentAmountColumns): string =>
  `(${documentTotalSql(columns)} - ${settledAmountSql(columns)} > 0)`;
