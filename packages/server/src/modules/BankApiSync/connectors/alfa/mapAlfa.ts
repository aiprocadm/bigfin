import { BankApiOperation } from '../BankProvider.types';

/**
 * Канонизация операции Альфа-Банка в запись для конвейера «Разбор» ⑨.
 *
 * Соответствие полей (СВЕРИТЬ с документацией банка при подключении —
 * спецификация Alfa API закрыта, поля взяты по типовому контракту выписки):
 *
 * | Альфа                  | Каноническое поле |
 * |------------------------|-------------------|
 * | `id` / `operationId`   | `externalId`      |
 * | `date` / `operationDate` | `date`          |
 * | `amount`               | `amount` (по модулю + знак из `direction`) |
 * | `direction`: CREDIT/DEBIT | знак суммы     |
 * | `counterparty.name/inn`| `payee`/`payeeInn`|
 * | `purpose`              | `description`     |
 * | `documentNumber`       | `referenceNo`     |
 */

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const mapAlfaOperation = (op: any): BankApiOperation => {
  const isIn = String(op?.direction ?? '').toUpperCase() === 'CREDIT';
  const magnitude = Math.abs(num(op?.amount ?? op?.operationAmount));

  return {
    date: op?.date || op?.operationDate,
    // `magnitude || 0` убирает -0 у пустой суммы.
    amount: isIn ? magnitude : -magnitude || 0,
    payee: op?.counterparty?.name || op?.counterParty?.name || null,
    payeeInn: op?.counterparty?.inn || op?.counterParty?.inn || null,
    externalId: `alfa:${String(op?.id ?? op?.operationId)}`,
    referenceNo: op?.documentNumber ? String(op.documentNumber) : null,
    description: op?.purpose || op?.payPurpose || null,
  };
};
