// © 2026 Bigfin

/**
 * Парето по контрагентам (FIN-018 ТЗ-2, формула 11.8).
 *
 * ЗАЧЕМ. Главная отвечала на «сколько денег» и «что горит», но не на «НА КОМ
 * ДЕРЖИТСЯ БИЗНЕС». Концентрация выручки — это риск: когда три клиента дают
 * восемьдесят процентов, уход одного меняет год.
 *
 * ЧЕГО НЕТ У КОНКУРЕНТА. ПланФакт рисует столбцы и линию накопительной доли
 * и оставляет человека читать график. Здесь рядом стоит фраза: «Более 80 %
 * выручки дают 3 клиента — высокая зависимость». График показывают глазами,
 * фразу читают.
 */

export interface ContractorRevenue {
  contactId: number;
  name: string;
  revenue: number;
}

export interface ParetoRow extends ContractorRevenue {
  /** Доля в выручке, %. */
  sharePercent: number;
  /** Накопительная доля, % — линия на графике. */
  cumulativePercent: number;
  /** Строка «Остальные»: это не контрагент, а свёртка хвоста. */
  isRest?: boolean;
}

export type ConcentrationVerdict =
  | 'SINGLE_CLIENT'
  | 'HIGH_DEPENDENCE'
  | 'MODERATE'
  | 'EVEN';

export interface ParetoResult {
  rows: ParetoRow[];
  totalRevenue: number;
  /** Сколько контрагентов дают 80 % выручки. `null` — выручки нет. */
  concentrationCount: number | null;
  verdict: ConcentrationVerdict | null;
}

/** Сколько контрагентов показываем поимённо; остальные — одной строкой. */
export const PARETO_TOP = 10;

/** Порог концентрации: классическое правило «восемьдесят на двадцать». */
export const CONCENTRATION_THRESHOLD = 80;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Строит Парето по выручке контрагентов.
 *
 * @param {ContractorRevenue[]} contractors выручка за период
 * @returns {ParetoResult}
 */
export function computeParetoContractors(
  contractors: ContractorRevenue[] = [],
): ParetoResult {
  // Контрагенты без выручки за период не показываются: строка с нулём
  // ничего не сообщает, а список удлиняет.
  const meaningful = (contractors ?? []).filter(
    (item) => Number(item?.revenue ?? 0) > 0,
  );

  const totalRevenue = round2(
    meaningful.reduce((sum, item) => sum + Number(item.revenue), 0),
  );

  // НУЛЕВАЯ ВЫРУЧКА — блок не показывается вовсе. Пустой график с подписью
  // «0 %» выглядит поломкой, а не ответом «продаж за период не было».
  if (totalRevenue === 0) {
    return {
      rows: [],
      totalRevenue: 0,
      concentrationCount: null,
      verdict: null,
    };
  }

  const sorted = [...meaningful].sort(
    (left, right) => Number(right.revenue) - Number(left.revenue),
  );

  const top = sorted.slice(0, PARETO_TOP);
  const rest = sorted.slice(PARETO_TOP);

  let cumulative = 0;
  const rows: ParetoRow[] = top.map((item) => {
    const sharePercent = round2((Number(item.revenue) / totalRevenue) * 100);
    cumulative = round2(cumulative + sharePercent);

    return {
      ...item,
      revenue: round2(Number(item.revenue)),
      sharePercent,
      cumulativePercent: cumulative,
    };
  });

  if (rest.length > 0) {
    const restRevenue = round2(
      rest.reduce((sum, item) => sum + Number(item.revenue), 0),
    );

    rows.push({
      contactId: 0,
      name: 'REST',
      revenue: restRevenue,
      sharePercent: round2((restRevenue / totalRevenue) * 100),
      // ДОХОДИТ РОВНО ДО СТА. Накопление через сложение округлённых долей
      // даёт 99,99 — и человек видит, что «чего-то не хватает». Последняя
      // строка закрывает ряд честной сотней.
      cumulativePercent: 100,
      isRest: true,
    });
  } else if (rows.length > 0) {
    rows[rows.length - 1].cumulativePercent = 100;
  }

  const concentrationCount = concentrationOf(sorted, totalRevenue);

  return {
    rows,
    totalRevenue,
    concentrationCount,
    verdict: verdictOf(concentrationCount, sorted.length),
  };
}

/** Сколько контрагентов набирают порог концентрации. */
function concentrationOf(
  sorted: ContractorRevenue[],
  totalRevenue: number,
): number | null {
  if (totalRevenue === 0) return null;

  let cumulative = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    cumulative += (Number(sorted[index].revenue) / totalRevenue) * 100;

    if (cumulative >= CONCENTRATION_THRESHOLD) return index + 1;
  }

  return sorted.length;
}

/**
 * Вывод словами.
 *
 * Границы взяты из ТЗ и не выдуманы: до трёх клиентов — зависимость,
 * которую владелец обязан видеть; до восьми — факт без оценки; дальше —
 * равномерно. Оценка там, где её не просят, читается как упрёк.
 */
function verdictOf(
  concentrationCount: number | null,
  contractorsCount: number,
): ConcentrationVerdict | null {
  if (concentrationCount === null) return null;
  if (contractorsCount === 1) return 'SINGLE_CLIENT';
  if (concentrationCount <= 3) return 'HIGH_DEPENDENCE';
  if (concentrationCount <= 8) return 'MODERATE';

  return 'EVEN';
}
