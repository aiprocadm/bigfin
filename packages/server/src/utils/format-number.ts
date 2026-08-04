import { get } from 'lodash';
import * as accounting from 'accounting';
import * as Currencies from 'js-money/lib/currency';

/** Неразрывный пробел: сумма и знак валюты не должны разъезжаться переносом. */
const NBSP = '\u00A0';

/**
 * Расположение знака валюты: по-русски — после суммы, иначе — перед ней.
 * Когда знака нет, пробел не добавляем, чтобы не оставлять хвост.
 */
const buildFormat = (ruStyle: boolean, hasSign: boolean): string => {
  if (!hasSign) return '%v';
  return ruStyle ? `%v${NBSP}%s` : '%s%v';
};

const getNegativeFormat = (formatName, ruStyle: boolean, hasSign: boolean) => {
  const body = buildFormat(ruStyle, hasSign);

  switch (formatName) {
    case 'parentheses':
      return `(${body})`;
    case 'mines':
      return `-${body}`;
  }
};

/**
 * Знак валюты. У рубля в библиотеке `symbol` — это буквы «RUB», а настоящий
 * знак «₽» лежит в `symbol_native`; берём его, иначе в отчётах выходило
 * «RUB590,000.00».
 */
const getCurrencySign = (currencyCode): string => {
  return (
    get(Currencies, `${currencyCode}.symbol_native`) ??
    get(Currencies, `${currencyCode}.symbol`) ??
    // Неизвестная валюта: без знака. Иначе библиотека подставляет доллар.
    ''
  );
};

/**
 * Валюты, которые принято писать по-русски: разряды через пробел, копейки
 * через запятую, знак валюты ПОСЛЕ суммы («590 000,00 ₽»).
 */
const RU_STYLE_CURRENCIES = ['RUB'];

const isRuStyle = (currencyCode?: string): boolean =>
  Boolean(currencyCode) && RU_STYLE_CURRENCIES.includes(currencyCode);

export interface IFormatNumberSettings {
  precision?: number;
  divideOn1000?: boolean;
  excerptZero?: boolean;
  negativeFormat?: string;
  thousand?: string;
  decimal?: string;
  zeroSign?: string;
  money?: boolean;
  currencyCode?: string;
  symbol?: string;
}

export const formatNumber = (
  balance,
  {
    precision = 2,
    divideOn1000 = false,
    excerptZero = false,
    negativeFormat = 'mines',
    thousand,
    decimal,
    zeroSign = '',
    money = true,
    currencyCode,
    symbol = '',
  }: IFormatNumberSettings,
) => {
  const ruStyle = isRuStyle(currencyCode);
  // Явно переданные разделители сильнее правил валюты.
  const thousandSep = thousand ?? (ruStyle ? NBSP : ',');
  const decimalSep = decimal ?? (ruStyle ? ',' : '.');

  const formattedSymbol = getCurrencySign(currencyCode);
  const sign = money ? formattedSymbol : symbol;
  const format = buildFormat(ruStyle, Boolean(sign));
  const negForamt = getNegativeFormat(negativeFormat, ruStyle, Boolean(sign));

  let formattedBalance = parseFloat(balance);

  if (divideOn1000) {
    formattedBalance /= 1000;
  }
  return accounting.formatMoney(
    formattedBalance,
    sign,
    precision,
    thousandSep,
    decimalSep,
    {
      pos: format,
      neg: negForamt,
      zero: excerptZero ? zeroSign : format,
    },
  );
};
