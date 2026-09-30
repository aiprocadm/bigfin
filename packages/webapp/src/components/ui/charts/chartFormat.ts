import intl from 'react-intl-universal';

import { formattedCompactAmount } from '@/utils/compactMoney';
import { organizationCurrency } from '@/utils/organizationMoney';
import { uiLocale } from '@/utils/formatShortDate';

/**
 * Подписи осей (R16): «1,6 млн ₽», «250 тыс. ₽», «0 ₽», отрицательные — с
 * «−». Полная сумма — в подсказке. На осях было «1600000».
 */
export function formatAxisMoney(value: number): string {
  if (!Number.isFinite(value)) return '';
  const text = formattedCompactAmount(value, organizationCurrency());
  // Минус — типографский, как в суммах реестра (UI-042-8).
  return text.replace(/^-/, '−');
}

/** Доля на оси: 0.125 → «12,5 %». */
export function formatAxisPercent(share: number): string {
  if (!Number.isFinite(share)) return '';
  const number = new Intl.NumberFormat(uiLocale(), { maximumFractionDigits: 1 }).format(
    share * 100,
  );
  return `${number.replace(/^-/, '−')} %`;
}

/**
 * Круговая — не больше пяти долей и «Прочее» (R18). Мелкие доли сливаются в
 * «Прочее», чтобы глаз сравнивал пять долей, а не пятнадцать щепок.
 */
export function topSlices<T extends { value: number; label: string }>(
  items: T[],
  limit = 5,
): Array<{ value: number; label: string; other?: boolean }> {
  const sorted = [...items].filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  if (sorted.length <= limit + 1) return sorted;
  const rest = sorted.slice(limit).reduce((sum, item) => sum + item.value, 0);
  return [...sorted.slice(0, limit), { value: rest, label: intl.get('charts.other'), other: true }];
}
