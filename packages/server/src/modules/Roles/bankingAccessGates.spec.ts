// © 2026 Bigfin
import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { MongoAbility, createMongoAbility } from '@casl/ability';
import { PermissionGuard } from './Permission.guard';
import { REQUIRED_PERMISSION_KEY } from './RequirePermission.decorator';
import { AbilitySubject } from './Roles.types';
import { AccountAction } from '@/interfaces/Account';
import { PreferencesAction } from '@/modules/Settings/Settings.types';
import { CashflowAction } from '@/modules/BankingTransactions/types/BankingTransactions.types';
import { staffRolePermissions } from '@/database/tenant/seeds/core/20210812121909_seed_roles_permissions';

import { BankRulesController } from '@/modules/BankRules/BankRules.controller';
import { BankAccountsController } from '@/modules/BankingAccounts/BankAccounts.controller';
import { BankingCategorizeController } from '@/modules/BankingCategorize/BankingCategorize.controller';
import { BankingMatchingController } from '@/modules/BankingMatching/BankingMatching.controller';
import { BankingTransactionsController } from '@/modules/BankingTransactions/controllers/BankingTransactions.controller';
import { BankingTransactionsExcludeController } from '@/modules/BankingTransactionsExclude/BankingTransactionsExclude.controller';
import { BankingPlaidController } from '@/modules/BankingPlaid/BankingPlaid.controller';

/**
 * Денежная группа шага П1 карты v8: банк, правила разбора, сопоставление.
 *
 * Разведка показала, что половина записывающих ручек продукта не спрашивает
 * прав вовсе. Деньги идут первыми: тут приглашённый человек мог создать
 * банковскую операцию, разнести чужую выписку по статьям, отменить разноску,
 * спрятать операцию из ленты и отключить банковскую подачу — всё это роль
 * «Сотрудник» ему не давала.
 *
 * Тест проверяет не текст файла, а поведение: берёт настоящую пометку с
 * настоящего обработчика, собирает права роли «Сотрудник» ровно так же, как
 * это делает приложение, и спрашивает у НАСТОЯЩЕГО стража, пройдёт ли запрос.
 *
 * Чтение (GET) намеренно оставлено открытым: спрятать ленту операций от
 * сотрудника — решение о продукте, а не закрытие дыры. Здесь закрывается
 * только запись.
 */

type Gate = {
  /** Понятное человеку название ручки — попадает в сообщение упавшего теста. */
  title: string;
  controller: any;
  handler: string;
  ability: string;
  subject: string;
};

