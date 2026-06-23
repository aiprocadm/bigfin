/**
 * Канонизация операции Дзенмани (Zenmoney diff API) в запись для конвейера
 * «Разбор» ⑨ — те же поля, что у импорта 1С/Тинькофф.
 */

/** Каноническая запись операции (вход для CreateUncategorizedTransaction). */
export interface ZenmoneyRecord {
  date: string;
  /** Знаковая: приход > 0, расход < 0. */
  amount: number;
  payee: string | null;
  description: string | null;
  externalId: string;
}

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Маппит транзакцию Дзенмани в каноническую запись. У Дзенмани раздельные поля
 * `income`/`outcome` (одно из них 0); приход → +income, расход → −outcome.
 */
export const mapZenmoneyTransaction = (tx: any): ZenmoneyRecord => {
  const income = num(tx?.income);
  const outcome = num(tx?.outcome);
  const amount = income > 0 ? income : -outcome;

  return {
    date: tx?.date,
    amount,
    payee: tx?.payee || null,
    description: tx?.comment || null,
    externalId: `zenmoney:${String(tx?.id)}`,
  };
};
