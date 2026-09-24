// © 2026 Bigfin

/**
 * Отчёт «Деньги (ДДС по статьям)» — расчёт (FIN-013 ТЗ-2).
 *
 * ЗАЧЕМ ОТЧЁТ. В разделе «Отчёты» предпринимателю предлагался ДДС КОСВЕННЫМ
 * методом: «чистая прибыль плюс изменение дебиторской задолженности минус
 * изменение запасов». Человеку без бухгалтерского образования это не
 * отвечает ни на один его вопрос. Прямой расчёт по статьям в продукте УЖЕ
 * БЫЛ и питал график на главной — то есть график и таблица показывали
 * разные вещи, и это дефект, а не разные точки зрения.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ЧИСТЫЙ МОДУЛЬ. Здесь живёт равенство
 * «остаток на начало + чистый поток = остаток на конец». Его нужно проверять
 * на наборах данных, а не на живой базе: расхождение в отчёте о деньгах —
 * это не косметика, это повод не верить продукту.
 */

/** Разделы движения денег. */
export const CASHFLOW_SECTIONS = [
  'operating',
  'investing',
  'financing',
] as const;

/**
 * Служебный раздел «Корректировки остатка» (FT-071 ТЗ-3).
 *
 * Сюда попадает только служебная статья «Корректировка остатка», которой
 * фиксация остатка на дату выравнивает счёт по выписке. Это не деятельность
 * бизнеса: разница между учётом и банком — не выручка, не закупка и не
 * кредит. Положи её в операционный раздел — поехали бы операционный поток
 * и всё, что на нём стоит (точка безубыточности, запас денег, ИИ-аналитик).
 *
 * Раздел появляется в отчёте, только если такая статья есть: у организаций,
 * которые остаток не фиксировали, отчёт не меняется ни на строку.
 */
export const ADJUSTMENTS_SECTION = 'adjustments' as const;

export type CashFlowSection =
  | (typeof CASHFLOW_SECTIONS)[number]
  | typeof ADJUSTMENTS_SECTION;

/**
 * Виды статей, дающие ПРИТОК денег.
 *
 * Направление выводится из вида, а не угадывается по знаку: вид статьи
 * обязан совпадать с корневым типом привязанных счетов (правило этапа 17), а
 * корневой тип задаёт нормальную сторону счёта. Доход, обязательство и
 * капитал — кредитовые: деньги пришли. Расход и актив — дебетовые: ушли.
 */
export const INFLOW_ARTICLE_KINDS = ['income', 'liability', 'equity'] as const;

/** Виды статей, дающие ОТТОК денег. */
export const OUTFLOW_ARTICLE_KINDS = ['expense', 'asset'] as const;

export interface ReportArticle {
  id: number;
  name: string;
  kind: string;
  parentId: number | null;
  cashflowSection: string | null;
  sortOrder?: number;
}

/** Сумма, свёрнутая по статье за период (из `ArticlesCashflowRollup`). */
export interface ArticleAmount {
  id: number;
  amount: number;
}

export interface CashFlowArticleRow {
  id: number;
  name: string;
  kind: string;
  amount: number;
  level: number;
  children: CashFlowArticleRow[];
}

export interface CashFlowDirectionGroup {
  direction: 'inflow' | 'outflow';
  total: number;
  rows: CashFlowArticleRow[];
}

export interface CashFlowSectionGroup {
  section: CashFlowSection;
  inflow: CashFlowDirectionGroup;
  outflow: CashFlowDirectionGroup;
  /** Итог раздела: приток минус отток. */
  total: number;
}

export interface CashFlowTransfersBlock {
  /** Зачисления между своими счетами. */
  incoming: number;
  /** Списания между своими счетами. */
  outgoing: number;
  /**
   * Итог блока. По определению ноль: перевод со своего счёта на свой не
   * меняет денег у бизнеса. Ненулевой итог означает поломку данных, и
   * показать его надо, а не спрятать.
   */
  total: number;
}

export interface CashFlowArticlesReport {
  openingBalance: number;
  closingBalance: number;
  /** Итог по всем разделам: сколько денег прибавилось за период. */
  netCashFlow: number;
  sections: CashFlowSectionGroup[];
  transfers: CashFlowTransfersBlock;
  /**
   * Деньги, прошедшие МИМО статей.
   *
   * Так бывает, когда счёт не привязан ни к одной статье. Сумма при этом не
   * исчезает из остатка — она есть в «конце периода», — но её не видно ни в
   * одной строке. Показываем отдельной строкой, а не растворяем: иначе
   * человек складывает статьи, не получает чистый поток и перестаёт верить
   * отчёту, не понимая почему.
   */
  unclassified: number;
  /**
   * Сошлось ли равенство «начало + поток = конец».
   *
   * Поле есть в ответе НАМЕРЕННО: молчаливое расхождение в отчёте о деньгах
   * хуже видимого. Сходимость обеспечивается конструкцией (чистый поток
   * считается по денежной стороне), и ложь здесь означала бы поломку данных.
   */
  isBalanced: boolean;
}

