import { describe, it, expect } from 'vitest';
import { mapDividendsSummary, mapDividendPayouts } from './mapDividends';

/** Ответы сервера как есть — snake_case. */
const summaryResponse = {
  available: 150000,
  safe: 150000,
  net_profit: 250000,
  total_paid_out: 100000,
  unpaid_bills: 0,
};

const payoutsResponse = {
  payouts: [
    {
      id: 1,
      date: '2026-08-04',
      amount: 100000,
      note: 'Дивиденды за первое полугодие',
      payment_account_id: 1000,
      payment_account_name: 'Расчётный счёт',
    },
  ],
};

describe('сводка по выводу средств', () => {
  it('читает выведенную сумму — она показывалась нулём', () => {
    const summary = mapDividendsSummary(summaryResponse);

    // На экране «Выведено всего: 0 ₽» соседствовало с выплатой на 100 000.
    expect(summary.totalPaidOut).toBe(100000);
  });

  it('читает накопленную прибыль', () => {
    expect(mapDividendsSummary(summaryResponse).netProfit).toBe(250000);
  });

  it('читает долги поставщикам — на них уменьшается безопасная сумма', () => {
    const summary = mapDividendsSummary({
      ...summaryResponse,
      unpaid_bills: 40000,
      safe: 110000,
    });

    expect(summary.unpaidBills).toBe(40000);
    expect(summary.safe).toBe(110000);
  });

  it('доступное и безопасное переносятся как есть', () => {
    const summary = mapDividendsSummary(summaryResponse);

    expect(summary.available).toBe(150000);
    expect(summary.safe).toBe(150000);
  });

  it('понимает camelCase, если сервер отдаст его', () => {
    const summary = mapDividendsSummary({
      available: 10,
      netProfit: 20,
      totalPaidOut: 30,
      unpaidBills: 40,
    });

    expect(summary).toMatchObject({
      netProfit: 20,
      totalPaidOut: 30,
      unpaidBills: 40,
    });
  });

  it('строковые суммы из ответа считаются числами', () => {
    const summary = mapDividendsSummary({
      available: '150000',
      total_paid_out: '100000',
    });

    expect(summary.available).toBe(150000);
    expect(summary.totalPaidOut).toBe(100000);
  });

  it('пустой ответ даёт нули, а не пропуски', () => {
    const summary = mapDividendsSummary(undefined);

    expect(summary).toEqual({
      available: 0,
      safe: 0,
      netProfit: 0,
      totalPaidOut: 0,
      unpaidBills: 0,
    });
  });
});

describe('история выплат', () => {
  it('читает счёт списания — в строке он пропадал', () => {
    const [payout] = mapDividendPayouts(payoutsResponse);

    expect(payout.paymentAccountName).toBe('Расчётный счёт');
    expect(payout.paymentAccountId).toBe(1000);
  });

  it('переносит сумму, дату и комментарий', () => {
    const [payout] = mapDividendPayouts(payoutsResponse);

    expect(payout).toMatchObject({
      id: 1,
      date: '2026-08-04',
      amount: 100000,
      note: 'Дивиденды за первое полугодие',
    });
  });

  it('дата с временем обрезается до дня', () => {
    const [payout] = mapDividendPayouts({
      payouts: [{ id: 2, date: '2026-08-04T00:00:00.000Z', amount: 1 }],
    });

    expect(payout.date).toBe('2026-08-04');
  });

  it('выплата без счёта не ломает строку', () => {
    const [payout] = mapDividendPayouts({ payouts: [{ id: 3, amount: 500 }] });

    expect(payout.paymentAccountId).toBeNull();
    expect(payout.paymentAccountName).toBe('');
  });

  it('понимает и голый массив, и обёртку', () => {
    expect(mapDividendPayouts(payoutsResponse.payouts)).toHaveLength(1);
    expect(mapDividendPayouts(payoutsResponse)).toHaveLength(1);
  });

  it('пустой ответ даёт пустую историю', () => {
    expect(mapDividendPayouts(undefined)).toEqual([]);
  });
});
