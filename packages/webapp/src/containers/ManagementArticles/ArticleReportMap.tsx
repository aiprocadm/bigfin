import React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useArticleReportMap } from '@/hooks/query/managementArticles';

export interface ReportMapNode {
  key: string;
  title: string;
  children?: ReportMapNode[];
  isHighlighted?: boolean;
}

/**
 * Схема «Куда попадает статья» (FIN-002 ТЗ-2).
 *
 * ГЛАВНАЯ БЕДА ПРОДУКТА, названная владельцем: человек не понимает связи
 * между тем, что он выбирает при разноске, и тем, что видит в отчётах.
 * Экрана, объясняющего связь, не было — и человек разносил наугад, а потом
 * не верил цифрам.
 *
 * ЧЕМ ЛУЧШЕ КОНКУРЕНТА. У ПланФакта схема статична и отвечает на вопрос
 * «как устроен продукт вообще». Здесь она подсвечивает строку ВЫБРАННОЙ
 * статьи и печатает рядом её оборот — то есть отвечает «где окажутся мои
 * деньги».
 */
function MapNodes({
  nodes,
  level = 0,
  turnover,
  reportLink,
}: {
  nodes: ReportMapNode[];
  level?: number;
  turnover?: string | null;
  reportLink?: string;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {nodes.map((node) => (
        <li key={node.key}>
          <div
            className={
              node.isHighlighted
                ? // Подсветка ФОНОМ и планкой, а не цветом текста: цветной
                  // текст конфликтует с правилом «расход не красный», и
                  // человек прочитал бы в нём оценку, которой нет.
                  'flex items-center justify-between gap-2 border-l-[3px] border-accent bg-accent/15 py-1 pr-2 text-sm'
                : 'flex items-center justify-between gap-2 border-l-[3px] border-transparent py-1 pr-2 text-sm'
            }
            style={{ paddingLeft: `${level * 14 + 8}px` }}
          >
            <span>
              {node.isHighlighted && reportLink ? (
                <Link
                  to={reportLink}
                  className="underline underline-offset-2"
                >
                  {node.title}
                </Link>
              ) : (
                node.title
              )}
            </span>
            {node.isHighlighted && turnover ? (
              <span className="shrink-0 tabular-nums font-medium">
                {turnover}
              </span>
            ) : null}
          </div>
          {node.children && node.children.length > 0 && (
            <MapNodes
              nodes={node.children}
              level={level + 1}
              turnover={turnover}
              reportLink={reportLink}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function MapCard({
  title,
  nodes,
  turnover,
  reportLink,
}: {
  title: string;
  nodes: ReportMapNode[];
  turnover?: string | null;
  reportLink?: string;
}) {
  return (
    <section className="rounded-default border border-border p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <MapNodes nodes={nodes} turnover={turnover} reportLink={reportLink} />
    </section>
  );
}

export function ArticleReportMap({
  articleId,
  fromDate,
  toDate,
}: {
  articleId?: number;
  fromDate?: string;
  toDate?: string;
}) {
  const { data, isLoading, isError, refetch } = useArticleReportMap({
    articleId,
    fromDate,
    toDate,
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError) {
    // Сбой схемы НЕ ломает дерево статей: это подсказка, а не сам экран.
    return (
      <div className="flex flex-col items-start gap-2 rounded-default border border-border p-4">
        <p className="text-sm">{intl.get('article_report_map.error')}</p>
        <Button variant="secondary" onClick={() => refetch()}>
          {intl.get('retry')}
        </Button>
      </div>
    );
  }

  const map: any = data ?? {};
  const turnover = map.turnover?.formatted ?? null;
  const cashFlowLink = articleId
    ? `/financial-reports/cash-flow-articles?articleId=${articleId}`
    : undefined;

  return (
    <div className="flex flex-col gap-3">
      {!articleId && (
        <p className="text-sm text-text-secondary">
          {intl.get('article_report_map.pick_article')}
        </p>
      )}

      {map.warning === 'NO_ACCOUNTS' && (
        /**
         * Статья без счетов НИ НА ЧТО НЕ ВЛИЯЕТ. Промолчать значило бы
         * оставить человека с ощущением, что схема сломалась, — а сломана
         * не схема, а настройка статьи.
         */
        <div className="rounded-default border border-border bg-surface-elevated p-3 text-sm">
          {intl.get('article_report_map.no_accounts')}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <MapCard
          title={intl.get('article_report_map.card.cash_flow')}
          nodes={map.cashFlow ?? []}
          turnover={turnover}
          reportLink={cashFlowLink}
        />
        <MapCard
          title={intl.get('article_report_map.card.profit_loss')}
          nodes={map.profitLoss ?? []}
          turnover={turnover}
        />
        <MapCard
          title={intl.get('article_report_map.card.balance')}
          nodes={map.balance ?? []}
        />
      </div>
    </div>
  );
}
