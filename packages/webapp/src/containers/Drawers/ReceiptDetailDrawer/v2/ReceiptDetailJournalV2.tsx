import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactionsByReference } from '@/hooks/query';
import { useCurrentOrganization } from '@/hooks/state';

import type { ReceiptGLTransaction } from './types';

const EMPTY_VALUE = '—';

// useTransactionsByReference — легаси react-query хук без типов,
// кастуем результат локально (defaultData: { transactions: [] }).
interface UseTransactionsByReferenceResult {
  data: { transactions: ReceiptGLTransaction[] };
  isLoading: boolean;
}

/**
 * Вкладка «Проводки»: журнальные записи по чеку (дебет/кредит по счетам).
 * Суммы показываются в базовой валюте — подсказка над таблицей.
 */
export function ReceiptDetailJournalV2({ receiptId }: { receiptId: number }) {
  const organization = useCurrentOrganization() as
    | { base_currency?: string }
    | undefined;

  const {
    data: { transactions },
    isLoading,
  } = useTransactionsByReference(
    {
      reference_id: receiptId,
      reference_type: 'SaleReceipt',
    },
    { enabled: !!receiptId },
  ) as UseTransactionsByReferenceResult;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
        {intl.get('journal_entries.amount_displayed_base_currency')}
        {organization?.base_currency ? (
          <Badge variant="outline">{organization.base_currency}</Badge>
        ) : null}
      </div>

      {isLoading ? (
        <div className="mt-4 flex flex-col gap-2">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 text-left text-xs font-medium text-text-muted">
                  {intl.get('date')}
                </th>
                <th className="py-2 pr-4 text-left text-xs font-medium text-text-muted">
                  {intl.get('account_name')}
                </th>
                <th className="py-2 pr-4 text-left text-xs font-medium text-text-muted">
                  {intl.get('contact')}
                </th>
                <th className="whitespace-nowrap py-2 pl-4 text-right text-xs font-medium text-text-muted">
                  {intl.get('debit')}
                </th>
                <th className="whitespace-nowrap py-2 pl-4 text-right text-xs font-medium text-text-muted">
                  {intl.get('credit')}
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, index) => (
                <tr
                  key={transaction.id ?? index}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="whitespace-nowrap py-2.5 pr-4 align-top text-sm text-text-primary">
                    {transaction.date?.formatted_date || EMPTY_VALUE}
                  </td>
                  <td className="py-2.5 pr-4 align-top text-sm text-text-primary">
                    {transaction.account_name || EMPTY_VALUE}
                  </td>
                  <td className="py-2.5 pr-4 align-top text-sm text-text-secondary">
                    {transaction.contactTypeFormatted || EMPTY_VALUE}
                  </td>
                  <td className="whitespace-nowrap py-2.5 pl-4 text-right align-top text-sm tabular-nums text-text-primary">
                    {transaction.debit?.formatted_amount || EMPTY_VALUE}
                  </td>
                  <td className="whitespace-nowrap py-2.5 pl-4 text-right align-top text-sm tabular-nums text-text-primary">
                    {transaction.credit?.formatted_amount || EMPTY_VALUE}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
