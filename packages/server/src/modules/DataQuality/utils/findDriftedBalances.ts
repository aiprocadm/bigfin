// © 2026 Bigfin

/**
 * Остаток счёта разошёлся с проводками.
 *
 * ЗАЧЕМ. Продукт хранит остаток денежного счёта ДВАЖДЫ: в колонке счёта
 * (её показывают шапка и главная — это быстро) и в проводках (по ним
 * строятся отчёты — это правда). Пока они совпадают, никто о двойственности
 * не думает. Когда расходятся — человек видит одну сумму в шапке и другую
 * в отчёте, и ни один экран не говорит, какая из них настоящая.
 *
 * НАЙДЕНО ЖИВЫМ ПРОХОДОМ ПО СТЕНДУ. Шапка показывала 1 749 839,09 ₽,
 * отчёт о движении денег — 1 748 838,59 ₽. Разошлись на 1 000,50 ₽ по
 * одной кассе. Требование чек-листа приёмки (§15.1 ТЗ-2) — «сумма в шапке
 * совпадает с итогом на экране счетов» — нарушалось, и увидеть это можно
 * было только сравнив два экрана глазами.
 *
 * ЧЕГО ЗДЕСЬ НЕТ. Автоматической починки. Какая из двух сумм верна, решает
 * человек: колонка могла отстать от проводок, а могла и правильно хранить
 * начальный остаток, который в проводки не попал. Молча переписать деньги
 * в базе — худшее, что здесь можно сделать.
 */

export interface AccountBalanceRow {
  id: number;
  name: string;
  accountType: string;
  /** Остаток в колонке счёта. `null` — колонка не заполнена. */
  storedAmount: number | null;
  /** Остаток по проводкам: дебет минус кредит. */
  ledgerAmount: number;
}

export interface DriftedBalance {
  id: number;
  name: string;
  accountType: string;
  storedAmount: number;
  ledgerAmount: number;
  /** Насколько колонка больше проводок. Отрицательное — меньше. */
  difference: number;
}

export interface DriftedBalancesResult {
  rows: DriftedBalance[];
  /** Суммарное расхождение: на столько врёт общий остаток. */
  totalDifference: number;
}

/**
 * Порог, ниже которого расхождение не считается расхождением.
 *
 * Полкопейки — обычная погрешность округления при пересчёте валют. Пищать
 * из-за неё значит приучить человека не смотреть на этот отчёт.
 */
export const DRIFT_TOLERANCE = 0.005;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Находит счета, у которых колонка остатка разошлась с проводками.
 *
 * @param {AccountBalanceRow[]} accounts денежные счета
 * @returns {DriftedBalancesResult}
 */
export function findDriftedBalances(
  accounts: AccountBalanceRow[] = [],
): DriftedBalancesResult {
  const rows = (accounts ?? [])
    // ПУСТАЯ КОЛОНКА — НЕ РАСХОЖДЕНИЕ. У счёта без движения она остаётся
    // незаполненной, и объявлять это ошибкой значит завалить отчёт шумом.
    .filter((account) => account?.storedAmount != null)
    .map((account) => {
      const storedAmount = round2(Number(account.storedAmount));
      const ledgerAmount = round2(Number(account.ledgerAmount ?? 0));

      return {
        id: account.id,
        name: account.name,
        accountType: account.accountType,
        storedAmount,
        ledgerAmount,
        difference: round2(storedAmount - ledgerAmount),
      };
    })
    .filter((row) => Math.abs(row.difference) > DRIFT_TOLERANCE)
    // Крупные первыми: с них и начинают разбираться.
    .sort((left, right) => Math.abs(right.difference) - Math.abs(left.difference));

  return {
    rows,
    totalDifference: round2(
      rows.reduce((total, row) => total + row.difference, 0),
    ),
  };
}
