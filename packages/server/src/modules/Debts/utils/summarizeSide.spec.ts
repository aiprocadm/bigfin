// © 2026 Bigfin
import { summarizeSide } from './summarizeSide';
import { DebtContact } from '../Debts.interfaces';

const contact = (over: Partial<DebtContact>): DebtContact => ({
  contactId: 1,
  contactName: 'X',
  current: 0,
  buckets: [0, 0, 0, 0],
  overdueTotal: 0,
  total: 0,
  worstBucketIndex: -1,
  ...over,
});

describe('summarizeSide', () => {
  it('суммирует контакты и сортирует ТОП по total', () => {
    const res = summarizeSide(
      [
        contact({ contactId: 1, total: 100, current: 100 }),
        contact({
          contactId: 2,
          total: 300,
          overdueTotal: 300,
          buckets: [0, 300, 0, 0],
        }),
      ],
      5,
    );
    expect(res.total).toBe(400);
    expect(res.current).toBe(100);
    expect(res.overdueTotal).toBe(300);
    expect(res.buckets).toEqual([0, 300, 0, 0]);
    expect(res.top.map((c) => c.contactId)).toEqual([2, 1]);
  });

  it('ограничивает ТОП размером topN', () => {
    const res = summarizeSide(
      [1, 2, 3].map((id) => contact({ contactId: id, total: id })),
      2,
    );
    expect(res.top.map((c) => c.contactId)).toEqual([3, 2]);
  });

  it('пустой вход — нули и пустой ТОП', () => {
    const res = summarizeSide([], 5);
    expect(res).toEqual({
      total: 0,
      current: 0,
      overdueTotal: 0,
      buckets: [0, 0, 0, 0],
      contacts: [],
      top: [],
    });
  });
});
