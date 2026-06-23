/** Узел отчёта (Баланс/ОПиУ) с возможными детьми и тоталом. */
interface ReportNode {
  id?: string;
  total?: { amount?: number };
  children?: ReportNode[];
}

/**
 * Рекурсивно ищет узел отчёта по `id` в дереве и возвращает его сумму
 * (`total.amount`). Если узел не найден — 0. Узлы Баланса/ОПиУ вложены
 * (например, CURRENT_ASSETS внутри ASSETS), поэтому нужен глубокий поиск.
 *
 * @param {ReportNode[]} nodes — корневые узлы данных отчёта.
 * @param {string} id — идентификатор узла (например, 'CURRENT_ASSETS').
 * @returns {number}
 */
export const findNodeTotal = (
  nodes: ReportNode[] | undefined,
  id: string,
): number => {
  for (const node of nodes ?? []) {
    if (node?.id === id) return node?.total?.amount ?? 0;
    const found = findNodeInner(node?.children, id);
    if (found !== undefined) return found;
  }
  return 0;
};

/** Внутренний поиск, различающий «не найдено» (undefined) и 0. */
const findNodeInner = (
  nodes: ReportNode[] | undefined,
  id: string,
): number | undefined => {
  for (const node of nodes ?? []) {
    if (node?.id === id) return node?.total?.amount ?? 0;
    const found = findNodeInner(node?.children, id);
    if (found !== undefined) return found;
  }
  return undefined;
};
