// © 2026 Bigfin
import { ICashBasisLeg } from './ProfitLossSheetCashBasis';
import {
  buildDocumentPnlShape,
  recognizeSettledPnlLegs,
  Settlement,
} from './recognizeSettledPnlLegs';

/**
 * Доход и расход «по деньгам» для тех, кто работает по счетам.
 *
 * Проводки оплаты счёта ходят только по балансовым счетам («пришло на
 * счёт» / «уменьшился долг») и выручки не приносят. Поэтому доход счёта,
 * оплаченного позже, признаётся по факту платежа — пропорционально
 * оплаченной доле. Без этого кассовый ОПиУ у тех, кто выставляет счета,
 * показывает почти ноль выручки.
 *
 * ОДНО МЕСТО НА ОБА ОТЧЁТА: бухгалтерский ОПиУ по деньгам и управленческий
 * ОПиУ по деньгам (FT-010 ТЗ-3). Две копии правила однажды разошлись бы,
 * и два отчёта «по деньгам» показали бы разную выручку.
 */
export const SETTLEMENT_SOURCES = [
  {
    paymentReferenceType: 'PaymentReceive',
    documentReferenceType: 'SaleInvoice',
    /** Доход признаётся кредитом счетов выручки. */
    direction: 'credit' as const,
    settlementAccountTypes: ['accounts-receivable'],
    pnlAccountTypes: ['income', 'other-income'],
  },
  {
    paymentReferenceType: 'BillPayment',
    documentReferenceType: 'Bill',
    /** Расход признаётся дебетом счетов расходов. */
    direction: 'debit' as const,
    settlementAccountTypes: ['accounts-payable'],
    pnlAccountTypes: ['expense', 'other-expense', 'cost-of-goods-sold'],
  },
];

export type SettlementSource = (typeof SETTLEMENT_SOURCES)[number];

/** Что нужно из базы — отдельными функциями, чтобы правило проверялось без неё. */
export interface SettlementRecognitionDeps {
  accountTypeById: Map<number, string>;
  /** Разбивка платежей по оплаченным документам. */
  entriesOf: (
    source: SettlementSource,
    paymentIds: number[],
  ) => Promise<Array<{ paymentId: number; documentId: number; amount: number }>>;
  /** Все строки журнала документов — без фильтра по периоду. */
  documentLegsOf: (referenceType: string, ids: number[]) => Promise<any[]>;
}

/**
 * Строки ОПиУ, признающие доход и расход по факту оплаты.
 * @param settledLegs строки документов, коснувшихся денег
 */
export async function recognizeSettlementLegs(
  settledLegs: ICashBasisLeg[],
  deps: SettlementRecognitionDeps,
): Promise<ICashBasisLeg[]> {
  const isOfTypes = (types: string[]) => (accountId: number) =>
    types.includes(deps.accountTypeById.get(accountId) as string);

  const recognized: ICashBasisLeg[] = [];

  for (const source of SETTLEMENT_SOURCES) {
    const payments = settledLegs.filter(
      (leg) => leg.referenceType === source.paymentReferenceType,
    );
    if (!payments.length) continue;

    // Дата платежа берётся из его же строк журнала.
    const paymentDates = new Map<number, any>();
    payments.forEach((leg) => paymentDates.set(leg.referenceId, leg.date));

    const entries = await deps.entriesOf(source, [...paymentDates.keys()]);
    const settlements: Settlement[] = entries.map((entry) => ({
      paymentReferenceType: source.paymentReferenceType,
      paymentReferenceId: entry.paymentId,
      date: paymentDates.get(entry.paymentId),
      documentReferenceType: source.documentReferenceType,
      documentReferenceId: entry.documentId,
      amount: Number(entry.amount) || 0,
    }));
    if (!settlements.length) continue;

    const documentIds = [...new Set(settlements.map((s) => s.documentReferenceId))];
    // Без фильтра по периоду: счёт мог быть выставлен в январе, а оплачен
    // в марте — его строки нужны целиком.
    const documentLegs = await deps.documentLegsOf(
      source.documentReferenceType,
      documentIds,
    );

    const legsByDocument = new Map<number, any[]>();
    documentLegs.forEach((leg) => {
      const list = legsByDocument.get(leg.referenceId) ?? [];
      list.push(leg);
      legsByDocument.set(leg.referenceId, list);
    });

    const shapes = new Map();
    legsByDocument.forEach((legs, documentId) => {
      shapes.set(
        `${source.documentReferenceType}:${documentId}`,
        buildDocumentPnlShape(
          legs,
          isOfTypes(source.settlementAccountTypes),
          isOfTypes(source.pnlAccountTypes),
          source.direction,
        ),
      );
    });
    recognized.push(...recognizeSettledPnlLegs(settlements, shapes));
  }
  return recognized;
}

/** Зависимости из моделей — одинаково для обоих отчётов. */
export function settlementDepsFromModels(models: {
  accounts: Array<{ id: number; accountType: string }>;
  accountTransactionModel: () => any;
  paymentReceivedEntryModel: () => any;
  billPaymentEntryModel: () => any;
}): SettlementRecognitionDeps {
  return {
    accountTypeById: new Map(
      models.accounts.map((account) => [account.id, account.accountType]),
    ),
    entriesOf: async (source, paymentIds) => {
      const isInvoicePayment = source.paymentReferenceType === 'PaymentReceive';
      const entries: any[] = isInvoicePayment
        ? await models.paymentReceivedEntryModel().query().whereIn('paymentReceiveId', paymentIds)
        : await models.billPaymentEntryModel().query().whereIn('billPaymentId', paymentIds);
      return entries.map((entry) => ({
        paymentId: isInvoicePayment ? entry.paymentReceiveId : entry.billPaymentId,
        documentId: isInvoicePayment ? entry.invoiceId : entry.billId,
        amount: Number(entry.paymentAmount) || 0,
      }));
    },
    documentLegsOf: (referenceType, ids) =>
      models
        .accountTransactionModel()
        .query()
        .where('referenceType', referenceType)
        .whereIn('referenceId', ids),
  };
}
