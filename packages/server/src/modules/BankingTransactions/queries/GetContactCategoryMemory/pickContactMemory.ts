/**
 * Кандидат памяти по контрагенту: пара «статья + тип операции»,
 * взятая из прошлой подтверждённой денежной операции этого контрагента.
 */
export interface ContactMemoryCandidate {
  creditAccountId: number | null | undefined;
  transactionType: string | null | undefined;
}

/**
 * Память по контрагенту: статья (`creditAccountId`) и тип операции (`transactionType`),
 * подставляемые в форму «Разбор» по умолчанию.
 */
export interface ContactMemory {
  creditAccountId: number;
  transactionType: string | null;
}

/**
 * Выбирает память по контрагенту из списка кандидатов.
 *
 * Кандидаты приходят уже отсортированными «свежие сверху» (последнее подтверждение
 * выигрывает) — функция берёт первую строку с непустой статьёй. Чистая, без I/O.
 *
 * @param {ContactMemoryCandidate[]} rows — кандидаты из истории, свежие сверху.
 * @returns {ContactMemory | null} память или null, если статьи нет ни в одной строке.
 */
export const pickContactMemory = (
  rows: ContactMemoryCandidate[],
): ContactMemory | null => {
  const match = rows.find((row) => row.creditAccountId != null);

  if (!match) return null;

  return {
    creditAccountId: match.creditAccountId as number,
    transactionType: match.transactionType ?? null,
  };
};
