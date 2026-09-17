import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { CleanupOneClickDemosService } from './CleanupOneClickDemos.service';

/**
 * Д4 карты v86. Уборка демо сносила базу организации, а файлы в хранилище
 * оставались навсегда. Ключи вложений начинаются с номера организации, поэтому
 * уборка находит их по префиксу — до сброса базы, страницами, и сбой
 * хранилища её не останавливает.
 */
const ORGANIZATION_ID = 'demo-org-1';

function makeDeps(options: {
  bucket?: string;
  pages?: Array<{ keys: string[]; next?: string }>;
  s3Fails?: boolean;
} = {}) {
  const { bucket = 'bigfin-files', pages = [{ keys: [] }], s3Fails } = options;
  const events: string[] = [];
  const demo = { id: 7, tenantId: 3, userId: 11, createdAt: '2020-01-01' };
  const tenant = { id: 3, organizationId: ORGANIZATION_ID };

  const configService = {
    get: (key: string) =>
      ({
        'oneClickDemo.ttlHours': 24,
        'tenantDatabase.dbNamePrefix': 'bigfin_',
        's3.bucket': bucket,
      })[key],
  };
  const systemKnex = {
    raw: jest.fn(async (sql: string) => {
      events.push(`sql:${sql}`);
    }),
  };
  const deleted: Record<string, number[]> = {};
  const model = (name: string, rows: any[] = []) => ({
    query: () => ({
      where: async () => rows,
      findById: async (id: number) => rows.find((r) => r.id === id),
      deleteById: async (id: number) => {
        (deleted[name] ??= []).push(id);
        events.push(`delete:${name}`);
        return 1;
      },
      delete: () => ({
        where: async () => {
          events.push(`delete:${name}`);
          return 1;
        },
      }),
    }),
  });

  let page = 0;
  const s3 = {
    send: jest.fn(async (command: unknown) => {
      if (s3Fails) throw new Error('storage is down');
      if (command instanceof ListObjectsV2Command) {
        events.push(`list:${command.input.ContinuationToken ?? 'first'}`);
        const current = pages[page++] ?? { keys: [] };
        return {
          Contents: current.keys.map((Key) => ({ Key })),
          IsTruncated: Boolean(current.next),
          NextContinuationToken: current.next,
        };
      }
      if (command instanceof DeleteObjectsCommand) {
        events.push(
          `delete-objects:${(command.input.Delete?.Objects ?? [])
            .map((o) => o.Key)
            .join(',')}`,
        );
        return {};
      }
      throw new Error('unexpected command');
    }),
  };

  const service = new CleanupOneClickDemosService(
    configService as any,
    systemKnex as any,
    model('demo', [demo]) as any,
    model('tenant', [tenant]) as any,
    model('metadata') as any,
    model('user') as any,
    model('subscription') as any,
    s3 as any,
  );
  return { service, s3, systemKnex, events, deleted };
}

describe('CleanupOneClickDemosService — файлы демо в хранилище', () => {
  it('удаляет файлы организации по префиксу — и делает это до сброса базы', async () => {
    const deps = makeDeps({
      pages: [{ keys: [`${ORGANIZATION_ID}/a.pdf`, `${ORGANIZATION_ID}/b.png`] }],
    });

    const removed = await deps.service.cleanupExpiredDemos();

    expect(removed).toBe(1);
    const list = deps.s3.send.mock.calls[0][0] as ListObjectsV2Command;
    expect(list.input).toMatchObject({
      Bucket: 'bigfin-files',
      Prefix: `${ORGANIZATION_ID}/`,
    });
    const drop = deps.events.findIndex((e) => e.startsWith('sql:DROP DATABASE'));
    const del = deps.events.findIndex((e) => e.startsWith('delete-objects:'));
    expect(del).toBeGreaterThanOrEqual(0);
    expect(del).toBeLessThan(drop);
    expect(deps.events[del]).toBe(
      `delete-objects:${ORGANIZATION_ID}/a.pdf,${ORGANIZATION_ID}/b.png`,
    );
  });

  it('проходит по всем страницам списка, а не только по первой', async () => {
    const deps = makeDeps({
      pages: [
        { keys: [`${ORGANIZATION_ID}/1`], next: 'page-2' },
        { keys: [`${ORGANIZATION_ID}/2`] },
      ],
    });

    await deps.service.cleanupExpiredDemos();

    expect(deps.events.filter((e) => e.startsWith('list:'))).toEqual([
      'list:first',
      'list:page-2',
    ]);
    expect(deps.events.filter((e) => e.startsWith('delete-objects:'))).toEqual([
      `delete-objects:${ORGANIZATION_ID}/1`,
      `delete-objects:${ORGANIZATION_ID}/2`,
    ]);
  });

  it('без файлов под префиксом удаление в хранилище не зовётся', async () => {
    const deps = makeDeps({ pages: [{ keys: [] }] });

    await deps.service.cleanupExpiredDemos();

    expect(deps.events.some((e) => e.startsWith('delete-objects:'))).toBe(false);
  });

  it('сбой хранилища не останавливает уборку базы и записей', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const deps = makeDeps({ s3Fails: true });

    const removed = await deps.service.cleanupExpiredDemos();

    expect(removed).toBe(1);
    expect(deps.events.some((e) => e.startsWith('sql:DROP DATABASE'))).toBe(true);
    expect(deps.deleted.demo).toEqual([7]);
    expect(deps.deleted.user).toEqual([11]);
    spy.mockRestore();
  });

  it('без корзины в настройках хранилище не трогается', async () => {
    // Пустая строка, а не undefined: у заготовки есть значение по умолчанию,
    // и undefined его не отменяет.
    const deps = makeDeps({ bucket: '' });

    await deps.service.cleanupExpiredDemos();

    expect(deps.s3.send).not.toHaveBeenCalled();
  });
});
