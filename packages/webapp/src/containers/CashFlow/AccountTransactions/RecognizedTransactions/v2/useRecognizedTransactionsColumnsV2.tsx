import React from 'react';
import intl from 'react-intl-universal';
import { ArrowRight } from 'lucide-react';
import {
  bankDateColumn,
  bankDescriptionColumn,
  bankPayeeColumn,
  bankDepositColumn,
  bankWithdrawalColumn,
} from '../../v2/bankTableColumns';
import { RecognizedRowActions } from './RecognizedRowActions';

interface ColumnsHandlers {
  onCategorize: (row: any) => void;
  onExclude: (row: any) => void;
}

/**
 * Колонки таблицы «Распознанные транзакции» под примитив components/ui/data-table.tsx
 * (D-redesign, слайс 4c). База — общий билдер (date/description/payee/deposit/withdrawal);
 * добавлены «Распознано» (категория → счёт), «Правило» и колонка действий.
 */
export function useRecognizedTransactionsColumnsV2({
  onCategorize,
  onExclude,
}: ColumnsHandlers) {
  return React.useMemo(
    () => [
      bankDateColumn(),
      bankDescriptionColumn(),
      bankPayeeColumn(),
      {
        id: 'recognize',
        Header: intl.get('recognize'),
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <span className="inline-flex items-center gap-2">
            <span>{row.original.assigned_category_formatted}</span>
            <ArrowRight className="h-3 w-3 text-text-muted" />
            <span>{row.original.assigned_account_name}</span>
          </span>
        ),
      },
      { id: 'rule', Header: intl.get('rule'), accessor: 'bank_rule_name' },
      bankDepositColumn(),
      bankWithdrawalColumn(),
      {
        id: 'actions',
        Header: '',
        disableSortBy: true,
        align: 'right',
        Cell: ({ row }: any) => (
          <RecognizedRowActions
            onCategorize={() => onCategorize(row.original)}
            onExclude={() => onExclude(row.original)}
          />
        ),
      },
    ],
    [onCategorize, onExclude],
  );
}
