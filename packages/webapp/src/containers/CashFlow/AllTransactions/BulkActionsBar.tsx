import React from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { showApiError } from '@/utils/showApiError';
import { useCategorizeTransaction } from '@/hooks/query';
import { useExcludeUncategorizedTransactions } from '@/hooks/query/bank-rules';

import {
  buildBulkCategorizePayload,
  bulkSide,
  pickAccountsForRow,
} from './categorizeInline';

interface BulkActionsBarProps {
  /** Выделенные строки выписки. */
  rows: any[];
  /** План счетов организации. */
  accounts: any[];
  /** Снять выделение после удачного действия. */
  onDone: () => void;
}

/**
 * Массовые действия над выделенными строками (этап 3 ТЗ, п. 3.1).
 *
 * Разнести разом можно только однородное выделение: у поступлений и списаний
 * разные статьи и разный тип операции. Смешанное выделение не разносим и
 * прямо об этом говорим — молча разнести половину было бы хуже.
 */
export function BulkActionsBar({ rows, accounts, onDone }: BulkActionsBarProps) {
  const { mutateAsync: categorize, isLoading: isCategorizing } =
    useCategorizeTransaction({});
  const { mutateAsync: exclude, isLoading: isExcluding } =
    useExcludeUncategorizedTransactions({});

  const side = bulkSide(rows);
  const isMixed = side === 'mixed';
  const busy = isCategorizing || isExcluding;

  // Статьи берём по стороне выделения — у однородного выделения она общая.
  const items = React.useMemo(
    () =>
      isMixed || rows.length === 0
        ? []
        : pickAccountsForRow(rows[0], accounts).map((account: any) => ({
            value: String(account.id),
            label: account.name,
          })),
    [rows, accounts, isMixed],
  );

  const handleCategorize = async (accountId: number) => {
    try {
      await categorize(buildBulkCategorizePayload(rows, accountId) as any);
      AppToaster.show({
        message: intl.get('all_transactions.bulk.categorized', {
          count: rows.length,
        }),
        intent: Intent.SUCCESS,
      });
      onDone();
    } catch (error) {
      showApiError(error);
    }
  };

  const handleExclude = async () => {
    try {
      await exclude({ ids: rows.map((row) => Number(row.id)) });
      AppToaster.show({
        message: intl.get('all_transactions.bulk.excluded', {
          count: rows.length,
        }),
        intent: Intent.SUCCESS,
      });
      onDone();
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isMixed ? (
        <span className="text-sm text-text-secondary">
          {intl.get('all_transactions.bulk.mixed')}
        </span>
      ) : (
        <Combobox
          items={items}
          value={undefined}
          onChange={(value) => handleCategorize(Number(value))}
          placeholder={intl.get('all_transactions.bulk.categorize')}
          searchPlaceholder={intl.get('all_transactions.categorize.search')}
          emptyText={intl.get('all_transactions.categorize.empty')}
          disabled={busy}
          className="min-w-[220px]"
        />
      )}

      <Button variant="ghost" disabled={busy} onClick={handleExclude}>
        {intl.get('all_transactions.bulk.exclude')}
      </Button>
    </div>
  );
}
