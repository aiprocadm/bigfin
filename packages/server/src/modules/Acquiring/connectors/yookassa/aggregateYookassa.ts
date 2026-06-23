/**
 * Канонические провайдер-агностичные сущности эквайринга (⑨d).
 * Версионируется как CRM/маркетплейсы (§4.11): YooKassa — первая реализация,
 * другие эквайеры подключаются на ту же абстракцию.
 */

/** Сводка эквайринга за период (в рублях). */
export interface AcquiringSummary {
  /** Выручка (сумма успешных платежей, gross). */
  gross: number;
  /** К зачислению (за вычетом комиссии эквайера, net). */
  net: number;
  /** Комиссия эквайера = gross − net. */
  commission: number;
  /** Число успешных платежей. */
  count: number;
}

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Чистая агрегация платежей YooKassa (`GET /v3/payments`) в сводку эквайринга.
 * Учитываются только успешные (`status: 'succeeded'`). `amount.value` — сумма
 * платежа (gross), `income_amount.value` — к зачислению (net) после комиссии.
 */
export const aggregateYookassaPayments = (
  payments: any[],
): AcquiringSummary => {
  const succeeded = (payments ?? []).filter(
    (p) => p?.status === 'succeeded',
  );

  const gross = succeeded.reduce((s, p) => s + num(p?.amount?.value), 0);
  const net = succeeded.reduce(
    (s, p) => s + num(p?.income_amount?.value ?? p?.amount?.value),
    0,
  );

  return {
    gross,
    net,
    commission: gross - net,
    count: succeeded.length,
  };
};
