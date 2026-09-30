import intl from 'react-intl-universal';

/**
 * Короткая человеческая дата на языке интерфейса — «20 июн. 2026».
 *
 * Формат берём у браузера (`Intl.DateTimeFormat`): его локали всегда на месте,
 * тогда как у moment русская локаль подключается отдельным импортом. Нужен
 * там, где пользователь читает даты глазами: сроки оплаты, дни календаря.
 */
export const uiLocale = (): string => {
  const current = intl.getInitOptions?.()?.currentLocale;
  if (current === 'en') return 'en-US';
  if (current === 'ar') return 'ar';
  return 'ru-RU';
};

export const formatShortDate = (date: string | null | undefined): string => {
  if (!date) return '—';

  const parsed = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(date);

  return new Intl.DateTimeFormat(uiLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

/**
 * «июль 2026 г.» — месяц периода: начисления зарплаты, налоги с ФОТ.
 * Принимает и «2026-07», и полную дату.
 */
export const formatMonth = (value: string | null | undefined): string => {
  if (!value) return '—';

  const raw = String(value).slice(0, 10);
  const iso = /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : raw;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat(uiLocale(), {
    month: 'long',
    year: 'numeric',
  }).format(parsed);
};

/**
 * «янв.» — только месяц, для подписей осей графика: там год повторять незачем,
 * а «2026-01» читается плохо.
 */
export const formatMonthShort = (value: string | null | undefined): string => {
  if (!value) return '';

  const raw = String(value).slice(0, 10);
  const iso = /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : raw;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat(uiLocale(), { month: 'short' }).format(parsed);
};

/**
 * Месяц с годом коротко — «сент. 26» (оси графиков по месяцам нескольких
 * лет). Месяц — в языке интерфейса: `moment(...).format('MMM YY')` брал
 * глобальную локаль и печатал «Sep 26» в русском интерфейсе (живой проход
 * этапа 46).
 */
export const formatMonthShortYear = (value: string | null | undefined): string => {
  if (!value) return '';
  const raw = String(value).slice(0, 10);
  const iso = /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : raw;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat(uiLocale(), { month: 'short', year: '2-digit' }).format(parsed);
};

/**
 * Период словами — «1–30 сент. 2026 г.», «1 сент. – 15 окт. 2026 г.»
 * (UI-044-2 ТЗ-4). Общие месяц и год браузер пишет один раз сам
 * (`formatRange`); один день — одной датой. Даты — `YYYY-MM-DD`, считаются в
 * UTC, чтобы не съехать на сутки из-за часового пояса.
 */
export const formatDateRange = (
  from: string | null | undefined,
  to: string | null | undefined,
): string => {
  if (!from || !to) return '—';

  const start = new Date(`${String(from).slice(0, 10)}T00:00:00Z`);
  const end = new Date(`${String(to).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${from} — ${to}`;
  }

  const format = new Intl.DateTimeFormat(uiLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return typeof format.formatRange === 'function'
    ? format.formatRange(start, end)
    : `${format.format(start)} – ${format.format(end)}`;
};
