// © 2026 Bigfin

/** Корзина старения с суммой. */
export interface AgingBucket {
  key: string;
  amount: number; // в базовой валюте
}

/** Один неоплаченный документ (счёт/счёт поставщика) для drill-down. */
export interface DebtDocument {
  id: number;
  side: 'receivable' | 'payable';
  number: string;
  date: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  total: number;
  dueAmount: number; // остаток к оплате, базовая валюта
  overdueDays: number;
}

/** Контрагент в реестре долгов. */
export interface DebtContact {
  contactId: number;
  contactName: string;
  current: number; // ещё не просрочено
  buckets: number[]; // суммы по AGING_PERIODS (просрочка)
  overdueTotal: number;
  total: number; // current + overdueTotal
  worstBucketIndex: number; // -1 если просрочки нет
}

/** Итоги одной стороны (дебиторка ИЛИ кредиторка). */
export interface DebtsSideSummary {
  total: number;
  current: number;
  overdueTotal: number;
  buckets: number[]; // суммы по AGING_PERIODS
  contacts: DebtContact[];
  top: DebtContact[]; // ТОП-должники по total
}

/** Полный ответ сводки. */
export interface DebtsOverviewResponse {
  baseCurrency: string;
  asDate: string;
  receivable?: DebtsSideSummary;
  payable?: DebtsSideSummary;
  net?: number; // дебиторка.total − кредиторка.total (когда есть обе)
}

/** Прогресс плана погашения. */
export interface PlanProgress {
  plannedTotal: number;
  paidTotal: number;
  remaining: number;
  percentPaid: number; // 0..100
  nextDueDate: string | null;
  isOverdue: boolean;
}
