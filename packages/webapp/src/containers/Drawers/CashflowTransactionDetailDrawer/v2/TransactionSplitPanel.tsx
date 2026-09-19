// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';

import { useManagementArticles } from '@/hooks/query/managementArticles';
import {
  useClearTransactionSplits,
  useSaveTransactionSplits,
  useTransactionSplits,
} from '@/hooks/query/transactionSplits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { cn } from '@/lib/cn';

import {
  evaluateSplit,
  suggestedAmount,
  type SplitLine,
} from './splitPanelView';

interface TransactionSplitPanelProps {
  referenceType: string;
  referenceId: number;
  /** Сумма операции целиком — с ней обязаны сойтись части. */
  parentAmount: number;
}

const money = (value: number) => formatOrganizationMoney(value ?? 0);

/**
 * Разделение операции на части (этап 10 ТЗ, остаток Р1).
 *
 * Сервер умел делить операции с самого этапа 10, но воспользоваться этим было
 * нельзя: панели не существовало.
 *
 * Родительская операция НЕ трогается: в отчёты идут части, в сверку с банком —
 * родитель. Поэтому панель ничего не меняет в самой операции.
 */
export function TransactionSplitPanel({
  referenceType,
  referenceId,
  parentAmount,
}: TransactionSplitPanelProps) {
  const { data: saved } = useTransactionSplits(referenceType, referenceId);
  const { data: articles } = useManagementArticles();

  const { mutateAsync: saveSplits, isLoading: isSaving } =
    useSaveTransactionSplits();
  const { mutateAsync: clearSplits, isLoading: isClearing } =
    useClearTransactionSplits();

  const [lines, setLines] = React.useState<SplitLine[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  // Сохранённое разбиение подхватывается, когда приезжает с сервера. Если
  // части уже есть, панель сразу раскрыта: прятать то, что уже влияет на
  // отчёты, — значит скрывать от человека последствия его действий.
  React.useEffect(() => {
    if (saved && saved.length > 0) {
      setLines(saved as SplitLine[]);
      setIsOpen(true);
    }
  }, [saved]);

  const state = evaluateSplit(parentAmount, lines);

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { amount: suggestedAmount(state.remaining), articleId: null },
    ]);

  const updateLine = (index: number, patch: Partial<SplitLine>) =>
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );

  const removeLine = (index: number) =>
    setLines((prev) => prev.filter((_, i) => i !== index));

  const onSave = async () => {
    if (!state.isValid) return;

    await saveSplits({ referenceType, referenceId, parentAmount, lines });
  };

  const onClear = async () => {
    await clearSplits({ referenceType, referenceId });
    setLines([]);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <section className="rounded-default border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium">
              {intl.get('transaction_split.title')}
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              {intl.get('transaction_split.hint')}
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setIsOpen(true)}>
            {intl.get('transaction_split.open')}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-default border border-border bg-surface p-4">
      <h3 className="text-sm font-medium">
        {intl.get('transaction_split.title')}
      </h3>
      <p className="mt-1 text-sm text-text-muted">
        {intl.get('transaction_split.hint')}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {lines.map((line, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">
                {intl.get('transaction_split.amount')}
              </label>
              <Input
                inputMode="decimal"
                className="w-36"
                value={String(line.amount ?? '')}
                onChange={(event) =>
                  updateLine(index, {
                    amount: Number(event.target.value.replace(',', '.')),
                  })
                }
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-text-muted">
                {intl.get('transaction_split.article')}
              </label>
              <select
                className="rounded-control border border-border bg-surface px-2 py-1 text-sm"
                value={line.articleId == null ? '' : String(line.articleId)}
                onChange={(event) =>
                  updateLine(index, {
                    articleId: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
              >
                <option value="">
                  {intl.get('transaction_split.article_placeholder')}
                </option>
                {articles?.map((article: any) => (
                  <option key={article.id} value={article.id}>
                    {article.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => removeLine(index)}
            >
              {intl.get('transaction_split.remove_line')}
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <Button type="button" variant="secondary" onClick={addLine}>
          {intl.get('transaction_split.add_line')}
        </Button>

        {/*
          Остаток виден всё время, пока человек печатает. Узнать «не сходится»
          только после нажатия «Сохранить» — значит заставить искать, где
          именно.
        */}
        <span
          className={cn(
            'money',
            state.remaining !== 0 && 'text-danger',
          )}
        >
          {intl.get('transaction_split.remaining', {
            amount: money(state.remaining),
          })}
        </span>
      </div>

      {state.problem && (
        <p className="mt-2 text-sm text-text-muted">
          {intl.get(`transaction_split.problem.${state.problem}`)}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={onSave}
          disabled={!state.isValid || isSaving}
        >
          {intl.get('save')}
        </Button>
        {(saved?.length ?? 0) > 0 && (
          <Button
            type="button"
            variant="secondary"
            onClick={onClear}
            disabled={isClearing}
          >
            {intl.get('transaction_split.clear')}
          </Button>
        )}
      </div>
    </section>
  );
}
