// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import {
  parseWriteEndpoints,
  endpointKey,
} from '@/common/utils/findUnguardedWriteEndpoints';
import { activeCode } from '../../testing/activeCode';

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

  // Демо «в один щелчок» (Д1 карты v18): и создание демо, и вход в него
  // происходят ДО всякой организации — прав в этот момент не существует.
  // Вместо права здесь стоят три засова: флаг `ONE_CLICK_DEMO_ENABLE` (по
  // умолчанию выключен, проверяется в каждой службе), предел частоты по
  // адресу и вход только по случайному ключу демо.
  'OneClickDemo/OneClickDemo.controller.ts#createOneClickDemo',
  'OneClickDemo/OneClickDemo.controller.ts#signin',

  // ИИ-чат (этап 14 ТЗ): POST здесь только потому, что вопрос — это текст,
  // и его отправляют телом запроса. Ручка НИЧЕГО НЕ МЕНЯЕТ: она читает те же
  // отчёты, что человек и так видит на экране. Требовать право на запись
  // значило бы, что вопрос о своих же цифрах доступен меньшему числу людей,
  // чем сам отчёт.
  'AiChat/AiChat.controller.ts#ask',

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

  // Оплата счёта по ссылке — поток для ПОКУПАТЕЛЯ, а не для участника
  // организации: он открывает ссылку без входа, видит счёт и платит.
  // Контроллер помечен публичным (решение владельца, шаг В4 карты v9),
  // организация ищется по самой ссылке. Право внутри организации тут
  // неприменимо.
  'PaymentLinks/PaymentLinks.controller.ts#createInvoicePaymentLinkCheckoutSession',
];

/**
 * Ещё не размечено — долг шага П1.
 *
 * Список ведётся честно, чтобы остаток был виден числом, а не «когда-нибудь
 * дойдём». Он может только сокращаться: разметили ручку — убрали строку.
 * Добавлять сюда новое нельзя, для этого есть проверка ниже.
 */
const NOT_YET_MARKED: string[] = [];

/**
 * Проверка есть, но живёт не в пометке права.
 *
 * Рабочие пространства — это сами организации пользователя, и мерить их
 * правами ВНУТРИ организации неверно: удаление организации в набор её прав не
 * входит. Службы сверяют системное членство: владелец этой организации или
 * нет. Отдельный тест (`adminAccessGates.spec.ts`) следит, чтобы эта сверка
 * не пропала.
 */
const GUARDED_ELSEWHERE: string[] = [
  // Заявку на оплату подаёт любой участник — в этом смысл модуля: сотрудник
  // просит оплатить счёт, а решение принимает администратор (одобрение и
  // отказ уже требуют полных прав).
  'PaymentRequests/PaymentRequests.controller.ts#create',
  // Отменяет заявку её автор — или тот, кто заявки одобряет. Правом такое не
  // описать: важно, ЧЬЯ это заявка, поэтому проверка живёт в самой службе.
  'PaymentRequests/PaymentRequests.controller.ts#cancel',

  // Своя новая организация: человек заводит её себе, спрашивать не у кого.
  'ee/Workspaces/Workspaces.controller.ts#createWorkspace',
  // Свой выбор организации по умолчанию.
  'ee/Workspaces/Workspaces.controller.ts#setDefaultWorkspace',
  // Служба требует роль «владелец» в системном членстве.
  'ee/Workspaces/Workspaces.controller.ts#deleteWorkspace',
  'ee/Workspaces/Workspaces.controller.ts#inactivateWorkspace',
  'ee/Workspaces/Workspaces.controller.ts#activateWorkspace',
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
      activeCode(fs.readFileSync(file, 'utf8')),
      path.relative(MODULES_DIR, file).split(path.sep).join('/'),
    ),
  );

describe('каждая ручка записи спрашивает права или объявлена открытой', () => {
  const endpoints = allEndpoints();
  const open = endpoints.filter((endpoint) => !endpoint.guarded);
  const openKeys = open.map(endpointKey);
  const known = [...OPEN_BY_DESIGN, ...GUARDED_ELSEWHERE, ...NOT_YET_MARKED];

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

  it('долга разметки не осталось', () => {
    // Шаг П1 пройден целиком: у каждой записывающей ручки либо пометка права,
    // либо запись в одном из двух списков с причиной. Список долга пуст и
    // должен таким остаться — новая ручка без пометки красит сборку.
    expect(NOT_YET_MARKED).toEqual([]);
  });
});
