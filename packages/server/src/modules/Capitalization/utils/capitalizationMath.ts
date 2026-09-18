// © 2026 Bigfin
/**
 * Капитализация и стоимость бизнеса (этап 11 ТЗ).
 *
 * ТЗ называет это «главным отчётом собственника». Все исходные данные уже
 * есть — баланс и ОПиУ, новых сущностей не требуется. Здесь только расчёты.
 *
 * Оценка бизнеса — место, где легко нарисовать красивое число, которое
 * ничего не значит. Поэтому каждое правило ниже — про то, когда считать
 * НЕЛЬЗЯ.
 */

export interface MetricValue {
  value: number;
  applicable: boolean;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Чистые активы: чем владеем минус кому должны.
 *
 * Самая честная из оценок: она не зависит ни от каких допущений, только от
 * баланса. Может быть отрицательной — и это не ошибка, а важный сигнал:
 * долгов больше, чем имущества.
 */
export function computeNetAssets(assets: number, liabilities: number): number {
  return round2(Number(assets ?? 0) - Number(liabilities ?? 0));
}

/**
 * Оценка по мультипликатору прибыли.
 *
 * **Убыточный бизнес так не оценивается.** Прибыль −2 млн, умноженная на
 * множитель 4, даёт «стоимость −8 млн» — число, которое выглядит как
 * расчёт, но смысла не имеет: бизнес не стоит отрицательных денег, его
 * просто не оценивают этим способом.
 *
 * Множитель обязан быть положительным: ноль или минус означают, что его
 * забыли настроить.
 */
export function computeMultipleValuation(
  annualEbitda: number,
  multiple: number,
): MetricValue {
  const profit = Number(annualEbitda ?? 0);
  const factor = Number(multiple ?? 0);

  if (!Number.isFinite(profit) || profit <= 0) {
    return { value: 0, applicable: false };
  }
  if (!Number.isFinite(factor) || factor <= 0) {
    return { value: 0, applicable: false };
  }

  return { value: round2(profit * factor), applicable: true };
}

/**
 * Доля владельца в деньгах.
 *
 * Берётся из поля юрлица (этап 6). Доля вне диапазона 0..100 — это ошибка
 * данных, а не повод показать странное число.
 */
export function computeOwnerValue(
  companyValue: number,
  ownershipSharePercent: number,
): MetricValue {
  const share = Number(ownershipSharePercent ?? 0);

  if (!Number.isFinite(share) || share < 0 || share > 100) {
    return { value: 0, applicable: false };
  }
  return {
    value: round2((Number(companyValue ?? 0) * share) / 100),
    applicable: true,
  };
}

export interface ValueDriver {
  key: string;
  amount: number;
  /** Увеличивает стоимость или уменьшает. */
  direction: 'up' | 'down';
}

/**
 * Разложение: что увеличивает стоимость, что уменьшает.
 *
 * Направление определяется **смыслом статьи, а не знаком числа**. Рост долга
 * — это минус к стоимости, даже когда сам долг записан положительным числом.
 * Если брать знак, разложение будет показывать долги как рост стоимости.
 */
export function buildValueDrivers(input: {
  assets: number;
  liabilities: number;
  profit: number;
}): ValueDriver[] {
  const drivers: ValueDriver[] = [
    { key: 'assets', amount: round2(Number(input.assets ?? 0)), direction: 'up' },
    {
      key: 'liabilities',
      amount: round2(Number(input.liabilities ?? 0)),
      direction: 'down',
    },
  ];

  const profit = round2(Number(input.profit ?? 0));
  // Прибыль увеличивает стоимость, убыток уменьшает — вот здесь знак как раз
  // и решает, потому что это одна и та же величина с разным исходом.
  drivers.push({
    key: 'profit',
    amount: Math.abs(profit),
    direction: profit >= 0 ? 'up' : 'down',
  });

  return drivers.filter((driver) => driver.amount !== 0);
}

/**
 * Динамика стоимости по месяцам.
 *
 * Месяц без данных **рвёт линию**, а не опускается в ноль: ноль означал бы,
 * что бизнес в этот месяц ничего не стоил.
 */
export function buildValueSeries(
  months: Array<{ month: string; netAssets: number | null }>,
): Array<{ month: string; value: number }> {
  return (months ?? [])
    .filter((point) => point.netAssets != null)
    .map((point) => ({
      month: point.month,
      value: round2(Number(point.netAssets)),
    }));
}
