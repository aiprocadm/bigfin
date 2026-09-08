// © 2026 Bigfin
import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { MongoAbility, createMongoAbility } from '@casl/ability';
import { PermissionGuard } from './Permission.guard';
import { REQUIRED_PERMISSION_KEY } from './RequirePermission.decorator';
import { REQUIRED_ANY_PERMISSION_KEY } from './RequireAnyPermission.decorator';
import { AbilitySubject } from './Roles.types';
import { AccountAction } from '@/interfaces/Account';
import { ItemAction } from '@/interfaces/Item';
import {
  CustomerAction,
  VendorAction,
} from '@/modules/Customers/types/Customers.types';
import { staffRolePermissions } from '@/database/tenant/seeds/core/20210812121909_seed_roles_permissions';

import { ContactsController } from '@/modules/Contacts/Contacts.controller';
import { ItemCategoryController } from '@/modules/ItemCategories/ItemCategory.controller';
import { ManagementArticlesController } from '@/modules/ManagementArticles/ManagementArticles.controller';

/**
 * Группа «справочники» шага П1 карты v8: контрагенты, категории товаров,
 * статьи учёта.
 *
 * Живая проба показала перевёрнутую картину. Покупатели, поставщики и товары
 * закрыты правами давно — и роль «Сотрудник» не имела на них НИ ОДНОГО права,
 * то есть не видела ни одного контрагента и не могла выбрать позицию в счёте.
 * Роль, которая существует ради выписки счетов, в интерфейсе была нерабочей.
 * При этом подсказка контрагентов (`/contacts/auto-complete`) стояла открытой
 * и отдавала весь список вместе с долгами — прямой обход закрытого списка
 * покупателей. А категории и статьи учёта заводил и удалял кто угодно.
 *
 * Выбран мягкий вариант (§5 вопрос 10 карты): **сотрудник заводит и правит
 * карточки, но не удаляет**. Строгий вариант оставлен статьям учёта — они
 * меняют структуру отчётов для всех, поэтому идут по праву «Счета».
 *
 * Контрагент — это покупатель ИЛИ поставщик, поэтому у ручек контрагентов
 * пометка «любое из прав»: одного из двух достаточно.
 */

type Gate = {
  title: string;
  controller: any;
  handler: string;
  /** Одно требуемое право. */
  ability?: string;
  subject?: string;
  /** Либо любое из перечисленных. */
  any?: Array<{ ability: string; subject: string }>;
};

const CONTACT_VIEW = [
  { ability: CustomerAction.View, subject: AbilitySubject.Customer },
  { ability: VendorAction.View, subject: AbilitySubject.Vendor },
];

const CONTACT_EDIT = [
  { ability: CustomerAction.Edit, subject: AbilitySubject.Customer },
  { ability: VendorAction.Edit, subject: AbilitySubject.Vendor },
];

const CATALOG_GATES: Gate[] = [
  {
    title: 'подсказка контрагентов',
    controller: ContactsController,
    handler: 'getAutoComplete',
    any: CONTACT_VIEW,
  },
  {
    title: 'карточка контрагента',
    controller: ContactsController,
    handler: 'getContact',
    any: CONTACT_VIEW,
  },
  {
    title: 'включить контрагента',
    controller: ContactsController,
    handler: 'activateContact',
    any: CONTACT_EDIT,
  },
  {
    title: 'выключить контрагента',
    controller: ContactsController,
    handler: 'inactivateContact',
    any: CONTACT_EDIT,
  },

  // Категории товаров — часть каталога, поэтому право на товары.
  {
    title: 'завести категорию товаров',
    controller: ItemCategoryController,
    handler: 'createItemCategory',
    ability: ItemAction.CREATE,
    subject: AbilitySubject.Item,
  },
  {
    title: 'изменить категорию товаров',
    controller: ItemCategoryController,
    handler: 'editItemCategory',
    ability: ItemAction.EDIT,
    subject: AbilitySubject.Item,
  },
  {
    title: 'удалить категорию товаров',
    controller: ItemCategoryController,
    handler: 'deleteItemCategory',
    ability: ItemAction.DELETE,
    subject: AbilitySubject.Item,
  },

  // Статьи учёта задают разрезы отчётов для всей организации — право «Счета».
  {
    title: 'завести статью учёта',
    controller: ManagementArticlesController,
    handler: 'createManagementArticle',
    ability: AccountAction.CREATE,
    subject: AbilitySubject.Account,
  },
  {
    title: 'изменить статью учёта',
    controller: ManagementArticlesController,
    handler: 'editManagementArticle',
    ability: AccountAction.EDIT,
    subject: AbilitySubject.Account,
  },
  {
    title: 'удалить статью учёта',
    controller: ManagementArticlesController,
    handler: 'deleteManagementArticle',
    ability: AccountAction.DELETE,
    subject: AbilitySubject.Account,
  },
];

