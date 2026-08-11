// © 2026 Bigfin
import { TransactionsLockingRepository } from './TransactionsLockingRepository';

/**
 * Настройки хранятся строками. Отменённая блокировка возвращалась строкой «0»,
 * а непустая строка в JavaScript истинна — сторож делает `if (!isEnabled)`,
 * поэтому снятая блокировка продолжала запрещать правку документов.
 *
 * Прячется дефект так же, как на модулях за флагом: организация, где блокировку
 * ни разу не включали, ведёт себя правильно (значения нет вовсе). Ломается
 * ровно та, где блокировку включили, а потом сняли.
 */
const buildRepository = (stored: Record<string, unknown>) => {
  const store = {
    get: ({ key }: { group: string; key: string }) => stored[key],
    set: () => undefined,
    save: async () => undefined,
  };
  return new TransactionsLockingRepository(() => store as any);
};

describe('TransactionsLockingRepository — признак блокировки', () => {
  it('снятая блокировка (строка «0») больше не считается включённой', () => {
    const repository = buildRepository({ 'all.active': '0' });

    return expect(
      repository.getTransactionsLocking().then((meta) => meta.isEnabled),
    ).resolves.toBe(false);
  });

  it('включённая блокировка (строка «1») остаётся включённой', () => {
    const repository = buildRepository({ 'all.active': '1' });

    return expect(
      repository.getTransactionsLocking().then((meta) => meta.isEnabled),
    ).resolves.toBe(true);
  });

  it('никогда не включавшаяся блокировка выключена', () => {
    const repository = buildRepository({});

    return expect(
      repository.getTransactionsLocking().then((meta) => meta.isEnabled),
    ).resolves.toBe(false);
  });

  it('настоящие логические значения работают как прежде', async () => {
    await expect(
      buildRepository({ 'all.active': true })
        .getTransactionsLocking()
        .then((m) => m.isEnabled),
    ).resolves.toBe(true);

    await expect(
      buildRepository({ 'all.active': false })
        .getTransactionsLocking()
        .then((m) => m.isEnabled),
    ).resolves.toBe(false);
  });
});
