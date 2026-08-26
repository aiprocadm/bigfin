import moment from 'moment';
import { store } from '@/store/create-store';
import { getCurrentOrganizationFactory } from '@/store/authentication/authentication.selectors';

/** Формат даты, если организация его не задала. */
export const FALLBACK_DATE_FORMAT = 'DD.MM.YYYY';

/**
 * Печатает дату по заданному формату.
 *
 * Вынесено отдельно, чтобы правила можно было проверить без React и без
 * состояния приложения.
 */
export function formatDateBy(
  date: Date | null | undefined,
  format?: string | null,
): string {
  if (!date) return '';

  const parsed = moment(date);

  return parsed.isValid() ? parsed.format(format || FALLBACK_DATE_FORMAT) : '';
}

/**
 * Ф1/Ф3 карты v25. Дата в полях ввода — по формату организации.
 *
 * В формах документов дата показывалась через `date.toLocaleDateString()`,
 * то есть по языку БРАУЗЕРА: у человека с английским браузером «8/26/2026»
 * вместо «26.08.2026». При этом в списках та же дата приходит с сервера уже
 * в формате организации (`invoice_date_formatted`) — и на соседних экранах
 * одна дата выглядела по-разному.
 *
 * Формат берём из настроек организации (`date_format`, у российских —
 * `DD.MM.YYYY`). Если он не задан или организация ещё не загружена —
 * печатаем по-русски: продукт нацелен на российских предпринимателей, и
 * это честнее, чем формат браузера.
 *
 * Функция, а не хук: её подставляют прямо в свойство `formatDate` полей
 * даты, которых в продукте больше двух десятков; хук потребовал бы менять
 * устройство каждого компонента.
 */
export function formatOrganizationDate(date: Date): string {
  let format: string | undefined;

  try {
    const organization = getCurrentOrganizationFactory()(store.getState()) as
      | { date_format?: string }
      | undefined;
    format = organization?.date_format;
  } catch {
    // Состояние ещё не готово — не повод ронять поле ввода.
  }

  return formatDateBy(date, format);
}
