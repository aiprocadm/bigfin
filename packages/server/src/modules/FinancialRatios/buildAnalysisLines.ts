// © 2026 Bigfin
/**
 * Разбор ОПиУ на строки для вертикального и горизонтального анализа —
 * шаг Д10 карты v6.
 *
 * Как было. В анализ шли только верхнеуровневые узлы отчёта, то есть разделы:
 * «Выручка», «Расходы», «Прочие доходы». Владелец видел «Расходы — 40 % от
 * выручки» и не мог понять, КАКАЯ статья эти 40 % съедает: аренда, зарплата
 * или проценты по кредитам. А ради этого вертикальный анализ и делают.
 *
 * Второе: в том же списке вперемешку стояли итоговые строки — «Валовая
 * прибыль», «Чистая прибыль». Их доли складывать с долями разделов нельзя,
 * а выглядели они одинаково: просто ещё одна строка с процентом.
 *
 * Как стало. Разделы и их статьи возвращаются вместе, статья знает своего
 * родителя и глубину; итоговые строки помечены отдельно, чтобы показать их
 * не в общем списке. Статьи внутри раздела идут от самой крупной доли к
 * меньшей — сверху ровно то, что съедает выручку.
 */

/** Узел отчёта в том виде, в каком его отдаёт ОПиУ. */
export interface PlNode {
  id: string;
  name: string;
  nodeType?: string;
  total?: { amount?: number };
  children?: PlNode[];
}

/** Строка анализа. */
export interface AnalysisLine {
  key: string;
  label: string;
  amount: number;
  /** 0 — раздел отчёта, 1 — статья внутри раздела. */
  level: number;
  /** Ключ раздела, к которому относится статья (у раздела — null). */
  parentKey: string | null;
  /** Итоговая строка («Валовая прибыль», «Чистая прибыль»). */
  isTotal: boolean;
}

/** Идентификаторы итоговых строк отчёта. */
const TOTAL_NODE_IDS = new Set([
  'GROSS_PROFIT',
  'OPERATING_PROFIT',
  'NET_OPERATING_INCOME',
  'NET_OTHER_INCOME',
  'NET_INCOME',
]);

const amountOf = (node: PlNode): number => Number(node?.total?.amount ?? 0);

/** Итоговая ли это строка: по типу узла либо по известному идентификатору. */
const isTotalNode = (node: PlNode): boolean =>
  node?.nodeType === 'AGGREGATE' || TOTAL_NODE_IDS.has(String(node?.id));

/**
 * Собирает строки анализа из дерева ОПиУ.
 *
 * Берём разделы верхнего уровня и их непосредственные статьи. Глубже не
 * спускаемся: в отчёте это уже подсчета конкретных счетов, а для вопроса
 * «что съедает выручку» достаточно уровня статьи.
 *
 * @param nodes — верхнеуровневые узлы ОПиУ.
 */
export const buildAnalysisLines = (nodes: PlNode[]): AnalysisLine[] => {
  const lines: AnalysisLine[] = [];

  (nodes ?? []).forEach((section) => {
    const sectionTotal = isTotalNode(section);

    lines.push({
      key: String(section.id),
      label: section.name,
      amount: amountOf(section),
      level: 0,
      parentKey: null,
      isTotal: sectionTotal,
    });

    // У итоговых строк детей нет по смыслу — раскрывать нечего.
    if (sectionTotal) return;

    const children = (section.children ?? [])
      .filter((child) => !isTotalNode(child))
      .map((child) => ({
        key: `${section.id}:${child.id}`,
        label: child.name,
        amount: amountOf(child),
        level: 1,
        parentKey: String(section.id),
        isTotal: false,
      }))
      // Самая крупная статья — сверху: именно она и «съедает выручку».
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    lines.push(...children);
  });
  return lines;
};
