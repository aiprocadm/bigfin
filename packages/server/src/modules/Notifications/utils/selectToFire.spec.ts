// © 2026 Bigfin
import { selectToFire } from './selectToFire';

const cand = (dedupKey: string) => ({ eventType: dedupKey, dedupKey, title: 't', body: 'b', payload: {} });

describe('selectToFire', () => {
  it('пропускает кандидата, если есть свежее срабатывание в окне cooldown', () => {
    const recent = [{ dedupKey: 'cash_gap', firedAt: '2026-06-15T06:00:00Z' }];
    expect(selectToFire([cand('cash_gap')], recent, 24, '2026-06-15T07:00:00Z')).toHaveLength(0);
  });
  it('отправляет, если последнее срабатывание старше окна', () => {
    const recent = [{ dedupKey: 'cash_gap', firedAt: '2026-06-10T06:00:00Z' }];
    expect(selectToFire([cand('cash_gap')], recent, 24, '2026-06-15T07:00:00Z').map((c) => c.dedupKey)).toEqual(['cash_gap']);
  });
  it('отправляет, если срабатываний ещё не было', () => {
    expect(selectToFire([cand('overdue')], [], 24, '2026-06-15T07:00:00Z')).toHaveLength(1);
  });
});
