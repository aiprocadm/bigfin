// © 2026 Bigfin
import { AccountNormal } from '@/modules/Accounts/Accounts.types';
import {
  getDepreciationGLEntries,
  getDisposalGLEntries,
} from './fixedAssetGLEntries';

const sum = (entries: any[], key: 'debit' | 'credit') =>
  Math.round(entries.reduce((s, e) => s + e[key], 0) * 100) / 100;

describe('getDepreciationGLEntries', () => {
  it('Dr расход амортизации / Cr накопленная амортизация, баланс сходится', () => {
    const entries = getDepreciationGLEntries({
      entryId: 7,
      date: '2026-04-30',
      amount: 10000,
      currencyCode: 'RUB',
      expenseAccountId: 40,
      accumulatedAccountId: 41,
    });
    expect(sum(entries, 'debit')).toBe(10000);
    expect(sum(entries, 'credit')).toBe(10000);
    const dr = entries.find((e) => e.debit > 0);
    const cr = entries.find((e) => e.credit > 0);
    expect(dr.accountId).toBe(40);
    expect(dr.accountNormal).toBe(AccountNormal.DEBIT);
    expect(cr.accountId).toBe(41);
    expect(cr.accountNormal).toBe(AccountNormal.CREDIT);
  });
});

describe('getDisposalGLEntries', () => {
  it('продажа с убытком: Dr накопл + Dr банк + Dr убыток / Cr актив', () => {
    const entries = getDisposalGLEntries({
      assetId: 3,
      date: '2026-12-31',
      currencyCode: 'RUB',
      cost: 600000,
      accumulated: 200000,
      proceeds: 350000,
      assetAccountId: 10,
      accumulatedAccountId: 41,
      disposalAccountId: 50,
      bankAccountId: 1,
    });
    expect(sum(entries, 'debit')).toBe(600000);
    expect(sum(entries, 'credit')).toBe(600000);
    const loss = entries.find((e) => e.accountId === 50);
    expect(loss.debit).toBe(50000);
  });

  it('продажа с прибылью: счёт выбытия в кредите', () => {
    const entries = getDisposalGLEntries({
      assetId: 3,
      date: '2026-12-31',
      currencyCode: 'RUB',
      cost: 600000,
      accumulated: 500000,
      proceeds: 150000,
      assetAccountId: 10,
      accumulatedAccountId: 41,
      disposalAccountId: 50,
      bankAccountId: 1,
    });
    expect(sum(entries, 'debit')).toBe(650000);
    expect(sum(entries, 'credit')).toBe(650000);
    const bank = entries.find((e) => e.accountId === 1);
    expect(bank.debit).toBe(150000); // полная сумма поступления
    const asset = entries.find((e) => e.accountId === 10);
    expect(asset.credit).toBe(600000); // актив убран по полной стоимости
    const gain = entries.find((e) => e.accountId === 50);
    expect(gain.credit).toBe(50000); // прибыль = proceeds − остаточная
  });

  it('ликвидация (без денег): вся остаточная в убыток', () => {
    const entries = getDisposalGLEntries({
      assetId: 3,
      date: '2026-12-31',
      currencyCode: 'RUB',
      cost: 600000,
      accumulated: 200000,
      proceeds: 0,
      assetAccountId: 10,
      accumulatedAccountId: 41,
      disposalAccountId: 50,
      bankAccountId: null,
    });
    expect(sum(entries, 'debit')).toBe(600000);
    expect(sum(entries, 'credit')).toBe(600000);
    const loss = entries.find((e) => e.accountId === 50);
    expect(loss.debit).toBe(400000);
  });
});
