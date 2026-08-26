// © 2026 Bigfin
import { InAppNotificationsService } from './InAppNotifications.service';

/**
 * У1 карты v27. Лента и бейдж не показывают вытесненные записи.
 *
 * Свежий суточный повтор события вытесняет прежнюю запись (supersededAt).
 * Все три запроса — лента, счётчик непрочитанных и «прочитать всё» —
 * обязаны отбрасывать вытесненные строки, иначе бейдж продолжит расти на
 * одинаковых новостях.
 */

/** Цепочка запроса, которая пишет вызовы в спаи и отдаёт rows. */
function chain(rows: any[], spies: Record<string, jest.Mock>): any {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === 'then') {
        return (resolve: (v: any) => any) => Promise.resolve(rows).then(resolve);
      }
      if (prop === 'first') {
        return () => Promise.resolve(rows[0]);
      }
      return (...args: any[]) => {
        if (spies[prop]) spies[prop](...args);
        return chain(rows, spies);
      };
    },
  };
  return new Proxy({}, handler);
}

function makeService(rows: any[] = []) {
  const spies = {
    whereNull: jest.fn(),
    where: jest.fn(),
  };
  const service = new InAppNotificationsService(
    { get: jest.fn().mockReturnValue(1) } as any,
    { render: jest.fn().mockResolvedValue(null) } as any,
    (() => ({ query: () => chain(rows, spies) })) as any,
    (() => ({
      query: () => chain([], {}),
      knex: () => ({}),
    })) as any,
  );
  return { service, spies };
}

describe('лента без вытесненных записей', () => {
  it('лента отбрасывает вытесненные уведомления', async () => {
    const { service, spies } = makeService([]);
    await service.list();

    expect(spies.whereNull.mock.calls.flat()).toContain('supersededAt');
  });

  it('счётчик непрочитанных отбрасывает вытесненные', async () => {
    const { service, spies } = makeService([{ count: 0 }]);
    await service.unreadCount();

    expect(spies.whereNull.mock.calls.flat()).toContain(
      'notifications.supersededAt',
    );
  });

  it('«прочитать всё» гасит ровно то, что видит счётчик', async () => {
    const { service, spies } = makeService([]);
    await service.markAllRead();

    expect(spies.whereNull.mock.calls.flat()).toContain(
      'notifications.supersededAt',
    );
  });
});
