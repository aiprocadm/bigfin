import intl from 'react-intl-universal';
import Currency from 'js-money/lib/currency';

import { formattedAmount } from './index';
import { NBSP, RU_STYLE_CURRENCIES } from './currencyStyle';

/**
 * Короткая запись суммы: «1,75 млн ₽», «250 тыс. ₽» (UI-042-1, R16 ТЗ-4).
 *
 * Для мест, где полная сумма не помещается: шапка на телефоне, оси графиков.
 * Полная сумма при этом всегда доступна рядом (всплывающая подсказка, окно).
 *
 * Своего форматирования денег здесь нет: число печатает общая
 * `formattedAmount`, отсюда только ступень (тыс./млн/млрд) и её слово.
 */
const STEPS: { size: number; key: string }[] = [
  { size: 1e3, key: 'compact.thousand' },
  { size: 1e6, key: 'compact.million' },
  { size: 1e9, key: 'compact.billion' },
];

/**
 * Округление для короткой записи: 100 и больше — целые, 10–99 — один знак,
 * меньше — два. Хвостовые нули не печатаются: «1,5», а не «1,50».
 */
function roundCompact(value: number): { value: number; precision: number } {
  const abs = Math.abs(value);
  let precision = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  const rounded = Math.round(value * 10 ** precision) / 10 ** precision;
  while (
    precision > 0 &&
    Math.round(rounded * 10 ** (precision - 1)) / 10 ** (precision - 1) ===
      rounded
  ) {
    precision -= 1;
  }
  return { value: rounded, precision };
}

export function formattedCompactAmount(
  amount: number,
  currencyCode = '',
): string {
  const abs = Math.abs(amount);
  // До тысячи сумма помещается и так — печатаем целиком, без копеек.
  if (Math.round(abs) < 1e3) {
    return formattedAmount(Math.round(amount), currencyCode, { precision: 0 });
  }
  // Самая крупная ступень, до которой сумма дотягивает.
  let step = STEPS.filter(({ size }) => abs >= size).pop() ?? STEPS[0];
  let rounded = roundCompact(amount / step.size);
  // 999 999 округляется до «1000 тыс.» — это «1 млн».
  const next = STEPS[STEPS.indexOf(step) + 1];
  if (next && Math.abs(rounded.value) >= 1000) {
    step = next;
    rounded = roundCompact(amount / step.size);
  }
  return withUnit(
    formattedAmount(rounded.value, currencyCode, {
      precision: rounded.precision,
    }),
    intl.get(step.key),
    currencyCode,
  );
}

/** Вставить слово ступени между числом и знаком валюты: «1,75 млн ₽». */
function withUnit(
  formatted: string,
  unit: string,
  currencyCode: string,
): string {
  const sign: string = (Currency as any)[currencyCode]?.symbol_native ?? '';
  if (
    RU_STYLE_CURRENCIES.includes(currencyCode) &&
    sign &&
    formatted.endsWith(sign)
  ) {
    const number = formatted.slice(0, -sign.length).trimEnd();
    return `${number}${NBSP}${unit}${NBSP}${sign}`;
  }
  return `${formatted}${NBSP}${unit}`;
}
