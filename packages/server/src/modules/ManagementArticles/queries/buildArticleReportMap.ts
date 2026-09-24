// © 2026 Bigfin

/**
 * Схема «Куда попадает статья» (FIN-002 ТЗ-2).
 *
 * ЗАЧЕМ. Владелец назвал это главной бедой продукта: человек не понимает
 * связи между тем, что он выбирает при разноске, и тем, что потом видит в
 * отчётах. Экрана, объясняющего связь, не было вовсе — и человек разносил
 * наугад, а потом не верил цифрам.
 *
 * ЧЕМ ЛУЧШЕ, ЧЕМ У КОНКУРЕНТА. У ПланФакта такая схема статична: она
 * объясняет, как устроен продукт вообще. Здесь схема ПОДСВЕЧИВАЕТ строку
 * выбранной статьи и печатает рядом её оборот — то есть отвечает на вопрос
 * «где окажутся МОИ деньги», а не «как всё устроено».
 *
 * КАРТА ВЫВОДИТСЯ, А НЕ ХРАНИТСЯ (решение D2). Таблицы «статья → строка
 * отчёта» нет и не будет: всё выводится из вида статьи, раздела движения
 * денег и корневых типов привязанных счетов. Хранить производное — значит
 * завести второй источник правды и однажды разойтись с отчётом.
 */

export interface ReportMapNode {
  key: string;
  title: string;
  children?: ReportMapNode[];
  isHighlighted?: boolean;
}

export interface ReportMapHighlight {
  report: 'cashFlow' | 'profitLoss' | 'balance';
  path: string[];
}

export interface ArticleReportMap {
  cashFlow: ReportMapNode[];
  profitLoss: ReportMapNode[];
  balance: ReportMapNode[];
  highlights: ReportMapHighlight[];
  /**
   * Почему статья никуда не попадает. `null` — попадает.
   *
   * Отдельным полем, а не пустой подсветкой: «ничего не подсветилось» и «эта
   * статья ни на что не влияет» для человека совершенно разные сообщения, а
   * выглядят одинаково.
   */
  warning: 'NO_ACCOUNTS' | null;
}

export interface ReportMapArticle {
  id: number;
  name: string;
  kind: string;
  cashflowSection: string | null;
  /** Привязан ли к статье хотя бы один счёт плана счетов. */
  hasAccounts: boolean;
}

const SECTION_TITLES: Record<string, string> = {
  operating: 'Операционная деятельность',
  investing: 'Инвестиционная деятельность',
  financing: 'Финансовая деятельность',
};

/**
 * Служебный раздел «Корректировки остатка» (FT-071 ТЗ-3). В общую схему не
 * входит: у организации без фиксаций остатка такого раздела в отчёте нет, и
 * рисовать его всем значило бы обещать строку, которой не будет. Показываем
 * только у статьи, которая в него попадает.
 */
const ADJUSTMENTS_SECTION = 'adjustments';
const ADJUSTMENTS_TITLE = 'Корректировки остатка';

/** Виды, дающие приток денег: у них кредитовая сторона счёта. */
const INFLOW_KINDS = ['income', 'liability', 'equity'];

/** Куда в балансе встаёт вид статьи. */
const BALANCE_SECTION_BY_KIND: Record<string, string> = {
  asset: 'assets',
  liability: 'liabilities',
  equity: 'equity',
};

const node = (
  key: string,
  title: string,
  children?: ReportMapNode[],
): ReportMapNode => (children ? { key, title, children } : { key, title });

/** Ставит признак подсветки по адресу строки. */
function highlight(nodes: ReportMapNode[], path: string[]): ReportMapNode[] {
  if (path.length === 0) return nodes;

  const [head, ...rest] = path;

  return nodes.map((item) => {
    if (item.key !== head) return item;

    return {
      ...item,
      isHighlighted: rest.length === 0 ? true : item.isHighlighted,
      children: item.children ? highlight(item.children, rest) : item.children,
    };
  });
}

/** Структура отчёта о движении денег: три раздела, в каждом два направления. */
function cashFlowSkeleton(): ReportMapNode[] {
  return Object.entries(SECTION_TITLES).map(([key, title]) =>
    node(key, title, [
      node('inflow', 'Поступления'),
      node('outflow', 'Выплаты'),
    ]),
  );
}

/** Структура отчёта о прибылях и убытках. */
function profitLossSkeleton(): ReportMapNode[] {
  return [
    node('income', 'Доходы'),
    node('expense', 'Расходы'),
    node('profit', 'Прибыль'),
  ];
}

/**
 * Структура баланса.
 *
 * Последняя строка — равенство, а не заголовок: именно оно объясняет
 * человеку, зачем вообще нужны три балансовых вида статей.
 */
function balanceSkeleton(): ReportMapNode[] {
  return [
    node('assets', 'Активы'),
    node('liabilities', 'Обязательства'),
    node('equity', 'Капитал'),
    node('equation', 'Активы = Обязательства + Капитал'),
  ];
}

/**
 * Строит схему и, если статья выбрана, отмечает её строки.
 *
 * @param {ReportMapArticle | null} article выбранная статья
 * @returns {ArticleReportMap}
 */
export function buildArticleReportMap(
  article: ReportMapArticle | null,
): ArticleReportMap {
  const empty: ArticleReportMap = {
    cashFlow: cashFlowSkeleton(),
    profitLoss: profitLossSkeleton(),
    balance: balanceSkeleton(),
    highlights: [],
    warning: null,
  };

  if (!article) return empty;

  // Статья без счетов НИ НА ЧТО НЕ ВЛИЯЕТ. Подсветить ей строку значило бы
  // пообещать, что суммы туда попадут, — а они не попадут никогда, потому
  // что попадать нечему.
  if (!article.hasAccounts) {
    return { ...empty, warning: 'NO_ACCOUNTS' };
  }

  const highlights: ReportMapHighlight[] = [];

  // Движение денег: туда попадают ВСЕ пять видов — деньги двигаются и
  // кредитом, и покупкой станка.
  const isAdjustment = article.cashflowSection === ADJUSTMENTS_SECTION;
  const section = isAdjustment || (SECTION_TITLES as any)[article.cashflowSection ?? '']
    ? (article.cashflowSection as string)
    : 'operating';
  const direction = INFLOW_KINDS.includes(article.kind) ? 'inflow' : 'outflow';
  highlights.push({ report: 'cashFlow', path: [section, direction] });

  const articleCashFlow = isAdjustment
    ? [
        ...empty.cashFlow,
        node(ADJUSTMENTS_SECTION, ADJUSTMENTS_TITLE, [
          node('inflow', 'Поступления'),
          node('outflow', 'Выплаты'),
        ]),
      ]
    : empty.cashFlow;

  // Прибыль: только доходы и расходы. Взнос учредителя не выручка, покупка
  // станка не расход — балансовым видам в ОПиУ места нет.
  if (article.kind === 'income' || article.kind === 'expense') {
    highlights.push({ report: 'profitLoss', path: [article.kind] });
  }

  const balanceKey = BALANCE_SECTION_BY_KIND[article.kind];
  if (balanceKey) {
    highlights.push({ report: 'balance', path: [balanceKey] });
  }

  let { profitLoss, balance } = empty;
  let cashFlow = articleCashFlow;

  highlights.forEach((item) => {
    if (item.report === 'cashFlow') cashFlow = highlight(cashFlow, item.path);
    if (item.report === 'profitLoss') {
      profitLoss = highlight(profitLoss, item.path);
    }
    if (item.report === 'balance') balance = highlight(balance, item.path);
  });

  return { cashFlow, profitLoss, balance, highlights, warning: null };
}
