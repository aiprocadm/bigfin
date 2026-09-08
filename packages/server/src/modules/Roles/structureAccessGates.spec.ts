// © 2026 Bigfin
import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { MongoAbility, createMongoAbility } from '@casl/ability';
import { PermissionGuard } from './Permission.guard';
import { REQUIRED_PERMISSION_KEY } from './RequirePermission.decorator';
import { AbilitySubject } from './Roles.types';
import { PreferencesAction } from '@/modules/Settings/Settings.types';
import { InventoryAdjustmentAction } from '@/modules/InventoryAdjutments/types/InventoryAdjustments.types';
import { staffRolePermissions } from '@/database/tenant/seeds/core/20210812121909_seed_roles_permissions';

import { WarehousesController } from '@/modules/Warehouses/Warehouses.controller';
import { WarehouseTransfersController } from '@/modules/WarehousesTransfers/WarehouseTransfers.controller';
import { BranchesController } from '@/modules/Branches/Branches.controller';
import { CurrenciesController } from '@/modules/Currencies/Currencies.controller';

/**
 * Группа «структура» шага П1 карты v8: склады, перемещения, отделения, валюты.
 *
 * Устройство организации — это не повседневная работа. Пока эти ручки стояли
 * без спроса, приглашённый человек мог завести или удалить склад и отделение,
 * назначить их основными, включить многоскладовый режим всей организации,
 * добавить или убрать валюту и двигать товар между складами.
 *
 * Готового права «склад» и «отделение» в схеме нет (в перечислении они есть,
 * а в `AbilitySchema` — нет), поэтому право выбрано по смыслу действия:
 *
 * - устройство организации (склады, отделения, валюты) — «Настройки:
 *   изменение»: заводится один раз и действует на всех;
 * - перемещение товара между складами — «Складская корректировка»: это
 *   движение остатков, ровно тот же предмет, что и правка остатков.
 *
 * Проверяется поведение, а не текст файлов: настоящая пометка с настоящего
 * обработчика, права роли «Сотрудник» собраны как в приложении, и вопрос
 * задаётся настоящему стражу.
 */

type Gate = {
  title: string;
  controller: any;
  handler: string;
  ability: string;
  subject: string;
};

const STRUCTURE_GATES: Gate[] = [
  // Склады — устройство организации.
  {
    title: 'завести склад',
    controller: WarehousesController,
    handler: 'createWarehouse',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'изменить склад',
    controller: WarehousesController,
    handler: 'editWarehouse',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'удалить склад',
    controller: WarehousesController,
    handler: 'deleteWarehouse',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'включить склады всей организации',
    controller: WarehousesController,
    handler: 'activateWarehouses',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'назначить склад основным',
    controller: WarehousesController,
    handler: 'markWarehousePrimary',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },

  // Отделения — устройство организации.
  {
    title: 'завести отделение',
    controller: BranchesController,
    handler: 'createBranch',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'изменить отделение',
    controller: BranchesController,
    handler: 'editBranch',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'удалить отделение',
    controller: BranchesController,
    handler: 'deleteBranch',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'включить отделения всей организации',
    controller: BranchesController,
    handler: 'activateBranches',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'назначить отделение основным',
    controller: BranchesController,
    handler: 'markBranchAsPrimary',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },

  // Валюты — устройство организации.
  {
    title: 'добавить валюту',
    controller: CurrenciesController,
    handler: 'create',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'изменить валюту',
    controller: CurrenciesController,
    handler: 'edit',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'убрать валюту',
    controller: CurrenciesController,
    handler: 'delete',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },

  // Перемещения между складами — движение остатков.
  {
    title: 'создать перемещение',
    controller: WarehouseTransfersController,
    handler: 'createWarehouseTransfer',
    ability: InventoryAdjustmentAction.CREATE,
    subject: AbilitySubject.InventoryAdjustment,
  },
  {
    title: 'изменить перемещение',
    controller: WarehouseTransfersController,
    handler: 'editWarehouseTransfer',
    ability: InventoryAdjustmentAction.EDIT,
    subject: AbilitySubject.InventoryAdjustment,
  },
  {
    title: 'отправить перемещение',
    controller: WarehouseTransfersController,
    handler: 'initiateTransfer',
    ability: InventoryAdjustmentAction.EDIT,
    subject: AbilitySubject.InventoryAdjustment,
  },
  {
    title: 'принять перемещение',
    controller: WarehouseTransfersController,
    handler: 'deliverTransfer',
    ability: InventoryAdjustmentAction.EDIT,
    subject: AbilitySubject.InventoryAdjustment,
  },
  {
    title: 'удалить перемещение',
    controller: WarehouseTransfersController,
    handler: 'deleteWarehouseTransfer',
    ability: InventoryAdjustmentAction.DELETE,
    subject: AbilitySubject.InventoryAdjustment,
  },
];

/** Права роли «Сотрудник» — собраны так же, как их собирает приложение. */
const staffAbility = () =>
  createMongoAbility(
    staffRolePermissions()
      .filter((permission) => permission.value)
      .map((permission) => ({
        action: permission.ability,
        subject: permission.subject,
      })),
  );

/** Владелец и встроенный «Администратор» получают ровно это правило. */
const adminAbility = () => createMongoAbility([{ action: 'manage', subject: 'all' }]);

const contextFor = (gate: Gate, ability: MongoAbility) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ ability }) }),
    getHandler: () => gate.controller.prototype[gate.handler],
    getClass: () => gate.controller,
  }) as any;

const guard = () =>
  new PermissionGuard({
    getAllAndOverride: (_key: string, targets: any[]) =>
      targets
        .map((target) => Reflect.getMetadata(REQUIRED_PERMISSION_KEY, target))
        .find(Boolean),
  } as any);

describe('ручки устройства организации спрашивают права', () => {
  it.each(STRUCTURE_GATES)('$title — пометка стоит', (gate) => {
    const declared = Reflect.getMetadata(
      REQUIRED_PERMISSION_KEY,
      gate.controller.prototype[gate.handler],
    );

    expect({ title: gate.title, declared }).toEqual({
      title: gate.title,
      declared: { ability: gate.ability, subject: gate.subject },
    });
  });

  it.each(STRUCTURE_GATES)('$title — страж подключён к контроллеру', (gate) => {
    const guards: any[] =
      Reflect.getMetadata('__guards__', gate.controller) ?? [];

    expect({
      title: gate.title,
      guarded: guards.some((item) => item === PermissionGuard),
    }).toEqual({ title: gate.title, guarded: true });
  });

  it.each(STRUCTURE_GATES)('$title — сотруднику отказ', (gate) => {
    expect(() => guard().canActivate(contextFor(gate, staffAbility()))).toThrow(
      ForbiddenException,
    );
  });

  it.each(STRUCTURE_GATES)('$title — владельцу можно', (gate) => {
    expect(guard().canActivate(contextFor(gate, adminAbility()))).toBe(true);
  });

  it('обработчики названы верно — иначе тест сторожит пустоту', () => {
    const missing = STRUCTURE_GATES.filter(
      (gate) => typeof gate.controller.prototype[gate.handler] !== 'function',
    ).map((gate) => `${gate.controller.name}.${gate.handler}`);

    expect(missing).toEqual([]);
  });

  it('группа «структура» закрыта целиком', () => {
    // Восемнадцать записывающих ручек в четырёх контроллерах. Число меняется
    // только вместе с осознанным решением, что группа стала другой.
    expect(STRUCTURE_GATES).toHaveLength(18);
  });
});
