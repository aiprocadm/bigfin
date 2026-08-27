// © 2026 Bigfin
import { TenantsMigrateLatestCommand } from './TenantsMigrateLatest.command';
import { TenantsMigrateRollbackCommand } from './TenantsMigrateRollback.command';

/**
 * М1 карты v28. Сбой одной организации не лишает миграций остальные.
 *
 * Раньше любая ошибка внутри цикла звала process.exit(1): начатые соседи
 * обрывались с взведёнными замками, до кого очередь не дошла — молча
 * оставались на старых миграциях. Живое следствие: организация-призрак
 * (метаданные есть, базы нет) день за днём рвала прогон, и три базы
 * просидели на миграциях восьмидневной давности.
 *
 * Правило: ошибки собираются, остальные организации мигрируют, итог
 * называет каждого виновника, соединения закрываются.
 */

const TENANTS = [
  { organizationId: 'org-a' },
  { organizationId: 'org-b' },
  { organizationId: 'org-c' },
];

function makeCommand(
  Ctor: any,
  method: 'latest' | 'rollback',
  failingOrg: string | null,
) {
  const configService = {
    get: (key: string) => (key === 'tenantDatabase.dbNamePrefix' ? 'db_' : ''),
  };
  const cmd = new Ctor(configService as any);

  const migrated: string[] = [];
  const destroyed: string[] = [];

  jest.spyOn(cmd, 'initSystemKnex').mockReturnValue({});
  jest.spyOn(cmd, 'getAllInitializedTenants').mockResolvedValue(TENANTS);
  jest.spyOn(cmd, 'initTenantKnex').mockImplementation(
    (organizationId: string) => ({
      migrate: {
        [method]: async () => {
          if (organizationId === failingOrg) {
            // Сообщение нарочно БЕЗ имени организации: итог обязан назвать
            // её сам, а не надеяться на текст ошибки драйвера.
            throw new Error('нет базы');
          }
          migrated.push(organizationId);
          return [1, ['20260827_x.js']];
        },
      },
      destroy: async () => {
        destroyed.push(organizationId);
      },
    }),
  );

  // exit/success в бою зовут process.exit — здесь только записываем.
  const exit = jest.spyOn(cmd, 'exit').mockImplementation(() => undefined);
  const success = jest.spyOn(cmd, 'success').mockImplementation(() => undefined);

  return { cmd, migrated, destroyed, exit, success };
}

describe.each([
  ['tenants:migrate:latest', TenantsMigrateLatestCommand, 'latest' as const],
  ['tenants:migrate:rollback', TenantsMigrateRollbackCommand, 'rollback' as const],
])('%s', (_name, Ctor, method) => {
  it('сбой одной организации: остальные мигрируют, итог называет виновника', async () => {
    const { cmd, migrated, exit, success } = makeCommand(Ctor, method, 'org-b');

    await cmd.run([], {});

    expect(migrated.sort()).toEqual(['org-a', 'org-c']);
    expect(success).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledTimes(1);
    const message = String(exit.mock.calls[0][0]);
    expect(message).toContain('org-b');
    expect(message).toContain('нет базы');
    expect(message).not.toContain('org-a');
  });

  it('без сбоев: успех, выхода с ошибкой нет', async () => {
    const { cmd, exit, success } = makeCommand(Ctor, method, null);

    await cmd.run([], {});

    expect(success).toHaveBeenCalledTimes(1);
    expect(exit).not.toHaveBeenCalled();
  });

  it('соединения закрываются и у успешных, и у сбойных', async () => {
    const { cmd, destroyed } = makeCommand(Ctor, method, 'org-b');

    await cmd.run([], {});

    expect(destroyed.sort()).toEqual(['org-a', 'org-b', 'org-c']);
  });

  it('адресный прогон одной сбойной организации тоже называет её', async () => {
    const { cmd, exit, success } = makeCommand(Ctor, method, 'org-b');

    await cmd.run([], { tenant_id: 'org-b' });

    expect(success).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledTimes(1);
    expect(String(exit.mock.calls[0][0])).toContain('org-b');
  });
});
