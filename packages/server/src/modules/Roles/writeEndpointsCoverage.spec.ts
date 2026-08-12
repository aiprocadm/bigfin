// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import {
  parseWriteEndpoints,
  endpointKey,
} from '@/common/utils/findUnguardedWriteEndpoints';

/**
 * Сплошная разметка прав (шаг П1 карты v8) под машинной проверкой.
 *
 * Разметка идёт группами, и без сторожа список неизбежно разъедется обратно:
 * новая ручка пишется без пометки, и по коду это не видно — она просто
 * работает у всех. Ровно так уже случалось с флагами модулей (#204) и с
 * «мнимой защитой» (#221).
 *
 * Правило простое: у каждой ручки записи либо стоит пометка права, либо она
 * записана здесь — с причиной. Оба списка могут только сокращаться.
 */
const MODULES_DIR = path.resolve(__dirname, '..');

/**
 * Открыты намеренно. Закрыть их правом нельзя: в этот момент прав ещё нет
 * или запрос приходит не от человека.
 */
const OPEN_BY_DESIGN: string[] = [
  // Вход, регистрация и восстановление пароля — до всякой организации.
  'Auth/Auth.controller.ts#signin',
  'Auth/Auth.controller.ts#signinTwoFactor',
  'Auth/Auth.controller.ts#signup',
  'Auth/Auth.controller.ts#signupConfirm',
  'Auth/Auth.controller.ts#sendResetPassword',
  'Auth/Auth.controller.ts#resetPassword',
  'Auth/Authed.controller.ts#resendSignupConfirm',

  // Приглашение принимает тот, кого ещё нет в организации.
  'UsersModule/UsersInvitePublic.controller.ts#acceptInvite',

  // Создание организации: роли появляются вместе с ней, спрашивать нечего.
  'Organization/Organization.controller.ts#build',

  // Уведомления читает их собственный получатель — это не общие данные.
  'Notifications/Notifications.controller.ts#markAllRead',
  'Notifications/Notifications.controller.ts#markRead',

  // Двухфакторная защита своего личного входа: настраивает её сам человек,
  // а не тот, кому в организации дали больше прав.
  'TwoFactor/TwoFactor.controller.ts#setup',
  'TwoFactor/TwoFactor.controller.ts#enable',
  'TwoFactor/TwoFactor.controller.ts#disable',
  'TwoFactor/TwoFactor.controller.ts#regenerate',

  // Приём уведомлений от банка и платёжных систем: запрос приходит от них,
  // а не от пользователя, и проверяется подписью.
  'BankingPlaid/BankingPlaidWebhooks.controller.ts#webhooks',
  'CrmIntegration/CrmWebhooks.controller.ts#inbound',
  'StripePayment/StripePaymentWebhooks.controller.ts#handleWebhook',
  'Subscription/SubscriptionsLemonWebhook.controller.ts#lemonWebhooks',
];

/**
 * Ещё не размечено — долг шага П1.
 *
 * Список ведётся честно, чтобы остаток был виден числом, а не «когда-нибудь
 * дойдём». Он может только сокращаться: разметили ручку — убрали строку.
 * Добавлять сюда новое нельзя, для этого есть проверка ниже.
 */
