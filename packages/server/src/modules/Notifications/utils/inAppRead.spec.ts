// © 2026 Bigfin
import {
  markReadFlags,
  countUnread,
  selectUnreadIds,
  NotificationRow,
} from './inAppRead';

const rows: NotificationRow[] = [
  { id: 1, eventType: 'cash_gap', title: 'A', body: 'a', payload: null, firedAt: '2026-06-20 10:00:00' },
  { id: 2, eventType: 'overdue', title: 'B', body: 'b', payload: null, firedAt: '2026-06-20 11:00:00' },
  { id: 3, eventType: 'low_balance', title: 'C', body: 'c', payload: null, firedAt: '2026-06-20 12:00:00' },
];

describe('inAppRead — markReadFlags', () => {
  it('помечает read=true только для прочитанных id, остальные false', () => {
    const result = markReadFlags(rows, [2]);
    expect(result.map((r) => [r.id, r.read])).toEqual([
      [1, false],
      [2, true],
      [3, false],
    ]);
  });
});

describe('inAppRead — countUnread', () => {
  it('считает уведомления, чьего id нет в прочитанных', () => {
    expect(countUnread([1, 2, 3], [2])).toBe(2);
  });
  it('ноль, когда всё прочитано', () => {
    expect(countUnread([1, 2, 3], [1, 2, 3])).toBe(0);
  });
});

describe('inAppRead — selectUnreadIds', () => {
  it('возвращает только ещё не прочитанные id', () => {
    expect(selectUnreadIds([1, 2, 3], [2])).toEqual([1, 3]);
  });
  it('пусто, когда всё прочитано (идемпотентность mark-all)', () => {
    expect(selectUnreadIds([1, 2, 3], [1, 2, 3])).toEqual([]);
  });
});
