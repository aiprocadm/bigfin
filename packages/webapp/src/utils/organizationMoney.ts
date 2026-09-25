import { store } from '@/store/create-store';
import { getCurrentOrganizationFactory } from '@/store/authentication/authentication.selectors';
import { formattedAmount } from '@/utils';
import { getDisplayPreferences } from './displayPreferences';

/** Валюта, если организация ещё не загружена. */
const FALLBACK_CURRENCY = 'RUB';

/**
 * Валюта организации — для мест, где сумма печатается не целиком (оси
 * графиков, короткая запись «1,6 млн ₽»).
 */
export function organizationCurrency(): string {
  try {
    const organization = getCurrentOrganizationFactory()(store.getState()) as
      | { base_currency?: string }
      | undefined;
    return organization?.base_currency || FALLBACK_CURRENCY;
  } catch {
    // Состояние ещё не готово — печатаем в рублях, продукт российский.
    return FALLBACK_CURRENCY;
  }
}

/**
 * Р1 карты v26. Сумма — по валюте организации, одной утилитой на весь
 * продукт.
 *
 * Четыре экрана (анализ НДС, маркетплейсы, эквайринг, МойСклад) завели себе
 * по маленькому форматтеру `new Intl.NumberFormat('ru-RU', …)`, который
 * печатал `45 000` — без знака валюты и без копеек. В разделе про НДС такое
 * число читается как «сорок пять тысяч чего?», а на соседнем экране та же
 * сумма подписана рублём.
 *
 * Здесь берётся валюта организации и общая утилита `formattedAmount` — та
 * самая, которой печатаются деньги в отчётах, сводке и документах.
 *
 * Функция, а не хук: её зовут внутри маленьких помощников этих экранов,
 * которые не являются компонентами.
 */
export function formatOrganizationMoney(value: number): string {
  const currency = organizationCurrency();

  // КОПЕЙКИ — ЛИЧНАЯ НАСТРОЙКА ЧЕЛОВЕКА (FIN-026). Раньше галочка на
  // экране настроек сохранялась и не меняла НИЧЕГО: её никто не читал.
  const { showCents } = getDisplayPreferences();

  return formattedAmount(
    value ?? 0,
    currency,
    showCents ? {} : { precision: 0 },
  );
}
