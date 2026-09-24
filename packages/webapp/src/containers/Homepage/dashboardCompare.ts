import moment from 'moment';

/**
 * С чем сравнивать показатели главной (FT-061 ТЗ-3).
 *
 * Четыре варианта базы: прошлый период такой же длины (как было всегда),
 * два периода назад, этот же период год назад и свой отрезок датами.
 * Сами даты базы считает сервер — сюда приходит только выбор человека, а
 * обратно — какие даты сервер взял на самом деле (`comparison`).
 *
 * Здесь только расчёт и хранение, без React: так это проверяется тестами.
 */
export type CompareKind = 'previous' | 'previous2' | 'last_year' | 'custom';

export const COMPARE_KINDS: CompareKind[] = [
  'previous',
  'previous2',
  'last_year',
  'custom',
];

export interface DashboardCompare {
  kind: CompareKind;
  /** Только для своего отрезка: начало базы, «ГГГГ-ММ-ДД». */
  fromDate?: string;
  /** Только для своего отрезка: конец базы, «ГГГГ-ММ-ДД». */
  toDate?: string;
}

/** Где храним выбор между сессиями — рядом с выбором периода. */
export const COMPARE_STORAGE_KEY = 'bigfin.dashboard.compare';

/** База по умолчанию — прошлый период: так главная сравнивала и раньше. */
export const defaultCompare = (): DashboardCompare => ({ kind: 'previous' });

const isCompareKind = (value: unknown): value is CompareKind =>
  COMPARE_KINDS.includes(value as CompareKind);

/**
 * Параметры запроса главной.
 *
 * НЕДОЗАПОЛНЕННЫЙ СВОЙ ОТРЕЗОК ЕДЕТ КАК «ПРОШЛЫЙ ПЕРИОД». Человек выбрал
 * «свой период» и ещё не ввёл вторую дату — спрашивать сервер про отрезок
 * без конца незачем: он всё равно ответил бы прошлым периодом. Зато ключ
 * запроса совпадает с уже загруженным «прошлым периодом», и лишнего
 * запроса нет. Какая база взята на деле, видно по подписи под плитками.
 */
export function compareQueryParams(compare: DashboardCompare): {
  compare: CompareKind;
  compareFrom?: string;
  compareTo?: string;
} {
  if (compare.kind === 'custom') {
    const { fromDate, toDate } = compare;
    if (fromDate && toDate && fromDate <= toDate) {
      return { compare: 'custom', compareFrom: fromDate, compareTo: toDate };
    }
    return { compare: 'previous' };
  }
  return { compare: isCompareKind(compare.kind) ? compare.kind : 'previous' };
}

/**
 * Читает сохранённый выбор. Мусор в хранилище (чужая вкладка, старая
 * версия) — не повод ронять главную: тогда база по умолчанию.
 */
export function readStoredCompare(
  storage: Pick<Storage, 'getItem'> | undefined,
): DashboardCompare {
  try {
    const raw = storage?.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return defaultCompare();

    const parsed = JSON.parse(raw);
    if (!isCompareKind(parsed?.kind)) return defaultCompare();
    if (parsed.kind !== 'custom') return { kind: parsed.kind };

    return {
      kind: 'custom',
      fromDate: typeof parsed.fromDate === 'string' ? parsed.fromDate : undefined,
      toDate: typeof parsed.toDate === 'string' ? parsed.toDate : undefined,
    };
  } catch {
    return defaultCompare();
  }
}

/** Запоминает выбор. Недоступное хранилище — не повод падать. */
export function storeCompare(
  storage: Pick<Storage, 'setItem'> | undefined,
  compare: DashboardCompare,
): void {
  try {
    storage?.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compare));
  } catch {
    // Приватный режим браузера или запрет на хранение: молчим.
  }
}

/**
 * Есть ли с чем сравнивать.
 *
 * ГЛАВНОЕ ПРАВИЛО FT-061: ПРИ НУЛЕВОЙ БАЗЕ ПРОЦЕНТА НЕТ. Сервер в этом
 * случае присылает `null`, и любое «+100 %» или «∞» на его месте было бы
 * выдумкой: рост к нулю — не рост, а отсутствие сравнения.
 */
export function hasComparisonBase(
  changePercent: number | null | undefined,
): changePercent is number {
  return typeof changePercent === 'number' && Number.isFinite(changePercent);
}

/**
 * Изменение к базе текстом: «+12.5%», «-3%». `null` — базы нет, и
 * процент не печатается НИКАК, даже нулём.
 */
export function formatChangePercent(
  changePercent: number | null | undefined,
): string | null {
  if (!hasComparisonBase(changePercent)) return null;
  return `${changePercent >= 0 ? '+' : ''}${changePercent}%`;
}

/**
 * Даты базы коротко: «01.08–31.08».
 *
 * Год дописываем, только когда база лежит не в том году, что период: у
 * «этого периода в прошлом году» без года подпись совпала бы с текущим
 * периодом, и было бы непонятно, с чем сравнили.
 */
export function formatBaseRange(
  fromDate: string,
  toDate: string,
  referenceYear?: number,
): string {
  const from = moment(fromDate, 'YYYY-MM-DD');
  const to = moment(toDate, 'YYYY-MM-DD');
  if (!from.isValid() || !to.isValid()) return `${fromDate}–${toDate}`;

  const sameYear =
    referenceYear !== undefined &&
    from.year() === referenceYear &&
    to.year() === referenceYear;
  const format = sameYear ? 'DD.MM' : 'DD.MM.YYYY';

  if (fromDate === toDate) return from.format(format);
  return `${from.format(format)}–${to.format(format)}`;
}
