// © 2026 Bigfin
import { ACCOUNT_TYPE } from '@/constants/accounts';

/**
 * Отбор контрагентов по природе долга (FIN-023 ТЗ-2).
 *
 * ЗАЧЕМ. «Покажи тех, кто должен мне деньги» — самый частый вопрос к списку
 * контрагентов, и он не тот же самый, что «покажи должников»: часть долга
 * закроется отгрузкой по уже полученному авансу, а не деньгами.
 *
 * ПОЧЕМУ ПОДЗАПРОСОМ, А НЕ СПИСКОМ НОМЕРОВ. Посчитать разбор отдельно и
 * передать сюда найденные номера значило бы вшить в адрес страницы список на
 * несколько тысяч значений — и получить отказ сервера при большой базе.
 * Подзапрос считает то же самое внутри той же выборки.
 *
 * ВИД СЧЕТА БЕРЁТСЯ ИЗ БАЗЫ, А НЕ ЗАШИТ ЧИСЛОМ. Номера счетов расчётов у
 * каждой организации свои: зашитое число работало бы у одной и молча
 * возвращало бы пустоту у остальных.
 */
export type DebtNature = 'money' | 'goods' | 'none';

/** Все виды отбора: по нему проверяется входящее значение. */
export const DEBT_NATURES: DebtNature[] = ['money', 'goods', 'none'];

/** Приводит значение из адреса к виду отбора; чужое значение — не отбор. */
export function parseDebtNature(value?: string): DebtNature | undefined {
  return DEBT_NATURES.includes(value as DebtNature)
    ? (value as DebtNature)
    : undefined;
}

/**
 * Накладывает отбор на строитель запроса списка контрагентов.
 *
 * @param {any} builder строитель запроса по таблице контактов
 * @param {DebtNature} [nature] вид отбора; пусто — отбора нет
 */
export function applyDebtNatureFilter(builder: any, nature?: DebtNature): void {
  if (!nature) return;

  if (nature === 'money') {
    builder.whereIn('id', (qb: any) => owedInMoney(qb));
    return;
  }
  if (nature === 'goods') {
    builder.whereIn('id', (qb: any) => owedInGoods(qb));
    return;
  }

  // «БЕЗ ДЕБИТОРКИ» — ЭТО ОТСУТСТВИЕ ЛЮБОЙ ПРИРОДЫ (приёмка 3 FIN-023).
  // Исключить только денежную значило бы оставить в списке тех, кому мы
  // заплатили вперёд, — а они тоже нам должны.
  builder.whereNotIn('id', (qb: any) => owedInMoney(qb));
  builder.whereNotIn('id', (qb: any) => owedInGoods(qb));
}

/** Нам должны ДЕНЬГИ: по счетам дебиторки дебет больше кредита. */
function owedInMoney(qb: any) {
  return contactsWithNet(qb, ACCOUNT_TYPE.ACCOUNTS_RECEIVABLE, 'debit', 'credit');
}

/** Нам должны ПОСТАВКУ: по счетам кредиторки мы заплатили вперёд. */
function owedInGoods(qb: any) {
  return contactsWithNet(qb, ACCOUNT_TYPE.ACCOUNTS_PAYABLE, 'debit', 'credit');
}

/**
 * Контрагенты, у которых сальдо по счетам заданного вида положительно
 * в сторону `plus`.
 */
function contactsWithNet(
  qb: any,
  accountType: string,
  plus: string,
  minus: string,
) {
  return qb
    .select('contact_id')
    .from('accounts_transactions')
    .whereNotNull('contact_id')
    .whereIn('account_id', (accounts: any) =>
      accounts.select('id').from('accounts').where('account_type', accountType),
    )
    .groupBy('contact_id')
    .havingRaw(`SUM(\`${plus}\`) - SUM(\`${minus}\`) > 0`);
}
