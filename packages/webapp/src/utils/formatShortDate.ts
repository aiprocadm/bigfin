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
