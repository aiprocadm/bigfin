// © 2026 Bigfin
import { createHash } from 'crypto';

/**
 * Лимит вызовов инструментов: 60 в минуту на токен (FT-090 ТЗ-3).
 *
 * Общий ограничитель сервера считает по адресу, а агенты разных людей могут
 * приходить с одного адреса (через один прокси). Здесь счёт — по токену:
 * зациклившийся агент одного человека не должен съесть лимит другого.
 *
 * Память процесса, а не общая база: лимит — защита от петли агента, а не
 * тарифный учёт; после перезапуска сервера он честно начинается заново.
 */
export const MCP_CALLS_PER_MINUTE = 60;
const WINDOW_MS = 60_000;

export class McpRateLimiter {
  private readonly calls = new Map<string, number[]>();

  constructor(
    private readonly limit = MCP_CALLS_PER_MINUTE,
    private readonly now: () => number = Date.now,
  ) {}

  /** Хранится отпечаток, а не сам токен: в памяти процесса секретам не место. */
  static keyOf(authorization: string | undefined): string {
    return createHash('sha256').update(String(authorization ?? '')).digest('hex');
  }

  /** Можно ли ещё один вызов; если да — он засчитывается. */
  public take(key: string): boolean {
    const now = this.now();
    const recent = (this.calls.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
    if (recent.length >= this.limit) {
      this.calls.set(key, recent);
      return false;
    }
    recent.push(now);
    this.calls.set(key, recent);
    // Карта не растёт бесконечно: старые ключи без вызовов выбрасываются.
    if (this.calls.size > 10_000) {
      for (const [k, list] of this.calls) {
        if (!list.some((at) => now - at < WINDOW_MS)) this.calls.delete(k);
      }
    }
    return true;
  }
}
