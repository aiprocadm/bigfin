// © 2026 Bigfin
import {
  documentTotalSql,
  dueAmountSql,
  fullyPaidSql,
  hasDueSql,
  partiallyPaidSql,
  PaymentAmountColumns,
  unpaidSql,
} from './paymentStatusSql';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';

const INVOICE_COLUMNS: PaymentAmountColumns = {
  subtotalColumn: 'BALANCE',
  settledColumns: ['PAYMENT_AMOUNT', 'WRITTENOFF_AMOUNT', 'CREDITED_AMOUNT'],
};
const BILL_COLUMNS: PaymentAmountColumns = {
  subtotalColumn: 'AMOUNT',
  settledColumns: ['PAYMENT_AMOUNT', 'CREDITED_AMOUNT'],
};

/**
 * Мини-переводчик SQL → JS, только для тех конструкций, которые порождает
 * `paymentStatusSql` (COALESCE, CASE WHEN, GREATEST, арифметика, сравнения).
 *
 * Нужен ровно для одного: проверить, что формула фильтра в списке и формула
 * карточки дают ОДИН И ТОТ ЖЕ ответ. Настоящий прогон против MySQL делается
 * живьём на стенде — здесь закрепляется смысл, а не диалект.
 */
function evaluateSql(sql: string, row: Record<string, unknown>): any {
  let expression = sql;

  // Длинные имена колонок подставляем первыми: AMOUNT — часть PAYMENT_AMOUNT.
  const names = Object.keys(row).sort((a, b) => b.length - a.length);
  names.forEach((name) => {
    const value = row[name];
    const literal =
      value === null || value === undefined
        ? 'null'
        : typeof value === 'string'
          ? `'${value}'`
          : String(value);
    expression = expression.replace(new RegExp(`\\b${name}\\b`, 'g'), literal);
  });

  expression = expression
    .replace(/COALESCE\(([^()]*), 0\)/g, '(($1) ?? 0)')
    .replace(/CASE WHEN (.+?) THEN (.+?) ELSE (.+?) END/g, '(($1) ? ($2) : ($3))')
    .replace(/GREATEST\((.+), 0\)/g, 'Math.max($1, 0)')
    .replace(/ = /g, ' == ')
    .replace(/ AND /g, ' && ');

  // eslint-disable-next-line no-new-func
  return new Function(`return ${expression};`)();
}

/** Как ответил бы фильтр в списке. */
const listVerdict = (columns: PaymentAmountColumns, row: any) => ({
  total: evaluateSql(documentTotalSql(columns), row),
  due: evaluateSql(dueAmountSql(columns), row),
  fullyPaid: evaluateSql(fullyPaidSql(columns), row),
  partiallyPaid: evaluateSql(partiallyPaidSql(columns), row),
  unpaid: evaluateSql(unpaidSql(columns), row),
  hasDue: evaluateSql(hasDueSql(columns), row),
});

/** Как отвечает карточка документа — по геттерам модели. */
const cardVerdict = (document: SaleInvoice | Bill) => ({
  total: document.total,
  due: document.dueAmount,
  fullyPaid: document.isFullyPaid,
  partiallyPaid: document.isPartiallyPaid,
  unpaid: !document.isFullyPaid && !document.isPartiallyPaid,
  hasDue: document.dueAmount > 0,
});

