import { TransactionsLockingGuard } from './TransactionsLockingGuard';
import { TransactionsLockingGroup } from '../types/TransactionsLocking.types';

/**
 * И3 (карта v12): окно разблокировки закрытого периода. Период закрыт до
 * lockToDate, но внутри окна [unlockFromDate, unlockToDate] правки разрешены.
 * Раньше окно схлопывалось в одну точку — сравнивалось `isSameOrBefore(
 * unlockFromDate)` вместо `unlockToDate`, и разблокированной оказывалась
 * только сама дата начала окна.
 */
describe('TransactionsLockingGuard — окно разблокировки (И3)', () => {
  const makeGuard = (locking: any) => {
    const repo = {
      getTransactionsLocking: jest.fn().mockResolvedValue(locking),
      getTransactionsLockingType: jest
        .fn()
        .mockResolvedValue(TransactionsLockingGroup.All),
    };
    return new TransactionsLockingGuard(repo as any);
  };

  const LOCKING = {
    isEnabled: true,
    lockToDate: '2026-03-31',
    unlockFromDate: '2026-03-10',
    unlockToDate: '2026-03-20',
  };

  it('дата в замке и ВНЕ окна разблокировки → заблокирована', async () => {
    const guard = makeGuard(LOCKING);
    expect(
      await guard.isTransactionsLocking('2026-03-05', TransactionsLockingGroup.All),
    ).toBe(true);
  });

  it('дата в СЕРЕДИНЕ окна разблокировки → разблокирована', async () => {
    const guard = makeGuard(LOCKING);
    // 15 марта попадает в [10, 20] — правки разрешены.
    expect(
      await guard.isTransactionsLocking('2026-03-15', TransactionsLockingGroup.All),
    ).toBe(false);
  });

  it('дата у КОНЦА окна разблокировки → разблокирована', async () => {
    const guard = makeGuard(LOCKING);
    // 20 марта — последний день окна; правки ещё разрешены.
    expect(
      await guard.isTransactionsLocking('2026-03-20', TransactionsLockingGroup.All),
    ).toBe(false);
  });

  it('дата после окна, но в замке → заблокирована', async () => {
    const guard = makeGuard(LOCKING);
    expect(
      await guard.isTransactionsLocking('2026-03-25', TransactionsLockingGroup.All),
    ).toBe(true);
  });

  it('замок выключен → ничего не заблокировано', async () => {
    const guard = makeGuard({ ...LOCKING, isEnabled: false });
    expect(
      await guard.isTransactionsLocking('2026-03-05', TransactionsLockingGroup.All),
    ).toBe(false);
  });
});
