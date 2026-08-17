/**
 * Разбор ответа платёжного календаря (⑥).
 *
 * Сервер отдаёт поля в snake_case (`days_from_start`, `opening_balance`),
 * а страница читает их в camelCase. Из-за этого предупреждение о кассовом
 * разрыве выводилось без числа дней: «Кассовый разрыв через дн.».
 */
export interface ForecastLine {
  direction: 'inflow' | 'outflow';
  amount: number;
  label: string;
  source: string;
  /** Только у плановых строк — для кнопки «Записать в учёт» (О3). */
  plannedOperationId?: number;
}

export interface ForecastDay {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
  lines: ForecastLine[];
}

export interface ForecastGap {
  date: string;
  amount: number;
  daysFromStart: number;
}

export interface Forecast {
  days: ForecastDay[];
  gap: ForecastGap | null;
  openingBalance: number;
  baseCurrency: string;
}

const num = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapLine = (raw: any): ForecastLine => ({
  direction: raw?.direction === 'inflow' ? 'inflow' : 'outflow',
  amount: num(raw?.amount),
  label: raw?.label ?? '',
  source: raw?.source ?? '',
  plannedOperationId:
    raw?.planned_operation_id ?? raw?.plannedOperationId ?? undefined,
});

const mapDay = (raw: any): ForecastDay => ({
  date: raw?.date ?? '',
  inflow: num(raw?.inflow),
  outflow: num(raw?.outflow),
  balance: num(raw?.balance),
  lines: (raw?.lines ?? []).map(mapLine),
});

const mapGap = (raw: any): ForecastGap | null => {
  if (!raw) return null;

  return {
    date: raw.date ?? '',
    amount: num(raw.amount),
    daysFromStart: num(raw.days_from_start ?? raw.daysFromStart),
  };
};

export const mapForecast = (raw: any): Forecast => ({
  days: (raw?.days ?? []).map(mapDay),
  gap: mapGap(raw?.gap),
  openingBalance: num(raw?.opening_balance ?? raw?.openingBalance),
  baseCurrency: raw?.base_currency ?? raw?.baseCurrency ?? 'RUB',
});
