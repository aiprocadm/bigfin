import { formatOrganizationNumber } from '@/utils/organizationNumber';

/**
 * Числа в бюджетах. Пустое значение печатаем прочерком, а не роняем страницу:
 * из-за `undefined.toLocaleString()` вкладка «План-факт» падала целиком.
 *
 * Суммы здесь печатаются БЕЗ знака валюты намеренно (решение карты v31):
 * это столбцы, в которые человек вписывает суммы руками, и знак в поле
 * мешал бы вводу. А вот отклонение в процентах печатается общим печатником
 * чисел — раньше дробь уходила точкой («+12.5%»).
 */
export const fmt = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('ru-RU');

export const fmtPct = (v: number | null | undefined) =>
  v == null ? '—' : `${v > 0 ? '+' : ''}${formatOrganizationNumber(v)}%`;
