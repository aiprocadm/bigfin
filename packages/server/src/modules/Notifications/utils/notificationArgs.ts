// © 2026 Bigfin
/**
 * Подстановки для шаблонов уведомлений (`i18n/{ru,en}/notifications.json`).
 *
 * Эвалуаторы кладут в `payload` «сырые» данные (их форма — контракт БД и API
 * ленты), а шаблоны ждут человеческие поля: `{days}`, `{count}`, `{names}`,
 * форматированные суммы и даты. Эта функция — единственное место маппинга:
 * ею пользуются все каналы (email, telegram) и in-app лента, поэтому дырка
 * вида «через {days} дн.» не может разъехаться по трём местам.
 */

export interface NotificationFormatContext {
  /** Язык организации: 'ru' | 'en' | … */
  locale: string;
  /** Базовая валюта организации (ISO-код, например 'RUB'). */
  currencyCode: string;
}

const LOCALE_TAGS: Record<string, string> = { ru: 'ru-RU', en: 'en-US' };

const localeTag = (locale: string) => LOCALE_TAGS[locale] ?? 'en-US';

/** Денежная сумма в формате языка организации: 421161.41 → «421 161,41 ₽». */
export function formatNotificationMoney(
  value: number,
  ctx: NotificationFormatContext,
): string {
  if (!Number.isFinite(value)) return String(value);
  try {
    return new Intl.NumberFormat(localeTag(ctx.locale), {
      style: 'currency',
      currency: ctx.currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Неизвестный код валюты не должен ронять доставку уведомления.
    return value.toLocaleString(localeTag(ctx.locale));
  }
}

/** Дата ISO `2026-08-09` → «09.08.2026» (ru) / «08/09/2026» (en). */
export function formatNotificationDate(
  value: string,
  ctx: NotificationFormatContext,
): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(localeTag(ctx.locale), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/** Первые имена списком: [А, Б, В, Г] → «А, Б, В +1». */
function formatNames(names: string[], max = 3): string {
  const shown = names.slice(0, max).join(', ');
  const rest = names.length - max;
  return rest > 0 ? `${shown} +${rest}` : shown;
}

/**
 * Собирает аргументы шаблона по типу события.
 *
 * Неизвестный тип события возвращает payload как есть — шаблона для него всё
 * равно нет, а ронять доставку из-за этого нельзя.
 */
export function buildNotificationArgs(
  eventType: string,
  payload: Record<string, any> | null | undefined,
  ctx: NotificationFormatContext,
): Record<string, any> {
  const p = payload ?? {};

  switch (eventType) {
    case 'cash_gap':
      return {
        amount: formatNotificationMoney(Number(p.amount), ctx),
        date: formatNotificationDate(String(p.date), ctx),
        days: p.daysFromStart ?? p.days ?? 0,
      };
    case 'low_balance': {
      const accounts: Array<{ name?: string }> = Array.isArray(p.accounts)
        ? p.accounts
        : [];
      return {
        count: accounts.length,
        minAmount: formatNotificationMoney(Number(p.minAmount ?? 0), ctx),
        names: formatNames(accounts.map((a) => a?.name ?? '?')),
      };
    }
    case 'overdue':
      return {
        count: p.count ?? 0,
        total: formatNotificationMoney(Number(p.total ?? 0), ctx),
      };
    // Н4 карты v22: сумма — деньгами, срок — датой на языке организации.
    case 'tax_due':
      return {
        amount: formatNotificationMoney(Number(p.amount ?? 0), ctx),
        ratePercent: p.ratePercent ?? 0,
        dueDate: formatNotificationDate(String(p.dueDate), ctx),
        daysLeft: p.daysLeft ?? 0,
      };
    default:
      return p;
  }
}
