// © 2026 Bigfin
import { MAX_DELIVERY_ATTEMPTS, nextRetryDelaySeconds, shouldRetry, signPayload } from './webhooks';

/**
 * Доставка вебхука (FT-092 ТЗ-3): заголовки и итог одной попытки. Без сети
 * и базы — их держат тесты.
 */

export function deliveryHeaders(event: string, body: string, secret: string, nowSeconds: number, deliveryId: number) {
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'Bigfin-Webhooks/1.0',
    'X-Bigfin-Event': event,
    'X-Bigfin-Timestamp': String(nowSeconds),
    'X-Bigfin-Signature': signPayload(body, secret, nowSeconds),
    'X-Bigfin-Delivery': String(deliveryId),
  };
}

export interface AttemptOutcome {
  attempts: number;
  statusCode: number | null;
  error: string | null;
  delivered: boolean;
  /** Через сколько секунд повторить; null — больше не пытаться. */
  retryInSeconds: number | null;
}

/**
 * Итог попытки. 2xx — доставлено. Сеть, 5xx, 408, 429 — повтор с
 * удвоением паузы (30 с → 8 мин), всего до 6 попыток. Прочие 4xx — не
 * повторяем: запрос от повтора не станет верным.
 */
export function attemptOutcome(previousAttempts: number, statusCode: number | null, error: string | null): AttemptOutcome {
  const attempts = previousAttempts + 1;
  const delivered = statusCode !== null && statusCode >= 200 && statusCode < 300;
  if (delivered) return { attempts, statusCode, error: null, delivered: true, retryInSeconds: null };
  const retryInSeconds =
    attempts < MAX_DELIVERY_ATTEMPTS && shouldRetry(statusCode) ? nextRetryDelaySeconds(attempts) : null;
  return {
    attempts,
    statusCode,
    error: error ?? (statusCode !== null ? `HTTP ${statusCode}` : 'Нет ответа'),
    delivered: false,
    retryInSeconds,
  };
}
