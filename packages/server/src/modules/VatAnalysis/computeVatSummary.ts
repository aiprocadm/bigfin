/**
 * Чистый расчёт сводки по НДС (㉖) из движений ГЛ по счетам «НДС к уплате»
 * (`tax-payable`). На таких счетах: кредит = НДС начислен (с продаж),
 * дебет = НДС принят к вычету (с покупок), нетто = НДС к уплате.
 */

import { VatByRate } from './computeVatByRate';

/** Движение ГЛ по налоговому счёту за период. */
export interface VatLedgerRow {
  accountId: number;
  accountName: string;
  credit: number;
  debit: number;
}

/** Строка разбивки по налоговому счёту. */
export interface VatByAccount {
  accountId: number;
  accountName: string;
  charged: number;
  deductible: number;
}

/** Сводка по НДС за период. */
export interface VatSummary {
  /** НДС начислен (с продаж) = сумма кредитов налоговых счетов. */
  charged: number;
  /** НДС к вычету (с покупок) = сумма дебетов налоговых счетов. */
  deductible: number;
  /** НДС к уплате = начислен − к вычету (может быть < 0 = к возмещению). */
  payable: number;
  byAccount: VatByAccount[];
  /** Разбивка по ставкам вместе с налоговой базой (для декларации). */
  byRate?: VatByRate[];
}

/**
 * Считает сводку НДС из движений ГЛ по налоговым счетам.
 * @param {VatLedgerRow[]} rows — движения по счетам tax-payable за период.
 */
export const computeVatSummary = (rows: VatLedgerRow[]): VatSummary => {
  const byAccount: VatByAccount[] = rows.map((r) => ({
    accountId: r.accountId,
    accountName: r.accountName,
    charged: r.credit,
    deductible: r.debit,
  }));

  const charged = byAccount.reduce((s, a) => s + a.charged, 0);
  const deductible = byAccount.reduce((s, a) => s + a.deductible, 0);

  return {
    charged,
    deductible,
    payable: charged - deductible,
    byAccount,
  };
};

/**
 * «Очистка» суммы от НДС для управленческих отчётов: выделяет НДС из суммы,
 * включающей налог (чтобы прибыль не завышалась на НДС).
 * @param {number} grossAmount — сумма с НДС.
 * @param {number} ratePct — ставка НДС, % (например, 20).
 * @returns {{ net: number, vat: number }}
 */
export const stripVat = (
  grossAmount: number,
  ratePct: number,
): { net: number; vat: number } => {
  if (!ratePct) return { net: grossAmount, vat: 0 };
  const net = grossAmount / (1 + ratePct / 100);
  return { net, vat: grossAmount - net };
};
