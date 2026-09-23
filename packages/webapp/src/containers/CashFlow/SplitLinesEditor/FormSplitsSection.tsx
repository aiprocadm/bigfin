// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';

import { Button } from '@/components/ui/button';
import { useManagementArticles } from '@/hooks/query/managementArticles';
import { type SplitLine } from '@/containers/Drawers/CashflowTransactionDetailDrawer/v2/splitPanelView';
import { SplitLinesEditor } from './SplitLinesEditor';

interface FormSplitsSectionProps {
  parentAmount: number;
  lines: SplitLine[];
  onChange: (lines: SplitLine[]) => void;
  /** Поступление — статьи доходов, выплата — расходов. */
  kind: 'income' | 'expense';
}

/**
 * «Разбить сумму по статьям» в форме операции (FT-023 ТЗ-3). Свёрнут по
 * умолчанию: большинство платежей идёт в одну статью, и лишние поля мешали
 * бы. Открыл и передумал — «Убрать разбиение» возвращает операцию целиком.
 */
export function FormSplitsSection({ parentAmount, lines, onChange, kind }: FormSplitsSectionProps) {
  const [open, setOpen] = React.useState(lines.length > 0);
  const { data: articles } = useManagementArticles();
  const options = React.useMemo(
    () =>
      ((articles as any[]) ?? [])
        .filter((article) => !article.kind || article.kind === kind)
        .map((article) => ({ id: Number(article.id), name: String(article.name) })),
    [articles, kind],
  );

  if (!open) {
    return (
      <div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setOpen(true);
            if (lines.length === 0) onChange([{ amount: Math.abs(parentAmount) || 0, articleId: null }, { amount: 0, articleId: null }]);
          }}
        >
          {intl.get('transaction_split.open_in_form')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-control border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{intl.get('transaction_split.title')}</span>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            onChange([]);
            setOpen(false);
          }}
        >
          {intl.get('transaction_split.remove_all')}
        </Button>
      </div>
      <SplitLinesEditor parentAmount={parentAmount} lines={lines} onChange={onChange} articles={options} />
    </div>
  );
}
