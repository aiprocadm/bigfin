// © 2026 Bigfin
import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { MongoAbility, createMongoAbility } from '@casl/ability';
import { PermissionGuard } from './Permission.guard';
import { REQUIRED_PERMISSION_KEY } from './RequirePermission.decorator';
import { REQUIRED_ANY_PERMISSION_KEY } from './RequireAnyPermission.decorator';
import { AbilitySubject } from './Roles.types';
import { PreferencesAction } from '@/modules/Settings/Settings.types';
import { CashflowAction } from '@/modules/BankingTransactions/types/BankingTransactions.types';
import { SaleInvoiceAction } from '@/modules/SaleInvoices/SaleInvoice.types';
import { SaleEstimateAction } from '@/modules/SaleEstimates/types/SaleEstimates.types';
import {
  CustomerAction,
  VendorAction,
} from '@/modules/Customers/types/Customers.types';
import { staffRolePermissions } from '@/database/tenant/seeds/core/20210812121909_seed_roles_permissions';

import { BudgetsController } from '@/modules/Budgets/Budgets.controller';
import { PaymentCalendarController } from '@/modules/PaymentCalendar/PaymentCalendar.controller';
import { DebtsController } from '@/modules/Debts/Debts.controller';
import { DealsController } from '@/modules/Deals/Deals.controller';
import { DealStagesController } from '@/modules/Deals/DealStages.controller';

/**
 * Группа «планирование, долги и сделки» шага П1 карты v8.
 *
 * Своего предмета в схеме прав нет ни у одного из этих модулей, поэтому право
 * выбрано по смыслу действия:
 *
 * - бюджет — план всей организации, по нему считается план-факт у всех:
 *   «Настройки: изменение»;
 * - плановая операция — будущее движение денег: «Движение денег», тот же
 *   предмет, что и у банковских операций;
 * - напоминание о долге уходит покупателю письмом — «Счёт покупателю:
 *   изменение», по тому же правилу, что и остальные письма;
 * - план погашения заводится по контрагенту, а он бывает покупателем ИЛИ
 *   поставщиком — пометка «любое из прав»;
 * - сделка — преддоговорная работа, которая превращается в смету и счёт:
 *   «Смета», кому доверены сметы, тому и сделки.
 */

type Gate = {
  title: string;
  controller: any;
  handler: string;
  ability?: string;
  subject?: string;
  any?: Array<{ ability: string; subject: string }>;
};

const CONTACT_EDIT = [
  { ability: CustomerAction.Edit, subject: AbilitySubject.Customer },
  { ability: VendorAction.Edit, subject: AbilitySubject.Vendor },
];

const PLANNING_GATES: Gate[] = [
  // Бюджеты — план всей организации.
  {
    title: 'завести бюджет',
    controller: BudgetsController,
    handler: 'create',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'изменить бюджет',
    controller: BudgetsController,
    handler: 'edit',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'переписать строки бюджета',
    controller: BudgetsController,
    handler: 'upsertLines',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'удалить бюджет',
    controller: BudgetsController,
    handler: 'delete',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },

  // Плановые операции — будущее движение денег.
  {
    title: 'завести плановую операцию',
    controller: PaymentCalendarController,
    handler: 'createPlannedOperation',
    ability: CashflowAction.Create,
    subject: AbilitySubject.Cashflow,
  },
  {
    title: 'изменить плановую операцию',
    controller: PaymentCalendarController,
    handler: 'editPlannedOperation',
    ability: CashflowAction.Create,
    subject: AbilitySubject.Cashflow,
  },
  {
    title: 'удалить плановую операцию',
    controller: PaymentCalendarController,
    handler: 'deletePlannedOperation',
    ability: CashflowAction.Delete,
    subject: AbilitySubject.Cashflow,
  },

  // Долги.
  {
    title: 'напомнить о долге письмом',
    controller: DebtsController,
    handler: 'remind',
    ability: SaleInvoiceAction.Edit,
    subject: AbilitySubject.SaleInvoice,
  },
  {
    title: 'завести план погашения',
    controller: DebtsController,
    handler: 'createRepaymentPlan',
    any: CONTACT_EDIT,
  },
  {
    title: 'изменить план погашения',
    controller: DebtsController,
    handler: 'editRepaymentPlan',
    any: CONTACT_EDIT,
  },
  {
    title: 'удалить план погашения',
    controller: DebtsController,
    handler: 'deleteRepaymentPlan',
    any: CONTACT_EDIT,
  },
  {
    title: 'отметить платёж по плану',
    controller: DebtsController,
    handler: 'markInstallmentPaid',
    any: CONTACT_EDIT,
  },

  // Сделки и их этапы.
  {
    title: 'завести сделку',
    controller: DealsController,
    handler: 'create',
    ability: SaleEstimateAction.Create,
    subject: AbilitySubject.SaleEstimate,
  },
  {
    title: 'изменить сделку',
    controller: DealsController,
    handler: 'edit',
    ability: SaleEstimateAction.Edit,
    subject: AbilitySubject.SaleEstimate,
  },
  {
    title: 'удалить сделку',
    controller: DealsController,
    handler: 'remove',
    ability: SaleEstimateAction.Delete,
    subject: AbilitySubject.SaleEstimate,
  },
  {
    title: 'добавить этап сделки',
    controller: DealStagesController,
    handler: 'create',
    ability: SaleEstimateAction.Edit,
    subject: AbilitySubject.SaleEstimate,
  },
  {
    title: 'изменить этап сделки',
    controller: DealStagesController,
    handler: 'edit',
    ability: SaleEstimateAction.Edit,
    subject: AbilitySubject.SaleEstimate,
  },
  {
    title: 'убрать этап сделки',
    controller: DealStagesController,
    handler: 'remove',
    ability: SaleEstimateAction.Edit,
    subject: AbilitySubject.SaleEstimate,
  },
];

