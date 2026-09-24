// © 2026 Bigfin
import intl from 'react-intl-universal';
import moment from 'moment';
import { formattedAmount } from '@/utils';
import type { FixAccountBalanceResult } from '@/hooks/query/cashflowAccounts';

/**
 * Что сказать человеку после фиксации остатка (FT-071 ТЗ-3).
 *
 * Разницы нет — это не ошибка и не «ничего не произошло»: остаток в учёте
 * уже совпадает с банком, и сказать это надо прямо, иначе человек нажмёт
 * ещё раз, решив, что кнопка не сработала. Разница есть — называем сумму и
 * направление: именно эту операцию он увидит в истории счёта.
 */
export function fixBalanceResultMessage(
  result: Pick<FixAccountBalanceResult, 'created' | 'difference' | 'target_balance'>,
  date: string,
  currencyCode: string,
): { created: boolean; text: string } {
  const day = moment(date, 'YYYY-MM-DD').format('DD.MM.YYYY');
  const balance = formattedAmount(result.target_balance, currencyCode);

  if (!result.created) {
    return {
      created: false,
      text: intl.get('fix_balance.result.no_difference', { date: day, balance }),
    };
  }
  const amount = formattedAmount(Math.abs(result.difference), currencyCode);

  return {
    created: true,
    text: intl.get(
      result.difference > 0
        ? 'fix_balance.result.added'
        : 'fix_balance.result.subtracted',
      { date: day, balance, amount },
    ),
  };
}

/** Сегодня строкой ГГГГ-ММ-ДД — по местному времени, а не по UTC. */
export const todayIso = () => moment().format('YYYY-MM-DD');
