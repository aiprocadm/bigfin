import { useIsPhone } from '../use-media-query';

/** Высота графика: 240 на ноутбуке, 200 на телефоне (§6.1). */
export const CHART_HEIGHT = { desktop: 240, phone: 200 } as const;

/** Не больше шести подписей по оси на телефоне. */
export const PHONE_MAX_TICKS = 6;

/**
 * Через сколько подписей пропускать, чтобы их осталось не больше `max`.
 * Recharts понимает число как «показывать каждую (n+1)-ю».
 */
export function tickInterval(count: number, max: number): number {
  if (count <= max) return 0;
  return Math.ceil(count / max) - 1;
}

/**
 * Размеры графика по ширине экрана. Подписи оси X не наклоняются никогда
 * (правило 6): не влезают — прореживаются.
 */
export function useChartSize(pointCount = 0) {
  const isPhone = useIsPhone();
  return {
    isPhone,
    height: isPhone ? CHART_HEIGHT.phone : CHART_HEIGHT.desktop,
    xInterval: isPhone ? tickInterval(pointCount, PHONE_MAX_TICKS) : ('preserveStartEnd' as const),
  };
}
