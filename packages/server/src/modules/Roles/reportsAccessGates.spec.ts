// © 2026 Bigfin
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { ForbiddenException } from '@nestjs/common';
import { Ability } from '@casl/ability';
import { PermissionGuard } from './Permission.guard';
import { REQUIRED_PERMISSION_KEY } from './RequirePermission.decorator';
import { AbilitySubject } from './Roles.types';
import { ReportsAction } from '@/modules/FinancialStatements/types/Report.types';
import { AbilitySchema } from './AbilitySchema';
import { staffRolePermissions } from '@/database/tenant/seeds/core/20210812121909_seed_roles_permissions';

import { TrialBalanceSheetController } from '@/modules/FinancialStatements/modules/TrialBalanceSheet/TrialBalanceSheet.controller';
import { CustomerBalanceSummaryController } from '@/modules/FinancialStatements/modules/CustomerBalanceSummary/CustomerBalanceSummary.controller';
import { VendorBalanceSummaryController } from '@/modules/FinancialStatements/modules/VendorBalanceSummary/VendorBalanceSummary.controller';
import { TransactionsByCustomerController } from '@/modules/FinancialStatements/modules/TransactionsByCustomer/TransactionsByCustomer.controller';
import { TransactionsByVendorController } from '@/modules/FinancialStatements/modules/TransactionsByVendor/TransactionsByVendor.controller';
import { TransactionsByReferenceController } from '@/modules/FinancialStatements/modules/TransactionsByReference/TransactionsByReference.controller';
import { SalesByItemsController } from '@/modules/FinancialStatements/modules/SalesByItems/SalesByItems.controller';
import { PurchasesByItemReportController } from '@/modules/FinancialStatements/modules/PurchasesByItems/PurchasesByItems.controller';
import { InventoryValuationController } from '@/modules/FinancialStatements/modules/InventoryValuationSheet/InventoryValuation.controller';
import { InventoryItemDetailsController } from '@/modules/FinancialStatements/modules/InventoryItemDetails/InventoryItemDetails.controller';
import { SalesTaxLiabilitySummaryController } from '@/modules/FinancialStatements/modules/SalesTaxLiabilitySummary/SalesTaxLiabilitySummary.controller';
import { activeCode } from '../../testing/activeCode';

/**
 * Шаг В1 карты v9: отчёты спрашивают права.
 *
 * Запись мы закрыли в фазе v8, а чтение осталось наполовину размеченным. Живая
 * проба за приглашённого сотрудника показала перекос: Баланс, ОПиУ, движение
 * денег, главная книга и журнал закрыты, но **оборотно-сальдовая ведомость
 * открыта** — а она показывает обороты и остатки по ВСЕМ счетам организации,
 * то есть ту же картину, только подробнее. Вместе с ней были открыты остатки и
 * обороты по всем контрагентам, продажи по позициям и оценка склада.
 *
 * Решение (§5 вопрос 11 карты v9): сотруднику остаются отчёты **по
 * контрагентам** — с кем сколько наработали и кто сколько должен: это его
 * повседневная работа со счетами и оплатами. Общая финансовая картина
 * организации — Баланс, ОПиУ, ДДС, главная книга, журнал, ОСВ, продажи и
 * закупки по позициям, склад и налог — остаётся администратору.
 */

type Gate = {
  title: string;
  controller: any;
  handler: string;
  ability: string;
  /** Видит ли этот отчёт роль «Сотрудник». */
  staffSees: boolean;
};

