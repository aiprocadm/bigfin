import React from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { showApiError } from '@/utils/showApiError';
import { useCategorizeTransaction } from '@/hooks/query';

import {
  buildCategorizePayload,
  pickAccountsForRow,
  suggestedAccount,
} from './categorizeInline';

interface CategorizeInlineCellProps {
  /** Строка выписки, ждущая разноски. */
  row: any;
  /** Все счета организации — отбор по стороне операции делается внутри. */
  accounts: any[];
}

/**
 * Статья прямо в строке (этап 3 ТЗ, п. 3.1).
 *
 * Человек выбирает статью в выпадающем списке — операция разносится сразу,
 * без единого окна. Если правило разноски дало подсказку, рядом стоит кнопка
 * «Применить»: одно нажатие вместо выбора.
 */
export function CategorizeInlineCell({ row, accounts }: CategorizeInlineCellProps) {
  const { mutateAsync: categorize, isLoading } = useCategorizeTransaction({});
  const suggestion = suggestedAccount(row);

  const items = React.useMemo(
    () =>
      pickAccountsForRow(row, accounts).map((account: any) => ({
        value: String(account.id),
        label: account.name,
      })),
    [row, accounts],
  );

  const run = async (accountId: number) => {
    try {
      await categorize(buildCategorizePayload(row, accountId) as any);
      AppToaster.show({
        message: intl.get('cashflow.notify.transaction_categorized'),
        intent: Intent.SUCCESS,
      });
    } catch (error) {
      // Отказ сервера показываем причиной, а не общими словами: разнос идёт
      // подряд, и человек должен видеть, какая строка не прошла.
      showApiError(error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Combobox
        items={items}
        value={undefined}
        onChange={(value) => run(Number(value))}
        placeholder={intl.get('all_transactions.categorize.placeholder')}
        searchPlaceholder={intl.get('all_transactions.categorize.search')}
        emptyText={intl.get('all_transactions.categorize.empty')}
        disabled={isLoading}
        className="min-w-[200px]"
      />

      {suggestion && (
        <Button
          variant="ghost"
          disabled={isLoading}
          onClick={() => run(suggestion.id)}
          title={intl.get('all_transactions.suggested', {
            name: suggestion.name,
          })}
        >
          {intl.get('all_transactions.categorize.apply', {
            name: suggestion.name,
          })}
        </Button>
      )}
    </div>
  );
}