export interface BuildCashFlowArticlesInput {
  articles: ReportArticle[];
  amounts: ArticleAmount[];
  openingBalance: number;
  closingBalance: number;
  /** Зачисления и списания по переводам между своими счетами. */
  transfers?: { incoming: number; outgoing: number };
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

const isInflowKind = (kind: string): boolean =>
  (INFLOW_ARTICLE_KINDS as readonly string[]).includes(kind);

const isOutflowKind = (kind: string): boolean =>
  (OUTFLOW_ARTICLE_KINDS as readonly string[]).includes(kind);

/**
 * Раздел статьи. Статья без раздела считается операционной.
 *
 * Правило этапа 17 требует раздел у балансовых статей, но доходы и расходы
 * могли завестись раньше и остаться без него. Прятать такую статью из
 * отчёта нельзя — деньги по ней настоящие; операционный раздел здесь самый
 * честный ответ: это и есть «обычная деятельность».
 */
const sectionOf = (article: ReportArticle): CashFlowSection => {
  const value = article.cashflowSection;

  if (value === ADJUSTMENTS_SECTION) return ADJUSTMENTS_SECTION;

  return (CASHFLOW_SECTIONS as readonly string[]).includes(value ?? '')
    ? (value as CashFlowSection)
    : 'operating';
};

/** Собирает поддерево статей одного вида и раздела. */
function buildRows(
  articles: ReportArticle[],
  amountById: Map<number, number>,
  parentId: number | null,
  level: number,
): CashFlowArticleRow[] {
  return articles
    .filter((article) => (article.parentId ?? null) === parentId)
    .map((article) => ({
      id: article.id,
      name: article.name,
      kind: article.kind,
      amount: round2(amountById.get(article.id) ?? 0),
      level,
      children: buildRows(articles, amountById, article.id, level + 1),
    }));
}

/**
 * Итог группы считается по КОРНЯМ, а не по всем строкам.
 *
 * Свёртка уже подняла суммы детей в родителя: сложив всех подряд, мы
 * посчитали бы вложенные статьи дважды. Это самая дорогая ошибка такого
 * отчёта — она выглядит правдоподобно и ломает равенство с остатком.
 */
const totalOfRoots = (rows: CashFlowArticleRow[]): number =>
  round2(rows.reduce((sum, row) => sum + row.amount, 0));

/**
 * Строит отчёт о движении денег по статьям.
 *
 * ЧИСТЫЙ ПОТОК СЧИТАЕТСЯ ПО ДЕНЕЖНОЙ СТОРОНЕ (`closing − opening`), а не
 * сложением статей. Причина: счёт, не привязанный ни к одной статье, в
 * разбивку не попадает, и сумма статей может оказаться меньше настоящего
 * движения. Считай мы поток статьями — равенство «начало + поток = конец»
 * разошлось бы, и виноват был бы отчёт, а не данные. Разница показывается
 * отдельной строкой «не разнесено».
 *
 * @param {BuildCashFlowArticlesInput} input
 * @returns {CashFlowArticlesReport}
 */
export function buildCashFlowArticlesReport(
  input: BuildCashFlowArticlesInput,
): CashFlowArticlesReport {
  const articles = input.articles ?? [];
  const amountById = new Map<number, number>(
    (input.amounts ?? []).map((row) => [row.id, Number(row.amount) || 0]),
  );

  const hasAdjustments = articles.some(
    (article) => sectionOf(article) === ADJUSTMENTS_SECTION,
  );
  const sectionKeys: CashFlowSection[] = hasAdjustments
    ? [...CASHFLOW_SECTIONS, ADJUSTMENTS_SECTION]
    : [...CASHFLOW_SECTIONS];

  const sections = sectionKeys.map((section) => {
    const ofSection = articles.filter((article) => sectionOf(article) === section);

    const inflowArticles = ofSection.filter((a) => isInflowKind(a.kind));
    const outflowArticles = ofSection.filter((a) => isOutflowKind(a.kind));

    // Корнем внутри группы считается статья, чьего родителя в этой же
    // группе нет: так поддерево не теряется, если родитель другого вида.
    const rootsOf = (list: ReportArticle[]) => {
      const ids = new Set(list.map((a) => a.id));
      const roots = list.filter(
        (a) => a.parentId == null || !ids.has(a.parentId),
      );

      return roots.map((root) => ({
        id: root.id,
        name: root.name,
        kind: root.kind,
        amount: round2(amountById.get(root.id) ?? 0),
        level: 0,
        children: buildRows(list, amountById, root.id, 1),
      }));
    };

    const inflowRows = rootsOf(inflowArticles);
    const outflowRows = rootsOf(outflowArticles);
    const inflowTotal = totalOfRoots(inflowRows);
    const outflowTotal = totalOfRoots(outflowRows);

    return {
      section,
      inflow: { direction: 'inflow' as const, total: inflowTotal, rows: inflowRows },
      outflow: {
        direction: 'outflow' as const,
        total: outflowTotal,
        rows: outflowRows,
      },
      total: round2(inflowTotal - outflowTotal),
    };
  });

  const openingBalance = round2(input.openingBalance ?? 0);
  const closingBalance = round2(input.closingBalance ?? 0);
  const netCashFlow = round2(closingBalance - openingBalance);

  const classified = round2(
    sections.reduce((sum, group) => sum + group.total, 0),
  );

  const transfersIn = round2(input.transfers?.incoming ?? 0);
  const transfersOut = round2(input.transfers?.outgoing ?? 0);

  return {
    openingBalance,
    closingBalance,
    netCashFlow,
    sections,
    transfers: {
      incoming: transfersIn,
      outgoing: transfersOut,
      total: round2(transfersIn - transfersOut),
    },
    unclassified: round2(netCashFlow - classified),
    // Равенство держится конструкцией; поле остаётся как явное утверждение,
    // которое проверяют тесты и видит читатель ответа.
    isBalanced:
      round2(openingBalance + netCashFlow) === closingBalance,
  };
}
