// © 2026 Bigfin
import intl from 'react-intl-universal';

/**
 * С1 карты v29. Подпись типа счёта на языке организации.
 *
 * Сервер отдаёт `account_type_label` по-английски («Cost of Goods Sold»,
 * «Equity»), и раньше эта строка попадала прямо в столбец «ТИП» плана
 * счетов. Названия счетов при этом переведены — выходила вывеска на
 * русском с подписью на чужом языке.
 *
 * Подпись берём из словаря по ключу типа: `cost-of-goods-sold` →
 * `account_type.cost_of_goods_sold`. Если перевода нет (сервер завёл новый
 * тип, витрина о нём ещё не знает), показываем серверную подпись — пусть
 * английскую, но не пустоту.
 *
 * Функция, а не хук: подпись нужна и в ячейках таблиц, и в разметке
 * карточек, где хук потребовал бы менять устройство компонента.
 */
export const accountTypeDictionaryKey = (accountType: string): string =>
  `account_type.${String(accountType).replace(/-/g, '_')}`;

export function accountTypeLabel(
  accountType: string | null | undefined,
  serverLabel?: string | null,
): string {
  if (!accountType) return serverLabel ?? '';

  const key = accountTypeDictionaryKey(accountType);
  // react-intl-universal отдаёт пустую строку, когда ключа нет; на всякий
  // случай считаем ответом-заглушкой и сам ключ.
  const translated = intl.get(key);

  return translated && translated !== key ? translated : serverLabel ?? '';
}
