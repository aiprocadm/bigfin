// © 2026 Bigfin
import intl from 'react-intl-universal';

/**
 * Подпись стороны счёта на языке организации.
 *
 * НАЙДЕНО ОБХОДОМ ОТВЕТОВ СЕРВЕРА. Сервер отдаёт `account_normal_formatted`
 * английскими словами — «Debit» и «Credit», — и карточка счёта показывала
 * их как есть. Рядом при этом русское название счёта и русский тип: подпись
 * на чужом языке бросается в глаза сразу.
 *
 * Слова в словаре уже были («Дебет», «Кредит») — не хватало только того,
 * чтобы их кто-то взял. Ровно тот же случай, что и с типом счёта год назад.
 *
 * Если перевода нет, показываем серверную подпись: пусть английскую, но не
 * пустоту.
 */
export function accountNormalLabel(
  accountNormal: string | null | undefined,
  serverLabel?: string | null,
): string {
  if (!accountNormal) return serverLabel ?? '';

  const key = String(accountNormal).toLowerCase();
  const translated = intl.get(key);

  return translated && translated !== key ? translated : serverLabel ?? '';
}
