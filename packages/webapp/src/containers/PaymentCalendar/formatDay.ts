import intl from 'react-intl-universal';

/**
 * Дата дня в платёжном календаре (⑥).
 *
 * Формат встроенный в браузер (`Intl.DateTimeFormat`), а не moment: локали
 * там всегда на месте, тогда как у moment русская локаль подключается
 * отдельным импортом и в dev-сборке до модуля не доезжает.
 *
 * День недели показываем не для красоты: платёж, попавший на выходной,
 * фактически уйдёт в понедельник — это надо видеть глазами.
 */
const localeOf = (): string => {
  const current = intl.getInitOptions?.()?.currentLocale;
  if (current === 'ru') return 'ru-RU';
  if (current === 'ar') return 'ar';
  if (current === 'en') return 'en-US';
  return 'ru-RU';
};

/** «20 авг, ср» — короткая человеческая дата с днём недели. */
export const formatDay = (date: string): string => {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat(localeOf(), {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  }).format(parsed);
};

/** Суббота и воскресенье: банк не проводит платежи. */
export const isWeekend = (date: string): boolean => {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;

  const weekday = parsed.getDay();
  return weekday === 0 || weekday === 6;
};
