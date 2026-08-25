import intl from 'react-intl-universal';
import { getCookie } from '@/utils';

/**
 * Язык, на котором витрина спрашивает сервер (Р1 карты v21).
 *
 * Правило одно: спрашиваем на том языке, на котором человек смотрит
 * продукт. Сначала — язык, которым интерфейс уже отрисован
 * (`react-intl-universal` разобрал cookie, настройку браузера и адрес и
 * выбрал поддерживаемый), и только если он ещё не готов — cookie `locale`
 * напрямую (запросы бывают и до загрузки словарей, например при входе).
 *
 * Пустая строка означает «языка не знаем» — тогда заголовок не ставится
 * вовсе и сервер решает сам (у него есть язык организации).
 */
export const getRequestLocale = (): string => {
  try {
    const current = intl.getInitOptions()?.currentLocale;
    if (current) return current;
  } catch {
    // Словари ещё не загружены — не повод ронять запрос.
  }
  return getCookie('locale', '');
};
