import { store } from '@/store/create-store';
import { getCurrentOrganizationFactory } from '@/store/authentication/authentication.selectors';
import { RU_STYLE_CURRENCIES, NBSP } from './currencyStyle';

/**
 * З1 карты v37. Продукт слушает суммы так же, как печатает.
 *
 * Продукт печатает «1 000,50 ₽»: разряды пробелом, копейки запятой (см.
 * `formattedAmount`). Денежные поля при этом заведены с американскими
 * настройками — запятая для них разделитель разрядов. Человек печатает
 * `1000,50`, а в учёт уходит `100050`: в сто раз больше, без ошибки и без
 * подсказки. Системное числовое поле браузера ведёт себя так же — оно
 * просто выбрасывает запятую (проверено на `en-US` и на `ru-RU`).
 *
 * Здесь одно правило разбора на весь продукт.
 */

/** Валюта, если организация ещё не загружена. Продукт российский. */
const FALLBACK_CURRENCY = 'RUB';

/** Пробелы всех мастей: обычный, неразрывный, узкий неразрывный. */
const SPACES = /[\s\u00a0\u202f]/g;

export interface AmountSeparators {
  /** Знак копеек: у русской организации — запятая. */
  decimalSeparator: string;
  /** Знак разрядов: у русской организации — пробел. */
  groupSeparator: string;
}

const RU_SEPARATORS: AmountSeparators = {
  decimalSeparator: ',',
  groupSeparator: NBSP,
};

const EN_SEPARATORS: AmountSeparators = {
  decimalSeparator: '.',
  groupSeparator: ',',
};

/** Знаки разделителей по валюте организации — зеркало `formattedAmount`. */
export function amountSeparators(): AmountSeparators {
  let currency = FALLBACK_CURRENCY;

  try {
    const organization = getCurrentOrganizationFactory()(store.getState()) as
      | { base_currency?: string }
      | undefined;
    currency = organization?.base_currency || FALLBACK_CURRENCY;
  } catch {
    // Состояние ещё не готово — считаем по-русски, продукт российский.
  }

  return RU_STYLE_CURRENCIES.includes(currency)
    ? RU_SEPARATORS
    : EN_SEPARATORS;
}

/**
 * Где в напечатанной строке знак копеек, а где — разряды.
 *
 * Правила по убыванию надёжности:
 *  1. Есть и запятая, и точка — копейки отделяет ПОСЛЕДНЯЯ из них
 *     (так читается и «1,000.50» из английской выгрузки, и «1.000,50»
 *     из немецкой).
 *  2. Знак повторяется — это разряды: «1.000.000» — миллион.
 *  3. Знак стоит один раз и это знак разрядов организации, а цифры
 *     разложены тройками («1,000» у английской валюты) — разряды.
 *  4. Иначе это копейки. У русской организации разряды отделяет пробел,
 *     поэтому и запятая, и точка означают копейки — на цифровой
 *     клавиатуре запятой попросту нет.
 *
 * Возвращает позицию знака копеек в строке или -1.
 */
function decimalMarkAt(text: string, separators: AmountSeparators): number {
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');

  if (lastComma < 0 && lastDot < 0) return -1;
  if (lastComma >= 0 && lastDot >= 0) return Math.max(lastComma, lastDot);

  const mark = lastComma >= 0 ? ',' : '.';
  const repeated = text.split(mark).length - 1 > 1;
  if (repeated) return -1;

  // Раскладку тройками смотрим по голым цифрам: знак валюты и минус в
  // строке есть, а к разрядам отношения не имеют.
  const bare = text.replace(/[^0-9.,]/g, '');
  const groupedByThrees = new RegExp(`^\\d{1,3}(\\${mark}\\d{3})+$`).test(bare);
  if (mark === separators.groupSeparator && groupedByThrees) return -1;

  return Math.max(lastComma, lastDot);
}

const digitsOnly = (text: string): string => text.replace(/[^0-9]/g, '');

/**
 * Напечатанная человеком сумма → машинное число строкой («1000.50»).
 *
 * Пустая строка означает «ничего не введено» — так же, как у пустого поля.
 */
export function parseAmountInput(
  raw: string | number | null | undefined,
  separators: AmountSeparators = amountSeparators(),
): string {
  if (raw === null || raw === undefined) return '';

  const text = String(raw).replace(SPACES, '');
  if (!text) return '';

  const negative = text.includes('-');
  const cleaned = text.replace(/[^0-9.,]/g, '');
  if (!digitsOnly(cleaned)) return '';

  const markAt = decimalMarkAt(cleaned, separators);
  const int = digitsOnly(markAt >= 0 ? cleaned.slice(0, markAt) : cleaned);
  const frac = markAt >= 0 ? digitsOnly(cleaned.slice(markAt + 1)) : '';

  const sign = negative ? '-' : '';
  const body = frac ? `${int || '0'}.${frac}` : int || '0';

  return `${sign}${body}`;
}

/**
 * Машинное число → строка для поля ввода в формате организации.
 *
 * Разряды здесь не расставляются: их расставит само поле, когда человек
 * закончит печатать.
 */
export function formatAmountForInput(
  value: string | number | null | undefined,
  separators: AmountSeparators = amountSeparators(),
): string {
  if (value === null || value === undefined || value === '') return '';

  return String(value).replace('.', separators.decimalSeparator);
}

/**
 * Машинное число → сумма в формате организации, с разрядами: «1 000,50».
 *
 * Тем же самым занят `formattedAmount`, но он ставит ещё и знак валюты —
 * в поле ввода знак валюты только мешает печатать.
 */
export function formatAmountWithGroups(
  value: string | number | null | undefined,
  separators: AmountSeparators = amountSeparators(),
): string {
  if (value === null || value === undefined || value === '') return '';

  const canonical = String(value);
  const negative = canonical.startsWith('-');
  const [int, frac] = canonical.replace('-', '').split('.');

  const grouped = int.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    separators.groupSeparator,
  );
  const tail = frac === undefined ? '' : `${separators.decimalSeparator}${frac}`;

  return `${negative ? '-' : ''}${grouped}${tail}`;
}

/**
 * Приводит напечатанное к знакам разделителей поля: знак копеек — тот,
 * что настроен, лишние знаки убраны.
 *
 * Нужна денежному полю продукта, которое разбирает строку своим кодом:
 * без этого шага точка, напечатанная в русском поле, считается разрядом
 * и `1000.50` превращается в `100050`.
 */
export function normalizeTypedSeparators(
  raw: string,
  separators: AmountSeparators,
): string {
  const markAt = decimalMarkAt(raw.replace(SPACES, ''), separators);
  const text = raw.replace(SPACES, '');

  if (markAt < 0) return text.replace(/[.,]/g, '');

  const head = text.slice(0, markAt).replace(/[.,]/g, '');
  const tail = text.slice(markAt + 1).replace(/[.,]/g, '');

  return `${head}${separators.decimalSeparator}${tail}`;
}
