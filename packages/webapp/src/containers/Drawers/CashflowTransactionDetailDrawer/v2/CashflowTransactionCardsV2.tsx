import { ReactNode } from 'react';
import intl from 'react-intl-universal';

import { Card } from '@/components/ui/card';
import { formattedNumber } from '@/utils';

import type {
  CashflowTransactionDetail,
  CashflowTransactionEntry,
} from './types';

const EMPTY_VALUE = '—';

/** Строка «подпись — значение» с волосяным разделителем. */
function DetailRow({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-sm text-text-muted">{label}</dt>
      <dd className="m-0 text-right text-sm text-text-primary">
        {children ?? EMPTY_VALUE}
      </dd>
    </div>
  );
}

/** Заголовок карточки — маленький, вторичный (воздух вместо линий). */
function CardTitleSm({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-medium text-text-secondary">{children}</h3>
  );
}

/** Кредит/дебет как в легаси-таблице: ноль — пустая ячейка (noZero). */
function formatEntryAmount(value?: number): string {
  return formattedNumber(value ?? 0, { noZero: true }) as string;
}

/**
 * Карточки деталей денежной операции: сумма с реквизитами (деньги —
 * tabular-nums), проводки (счёт, контрагент, кредит/дебет) и назначение.
 * Пустые значения — спокойное «—».
 */
export function CashflowTransactionCardsV2({
  transaction,
}: {
  transaction: CashflowTransactionDetail;
}) {
  const entries: CashflowTransactionEntry[] = transaction.transactions ?? [];

  return (
    <>
      {/* Сумма: главное число крупно, реквизиты — волосяными строками. */}
      <Card className="p-4 sm:p-5">
        <div className="text-sm text-text-secondary">{intl.get('total')}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
          {transaction.formatted_amount || EMPTY_VALUE}
        </div>

        <dl className="m-0 mt-4">
          <DetailRow label={intl.get('cash_flow_drawer.label_transaction_type')}>
            {transaction.transaction_type_formatted || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('cash_flow.drawer.label_transaction_no')}>
            {transaction.transaction_number || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('date')}>
            {transaction.formatted_date || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('reference_no')}>
            {transaction.reference_no || EMPTY_VALUE}
          </DetailRow>
        </dl>
      </Card>

      {/* Проводки: счёт, контрагент, кредит/дебет — tabular-nums. */}
      <Card className="p-4 sm:p-5">
        <CardTitleSm>{intl.get('journal_entries')}</CardTitleSm>

        <div className="overflow-x-auto">
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="text-xs text-text-muted">
                <th className="pb-2 text-left font-normal">
                  {intl.get('account_name')}
                </th>
                <th className="pb-2 text-left font-normal">
                  {intl.get('contact')}
                </th>
                <th className="pb-2 text-right font-normal">
                  {intl.get('credit')}
                </th>
                <th className="pb-2 text-right font-normal">
                  {intl.get('debit')}
                </th>
              </tr>
            </thead>
  
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.id ?? index} className="border-t border-border">
                  <td className="py-2.5 pr-3 text-text-primary">
                    {entry.account?.name || EMPTY_VALUE}
                  </td>
                  <td className="py-2.5 pr-3 text-text-secondary">
                    {entry.contact?.display_name || EMPTY_VALUE}
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums text-text-primary">
                    {formatEntryAmount(entry.credit)}
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums text-text-primary">
                    {formatEntryAmount(entry.debit)}
                  </td>
                </tr>
              ))}
            </tbody>
  
            <tfoot>
              <tr className="border-t border-border font-medium">
                <td className="pt-2.5 text-text-primary" colSpan={2}>
                  {intl.get('manual_journal.details.total')}
                </td>
                <td className="pt-2.5 pl-3 text-right tabular-nums text-text-primary">
                  {transaction.formatted_amount || EMPTY_VALUE}
                </td>
                <td className="pt-2.5 pl-3 text-right tabular-nums text-text-primary">
                  {transaction.formatted_amount || EMPTY_VALUE}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Назначение — только если заполнено. */}
      {transaction.description ? (
        <Card className="p-4 sm:p-5">
          <CardTitleSm>
            {intl.get('cash_flow.drawer.label.statement')}
          </CardTitleSm>
          <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
            {transaction.description}
          </p>
        </Card>
      ) : null}
    </>
  );
}
