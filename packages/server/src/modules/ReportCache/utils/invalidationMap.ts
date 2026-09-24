// © 2026 Bigfin
import { events } from '@/common/events/events';

/**
 * Карта инвалидации кэша отчётов (FT-093 ТЗ-3).
 *
 * Два слоя сброса:
 * 1. Любой успешный изменяющий запрос человека сбрасывает кэш своей
 *    организации (`ReportCache.interceptor.ts`). Он ловит и модули, которые
 *    событий не шлют вовсе (статьи, правила распределения, бюджеты, планы).
 * 2. Эта карта — для изменений БЕЗ запроса: синхронизация банка, разбор
 *    выписки в очереди, пересчёт по расписанию. Здесь решение принимается
 *    по ГРУППЕ событий: новая группа не попадёт ни в один список, и сторож
 *    `invalidationMap.spec.ts` заставит решить, влияет ли она на отчёты.
 */

/** Группы, любое событие которых меняет данные отчётов. */
export const INVALIDATING_GROUPS = [
  'accounts',
  'contacts',
  'manualJournals',
  'expenses',
  'saleInvoice',
  'saleReceipt',
  'paymentReceive',
  'bill',
  'billPayment',
  'customers',
  'vendors',
  'item',
  'inventory',
  'inventoryAdjustment',
  'billLandedCost',
  'cashflow',
  'paymentRequest',
  'creditNote',
  'vendorCredit',
  'transactionsLocking',
  'warehouseTransfer',
  'branch',
  'project',
  'taxRates',
  'plaid',
  'bankRules',
  'bankMatch',
  'bankTransactions',
  'bankAccount',
  'import',
  'organization',
] as const;

/**
 * Группы, которые отчётов не меняют. Причина — рядом: «не влияет» тоже
 * решение, и через год его должно быть видно.
 */
export const IGNORED_GROUPS: Record<string, string> = {
  auth: 'вход и регистрация — не данные организации',
  inviteUser: 'приглашения в команду',
  workspace: 'рабочие пространства — вне организации',
  subscription: 'тариф и оплата подписки Bigfin',
  tenantManager: 'создание базы организации — отчётов ещё нет',
  saleEstimate: 'предложение клиенту не создаёт проводок',
  itemCategory: 'категория позиции — справочник для поиска',
  mcp: 'чтение агентом ничего не меняет',
  roles: 'права меняют ключ кэша (он по пользователю), а не данные',
  tenantUser: 'состав команды',
  warehouse: 'карточка склада без движения товара',
  projectTask: 'задачи проекта без денег',
  projectTime: 'учёт часов проекта без проводок',
  pdfTemplate: 'шаблон печатной формы',
  paymentMethod: 'способы оплаты счёта клиентом',
  paymentIntegrationLink: 'ссылка на оплату',
  stripeIntegration: 'подключение платёжного сервиса',
  stripeWebhooks: 'уведомления платёжного сервиса — деньги приходят операцией',
  reports: 'события самих отчётов',
};

/** Все имена событий, после которых кэш организации сбрасывается. */
export function invalidatingEventNames(): string[] {
  const names: string[] = [];
  for (const group of INVALIDATING_GROUPS) {
    const entries = (events as any)[group];
    if (!entries) continue;
    for (const value of Object.values(entries)) {
      if (typeof value === 'string') names.push(value);
    }
  }
  return Array.from(new Set(names));
}
