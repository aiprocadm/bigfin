// © 2026 Bigfin
import { aggregateAging } from './aggregateAging';
import { AGING_PERIODS } from '../constants';

describe('aggregateAging', () => {
  it('суммирует dueAmount по корзинам и считает worstBucketIndex', () => {
    const res = aggregateAging(
      [
        { dueAmount: 100, overdueDays: 10 }, // корзина 0
        { dueAmount: 50, overdueDays: 20 }, // корзина 0
        { dueAmount: 200, overdueDays: 75 }, // корзина 2 (61-90)
      ],
      AGING_PERIODS,
    );
    expect(res.buckets).toEqual([150, 0, 200, 0]);
    expect(res.overdueTotal).toBe(350);
    expect(res.worstBucketIndex).toBe(2);
  });

  it('пустой вход даёт нули и worstBucketIndex = -1', () => {
    const res = aggregateAging([], AGING_PERIODS);
    expect(res.buckets).toEqual([0, 0, 0, 0]);
    expect(res.overdueTotal).toBe(0);
    expect(res.worstBucketIndex).toBe(-1);
  });

  it('округляет до 3 знаков (без float-дрейфа)', () => {
    const res = aggregateAging(
      [
        { dueAmount: 0.1, overdueDays: 5 },
        { dueAmount: 0.2, overdueDays: 5 },
      ],
      AGING_PERIODS,
    );
    expect(res.buckets[0]).toBe(0.3);
  });
});