const NOT_YET_MARKED: string[] = [
  // Вложения: у загрузки права нет намеренно (приложить файл к своему
  // документу — часть работы с документом), а привязка и отвязка ждут
  // решения, каким правом их мерить.
  'Attachments/Attachments.controller.ts#uploadAttachment',
  'Attachments/Attachments.controller.ts#linkDocument',
  'Attachments/Attachments.controller.ts#unlinkDocument',

  // Планирование и долги: своего предмета в схеме прав нет, нужно решение.
  'Budgets/Budgets.controller.ts#create',
  'Budgets/Budgets.controller.ts#edit',
  'Budgets/Budgets.controller.ts#upsertLines',
  'Budgets/Budgets.controller.ts#delete',
  'Debts/Debts.controller.ts#remind',
  'Debts/Debts.controller.ts#createRepaymentPlan',
  'Debts/Debts.controller.ts#editRepaymentPlan',
  'Debts/Debts.controller.ts#deleteRepaymentPlan',
  'Debts/Debts.controller.ts#markInstallmentPaid',
  'PaymentCalendar/PaymentCalendar.controller.ts#createPlannedOperation',
  'PaymentCalendar/PaymentCalendar.controller.ts#editPlannedOperation',
  'PaymentCalendar/PaymentCalendar.controller.ts#deletePlannedOperation',
  'PaymentRequests/PaymentRequests.controller.ts#create',
  'PaymentRequests/PaymentRequests.controller.ts#cancel',

  // Сделки и их этапы.
  'Deals/Deals.controller.ts#create',
  'Deals/Deals.controller.ts#edit',
  'Deals/Deals.controller.ts#remove',
  'Deals/DealStages.controller.ts#create',
  'Deals/DealStages.controller.ts#edit',
  'Deals/DealStages.controller.ts#remove',

  // Настройки и обслуживание организации.
  'Import/Import.controller.ts#fileUpload',
  'Import/Import.controller.ts#mapping',
  'Import/Import.controller.ts#import',
  'Organization/Organization.controller.ts#updateOrganization',
  'PdfTemplate/PdfTemplates.controller.ts#createPdfTemplate',
  'PdfTemplate/PdfTemplates.controller.ts#editPdfTemplate',
  'PdfTemplate/PdfTemplates.controller.ts#deletePdfTemplate',
  'PdfTemplate/PdfTemplates.controller.ts#assignPdfTemplateAsDefault',

  // Приём платежей и подписка на сам продукт: тут нужно отдельное решение —
  // платит владелец, а ссылка на оплату счёта живёт наружу, для покупателя.
  'PaymentLinks/PaymentLinks.controller.ts#createInvoicePaymentLinkCheckoutSession',
  'PaymentServices/PaymentServices.controller.ts#updatePaymentMethod',
  'PaymentServices/PaymentServices.controller.ts#deletePaymentMethod',
  'StripePayment/StripePayment.controller.ts#exchangeOAuth',
  'StripePayment/StripePayment.controller.ts#createAccount',
  'StripePayment/StripePayment.controller.ts#createAccountSession',
  'StripePayment/StripePayment.controller.ts#createAccountLink',
  'Subscription/Subscriptions.controller.ts#getCheckoutUrl',
  'Subscription/Subscriptions.controller.ts#cancelSubscription',
  'Subscription/Subscriptions.controller.ts#resumeSubscription',
  'Subscription/Subscriptions.controller.ts#changeSubscriptionPlan',

  // Рабочие пространства — часть, доставшаяся от исходной кодовой базы.
  'ee/Workspaces/Workspaces.controller.ts#createWorkspace',
  'ee/Workspaces/Workspaces.controller.ts#deleteWorkspace',
  'ee/Workspaces/Workspaces.controller.ts#inactivateWorkspace',
  'ee/Workspaces/Workspaces.controller.ts#activateWorkspace',
  'ee/Workspaces/Workspaces.controller.ts#setDefaultWorkspace',
];

const controllerFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return controllerFiles(full);
    return entry.name.endsWith('.controller.ts') ? [full] : [];
  });

const allEndpoints = () =>
  controllerFiles(MODULES_DIR).flatMap((file) =>
    parseWriteEndpoints(
      fs.readFileSync(file, 'utf8'),
      path.relative(MODULES_DIR, file).split(path.sep).join('/'),
    ),
  );

describe('каждая ручка записи спрашивает права или объявлена открытой', () => {
  const endpoints = allEndpoints();
  const open = endpoints.filter((endpoint) => !endpoint.guarded);
  const openKeys = open.map(endpointKey);
  const known = [...OPEN_BY_DESIGN, ...NOT_YET_MARKED];

  it('ручки записи найдены', () => {
    // Если обходчик сломается, он найдёт ноль ручек и «всё будет хорошо».
    expect(endpoints.length).toBeGreaterThan(250);
  });

  it('новых открытых ручек не появилось', () => {
    const surprises = openKeys.filter((key) => !known.includes(key));

    expect(surprises).toEqual([]);
  });

  it('в списках нет выдуманных записей', () => {
    // Разметили ручку — убрали строку из списка, иначе список врёт.
    const stale = known.filter((key) => !openKeys.includes(key));

    expect(stale).toEqual([]);
  });

  it('долг разметки виден числом и может только сокращаться', () => {
    // Число меняется вместе с осознанной работой: разметили группу —
    // уменьшили. Увеличить его без правки этого теста нельзя.
    expect(NOT_YET_MARKED).toHaveLength(47);
  });
});