describe('paymentStatusSql — список отвечает так же, как карточка', () => {
  describe('счёт покупателю', () => {
    const check = (label: string, row: any) => {
      it(label, () => {
        const invoice = SaleInvoice.fromJson({
          balance: row.BALANCE,
          discount: row.DISCOUNT,
          discountType: row.DISCOUNT_TYPE,
          adjustment: row.ADJUSTMENT,
          taxAmountWithheld: row.TAX_AMOUNT_WITHHELD,
          isInclusiveTax: Boolean(row.IS_INCLUSIVE_TAX),
          paymentAmount: row.PAYMENT_AMOUNT,
          writtenoffAmount: row.WRITTENOFF_AMOUNT,
          creditedAmount: row.CREDITED_AMOUNT,
        });
        expect(listVerdict(INVOICE_COLUMNS, row)).toEqual(cardVerdict(invoice));
      });
    };

    const base = {
      BALANCE: 100000,
      DISCOUNT: 0,
      DISCOUNT_TYPE: 'amount',
      ADJUSTMENT: 0,
      TAX_AMOUNT_WITHHELD: 0,
      IS_INCLUSIVE_TAX: 0,
      PAYMENT_AMOUNT: 0,
      WRITTENOFF_AMOUNT: 0,
      CREDITED_AMOUNT: 0,
    };

    check('ничего не оплачено', base);
    check('оплачен полностью, без налога', { ...base, PAYMENT_AMOUNT: 100000 });
    // Тот самый дефект: раньше оплата подытога считалась полной оплатой.
    check('НДС сверху, оплачен только подытог — это долг', {
      ...base,
      TAX_AMOUNT_WITHHELD: 20000,
      PAYMENT_AMOUNT: 100000,
    });
    check('НДС сверху, оплачен весь итог', {
      ...base,
      TAX_AMOUNT_WITHHELD: 20000,
      PAYMENT_AMOUNT: 120000,
    });
    check('НДС в цене — к итогу не прибавляется', {
      ...base,
      TAX_AMOUNT_WITHHELD: 20000,
      IS_INCLUSIVE_TAX: 1,
      PAYMENT_AMOUNT: 100000,
    });
    check('скидка процентом: оплачен итог со скидкой', {
      ...base,
      DISCOUNT: 10,
      DISCOUNT_TYPE: 'percentage',
      PAYMENT_AMOUNT: 90000,
    });
    check('скидка суммой', {
      ...base,
      DISCOUNT: 15000,
      DISCOUNT_TYPE: 'amount',
      PAYMENT_AMOUNT: 85000,
    });
    check('корректировка увеличивает итог', {
      ...base,
      ADJUSTMENT: 500,
      PAYMENT_AMOUNT: 100000,
    });
    check('списание закрывает остаток', {
      ...base,
      PAYMENT_AMOUNT: 40000,
      WRITTENOFF_AMOUNT: 60000,
    });
    check('зачёт кредит-нотой закрывает счёт целиком', {
      ...base,
      CREDITED_AMOUNT: 100000,
    });
    check('переплата считается полной оплатой', {
      ...base,
      PAYMENT_AMOUNT: 150000,
    });
    check('частичная оплата', { ...base, PAYMENT_AMOUNT: 30000 });
    check('пустые суммы из базы не ломают формулу', {
      ...base,
      DISCOUNT: null,
      ADJUSTMENT: null,
      TAX_AMOUNT_WITHHELD: null,
      WRITTENOFF_AMOUNT: null,
      CREDITED_AMOUNT: null,
    });
  });

  describe('счёт поставщика', () => {
    const check = (label: string, row: any) => {
      it(label, () => {
        const bill = Bill.fromJson({
          amount: row.AMOUNT,
          discount: row.DISCOUNT,
          discountType: row.DISCOUNT_TYPE,
          adjustment: row.ADJUSTMENT,
          taxAmountWithheld: row.TAX_AMOUNT_WITHHELD,
          isInclusiveTax: Boolean(row.IS_INCLUSIVE_TAX),
          paymentAmount: row.PAYMENT_AMOUNT,
          creditedAmount: row.CREDITED_AMOUNT,
        });
        expect(listVerdict(BILL_COLUMNS, row)).toEqual(cardVerdict(bill));
      });
    };

    const base = {
      AMOUNT: 50000,
      DISCOUNT: 0,
      DISCOUNT_TYPE: 'amount',
      ADJUSTMENT: 0,
      TAX_AMOUNT_WITHHELD: 0,
      IS_INCLUSIVE_TAX: 0,
      PAYMENT_AMOUNT: 0,
      CREDITED_AMOUNT: 0,
    };

    check('ничего не оплачено', base);
    check('НДС сверху, оплачен только подытог — это долг', {
      ...base,
      TAX_AMOUNT_WITHHELD: 10000,
      PAYMENT_AMOUNT: 50000,
    });
    check('НДС сверху, оплачен весь итог', {
      ...base,
      TAX_AMOUNT_WITHHELD: 10000,
      PAYMENT_AMOUNT: 60000,
    });
    check('возврат поставщика закрывает счёт', {
      ...base,
      CREDITED_AMOUNT: 50000,
    });
    check('скидка процентом', {
      ...base,
      DISCOUNT: 20,
      DISCOUNT_TYPE: 'percentage',
      PAYMENT_AMOUNT: 40000,
    });
  });
});
