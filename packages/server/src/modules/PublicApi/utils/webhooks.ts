// © 2026 Bigfin
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Вебхуки: событие → URL (этап 15 ТЗ).
 *
 * Получатель вебхука должен уметь отличить наш вызов от подделки: адрес
 * вебхука рано или поздно узнают, и без подписи любой сможет прислать
 * «кассовый разрыв» или «операция создана».
 */

/** События из ТЗ — минимум, который обязан быть. */
export const WEBHOOK_EVENTS = [
  'transaction.created',
  'transaction.article_changed',
  'payment_request.approved',
  'cash_gap.forecasted',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export function isKnownEvent(event: string): event is WebhookEvent {
  return (WEBHOOK_EVENTS as readonly string[]).includes(event);
}

/**
 * Подпись доставки.
 *
 * Подписывается **тело вместе со временем**. Без времени перехваченный вызов
 * можно повторять бесконечно, и получатель не отличит повтор от нового
 * события: подпись-то верная.
 */
export function signPayload(
  payload: string,
  secret: string,
  timestamp: number,
): string {
  return createHmac('sha256', String(secret ?? ''))
    .update(`${timestamp}.${payload}`)
    .digest('hex');
}

/** Сколько секунд подпись считается свежей. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * Проверка подписи на стороне получателя — её же используем в тестах.
 *
 * Сравнение постоянного времени: обычное сравнение выходит на первом
 * различии, и по времени ответа подпись подбирается посимвольно.
 */
export function verifySignature(
  payload: string,
  secret: string,
  timestamp: number,
  signature: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  // Время должно быть числом. Иначе сравнение даёт NaN, а `NaN > 300` — это
  // «нет»: проверка свежести пропустила бы что угодно, притворяясь рабочей.
  if (!Number.isFinite(Number(timestamp))) return false;

  // Слишком старая подпись отвергается, даже если она верная: иначе
  // перехваченный вызов можно повторить через месяц.
  if (Math.abs(nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = Buffer.from(signPayload(payload, secret, timestamp), 'hex');
  const actual = Buffer.from(String(signature ?? ''), 'hex');

  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** Сколько раз пробуем доставить, прежде чем сдаться. */
export const MAX_DELIVERY_ATTEMPTS = 6;

/**
 * Задержка перед следующей попыткой — с удвоением.
 *
 * Равномерные повторы добивают получателя, который и так лежит: он поднимется
 * и тут же получит шквал накопившихся вызовов. Удвоение даёт ему прийти
 * в себя.
 */
export function nextRetryDelaySeconds(attempt: number): number | null {
  const n = Number(attempt ?? 0);
  if (!Number.isFinite(n) || n < 1) return null;
  if (n >= MAX_DELIVERY_ATTEMPTS) return null;

  return 30 * 2 ** (n - 1);
}

/**
 * Стоит ли повторять при таком ответе.
 *
 * Повторяем сетевые сбои и ошибки сервера получателя. **Не повторяем 4xx**:
 * это ответ «твой запрос неверен», и он не станет верным от повтора — мы
 * просто будем долбить чужой сервер до упора.
 *
 * Исключение — 408 и 429: они прямо просят повторить позже.
 */
export function shouldRetry(statusCode: number | null | undefined): boolean {
  if (statusCode == null) return true; // сеть не ответила вовсе
  const code = Number(statusCode);

  if (code === 408 || code === 429) return true;
  if (code >= 400 && code < 500) return false;
  return code >= 500;
}