const abilityFrom = (rules: Array<{ action: string; subject: string }>) =>
  createMongoAbility(rules);

/** Права роли «Сотрудник» — собраны так же, как их собирает приложение. */
const staffAbility = () =>
  abilityFrom(
    staffRolePermissions()
      .filter((permission) => permission.value)
      .map((permission) => ({
        action: permission.ability,
        subject: permission.subject,
      })),
  );

const adminAbility = () => abilityFrom([{ action: 'manage', subject: 'all' }]);

const contextFor = (gate: Gate, ability: MongoAbility) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ ability }) }),
    getHandler: () => gate.controller.prototype[gate.handler],
    getClass: () => gate.controller,
  }) as any;

const guard = () =>
  new PermissionGuard({
    getAllAndOverride: (key: string, targets: any[]) =>
      targets.map((target) => Reflect.getMetadata(key, target)).find(Boolean),
  } as any);

describe('справочники спрашивают права', () => {
  it.each(CATALOG_GATES)('$title — пометка стоит', (gate) => {
    const declared = gate.any
      ? Reflect.getMetadata(
          REQUIRED_ANY_PERMISSION_KEY,
          gate.controller.prototype[gate.handler],
        )
      : Reflect.getMetadata(
          REQUIRED_PERMISSION_KEY,
          gate.controller.prototype[gate.handler],
        );

    const expected = gate.any ?? { ability: gate.ability, subject: gate.subject };

    expect({ title: gate.title, declared }).toEqual({
      title: gate.title,
      declared: expected,
    });
  });

  it.each(CATALOG_GATES)('$title — страж подключён к контроллеру', (gate) => {
    const guards: any[] =
      Reflect.getMetadata('__guards__', gate.controller) ?? [];

    expect({
      title: gate.title,
      guarded: guards.some((item) => item === PermissionGuard),
    }).toEqual({ title: gate.title, guarded: true });
  });

  it.each(CATALOG_GATES)('$title — владельцу можно', (gate) => {
    expect(guard().canActivate(contextFor(gate, adminAbility()))).toBe(true);
  });

  it('сотрудник видит контрагентов и ведёт их карточки', () => {
    const ability = staffAbility();

    ['подсказка контрагентов', 'карточка контрагента', 'включить контрагента']
      .map((title) => CATALOG_GATES.find((gate) => gate.title === title)!)
      .forEach((gate) => {
        expect({
          title: gate.title,
          can: guard().canActivate(contextFor(gate, ability)),
        }).toEqual({ title: gate.title, can: true });
      });
  });

  it('сотрудник заводит и правит категории товаров', () => {
    const ability = staffAbility();
    const create = CATALOG_GATES.find(
      (gate) => gate.title === 'завести категорию товаров',
    )!;
    const edit = CATALOG_GATES.find(
      (gate) => gate.title === 'изменить категорию товаров',
    )!;

    expect(guard().canActivate(contextFor(create, ability))).toBe(true);
    expect(guard().canActivate(contextFor(edit, ability))).toBe(true);
  });

  it('сотрудник не удаляет из справочников', () => {
    const ability = staffAbility();
    const remove = CATALOG_GATES.find(
      (gate) => gate.title === 'удалить категорию товаров',
    )!;

    expect(() => guard().canActivate(contextFor(remove, ability))).toThrow(
      ForbiddenException,
    );
  });

  it('статьи учёта сотруднику не даются вовсе', () => {
    const ability = staffAbility();

    CATALOG_GATES.filter((gate) => gate.title.includes('статью учёта')).forEach(
      (gate) => {
        expect(() => guard().canActivate(contextFor(gate, ability))).toThrow(
          ForbiddenException,
        );
      },
    );
  });

  it('«любое из прав»: одного права из пары достаточно', () => {
    const onlyVendors = abilityFrom([{ action: 'View', subject: 'Vendor' }]);
    const gate = CATALOG_GATES.find(
      (item) => item.title === 'подсказка контрагентов',
    )!;

    // Роль, которой доверены только поставщики, подсказку получает.
    expect(guard().canActivate(contextFor(gate, onlyVendors))).toBe(true);
  });

  it('«любое из прав»: без обоих прав — отказ', () => {
    const nothing = abilityFrom([{ action: 'View', subject: 'SaleInvoice' }]);
    const gate = CATALOG_GATES.find(
      (item) => item.title === 'подсказка контрагентов',
    )!;

    expect(() => guard().canActivate(contextFor(gate, nothing))).toThrow(
      ForbiddenException,
    );
  });

  it('обработчики названы верно — иначе тест сторожит пустоту', () => {
    const missing = CATALOG_GATES.filter(
      (gate) => typeof gate.controller.prototype[gate.handler] !== 'function',
    ).map((gate) => `${gate.controller.name}.${gate.handler}`);

    expect(missing).toEqual([]);
  });

  it('группа «справочники» закрыта целиком', () => {
    expect(CATALOG_GATES).toHaveLength(10);
  });
});