const MONEY_GATES: Gate[] = [
  // Операции по банку — предмет «Движение денег».
  {
    title: 'создать банковскую операцию',
    controller: BankingTransactionsController,
    handler: 'createTransaction',
    ability: CashflowAction.Create,
    subject: AbilitySubject.Cashflow,
  },
  {
    title: 'удалить банковскую операцию',
    controller: BankingTransactionsController,
    handler: 'deleteTransaction',
    ability: CashflowAction.Delete,
    subject: AbilitySubject.Cashflow,
  },

  // Разбор выписки: отнести операцию к статье или к расходу.
  {
    title: 'разнести операцию',
    controller: BankingCategorizeController,
    handler: 'categorizeTransaction',
    ability: CashflowAction.Create,
    subject: AbilitySubject.Cashflow,
  },
  {
    title: 'разнести операцию как расход',
    controller: BankingCategorizeController,
    handler: 'categorizeTransactionAsExpense',
    ability: CashflowAction.Create,
    subject: AbilitySubject.Cashflow,
  },
  {
    title: 'отменить разноску пачкой',
    controller: BankingCategorizeController,
    handler: 'uncategorizeTransactionsBulk',
    ability: CashflowAction.Delete,
    subject: AbilitySubject.Cashflow,
  },
  {
    title: 'отменить разноску операции',
    controller: BankingCategorizeController,
    handler: 'uncategorizeTransaction',
    ability: CashflowAction.Delete,
    subject: AbilitySubject.Cashflow,
  },

  // Сопоставление операции с документом.
  {
    title: 'сопоставить операцию с документом',
    controller: BankingMatchingController,
    handler: 'matchTransaction',
    ability: CashflowAction.Create,
    subject: AbilitySubject.Cashflow,
  },
  {
    title: 'разорвать сопоставление',
    controller: BankingMatchingController,
    handler: 'unmatchMatchedTransaction',
    ability: CashflowAction.Delete,
    subject: AbilitySubject.Cashflow,
  },

  // Исключение операций из ленты. Обе стороны — по одному праву: кто прячет
  // операцию, тот и возвращает её обратно.
  {
    title: 'спрятать операции пачкой',
    controller: BankingTransactionsExcludeController,
    handler: 'excludeBankTransactions',
    ability: CashflowAction.Delete,
    subject: AbilitySubject.Cashflow,
  },
  {
    title: 'вернуть операции пачкой',
    controller: BankingTransactionsExcludeController,
    handler: 'unexcludeBankTransactions',
    ability: CashflowAction.Delete,
    subject: AbilitySubject.Cashflow,
  },
  {
    title: 'спрятать операцию',
    controller: BankingTransactionsExcludeController,
    handler: 'excludeBankTransaction',
    ability: CashflowAction.Delete,
    subject: AbilitySubject.Cashflow,
  },
  {
    title: 'вернуть операцию',
    controller: BankingTransactionsExcludeController,
    handler: 'unexcludeBankTransaction',
    ability: CashflowAction.Delete,
    subject: AbilitySubject.Cashflow,
  },

  // Банковский счёт — это счёт учёта, поэтому право на правку счёта.
  {
    title: 'отключить банковскую подачу',
    controller: BankAccountsController,
    handler: 'disconnectBankAccount',
    ability: AccountAction.EDIT,
    subject: AbilitySubject.Account,
  },
  {
    title: 'обновить банковскую подачу',
    controller: BankAccountsController,
    handler: 'refreshBankAccount',
    ability: AccountAction.EDIT,
    subject: AbilitySubject.Account,
  },
  {
    title: 'приостановить банковскую подачу',
    controller: BankAccountsController,
    handler: 'pauseBankAccount',
    ability: AccountAction.EDIT,
    subject: AbilitySubject.Account,
  },
  {
    title: 'возобновить банковскую подачу',
    controller: BankAccountsController,
    handler: 'resumeBankAccount',
    ability: AccountAction.EDIT,
    subject: AbilitySubject.Account,
  },

  // Правило разбора действует само и на всю организацию — это настройка,
  // а не разовая операция.
  {
    title: 'создать правило разбора',
    controller: BankRulesController,
    handler: 'createBankRule',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'изменить правило разбора',
    controller: BankRulesController,
    handler: 'editBankRule',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },
  {
    title: 'удалить правило разбора',
    controller: BankRulesController,
    handler: 'deleteBankRule',
    ability: PreferencesAction.Mutate,
    subject: AbilitySubject.Preferences,
  },

  // Подключение внешнего банка — как остальные интеграции (шаг П6).
  {
    title: 'запросить ключ подключения банка',
    controller: BankingPlaidController,
    handler: 'getLinkToken',
    ability: 'manage',
    subject: 'all',
  },
  {
    title: 'подключить банк по обмену ключа',
    controller: BankingPlaidController,
    handler: 'exchangeToken',
    ability: 'manage',
    subject: 'all',
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

/** Настоящий страж с настоящим чтением пометок. */
const guard = () =>
  new PermissionGuard({
    getAllAndOverride: (_key: string, targets: any[]) =>
      targets
        .map((target) => Reflect.getMetadata(REQUIRED_PERMISSION_KEY, target))
        .find(Boolean),
  } as any);

describe('денежные ручки спрашивают права', () => {
  it.each(MONEY_GATES)('$title — пометка стоит', (gate) => {
    const declared = Reflect.getMetadata(
      REQUIRED_PERMISSION_KEY,
      gate.controller.prototype[gate.handler],
    );

    expect({ title: gate.title, declared }).toEqual({
      title: gate.title,
      declared: { ability: gate.ability, subject: gate.subject },
    });
  });

  it.each(MONEY_GATES)('$title — страж подключён к контроллеру', (gate) => {
    const guards: any[] = Reflect.getMetadata('__guards__', gate.controller) ?? [];

    expect({
      title: gate.title,
      guarded: guards.some((item) => item === PermissionGuard),
    }).toEqual({ title: gate.title, guarded: true });
  });

  it.each(MONEY_GATES)('$title — сотруднику отказ', (gate) => {
    expect(() =>
      guard().canActivate(contextFor(gate, staffAbility())),
    ).toThrow(ForbiddenException);
  });

  it.each(MONEY_GATES)('$title — владельцу можно', (gate) => {
    expect(guard().canActivate(contextFor(gate, adminAbility()))).toBe(true);
  });

  it('обработчики названы верно — иначе тест сторожит пустоту', () => {
    const missing = MONEY_GATES.filter(
      (gate) => typeof gate.controller.prototype[gate.handler] !== 'function',
    ).map((gate) => `${gate.controller.name}.${gate.handler}`);

    expect(missing).toEqual([]);
  });

  it('денежная группа закрыта целиком', () => {
    // Двадцать одна записывающая ручка в семи контроллерах. Число меняется
    // только вместе с осознанным решением, что группа стала другой.
    expect(MONEY_GATES).toHaveLength(21);
  });
});
