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

/**
 * Клетка календаря при масштабе крупнее дня (FIN-019).
 *
 * Внутри одной клетки соседствуют ФАКТ и ПЛАН: прошедшая часть периода уже
 * случилась, оставшаяся — прогноз. Смешать их молча значило бы показать
 * план как свершившееся.
 */
export interface ForecastPeriod {
  from: string;
  to: string;
  inflow: number;
  outflow: number;
  balance: number;
  factInflow: number;
  factOutflow: number;
  planInflow: number;
  planOutflow: number;
  isWeekend: boolean;
}

export interface ForecastGap {
  date: string;
  amount: number;
  daysFromStart: number;
}

export interface Forecast {
  days: ForecastDay[];
  /** Клетки при масштабе крупнее дня; при дневном — по дню на клетку. */
  periods: ForecastPeriod[];
  granularity: string;
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

const mapPeriod = (raw: any): ForecastPeriod => ({
  from: raw?.from ?? '',
  to: raw?.to ?? '',
  inflow: num(raw?.inflow),
  outflow: num(raw?.outflow),
  balance: num(raw?.balance),
  factInflow: num(raw?.fact_inflow ?? raw?.factInflow),
  factOutflow: num(raw?.fact_outflow ?? raw?.factOutflow),
  planInflow: num(raw?.plan_inflow ?? raw?.planInflow),
  planOutflow: num(raw?.plan_outflow ?? raw?.planOutflow),
  isWeekend: Boolean(raw?.is_weekend ?? raw?.isWeekend),
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
  periods: (raw?.periods ?? []).map(mapPeriod),
  granularity: raw?.granularity ?? 'day',
  gap: mapGap(raw?.gap),
  openingBalance: num(raw?.opening_balance ?? raw?.openingBalance),
  baseCurrency: raw?.base_currency ?? raw?.baseCurrency ?? 'RUB',
});
