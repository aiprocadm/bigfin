/**
 * Разбор ответов модуля вывода средств (⑲).
 *
 * Сервер отдаёт поля в snake_case (`total_paid_out`, `net_profit`,
 * `payment_account_name`), а страница читала их в camelCase: «Выведено всего»
 * показывало 0 ₽ при выплате в истории прямо под ним, накопленная прибыль —
 * тоже 0, а у выплаты пропадал счёт списания.
 */
export interface DividendsSummary {
  available: number;
  safe: number;
  netProfit: number;
  totalPaidOut: number;
  unpaidBills: number;
}

export interface DividendPayout {
  id: number;
  date: string;
  amount: number;
  note: string;
  paymentAccountId: number | null;
  paymentAccountName: string;
}

const num = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pick = (raw: any, snake: string, camel: string): unknown =>
  raw?.[snake] ?? raw?.[camel];

export const mapDividendsSummary = (raw: any): DividendsSummary => ({
  available: num(raw?.available),
  safe: num(raw?.safe),
  netProfit: num(pick(raw, 'net_profit', 'netProfit')),
  totalPaidOut: num(pick(raw, 'total_paid_out', 'totalPaidOut')),
  unpaidBills: num(pick(raw, 'unpaid_bills', 'unpaidBills')),
});

export const mapDividendPayout = (raw: any): DividendPayout => {
  const accountId = pick(raw, 'payment_account_id', 'paymentAccountId');

  return {
    id: num(raw?.id),
    // Дата может прийти с временем — в списке нужен только день.
    date: String(raw?.date ?? '').slice(0, 10),
    amount: num(raw?.amount),
    note: raw?.note ?? '',
    paymentAccountId: accountId == null ? null : num(accountId),
    paymentAccountName:
      (pick(raw, 'payment_account_name', 'paymentAccountName') as string) ?? '',
  };
};

export const mapDividendPayouts = (raw: any): DividendPayout[] => {
  const rows = Array.isArray(raw) ? raw : (raw?.payouts ?? raw?.data ?? []);
  return rows.map(mapDividendPayout);
};
