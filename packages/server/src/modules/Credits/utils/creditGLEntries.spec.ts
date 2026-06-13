// © 2026 Bigfin
import { AccountNormal } from '@/modules/Accounts/Accounts.types';
import {
  getCreditDisbursementGLEntries,
  getCreditInstallmentPaymentGLEntries,
} from './creditGLEntries';

describe('creditGLEntries', () => {
  it('выдача: Dr банк / Cr обязательство на тело', () => {
    const entries = getCreditDisbursementGLEntries({
      creditId: 7,
      date: '2026-01-15',
      principal: 100000,
      currencyCode: 'RUB',
      bankAccountId: 1,
      liabilityAccountId: 2,
    });
    expect(entries).toHaveLength(2);
    const bank = entries.find((e) => e.accountId === 1);
    const liab = entries.find((e) => e.accountId === 2);
    expect(bank.debit).toBe(100000);
    expect(bank.accountNormal).toBe(AccountNormal.DEBIT);
    expect(liab.credit).toBe(100000);
    expect(liab.accountNormal).toBe(AccountNormal.CREDIT);
  });

  it('платёж: Dr обязательство + Dr проценты / Cr банк; дебет = кредит', () => {
    const entries = getCreditInstallmentPaymentGLEntries({
      installmentId: 42,
      date: '2026-02-15',
      principalAmount: 8000,
      interestAmount: 1500,
      paymentAmount: 9500,
      currencyCode: 'RUB',
      bankAccountId: 1,
      liabilityAccountId: 2,
      interestExpenseAccountId: 3,
    });
    expect(entries).toHaveLength(3);
    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
    expect(totalDebit).toBe(9500);
    expect(totalCredit).toBe(9500);
    const interest = entries.find((e) => e.accountId === 3);
    expect(interest.debit).toBe(1500);
    expect(interest.accountNormal).toBe(AccountNormal.DEBIT);
  });
});
