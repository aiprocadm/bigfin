// © 2026 Bigfin
import { ERRORS } from '../constants';

/**
 * Управленческий тип статьи для отчёта о прибыли (FT-009 ТЗ-3).
 *
 * ЗАЧЕМ. Отчёт о прибыли строился от вида СЧЁТА плана счетов: доходы,
 * себестоимость, расходы. Человек без бухгалтерского образования не мог
 * объяснить продукту, что «Комиссия за эквайринг» растёт вместе с выручкой, а
 * «Доставка на производство» относится ко всему цеху. Поэтому ярусов
 * управленческой прибыли — маржинальный доход, валовая по направлениям,
 * валовая общая — построить было не из чего.
 *
 * Теперь у статьи три измерения: вид (`kind`), раздел движения денег
 * (`cashflow_section`) и ярус прибыли (`pl_type`). Все три настраиваются в
 * одном месте — в карточке статьи. Отдельной таблицы «статья → строка отчёта»
 * нет и не будет (решение D2 ТЗ-2): карта выводится из полей статьи.
 *
 * ДОМЕН ЖИВЁТ В КОДЕ, а не в CHECK-ограничении базы: MySQL до 8.0.16 CHECK
 * молча игнорирует, и ограничение, которое не работает, хуже его отсутствия.
 * Так же устроены `kind` и `cost_behavior`.
 */

/** Ярусы доходов. */
export const INCOME_PL_TYPES = [
  /** Выручка без НДС. */
  'revenue',
  /** Прочие доходы вне основной деятельности: проценты на остаток и т. п. */
  'other_income_below_ebitda',
] as const;

/** Ярусы расходов — в порядке, в котором они уменьшают прибыль. */
export const EXPENSE_PL_TYPES = [
  /** Растут вместе с выручкой: комиссия эквайринга, сдельная оплата. */
  'direct_variable',
  /** Однозначно относятся к направлению или сделке. */
  'direct_production',
  /** Производственные, но общие для всего бизнеса. */
  'overhead_production',
  'administrative',
  'commercial',
  /** Налоги, амортизация, проценты по кредитам, прочие расходы. */
  'below_ebitda',
  /** Вывод прибыли, дивиденды: ниже чистой прибыли и на неё не влияют. */
  'below_net_profit',
] as const;

/**
 * Явное «не участвует в отчёте о прибыли».
 *
 * Отдельное значение, а не пустота: пустота у дочерней статьи значит
 * «как у родителя». Без явного исключения нельзя было бы вывести из отчёта
 * одну дочернюю статью, оставив родителя.
 */
export const PL_TYPE_EXCLUDED = 'excluded' as const;

export const PL_TYPES = [
  ...INCOME_PL_TYPES,
  ...EXPENSE_PL_TYPES,
  PL_TYPE_EXCLUDED,
] as const;

export type PlType = (typeof PL_TYPES)[number];

/** Какие ярусы допустимы при каком виде статьи. */
export const PL_TYPES_BY_KIND: Record<string, readonly string[]> = {
  income: [...INCOME_PL_TYPES, PL_TYPE_EXCLUDED],
  expense: [...EXPENSE_PL_TYPES, PL_TYPE_EXCLUDED],
};

export function isPlType(value: unknown): value is PlType {
  return (PL_TYPES as readonly unknown[]).includes(value);
}

/**
 * Почему пара «вид статьи + ярус» недопустима; `null` — допустима.
 *
 * Балансовым статьям (активы, обязательства, капитал) ярус не положен вовсе:
 * взнос учредителя не выручка, покупка станка не расход. Выручка у расходной
 * статьи и административный расход у доходной — бессмыслица, которая тихо
 * перевернула бы знак в отчёте.
 *
 * Пустой ярус допустим всегда: у дочерней статьи он значит «как у родителя»,
 * у корневой — «не отнесено к ярусу», и такая статья видна отдельной строкой.
 */
export function plTypeError(
  kind: string,
  plType: string | null | undefined,
): string | null {
  if (plType === null || plType === undefined || plType === '') return null;
  if (!isPlType(plType)) return ERRORS.ARTICLE_PL_TYPE_UNKNOWN;

  const allowed = PL_TYPES_BY_KIND[kind];
  if (!allowed || !allowed.includes(plType)) {
    return ERRORS.ARTICLE_PL_TYPE_NOT_ALLOWED_FOR_KIND;
  }
  return null;
}

export interface PlTypeNode {
  id: number;
  parentId?: number | null;
  plType?: string | null;
}

export interface ResolvedPlType {
  /** Действующий ярус; `null` — статья не отнесена ни к какому ярусу. */
  plType: PlType | null;
  /** Ярус взят у предка, а не задан у самой статьи. */
  inherited: boolean;
}

/**
 * Действующий ярус статьи с учётом наследования.
 *
 * Свой ярус статьи главнее родительского. Пустой — поднимаемся к ближайшему
 * предку, у которого ярус задан. `excluded` наследуется так же, как любой
 * другой: исключили родителя — исключены и дети, пока у ребёнка нет своего.
 *
 * Эвристики нет НАМЕРЕННО (раздел 34 ТЗ-3): ярус пользовательской статьи не
 * угадывается по названию. Не задан ни у кого в цепочке — значит не задан, и
 * отчёт покажет статью строкой «Не отнесено к ярусу», а человек настроит сам.
 *
 * Испорченная цепочка родителей (цикл) не зависает: каждый предок
 * посещается один раз.
 */
export function resolvePlType(
  articleId: number,
  articles: PlTypeNode[],
): ResolvedPlType {
  const byId = new Map<number, PlTypeNode>();
  articles.forEach((article) => byId.set(Number(article.id), article));

  const visited = new Set<number>();
  let current = byId.get(Number(articleId));
  let inherited = false;

  while (current && !visited.has(Number(current.id))) {
    visited.add(Number(current.id));

    if (isPlType(current.plType)) {
      return { plType: current.plType, inherited };
    }
    if (current.parentId == null) break;

    current = byId.get(Number(current.parentId));
    inherited = true;
  }

  return { plType: null, inherited: false };
}
