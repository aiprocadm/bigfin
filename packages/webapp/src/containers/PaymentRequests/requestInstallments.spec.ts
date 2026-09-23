// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import { installmentsPayload, installmentsState } from './requestInstallments';

/** FT-053 ТЗ-3: 1 000 000 = 600 000 + 400 000. */
describe('оплаты заявки на экране', () => {
  const row = (dueDate: string, amount?: number) => ({ key: dueDate, dueDate, amount, accountId: null });

  it('сошлись — можно сохранять; не сошлись — видно, сколько осталось', () => {
    expect(installmentsState(1_000_000, [row('2026-10-10', 600_000), row('2026-11-10', 400_000)])).toEqual({
      total: 1_000_000,
      remaining: 0,
      ok: true,
    });
    expect(installmentsState(1_000_000, [row('2026-10-10', 600_000)])).toMatchObject({ remaining: 400_000, ok: false });
    expect(installmentsState(500, [])).toMatchObject({ ok: true });
  });

  it('пустые строки не уходят на сервер', () => {
    expect(installmentsPayload([row('2026-10-10', 600_000), row('', 5), row('2026-11-01')])).toEqual([
      { dueDate: '2026-10-10', amount: 600_000, accountId: undefined },
    ]);
  });
});
