// © 2026 Bigfin
import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { Ability } from '@casl/ability';
import { PermissionGuard } from './Permission.guard';
import { REQUIRED_PERMISSION_KEY } from './RequirePermission.decorator';
import { REQUIRE_OWNER_KEY } from './RequireOwner.decorator';
import { OwnerGuard } from './Owner.guard';
import { AbilitySubject } from './Roles.types';
import { AttachmentAction } from '@/modules/Attachments/Attachments.types';
import { staffRolePermissions } from '@/database/tenant/seeds/core/20210812121909_seed_roles_permissions';

import { AttachmentsController } from '@/modules/Attachments/Attachments.controller';
import { SubscriptionsController } from '@/modules/Subscription/Subscriptions.controller';
import { StripeIntegrationController } from '@/modules/StripePayment/StripePayment.controller';
import { PaymentServicesController } from '@/modules/PaymentServices/PaymentServices.controller';

/**
 * Последняя группа шага П1 карты v8: вложения и приём платежей с подпиской.
 *
 * Три разных решения в одной группе:
 *
 * 1. **Вложения.** Приложить файл к документу — повседневная работа, но права
 *    на это в схеме не было вовсе: у вложений значились только просмотр и
 *    удаление. Добавлено «создание», и роль «Сотрудник» его получает —
 *    иначе она смогла бы открыть договор, но не приложить.
 * 2. **Подписка на сам продукт** — деньги владельца: сменить тариф или
 *    отменить подписку может только он, как и в случае с ролями и составом
 *    участников. Право внутри организации тут не подходит.
 * 3. **Приём платежей** (эквайринг, способы оплаты) — подключение внешней
 *    системы, как остальные интеграции: права администратора.
 */

type Gate = {
  title: string;
  controller: any;
  handler: string;
  ability: string;
  subject: string;
};

const PAYMENT_GATES: Gate[] = [
  {
    title: 'приложить файл',
    controller: AttachmentsController,
    handler: 'uploadAttachment',
    ability: AttachmentAction.Create,
    subject: AbilitySubject.Attachment,
  },
  {
    title: 'привязать файл к документу',
    controller: AttachmentsController,
    handler: 'linkDocument',
    ability: AttachmentAction.Create,
    subject: AbilitySubject.Attachment,
  },
  {
    title: 'отвязать файл от документа',
    controller: AttachmentsController,
    handler: 'unlinkDocument',
    ability: AttachmentAction.Delete,
    subject: AbilitySubject.Attachment,
  },

  // Эквайринг и способы оплаты — подключение внешней системы.
  {
    title: 'подключить Stripe по коду',
    controller: StripeIntegrationController,
    handler: 'exchangeOAuth',
    ability: 'manage',
    subject: 'all',
  },
  {
    title: 'завести счёт Stripe',
    controller: StripeIntegrationController,
    handler: 'createAccount',
    ability: 'manage',
    subject: 'all',
  },
  {
    title: 'открыть окно Stripe',
    controller: StripeIntegrationController,
    handler: 'createAccountSession',
    ability: 'manage',
    subject: 'all',
  },
  {
    title: 'получить ссылку Stripe',
    controller: StripeIntegrationController,
    handler: 'createAccountLink',
    ability: 'manage',
    subject: 'all',
  },
  {
    title: 'настроить способ оплаты',
    controller: PaymentServicesController,
    handler: 'updatePaymentMethod',
    ability: 'manage',
    subject: 'all',
  },
  {
    title: 'убрать способ оплаты',
    controller: PaymentServicesController,
    handler: 'deletePaymentMethod',
    ability: 'manage',
    subject: 'all',
  },
];

/** Подписка на продукт: только владелец организации. */
const OWNER_ONLY_HANDLERS = [
  'getCheckoutUrl',
  'cancelSubscription',
  'resumeSubscription',
  'changeSubscriptionPlan',
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

describe('вложения и приём платежей спрашивают права', () => {
  it.each(PAYMENT_GATES)('$title — пометка стоит', (gate) => {
    const declared = Reflect.getMetadata(
      REQUIRED_PERMISSION_KEY,
      gate.controller.prototype[gate.handler],
    );

    expect({ title: gate.title, declared }).toEqual({
      title: gate.title,
      declared: { ability: gate.ability, subject: gate.subject },
    });
  });

  it.each(PAYMENT_GATES)('$title — страж подключён', (gate) => {
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

  it.each(PAYMENT_GATES)('$title — владельцу можно', (gate) => {
    expect(guard().canActivate(contextFor(gate, adminAbility()))).toBe(true);
  });

  it('сотрудник прикладывает и привязывает файл, но не отвязывает', () => {
    const ability = staffAbility();
    const byTitle = (title: string) =>
      PAYMENT_GATES.find((gate) => gate.title === title)!;

    expect(
      guard().canActivate(contextFor(byTitle('приложить файл'), ability)),
    ).toBe(true);
    expect(
      guard().canActivate(
        contextFor(byTitle('привязать файл к документу'), ability),
      ),
    ).toBe(true);
    expect(() =>
      guard().canActivate(
        contextFor(byTitle('отвязать файл от документа'), ability),
      ),
    ).toThrow(ForbiddenException);
  });

  it('приём платежей сотруднику не даётся', () => {
    const ability = staffAbility();

    PAYMENT_GATES.filter((gate) => gate.subject === 'all').forEach((gate) => {
      expect(() => guard().canActivate(contextFor(gate, ability))).toThrow(
        ForbiddenException,
      );
    });
  });

  it.each(OWNER_ONLY_HANDLERS)('подписка: %s — только владелец', (handler) => {
    const required = Reflect.getMetadata(
      REQUIRE_OWNER_KEY,
      SubscriptionsController.prototype[handler],
    );

    const guards: any[] =
      Reflect.getMetadata('__guards__', SubscriptionsController) ?? [];

    expect({
      handler,
      required,
      guarded: guards.some((item) => item === OwnerGuard),
    }).toEqual({ handler, required: true, guarded: true });
  });

  it('обработчики названы верно — иначе тест сторожит пустоту', () => {
    const missing = [
      ...PAYMENT_GATES.filter(
        (gate) => typeof gate.controller.prototype[gate.handler] !== 'function',
      ).map((gate) => `${gate.controller.name}.${gate.handler}`),
      ...OWNER_ONLY_HANDLERS.filter(
        (handler) =>
          typeof SubscriptionsController.prototype[handler] !== 'function',
      ).map((handler) => `SubscriptionsController.${handler}`),
    ];

    expect(missing).toEqual([]);
  });
});
