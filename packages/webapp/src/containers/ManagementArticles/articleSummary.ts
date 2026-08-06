import intl from 'react-intl-universal';

/**
 * Подпись статьи учёта в дереве (②b).
 *
 * В списке было видно только название и вид — «Аренда · Расход». Настроена
 * статья или нет, понять было нельзя, а это важно: пока к статье не привязан
 * ни один счёт, «Факт» в план-факте бюджета и в финмодели остаётся нулевым
 * и выглядит как поломка продукта.
 */
export interface ArticleSummarySource {
  kind?: string;
  cashflowSection?: string | null;
  costBehavior?: string | null;
  accountsCount?: number | null;
}

export interface ArticleSummary {
  /** Части подписи: вид, раздел ДДС, тип затрат. */
  parts: string[];
  /** Текст про счета. */
  accountsLabel: string;
  /** Ни одного счёта — это стоит подсветить. */
  needsAccounts: boolean;
}

const t = (key: string, fallback: string): string =>
  intl.get(key) || fallback;

export const buildArticleSummary = (
  node: ArticleSummarySource,
): ArticleSummary => {
  const parts: string[] = [];

  if (node.kind) {
    parts.push(t(`management_articles.kind.${node.kind}`, node.kind));
  }
  if (node.cashflowSection) {
    parts.push(
      t(
        `management_articles.cashflow_section.${node.cashflowSection}`,
        node.cashflowSection,
      ),
    );
  }
  if (node.costBehavior) {
    parts.push(
      t(
        `management_articles.cost_behavior.${node.costBehavior}`,
        node.costBehavior,
      ),
    );
  }

  const count = Number(node.accountsCount ?? 0);
  const needsAccounts = count === 0;

  return {
    parts,
    needsAccounts,
    accountsLabel: needsAccounts
      ? t('management_articles.no_accounts', 'счета не привязаны')
      : `${t('management_articles.accounts_count', 'счетов')}: ${count}`,
  };
};
