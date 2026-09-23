// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';

import { useManagementArticles } from '@/hooks/query/managementArticles';
import { useTransactionSplits } from '@/hooks/query/transactionSplits';
import { serverMessage, useSetTransactionSplits } from '@/hooks/query/transactionActions';
import { Button } from '@/components/ui/button';
import { AppToaster } from '@/components';
import { Intent } from '@blueprintjs/core';
import { SplitLinesEditor, splitsReady } from '@/containers/CashFlow/SplitLinesEditor/SplitLinesEditor';

import { type SplitLine } from './splitPanelView';

/** Под этим видом части проводятся: только такие видит сборка проводок. */
const CASHFLOW_REFERENCE = 'CashflowTransaction';

interface TransactionSplitPanelProps {
  /** Денежная операция. */
  cashflowId: number;
  /**
   * Вид операции (`OtherExpense` и т. п.). До этапа 37 панель писала части
   * ПОД НИМ — сборка проводок их не видела, и отчёты не менялись. Такие
   * части подставляются черновиком, чтобы их можно было сохранить заново.
   */
  legacyReferenceType?: string;
  /** Сумма операции целиком — с ней обязаны сойтись части. */
  parentAmount: number;
}

/**
 * Разделение операции на части (этап 10 ТЗ, FT-022/FT-023 ТЗ-3).
 *
 * Сохранение ПЕРЕПИСЫВАЕТ ПРОВОДКИ операции по частям: деление делают ради
 * отчётов, и части, которые отчёт не видит, — обман. Пустой список снимает
 * разбиение, и операция снова идёт в отчёты целиком.
 */
export function TransactionSplitPanel({
  cashflowId,
  legacyReferenceType,
  parentAmount,
}: TransactionSplitPanelProps) {
  const { data: saved } = useTransactionSplits(CASHFLOW_REFERENCE, cashflowId);
  const { data: legacy } = useTransactionSplits(legacyReferenceType ?? '', cashflowId, {
    enabled: !!legacyReferenceType && !(saved?.length > 0),
  });
  const { data: articles } = useManagementArticles();
  const { mutateAsync: setSplits, isLoading: isSaving } = useSetTransactionSplits();

  const [lines, setLines] = React.useState<SplitLine[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  // Сохранённое разбиение подхватывается, когда приезжает с сервера. Если
  // части уже есть, панель сразу раскрыта: прятать то, что уже влияет на
  // отчёты, — значит скрывать от человека последствия его действий.
  React.useEffect(() => {
    const source = saved?.length ? saved : legacy?.length ? legacy : null;
    if (source) {
      setLines(
        (source as any[]).map((line) => ({
          amount: Number(line.amount),
          articleId: line.article_id ?? line.articleId ?? null,
        })),
      );
      setIsOpen(true);
    }
  }, [saved, legacy]);

  const hasSaved = (saved?.length ?? 0) > 0;
  const hasLegacyDraft = !hasSaved && (legacy?.length ?? 0) > 0;

  const save = async (next: SplitLine[]) => {
    try {
      await setSplits({
        id: cashflowId,
        lines: next.map((line) => ({ amount: Number(line.amount), articleId: Number(line.articleId) })),
      });
      AppToaster.show({ message: intl.get('transaction_split.saved'), intent: Intent.SUCCESS });
    } catch (error: any) {
      // Сервер объясняет отказ словами: статья без счёта, закрытый период.
      AppToaster.show({
        message: serverMessage(error, intl.get('transaction_split.save_error')),
        intent: Intent.DANGER,
      });
    }
  };

  if (!isOpen) {
    return (
      <section className="rounded-default border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium">{intl.get('transaction_split.title')}</h3>
            <p className="mt-1 text-sm text-text-muted">{intl.get('transaction_split.hint')}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setIsOpen(true)}>
            {intl.get('transaction_split.open')}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-default border border-border bg-surface p-4" id="transaction-split-panel">
      <h3 className="text-sm font-medium">{intl.get('transaction_split.title')}</h3>
      <p className="mt-1 text-sm text-text-muted">{intl.get('transaction_split.hint')}</p>
      {hasLegacyDraft && (
        <p className="mt-2 text-sm text-warning">{intl.get('transaction_split.legacy_draft')}</p>
      )}

      <div className="mt-3">
        <SplitLinesEditor
          parentAmount={parentAmount}
          lines={lines}
          onChange={setLines}
          articles={((articles as any[]) ?? []).map((article) => ({ id: article.id, name: article.name }))}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => save(lines)}
          disabled={lines.length === 0 || !splitsReady(parentAmount, lines) || isSaving}
        >
          {intl.get('save')}
        </Button>
        {hasSaved && (
          <Button type="button" variant="secondary" onClick={() => save([]).then(() => setLines([]))} disabled={isSaving}>
            {intl.get('transaction_split.clear')}
          </Button>
        )}
      </div>
    </section>
  );
}

