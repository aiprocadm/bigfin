/**
 * Канонизация операции Тинькофф Бизнес (Statement API) в запись для конвейера
 * «Разбор» ⑨ — те же поля, что у импорта 1С (переиспользуем уже готовый путь).
 */

/** Каноническая запись операции (вход для CreateUncategorizedTransaction). */
export interface BankApiOperation {
  date: string;
  /** Знаковая: приход > 0, расход < 0 (как virtual getters модели). */
  amount: number;
  payee: string | null;
  payeeInn: string | null;
  externalId: string;
  referenceNo: string | null;
  description: string | null;
}

/** Безопасное число. */
const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Маппит операцию Тинькофф в каноническую запись.
 * Поля Тинькофф: `operationId`, `operationDate`, `accountAmount`,
 * `typeOfOperation` ('Credit'=приход | 'Debit'=расход), `payPurpose`,
 * `counterParty.{name,inn}`, `documentNumber`.
 */
export const mapTinkoffOperation = (op: any): BankApiOperation => {
  const isIn = op?.typeOfOperation === 'Credit';
  const magnitude = Math.abs(num(op?.accountAmount ?? op?.operationAmount));

  return {
    date: op?.operationDate || op?.date,
    amount: isIn ? magnitude : -magnitude,
    payee: op?.counterParty?.name || null,
    payeeInn: op?.counterParty?.inn || null,
    externalId: `tinkoff:${String(op?.operationId ?? op?.id)}`,
    referenceNo: op?.documentNumber ? String(op.documentNumber) : null,
    description: op?.payPurpose || null,
  };
};
