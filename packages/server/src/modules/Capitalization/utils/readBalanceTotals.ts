// © 2026 Bigfin
/**
 * Итоги баланса для оценки стоимости (этап 11 ТЗ).
 *
 * ПОЧЕМУ БЕРЁМ ИЗ ОТЧЁТА, А НЕ СЧИТАЕМ ЗАНОВО. Стоимость бизнеса обязана
 * сходиться с балансом, который человек видит на своём экране. Свой,
 * «упрощённый» подсчёт активов рано или поздно разойдётся с отчётом на
 * копейку-другую, и владелец перестанет верить обоим числам сразу.
 *
 * Здесь только чтение готовых узлов — без базы, поэтому это можно проверить
 * тестами целиком.
 */

/** Узел отчёта: у каждого есть номер и итог. */
interface ReportNode {
  id?: string | number;
  total?: { amount?: number } | null;
  children?: ReportNode[] | null;
}

export interface BalanceTotals {
  assets: number;
  liabilities: number;
  /** Нашлись ли оба узла. Нет — считать нечего, и это надо сказать прямо. */
  found: boolean;
}

/** Номера узлов баланса, из которых берутся итоги. */
const ASSETS_NODE = 'ASSETS';
const LIABILITY_NODE = 'LIABILITY';

/**
 * Ищет узел по номеру на любой глубине.
 *
 * Обход именно рекурсивный: «Обязательства» лежат внутри «Обязательства и
 * капитал», и плоский поиск по верхнему уровню их не нашёл бы — вернул бы
 * ноль, и оценка молча получилась бы равной всем активам.
 */
function findNode(nodes: ReportNode[], id: string): ReportNode | null {
  for (const node of nodes ?? []) {
    if (String(node?.id) === id) return node;

    const inChildren = findNode(node?.children ?? [], id);
    if (inChildren) return inChildren;
  }
  return null;
}

/** Итог узла числом. */
function amountOf(node: ReportNode | null): number {
  const amount = Number(node?.total?.amount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * Активы и обязательства из данных баланса.
 *
 * `found` отвечает на вопрос «а был ли отчёт»: у организации без единой
 * проводки узлов нет вовсе, и показывать ей «чистые активы 0 ₽» нельзя —
 * это выглядит как расчёт, хотя считать было нечего.
 */
export function readBalanceTotals(nodes: ReportNode[]): BalanceTotals {
  const assetsNode = findNode(nodes ?? [], ASSETS_NODE);
  const liabilityNode = findNode(nodes ?? [], LIABILITY_NODE);

  return {
    assets: amountOf(assetsNode),
    liabilities: amountOf(liabilityNode),
    found: Boolean(assetsNode && liabilityNode),
  };
}
