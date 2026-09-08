import { parseAbbrValue } from './parseAbbrValue';
import { removeSeparators } from './removeSeparators';
import { removeInvalidChars } from './removeInvalidChars';
import { escapeRegExp } from './escapeRegExp';
import { normalizeTypedSeparators } from '@/utils/amountInput';

export type CleanValueOptions = {
  value: string;
  decimalSeparator?: string;
  groupSeparator?: string;
  allowDecimals?: boolean;
  decimalsLimit?: number;
  allowNegativeValue?: boolean;
  turnOffAbbreviations?: boolean;
  prefix?: string;
};

/**
 * Remove prefix, separators and extra decimals from value
 */
export const cleanValue = ({
  value,
  groupSeparator = ',',
  decimalSeparator = '.',
  allowDecimals = true,
  decimalsLimit = 2,
  allowNegativeValue = true,
  turnOffAbbreviations = false,
  prefix = '',
}: CleanValueOptions): string => {
  const abbreviations = turnOffAbbreviations ? [] : ['k', 'm', 'b'];

  // З1 карты v37. Сначала приводим напечатанное к знакам поля: без этого
  // точка в русском поле считается разрядом, и «1000.50» превращается в
  // «100050» — в сто раз больше, молча.
  value = normalizeTypedSeparators(value, { decimalSeparator, groupSeparator });

  const isNegative = value.includes('-');

  // Запасные пустые строки не для красоты: если приставки в строке нет, обе
  // части выходят пустыми, и `.concat(undefined)` дописал бы в число слово
  // «undefined» (Д35 карты v75).
  const [prefixWithValue = '', preValue = ''] =
    RegExp(`(\\d+)-?${escapeRegExp(prefix)}`).exec(value) || [];
  const withoutPrefix = prefix ? value.replace(prefixWithValue, '').concat(preValue) : value;
  const withoutSeparators = removeSeparators(withoutPrefix, groupSeparator);
  const withoutInvalidChars = removeInvalidChars(withoutSeparators, [
    groupSeparator,
    decimalSeparator,
    ...abbreviations,
  ]);

  let valueOnly = withoutInvalidChars;

  if (!turnOffAbbreviations) {
    // disallow letter without number
    if (abbreviations.some((letter) => letter === withoutInvalidChars.toLowerCase())) {
      return '';
    }
    const parsed = parseAbbrValue(withoutInvalidChars, decimalSeparator);
    if (parsed) {
      valueOnly = String(parsed);
    }
  }

  const includeNegative = isNegative && allowNegativeValue ? '-' : '';

  if (String(valueOnly).includes(decimalSeparator)) {
    const [int, decimals] = withoutInvalidChars.split(decimalSeparator);
    const trimmedDecimals = decimalsLimit ? decimals.slice(0, decimalsLimit) : decimals;
    const includeDecimals = allowDecimals ? `${decimalSeparator}${trimmedDecimals}` : '';

    return `${includeNegative}${int}${includeDecimals}`;
  }

  return `${includeNegative}${valueOnly}`;
};
