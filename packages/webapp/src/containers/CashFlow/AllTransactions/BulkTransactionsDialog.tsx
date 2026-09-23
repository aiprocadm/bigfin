// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { MoneyField } from '@/components/ui/money-field';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAccounts, useCashflowAccounts } from '@/hooks/query';
import { serverMessage, useCreateTransactionsBulk } from '@/hooks/query/transactionActions';
import { bulkPayload, emptyBulkRow, filledRows, remainingAfterResult, type BulkRow } from './bulkEntry';

const selectClassName = 'min-h-[36px] rounded-control border border-border bg-surface px-2 py-1 text-sm';

/** Статьи-счета, в которые ложится поступление или выплата. */
const CREDIT_TYPES = {
  in: ['income', 'other-income'],
  out: ['expense', 'other-expense', 'cost-of-goods-sold'],
};

/**
 * «Несколько операций» (FT-024 ТЗ-3): таблица строк в одном окне, общие
 * поля сверху, сохранение одним запросом. Строка с ошибкой остаётся в окне
 * со своим объяснением, сохранённые уходят.
 */
export function BulkTransactionsDialog({
  defaultAccountId,
  onClose,
}: {
  defaultAccountId?: number;
  onClose: () => void;
}) {
  const today = moment().format('YYYY-MM-DD');
  const [accountId, setAccountId] = React.useState<number | null>(defaultAccountId ?? null);
  const [flow, setFlow] = React.useState<'in' | 'out'>('out');
  const [rows, setRows] = React.useState<BulkRow[]>(() => Array.from({ length: 5 }, () => emptyBulkRow(today)));
  const { data: cashAccounts = [] } = useCashflowAccounts();
  const { data: accounts = [] } = useAccounts({}, {});
  const { mutateAsync, isLoading } = useCreateTransactionsBulk();

  const creditAccounts = (accounts as any[]).filter((account) =>
    CREDIT_TYPES[flow].includes(account.account_type ?? account.accountType),
  );
  const update = (key: string, patch: Partial<BulkRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch, error: undefined } : row)));

  const fieldName = (field: string) => intl.get(`all_transactions.bulk.field.${field}`) || field;

  const save = async () => {
    const items = bulkPayload({ cashflowAccountId: accountId, flow }, rows);
    if (items.length === 0) return;
    try {
      const result = await mutateAsync(items);
      const remaining = remainingAfterResult(rows, result.results, (fields) =>
        intl.get('all_transactions.bulk.missing', { fields: fields.map(fieldName).join(', ') }),
      );
      AppToaster.show({
        message: intl.get('all_transactions.bulk.result', { created: result.created, total: items.length }),
        intent: result.failed > 0 ? Intent.WARNING : Intent.SUCCESS,
      });
      if (remaining.length === 0) onClose();
      else setRows(remaining);
    } catch (error) {
      AppToaster.show({ message: serverMessage(error, intl.get('all_transactions.actions.failed')), intent: Intent.DANGER });
    }
  };

  const count = filledRows(rows).length;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-h-[calc(100vh-3rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{intl.get('all_transactions.bulk.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <select
            className={selectClassName}
            aria-label={intl.get('all_transactions.bulk.account')}
            value={accountId ?? ''}
            onChange={(event) => setAccountId(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">{intl.get('all_transactions.bulk.account')}</option>
            {(cashAccounts as any[]).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <select
            className={selectClassName}
            aria-label={intl.get('all_transactions.bulk.flow')}
            value={flow}
            onChange={(event) => setFlow(event.target.value as 'in' | 'out')}
          >
            <option value="out">{intl.get('all_transactions.flow.out')}</option>
            <option value="in">{intl.get('all_transactions.flow.in')}</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <div key={row.key} className="flex flex-col gap-1 border-b border-border pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-6 text-sm text-text-muted tabular-nums">{index + 1}</span>
                <DateField value={row.date} onChange={(value) => update(row.key, { date: value })} />
                <MoneyField
                  className="w-32"
                  value={row.amount ?? ''}
                  placeholder={intl.get('all_transactions.bulk.field.amount')}
                  onChange={(value) => update(row.key, { amount: value })}
                />
                <select
                  className={`${selectClassName} min-w-[160px] flex-1`}
                  aria-label={intl.get('all_transactions.bulk.field.creditAccountId')}
                  value={row.creditAccountId ?? ''}
                  onChange={(event) =>
                    update(row.key, { creditAccountId: event.target.value ? Number(event.target.value) : null })
                  }
                >
                  <option value="">{intl.get('all_transactions.bulk.field.creditAccountId')}</option>
                  {creditAccounts.map((account: any) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <Input
                  className="min-w-[160px] flex-1"
                  value={row.description}
                  placeholder={intl.get('all_transactions.bulk.field.description')}
                  onChange={(event) => update(row.key, { description: event.target.value })}
                />
              </div>
              {row.error && <p className="pl-8 text-sm text-danger">{row.error}</p>}
            </div>
          ))}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setRows((current) => [...current, emptyBulkRow(today)])}>
            {intl.get('all_transactions.bulk.add_row')}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {intl.get('cancel')}
          </Button>
          <Button type="button" disabled={isLoading || !accountId || count === 0} onClick={save}>
            {intl.get('all_transactions.bulk.save', { count })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
