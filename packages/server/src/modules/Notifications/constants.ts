// © 2026 Bigfin
export const NOTIFICATION_EVENTS = ['cash_gap', 'low_balance', 'overdue'] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const NOTIFICATIONS_QUEUE = 'notifications-evaluation';
export const NOTIFICATIONS_EVAL_JOB = 'evaluate-tenant';

// ㉓ Быстрый ввод из Telegram — отдельная очередь: на одну очередь BullMQ
// должен приходиться один воркер, иначе задачи разбирают оба вперемешку.
export const TELEGRAM_ENTRIES_QUEUE = 'telegram-quick-entries';
export const TELEGRAM_ENTRIES_JOB = 'pull-telegram-entries';

export const DEFAULT_COOLDOWN_HOURS = 24;
export const DEFAULT_CASH_GAP_HORIZON_DAYS = 7;

// In-app лента и бейдж непрочитанных показывают только окно последних N дней.
// Единое окно для list() и unreadCount() гарантирует, что счётчик и выпадашка
// согласованы, а COUNT не растёт безгранично вместе с историей уведомлений.
export const FEED_WINDOW_DAYS = 90;

export const SETTINGS_GROUP = 'notifications';

// Settings keys (group `notifications`).
export const SETTINGS_KEYS = {
  RECIPIENT_EMAIL: 'recipient_email',
  COOLDOWN_HOURS: 'cooldown_hours',
  TELEGRAM_BOT_TOKEN: 'telegram_bot_token',
  TELEGRAM_CHAT_ID: 'telegram_chat_id',
  // ㉓ Быстрый ввод операций из Telegram.
  TELEGRAM_LAST_UPDATE_ID: 'telegram_last_update_id',
  TELEGRAM_ENTRY_ACCOUNT_ID: 'telegram_entry_account_id',
};

export const ERRORS = {
  INVALID_EVENT_TYPE: 'INVALID_EVENT_TYPE',
  TELEGRAM_INVALID_TOKEN: 'TELEGRAM_INVALID_TOKEN',
  TELEGRAM_NO_CHAT: 'TELEGRAM_NO_CHAT',
  TELEGRAM_WEBHOOK_SET: 'TELEGRAM_WEBHOOK_SET',
  TELEGRAM_API_ERROR: 'TELEGRAM_API_ERROR',
};
