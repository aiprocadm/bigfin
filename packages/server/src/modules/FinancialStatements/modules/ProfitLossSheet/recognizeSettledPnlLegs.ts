// © 2026 Bigfin
import { ICashBasisLeg } from './ProfitLossSheetCashBasis';

/**
 * Признание дохода и расхода по факту оплаты — шаг Д7 карты v6.
 *
 * Как было. В кассовом режиме ОПиУ оставляет только документы, которые
 * коснулись денег. Счёт покупателю денег не касается — он выпадает целиком,
 * и это правильно: выручки ещё нет. Но и оплата счёта ничего не приносит:
 * её проводки — «пришло на счёт» и «уменьшился долг покупателя», обе на
 * балансовых счетах. Выходило, что деньги пришли, а выручки нет вообще:
 * у тех, кто работает по счетам, кассовый ОПиУ показывал почти ноль дохода.
 *
 * Как стало. Оплата признаёт доход того счёта, который она гасит, в той же
 * доле, в какой погашен долг. Оплатили половину счёта — половина его выручки.
 * Налог в доход не попадает: делим оплату по строкам ОПиУ документа, а строка
 * НДС к ним не относится.
 *
 * То же зеркально для оплат поставщикам: расход признаётся по факту платежа.
 * Закупка товара на склад расхода не даёт — это обмен денег на запасы,
 * расход появится при продаже.
 */

/** Одно погашение: столько-то денег ушло в счёт такого-то документа. */
export interface Settlement {
  /** Документ-оплата (нужен только для понятного отчёта). */
  paymentReferenceType: string;
  paymentReferenceId: number;
  /** Дата платежа — в этот период и попадёт доход. */
  date: Date | string;
  /** Оплачиваемый документ. */
  documentReferenceType: string;
  documentReferenceId: number;
  /** Сколько заплачено по этому документу. */
  amount: number;
}

/** Разбор оплачиваемого документа: сколько всего должны и из чего доход. */
export interface DocumentPnlShape {
  /** Сумма долга по документу (дебиторка у счёта, кредиторка у закупки). */
  settledTotal: number;
  /** Суммы строк ОПиУ по счетам учёта: accountId → сумма. */
  byAccount: Record<number, number>;
  /** Куда писать признанную сумму: доход — в кредит, расход — в дебет. */
  direction: 'credit' | 'debit';
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Превращает погашения в строки ОПиУ так, как если бы доход (расход)
 * возникал в момент оплаты.
 *
 * @param settlements — платежи с разбивкой по оплачиваемым документам.
 * @param shapes — разбор документов по ключу `тип:id`.
 */
export function recognizeSettledPnlLegs(
  settlements: Settlement[],
  shapes: Map<string, DocumentPnlShape>,
): ICashBasisLeg[] {
  const legs: ICashBasisLeg[] = [];

  settlements.forEach((settlement) => {
    const key = `${settlement.documentReferenceType}:${settlement.documentReferenceId}`;
    const shape = shapes.get(key);

    if (!shape || !(shape.settledTotal > 0)) return;

    const paid = Number(settlement.amount) || 0;
    if (paid <= 0) return;

    // Переплата не создаёт дохода больше, чем есть в самом документе.
    const share = Math.min(paid / shape.settledTotal, 1);

    Object.entries(shape.byAccount).forEach(([accountId, amount]) => {
      const recognized = round2(Number(amount) * share);
      if (recognized === 0) return;

      legs.push({
        // Строку показываем от имени платежа: именно он попал в период.
        referenceType: settlement.paymentReferenceType,
        referenceId: settlement.paymentReferenceId,
        accountId: Number(accountId),
        date: settlement.date,
        credit: shape.direction === 'credit' ? recognized : 0,
        debit: shape.direction === 'debit' ? recognized : 0,
      });
    });
  });
  return legs;
}

/**
 * Собирает разбор документа из его строк журнала.
 *
 * @param legs — все строки журнала документа (без фильтра по периоду:
 *   счёт мог быть выставлен в январе, а оплачен в марте).
 * @param isSettlementAccount — счёт расчётов (дебиторка или кредиторка).
 * @param isPnlAccount — счёт доходов или расходов.
 * @param direction — куда признавать: доход в кредит, расход в дебет.
 */
export function buildDocumentPnlShape(
  legs: ICashBasisLeg[],
  isSettlementAccount: (accountId: number) => boolean,
  isPnlAccount: (accountId: number) => boolean,
  direction: 'credit' | 'debit',
): DocumentPnlShape {
  const byAccount: Record<number, number> = {};
  let settledTotal = 0;

  legs.forEach((leg) => {
    const credit = Number(leg.credit || 0);
    const debit = Number(leg.debit || 0);

    if (isSettlementAccount(leg.accountId)) {
      // Дебиторка растёт дебетом, кредиторка — кредитом.
      settledTotal += direction === 'credit' ? debit - credit : credit - debit;
      return;
    }
    if (!isPnlAccount(leg.accountId)) return;

    const amount = direction === 'credit' ? credit - debit : debit - credit;
    byAccount[leg.accountId] = (byAccount[leg.accountId] ?? 0) + amount;
  });

  // Строки, ушедшие в ноль (например, полностью сторнированные), не нужны.
  Object.keys(byAccount).forEach((accountId) => {
    if (byAccount[Number(accountId)] === 0) delete byAccount[Number(accountId)];
  });

  return { settledTotal: round2(settledTotal), byAccount, direction };
}
