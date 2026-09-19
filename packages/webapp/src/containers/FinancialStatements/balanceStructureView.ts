// © 2026 Bigfin

export interface BalanceStructureSlice {
  id: string;
  name: string;
  total: number;
  share: number;
}

export interface BalanceStructure {
  assets: BalanceStructureSlice[];
  liabilitiesEquity: BalanceStructureSlice[];
  assetsTotal: number;
  liabilitiesEquityTotal: number;
}

/**
 * Полосы, которые и правда рисуются.
 *
 * У отрицательной группы ширины не существует: полоса «минус тридцать тысяч»
 * — это не короткая полоса, это ничто. Такие группы уходят в подпись под
 * картинкой, а не в саму картинку.
 */
export function drawableSlices(
  slices: BalanceStructureSlice[] | undefined,
): BalanceStructureSlice[] {
  return (slices ?? []).filter((slice) => slice.share > 0);
}

/** Группы, которые нельзя нарисовать, но нужно назвать. */
export function negativeSlices(
  slices: BalanceStructureSlice[] | undefined,
): BalanceStructureSlice[] {
  return (slices ?? []).filter((slice) => slice.total < 0);
}

/**
 * Показывать ли картинку вообще.
 *
 * Пустой баланс рисовать нечем, и пустая рамка на экране сообщает только то,
 * что что-то сломалось. Лучше не показывать ничего.
 */
export function shouldShowStructure(
  structure: BalanceStructure | undefined,
): boolean {
  if (!structure) return false;

  return (
    drawableSlices(structure.assets).length > 0 ||
    drawableSlices(structure.liabilitiesEquity).length > 0
  );
}

/**
 * Доля в процентах для подписи.
 *
 * Округляем до целых: «37,4 %» в подписи полосы никто не читает, а место
 * занимает. Доля меньше половины процента показывается как «<1 %», а не как
 * «0 %»: ноль означал бы, что группы нет вовсе.
 */
export function formatShare(share: number): string {
  const percent = share * 100;

  if (percent > 0 && percent < 1) return '<1%';

  return `${Math.round(percent)}%`;
}
