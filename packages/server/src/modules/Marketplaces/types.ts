/**
 * Канонические провайдер-агностичные сущности маркетплейсов (⑱).
 * Коннектор WB/Ozon маппит свой финотчёт В эти типы; превью показывает
 * «выручку за вычетом удержаний». Версионируется как CRM (§4.11, риск 17).
 */

/** Сводка финансов маркетплейса за период (в рублях). */
export interface MarketplaceSummary {
  /** Выручка от продаж (розничная сумма). */
  revenue: number;
  /** К перечислению продавцу (выручка − удержания МП). */
  toPay: number;
  /** Итого удержаний МП = выручка − к перечислению. */
  deductions: number;
  /** Логистика. */
  logistics: number;
  /** Штрафы/удержания. */
  penalties: number;
  /** Хранение. */
  storage: number;
}

/** Интерфейс коннектора маркетплейса (⑱). Реализации: Wildberries, Ozon. */
export interface MarketplaceConnector {
  /** Ключ: 'wildberries' | 'ozon'. */
  readonly key: string;
  /** Настроены ли учётные данные. */
  isConfigured(): Promise<boolean>;
  /** Финансовая сводка за период [fromDate, toDate] (ISO-даты). */
  fetchSummary(fromDate: string, toDate: string): Promise<MarketplaceSummary>;
}

/** Пустая сводка (нулевая). */
export const emptySummary = (): MarketplaceSummary => ({
  revenue: 0,
  toPay: 0,
  deductions: 0,
  logistics: 0,
  penalties: 0,
  storage: 0,
});
