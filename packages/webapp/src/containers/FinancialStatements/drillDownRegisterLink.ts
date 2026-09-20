/**
 * Переход из раскрытия суммы в реестр операций (FIN-005 ТЗ-2).
 *
 * ПОЧЕМУ АДРЕС, А НЕ СОСТОЯНИЕ. Конкурент открывает такой переход новой
 * вкладкой и передаёт отборы состоянием — ссылку переслать нельзя. Здесь
 * всё уходит в адресную строку: «посмотри, из чего сложилась аренда за
 * полугодие» становится обычной ссылкой, и открывший её увидит тот же
 * список, даже в другой сессии.
 *
 * Правило не новое: реестр операций и так держит отборы в адресе.
 */
export interface DrillDownRegisterParams {
  articleId?: number;
  accountId?: number;
  fromDate: string;
  toDate: string;
  /** Разрез по юрлицам из шапки отчёта — если он там был. */
  legalEntityIds?: number[];
}

/** Адрес реестра операций с отборами из отчёта. */
export function transactionsLinkFromDrillDown(
  params: DrillDownRegisterParams,
): string {
  const search = new URLSearchParams();

  if (params.articleId) search.set('articleId', String(params.articleId));
  if (params.accountId) search.set('accountId', String(params.accountId));
  if (params.fromDate) search.set('fromDate', params.fromDate);
  if (params.toDate) search.set('toDate', params.toDate);

  // Юрлица уходят повторяющимся параметром, а не через запятую: так их
  // читает сервер и так же собирает шапка отчёта. Один формат на оба конца.
  (params.legalEntityIds ?? []).forEach((id) =>
    search.append('legalEntityIds', String(id)),
  );

  const query = search.toString();

  return `/cashflow-accounts/transactions${query ? `?${query}` : ''}`;
}
