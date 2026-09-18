import moment from 'moment';

/**
 * Период главной страницы (этап 2 ТЗ, п. 2.2).
 *
 * Переключатель в шапке: месяц, квартал, год или произвольный отрезок.
 * Выбор запоминается между сессиями — человек заходит утром и видит тот же
 * разрез, что вчера, а не «текущий месяц» заново.
 *
 * Здесь только расчёт и хранение, без React: так это проверяется тестами.
 */
export type DashboardPeriodKind = 'month' | 'quarter' | 'year' | 'custom';

export interface DashboardPeriod {
  kind: DashboardPeriodKind;
  fromDate: string;
  toDate: string;
}

/** Где храним выбор между сессиями. */
export const PERIOD_STORAGE_KEY = 'bigfin.dashboard.period';

const format = (value: moment.Moment) => value.format('YYYY-MM-DD');

/** Границы периода по его виду. */
export const periodRange = (
  kind: Exclude<DashboardPeriodKind, 'custom'>,
  today: moment.MomentInput = undefined,
): { fromDate: string; toDate: string } => {
  const now = moment(today);

  return {
    fromDate: format(now.clone().startOf(kind)),
    toDate: format(now.clone().endOf(kind)),
  };
};

/** Период по умолчанию — текущий месяц (п. 2.2 ТЗ). */
export const defaultPeriod = (
  today: moment.MomentInput = undefined,
): DashboardPeriod => ({
  kind: 'month',
  ...periodRange('month', today),
});

/**
 * Читает сохранённый выбор.
 *
 * Хранилище может быть недоступно или содержать мусор — от чужой вкладки,
 * ручной правки, старой версии. Тогда молча берём период по умолчанию:
 * главная не должна падать из-за настройки вида.
 */
export const readStoredPeriod = (
  storage: Pick<Storage, 'getItem'> | undefined,
  today: moment.MomentInput = undefined,
): DashboardPeriod => {
  try {
    const raw = storage?.getItem(PERIOD_STORAGE_KEY);
    if (!raw) return defaultPeriod(today);

    const parsed = JSON.parse(raw);
    const kind = parsed?.kind;

    if (kind === 'month' || kind === 'quarter' || kind === 'year') {
      // Сохраняем вид, а не даты: вчерашний «текущий месяц» сегодня может
      // быть уже прошлым, и человек увидел бы устаревший разрез.
      return { kind, ...periodRange(kind, today) };
    }
    if (
      kind === 'custom' &&
      typeof parsed.fromDate === 'string' &&
      typeof parsed.toDate === 'string'
    ) {
      return { kind, fromDate: parsed.fromDate, toDate: parsed.toDate };
    }
    return defaultPeriod(today);
  } catch {
    return defaultPeriod(today);
  }
};

/** Запоминает выбор. Недоступное хранилище — не повод падать. */
export const storePeriod = (
  storage: Pick<Storage, 'setItem'> | undefined,
  period: DashboardPeriod,
): void => {
  try {
    storage?.setItem(PERIOD_STORAGE_KEY, JSON.stringify(period));
  } catch {
    // Приватный режим браузера или запрет на хранение: молчим.
  }
};
