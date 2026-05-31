/** Одна строка-источник внутри дня. */
export interface ForecastLine {
  direction: 'inflow' | 'outflow';
  amount: number; // в базовой валюте
  label: string;
  source: 'invoice' | 'bill' | 'manual' | 'recurring';
}

/** Чистые суммы за день (вход для бегущего остатка). */
export interface DayFlow {
  date: string; // YYYY-MM-DD
  inflow: number;
  outflow: number;
}

/** День с посчитанным остатком на конец. */
export interface DayBalance extends DayFlow {
  balance: number;
  lines?: ForecastLine[];
}

/** Кассовый разрыв. */
export interface CashGap {
  date: string;
  amount: number; // положительное число = размер дефицита
  daysFromStart: number;
}

/** Результат расчёта остатка по дням. */
export interface ForecastResult {
  days: DayBalance[];
  gap: CashGap | null;
}

/** Полный ответ прогноза календаря. */
export interface PaymentCalendarResponse {
  baseCurrency: string;
  openingBalance: number;
  fromDate: string;
  toDate: string;
  days: DayBalance[];
  gap: CashGap | null;
}
