// © 2026 Bigfin
/**
 * Правила показа экрана «Сколько стоит бизнес» (этап 11 ТЗ).
 *
 * Сервер уже посчитал числа и уже сказал, какие из них применимы. Здесь
 * решается только одно: что показать и о чём предупредить. Это тоже место
 * для ошибок, которые не падают, — например, нарисовать уверенную оценку
 * там, где считать было нечем.
 */

export interface MetricValue {
  value: number;
  applicable: boolean;
}

export interface ValueDriver {
  key: string;
  amount: number;
  direction: 'up' | 'down';
}

export interface Capitalization {
  assets: number;
  liabilities: number;
  netAssets: number;
  hasBalance: boolean;
  profit: number;
  profitMultiple: number | null;
  multipleValuation: MetricValue;
  ownershipSharePercent: number | null;
  ownerValue: MetricValue;
  drivers: ValueDriver[];
}

/**
 * О чём предупредить, прежде чем показывать оценку.
 *
 * Порядок важен: сначала «считать нечего» (отчёт не построился), потом
 * «оценки по прибыли нет» — иначе организации без единой проводки мы
 * посоветовали бы настроить множитель, хотя ей это ничего не даст.
 */
export type CapitalizationWarning =
  | 'no_balance'
  | 'loss'
  | 'no_multiple'
  | null;

export function capitalizationWarning(
  data: Capitalization | undefined,
): CapitalizationWarning {
  if (!data) return null;
  if (!data.hasBalance) return 'no_balance';

  // Убыток важнее ненастроенного множителя: настроив множитель, владелец
  // всё равно не получит оценку — и решит, что продукт сломан.
  if (data.profit <= 0) return 'loss';
  if (data.profitMultiple == null) return 'no_multiple';

  return null;
}

/**
 * Какую оценку показывать главной.
 *
 * Чистые активы — самая честная: они не зависят ни от каких допущений.
 * Оценка по мультипликатору показывается главной, только когда она
 * применима, потому что именно её владелец и спрашивает.
 */
export function primaryValuation(
  data: Capitalization | undefined,
): { key: 'multiple' | 'net_assets'; value: number } {
  if (data?.multipleValuation?.applicable) {
    return { key: 'multiple', value: data.multipleValuation.value };
  }

  return { key: 'net_assets', value: data?.netAssets ?? 0 };
}

/**
 * Строки разложения «что увеличивает стоимость, что уменьшает».
 *
 * Нулевые не показываем: строка «Обязательства 0 ₽» намекает на проблему,
 * которой нет. Порядок — сначала то, что увеличивает.
 */
export function buildDriverRows(
  drivers: ValueDriver[] | undefined,
): ValueDriver[] {
  return (drivers ?? [])
    .filter((driver) => driver.amount !== 0)
    .sort((a, b) => {
      if (a.direction !== b.direction) return a.direction === 'up' ? -1 : 1;
      return b.amount - a.amount;
    });
}