const abilityFrom = (rules: Array<{ action: string; subject: string }>) =>
  createMongoAbility(rules);

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

describe('планирование, долги и сделки спрашивают права', () => {
  it.each(PLANNING_GATES)('$title — пометка стоит', (gate) => {
    const declared = gate.any
      ? Reflect.getMetadata(
          REQUIRED_ANY_PERMISSION_KEY,
          gate.controller.prototype[gate.handler],
        )
      : Reflect.getMetadata(
          REQUIRED_PERMISSION_KEY,
          gate.controller.prototype[gate.handler],
        );

    const expected = gate.any ?? {
      ability: gate.ability,
      subject: gate.subject,
    };

    expect({ title: gate.title, declared }).toEqual({
      title: gate.title,
      declared: expected,
    });
  });

  it.each(PLANNING_GATES)('$title — страж подключён', (gate) => {
    const guards: any[] = [
      ...(Reflect.getMetadata('__guards__', gate.controller) ?? []),
      ...(Reflect.getMetadata(
        '__guards__',
        gate.controller.prototype[gate.handler],
      ) ?? []),
    ];

    expect({
      title: gate.title,
      guarded: guards.some((item) => item === PermissionGuard),
    }).toEqual({ title: gate.title, guarded: true });
  });

  it.each(PLANNING_GATES)('$title — владельцу можно', (gate) => {
    expect(guard().canActivate(contextFor(gate, adminAbility()))).toBe(true);
  });

  it('бюджеты и деньги наперёд сотруднику не даются', () => {
    const ability = staffAbility();

    PLANNING_GATES.filter(
      (gate) =>
        gate.subject === AbilitySubject.Preferences ||
        gate.subject === AbilitySubject.Cashflow,
    ).forEach((gate) => {
      expect(() => guard().canActivate(contextFor(gate, ability))).toThrow(
        ForbiddenException,
      );
    });
  });

  it('сделки и долги — часть повседневной работы сотрудника', () => {
    const ability = staffAbility();

    // Сделки идут по праву на сметы, планы погашения — по праву на
    // контрагента: и то и другое сотруднику доверено.
    PLANNING_GATES.filter(
      (gate) => gate.subject === AbilitySubject.SaleEstimate || gate.any,
    ).forEach((gate) => {
      expect({
        title: gate.title,
        can: guard().canActivate(contextFor(gate, ability)),
      }).toEqual({ title: gate.title, can: true });
    });
  });

  it('обработчики названы верно — иначе тест сторожит пустоту', () => {
    const missing = PLANNING_GATES.filter(
      (gate) => typeof gate.controller.prototype[gate.handler] !== 'function',
    ).map((gate) => `${gate.controller.name}.${gate.handler}`);

    expect(missing).toEqual([]);
  });

  it('группа закрыта целиком', () => {
    expect(PLANNING_GATES).toHaveLength(18);
  });
});