const REPORT_GATES: Gate[] = [
  {
    title: 'оборотно-сальдовая ведомость',
    controller: TrialBalanceSheetController,
    handler: 'getTrialBalanceSheet',
    ability: ReportsAction.READ_TRIAL_BALANCE_SHEET,
    staffSees: false,
  },
  {
    title: 'остатки по покупателям',
    controller: CustomerBalanceSummaryController,
    handler: 'customerBalanceSummary',
    ability: ReportsAction.READ_CUSTOMERS_SUMMARY_BALANCE,
    staffSees: true,
  },
  {
    title: 'остатки по поставщикам',
    controller: VendorBalanceSummaryController,
    handler: 'vendorBalanceSummary',
    ability: ReportsAction.READ_VENDORS_SUMMARY_BALANCE,
    staffSees: true,
  },
  {
    title: 'обороты по покупателям',
    controller: TransactionsByCustomerController,
    handler: 'transactionsByCustomer',
    ability: ReportsAction.READ_CUSTOMERS_TRANSACTIONS,
    staffSees: true,
  },
  {
    title: 'обороты по поставщикам',
    controller: TransactionsByVendorController,
    handler: 'transactionsByVendor',
    ability: ReportsAction.READ_VENDORS_TRANSACTIONS,
    staffSees: true,
  },
  {
    title: 'операции по документу',
    controller: TransactionsByReferenceController,
    handler: 'getTransactionsByReference',
    ability: ReportsAction.READ_JOURNAL,
    staffSees: false,
  },
  {
    title: 'продажи по позициям',
    controller: SalesByItemsController,
    handler: 'salesByitems',
    ability: ReportsAction.READ_SALES_BY_ITEMS,
    staffSees: false,
  },
  {
    title: 'закупки по позициям',
    controller: PurchasesByItemReportController,
    handler: 'purchasesByItems',
    ability: ReportsAction.READ_PURCHASES_BY_ITEMS,
    staffSees: false,
  },
  {
    title: 'оценка склада',
    controller: InventoryValuationController,
    handler: 'getInventoryValuationSheet',
    ability: ReportsAction.READ_INVENTORY_VALUATION_SUMMARY,
    staffSees: false,
  },
  {
    title: 'движение позиций склада',
    controller: InventoryItemDetailsController,
    handler: 'inventoryItemDetails',
    ability: ReportsAction.READ_INVENTORY_ITEM_DETAILS,
    staffSees: false,
  },
  {
    title: 'налог с продаж',
    controller: SalesTaxLiabilitySummaryController,
    handler: 'getSalesTaxLiabilitySummary',
    ability: ReportsAction.READ_SALES_TAX_LIABILITY_SUMMARY,
    staffSees: false,
  },
];

const abilityFrom = (rules: Array<{ action: string; subject: string }>) =>
  new Ability(rules);

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

const contextFor = (gate: Gate, ability: Ability) =>
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

describe('отчёты спрашивают права', () => {
  it.each(REPORT_GATES)('$title — пометка стоит', (gate) => {
    const declared = Reflect.getMetadata(
      REQUIRED_PERMISSION_KEY,
      gate.controller.prototype[gate.handler],
    );

    expect({ title: gate.title, declared }).toEqual({
      title: gate.title,
      declared: { ability: gate.ability, subject: AbilitySubject.Report },
    });
  });

  it.each(REPORT_GATES)('$title — страж подключён', (gate) => {
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

  it.each(REPORT_GATES)('$title — владельцу видно', (gate) => {
    expect(guard().canActivate(contextFor(gate, adminAbility()))).toBe(true);
  });

  it.each(REPORT_GATES)('$title — сотрудник видит ровно по решению', (gate) => {
    const ability = staffAbility();
    let allowed = true;

    try {
      guard().canActivate(contextFor(gate, ability));
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      allowed = false;
    }

    expect({ title: gate.title, allowed }).toEqual({
      title: gate.title,
      allowed: gate.staffSees,
    });
  });

  it('каждое требуемое право объявлено в схеме ролей', () => {
    // Иначе владелец не сможет выдать его своей роли через интерфейс: право
    // спрашивается, а поставить галочку негде.
    const subject = AbilitySchema.find(
      (item) => item.subject === AbilitySubject.Report,
    );
    const declared = (subject?.extraAbilities ?? []).map((item) => item.key);

    const missing = REPORT_GATES.map((gate) => gate.ability).filter(
      (ability) => !declared.includes(ability),
    );

    expect(missing).toEqual([]);
  });

  it('ни один отчёт не остался без пометки', () => {
    // Обходим ВСЕ отчётные контроллеры: список выше может отстать от жизни,
    // а этот счёт — нет.
    const dir = path.resolve(__dirname, '..', 'FinancialStatements', 'modules');

    const controllers = (folder: string): string[] =>
      fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(folder, entry.name);
        if (entry.isDirectory()) return controllers(full);
        return entry.name.endsWith('.controller.ts') ? [full] : [];
      });

    const unmarked = controllers(dir)
      .filter((file) => {
        const text = activeCode(fs.readFileSync(file, 'utf8'));
        return !text.includes('@RequirePermission(');
      })
      .map((file) => path.basename(file));

    expect(unmarked).toEqual([]);
  });
});
