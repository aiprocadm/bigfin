// © 2026 Bigfin
import { formattedAmount } from './index';

/** Валюта по умолчанию: продукт российский. */
const FALLBACK_CURRENCY = 'RUB';

/**
 * С2 карты v29. Подпись баланса счёта.
 *
 * Сервер присылает `amount: null`, пока по счёту не прошло ни одной
 * проводки, и экраны печатали в этом месте прочерк. Замер показал, что
 * пустой баланс бывает ровно там, где проводок ноль, — значит это обычный
 * ноль, а не «неизвестно»: остальной продукт так его и считает (сводка на
 * главной пишет «0,00 ₽», уведомление о низком остатке сравнивает с
 * порогом).
 *
 * Прочерк человек читает как поломку: «деньги не посчитались». Ноль —
 * спокойный ответ: денег нет, и это известно точно.
 */
export function accountBalanceText(
  amount: number | string | null | undefined,
  formatted?: string | null,
  currencyCode?: string | null,
): string {
  const currency = currencyCode || FALLBACK_CURRENCY;

  if (amount === null || amount === undefined) {
    return formattedAmount(0, currency, {});
  }
  // Готовую подпись сервера не переписываем: она уже собрана по правилам
  // организации.
  if (formatted) return formatted;

  return formattedAmount(Number(amount), currency, {});
}
