// © 2026 Bigfin
import { ForbiddenException } from '@nestjs/common';
import { OwnerGuard } from './Owner.guard';
import { REQUIRE_OWNER_KEY } from './RequireOwner.decorator';

/**
 * Страж «только владелец организации».
 *
 * Живая проба показала, зачем он нужен: участник с ролью «Сотрудник», которой
 * дано ровно шесть видов документов, создал роль с правами на счета, настройки
 * и блокировку периода. Роли и состав участников — это границы доступа,
 * поэтому их меняет владелец, а не тот, кому владелец что-то разрешил.
 */
const buildContext = () => ({
  switchToHttp: () => ({
    getRequest: () => ({ headers: { 'organization-id': 'org-1' } }),
  }),
  getHandler: () => undefined,
  getClass: () => undefined,
});

const buildGuard = ({
  required,
  tenant = { id: 7 },
  membership,
}: {
  required: boolean | undefined;
  tenant?: { id: number } | null;
  membership?: { role: string };
}) => {
  const reflector = { getAllAndOverride: () => required } as any;
  const cls = { get: () => 42 } as any;
  const tenantModel = {
    query: () => ({ findOne: async () => tenant }),
  } as any;
  const userTenantModel = {
    query: () => ({ findOne: async () => membership }),
  } as any;

  return new OwnerGuard(userTenantModel, tenantModel, reflector, cls);
};

describe('OwnerGuard — только владелец организации', () => {
  it('без пометки страж не вмешивается', async () => {
    const guard = buildGuard({ required: undefined });

    await expect(guard.canActivate(buildContext() as any)).resolves.toBe(true);
  });

  it('владельца пропускает', async () => {
    const guard = buildGuard({ required: true, membership: { role: 'owner' } });

    await expect(guard.canActivate(buildContext() as any)).resolves.toBe(true);
  });

  it('обычного участника не пропускает', async () => {
    const guard = buildGuard({ required: true, membership: { role: 'member' } });

    await expect(guard.canActivate(buildContext() as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('чужого человека не пропускает', async () => {
    const guard = buildGuard({ required: true, membership: undefined });

    await expect(guard.canActivate(buildContext() as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('несуществующую организацию не пропускает', async () => {
    const guard = buildGuard({
      required: true,
      tenant: null,
      membership: { role: 'owner' },
    });

    await expect(guard.canActivate(buildContext() as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('ключ пометки не менялся', () => {
    // Декоратор и страж должны читать одну и ту же пометку: если ключ
    // разъедется, страж будет молча пропускать всех.
    expect(REQUIRE_OWNER_KEY).toBe('requireOrganizationOwner');
  });
});
