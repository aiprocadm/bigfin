// © 2026 Bigfin

/**
 * Денежная и неденежная задолженность (FIN-023 ТЗ-2).
 *
 * ЗАЧЕМ. «Нам должны 1 200 000» — число, из которого не следует ничего.
 * Часть придёт деньгами, а часть закроется отгрузкой по уже полученному
 * авансу. Первое — будущие поступления, второе — обязательство поработать.
 * Сложенные вместе, они обещают денег больше, чем будет, и человек планирует
 * платежи, которых нечем закрыть.
 *
 * ПОЧЕМУ СЧИТАЕМ ПО САЛЬДО, А НЕ ПО ДОКУМЕНТАМ. ТЗ требует прямо: «зачёт
 * аванса против отгрузки выполняется ДО классификации». Разбор по видам
 * документов дал бы другой ответ: клиент, который заплатил вперёд 500 000 и
 * тут же получил товар на 500 000, показал бы и аванс, и отгрузку, хотя не
 * должен ничего и ему не должны ничего.
 *
 * ПОЧЕМУ НЕ ЗАВОДИМ ТАБЛИЦУ. Раздел 10 ТЗ отклоняет отдельные таблицы
 * дебиторки и кредиторки: это производное от проводок, и хранить его значит
 * завести второй источник правды, который однажды разойдётся с первым.
 */

export interface ContactDebtPosition {
  contactId: number;
  /**
   * Сальдо расчётов с покупателем (счета дебиторской задолженности).
   *
   * Плюс — отгрузили больше, чем получили: нам должны ДЕНЬГИ.
   * Минус — получили вперёд: мы должны ИСПОЛНЕНИЕ.
   */
  receivableNet: number;
  /**
   * Сальдо расчётов с поставщиком (счета кредиторской задолженности).
   *
   * Плюс — получили больше, чем заплатили: мы должны ДЕНЬГИ.
   * Минус — заплатили вперёд: нам должны ПОСТАВКУ.
   */
  payableNet: number;
}

export interface DebtSide {
  /** Закроется деньгами. */
  money: number;
  /** Закроется поставкой или работой. */
  goods: number;
  /** Сумма обеих частей. */
  total: number;
}

export interface ContactDebtBreakdown {
  contactId: number;
  /** Нам должны. */
  receivable: DebtSide;
  /** Мы должны. */
  payable: DebtSide;
}

export interface DebtBreakdownTotals {
  receivable: DebtSide;
  payable: DebtSide;
  /** Авансы, полученные от покупателей, — мы должны исполнение. */
  advancesReceived: number;
  /** Авансы, выданные поставщикам, — нам должны поставку. */
  advancesPaid: number;
}

export interface DebtBreakdownResult {
  contacts: ContactDebtBreakdown[];
  totals: DebtBreakdownTotals;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Положительная часть числа: отрицательная сторона считается отдельно. */
const positive = (value: number): number => (value > 0 ? round2(value) : 0);

/**
 * Разбирает сальдо расчётов одного контрагента на четыре части.
 *
 * @param {ContactDebtPosition} position сальдо по дебиторке и кредиторке
 * @returns {ContactDebtBreakdown}
 */
export function breakdownContactDebt(
  position: ContactDebtPosition,
): ContactDebtBreakdown {
  const receivableNet = Number(position?.receivableNet ?? 0);
  const payableNet = Number(position?.payableNet ?? 0);

  // Нам должны деньги — это неоплаченная отгрузка. Нам должны поставку —
  // это наш аванс поставщику.
  const receivable = side(positive(receivableNet), positive(-payableNet));
  // Мы должны деньги — это неоплаченный счёт поставщика. Мы должны
  // исполнение — это аванс, полученный от покупателя.
  const payable = side(positive(payableNet), positive(-receivableNet));

  return { contactId: position.contactId, receivable, payable };
}

function side(money: number, goods: number): DebtSide {
  return { money, goods, total: round2(money + goods) };
}

/**
 * Разбор по всем контрагентам плюс итоги для главной.
 *
 * Контрагенты с нулевым сальдо по обеим сторонам не возвращаются: строка с
 * нулями ничего не сообщает, а список удлиняет.
 *
 * @param {ContactDebtPosition[]} positions сальдо расчётов
 * @returns {DebtBreakdownResult}
 */
export function computeDebtBreakdown(
  positions: ContactDebtPosition[] = [],
): DebtBreakdownResult {
  const contacts = (positions ?? [])
    .map((position) => breakdownContactDebt(position))
    .filter((row) => row.receivable.total !== 0 || row.payable.total !== 0);

  const sum = (pick: (row: ContactDebtBreakdown) => number): number =>
    round2(contacts.reduce((total, row) => total + pick(row), 0));

  const receivable = side(
    sum((row) => row.receivable.money),
    sum((row) => row.receivable.goods),
  );
  const payable = side(
    sum((row) => row.payable.money),
    sum((row) => row.payable.goods),
  );

  return {
    contacts,
    totals: {
      receivable,
      payable,
      advancesReceived: payable.goods,
      advancesPaid: receivable.goods,
    },
  };
}
