// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
// Дата — полем продукта, в формате организации, а не полем браузера.
import { DateField } from '@/components/ui/date-field';
import { useCashflowAccounts } from '@/hooks/query/cashflowAccounts';
import {
  useReconciliation,
  useReconciliations,
  useResolveReconciliation,
  useStartReconciliationByBank,
  useStartReconciliationByFile,
} from '@/hooks/query/bankingTrash';
import { formattedAmount } from '@/utils';
import { showApiError } from '@/utils/showApiError';
import { formatDay } from '../Trash/trashView';
import { itemLabel, reconciliationHeadline, splitItems } from './reconciliationView';

type Mode = 'file' | 'bank';

/**
 * Сверка счёта с банком (FT-040, FT-041 ТЗ-3): по файлу выписки («сверить,
 * не импортировать») или по банку. Результат — два списка расхождений;
 * решают галочки и кнопки, сама сверка ничего не меняет.
 */
export default function ReconciliationPage() {
  const { data: accountsData } = useCashflowAccounts({}, {});
  const accounts: any[] = ((accountsData as any[]) ?? []).filter((a) =>
    ['bank', 'cash'].includes(a.account_type ?? a.accountType),
  );
  const [accountId, setAccountId] = React.useState<number | null>(null);
  const [mode, setMode] = React.useState<Mode>('file');
  const [file, setFile] = React.useState<File | null>(null);
  const [accountNumber, setAccountNumber] = React.useState('');
  const [provider, setProvider] = React.useState('tinkoff');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [currentId, setCurrentId] = React.useState<number | null>(null);

  const account = accounts.find((a) => Number(a.id) === Number(accountId));
  const currency = account?.currency_code ?? account?.currencyCode ?? '';
  const { data: history } = useReconciliations(accountId);
  const { data: current } = useReconciliation(currentId);
  const byFile = useStartReconciliationByFile();
  const byBank = useStartReconciliationByBank();

  const start = async () => {
    if (!accountId) return;
    try {
      const result: any =
        mode === 'file'
          ? await byFile.mutateAsync({ accountId, accountNumber: accountNumber || undefined, file: file as File })
          : await byBank.mutateAsync({ accountId, provider, accountNumber, fromDate, toDate });
      setCurrentId(Number(result?.id));
    } catch (error) {
      showApiError(error);
    }
  };
  const canStart =
    Boolean(accountId) && (mode === 'file' ? Boolean(file) : Boolean(accountNumber && fromDate && toDate));

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold">{intl.get('reconciliation.title')}</h1>
        <p className="text-sm text-text-secondary">{intl.get('reconciliation.hint')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          {intl.get('reconciliation.account')}
          <select
            className="h-9 min-w-[12rem] rounded-control border border-border px-2"
            value={accountId ?? ''}
            onChange={(e) => {
              setAccountId(e.target.value ? Number(e.target.value) : null);
              setCurrentId(null);
            }}
          >
            <option value="">{intl.get('reconciliation.choose_account')}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {intl.get('reconciliation.mode')}
          <select className="h-9 rounded-control border border-border px-2" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="file">{intl.get('reconciliation.mode.file')}</option>
            <option value="bank">{intl.get('reconciliation.mode.bank')}</option>
          </select>
        </label>
        {mode === 'file' ? (
          <label className="flex flex-col gap-1">
            {intl.get('reconciliation.file')}
            <input type="file" accept=".txt,.csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              {intl.get('reconciliation.provider')}
              <select className="h-9 rounded-control border border-border px-2" value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="tinkoff">{intl.get('reconciliation.provider.tinkoff')}</option>
                <option value="alfa">{intl.get('reconciliation.provider.alfa')}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              {intl.get('reconciliation.from')}
              <DateField className="h-9 w-40" value={fromDate} onChange={setFromDate} />
            </label>
            <label className="flex flex-col gap-1">
              {intl.get('reconciliation.to')}
              <DateField className="h-9 w-40" value={toDate} onChange={setToDate} />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1">
          {intl.get('reconciliation.account_number')}
          <input className="h-9 rounded-control border border-border px-2" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="40702810…" />
        </label>
        <Button disabled={!canStart || byFile.isLoading || byBank.isLoading} onClick={start}>
          {intl.get('reconciliation.start')}
        </Button>
      </div>

      {current && <ReconciliationResult rec={current} currency={currency} />}

      {accountId && Array.isArray(history) && history.length > 0 && (
        <section className="text-sm">
          <h2 className="mb-2 font-medium">{intl.get('reconciliation.history')}</h2>
          <ul className="flex flex-col gap-1">
            {history.map((rec: any) => (
              <li key={rec.id}>
                <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => setCurrentId(Number(rec.id))}>
                  {formatDay(rec.from_date ?? rec.fromDate)} — {formatDay(rec.to_date ?? rec.toDate)} ·{' '}
                  {intl.get(`reconciliation.status.${rec.status}`)}
                  {rec.status === 'done' &&
                    ` · ${intl.get('reconciliation.history_open', {
                      here: rec.missing_here ?? rec.missingHere,
                      bank: rec.missing_bank ?? rec.missingBank,
                    })}`}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ReconciliationResult({ rec, currency }: { rec: any; currency: string }) {
  const { mutateAsync: resolve, isLoading } = useResolveReconciliation();
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const money = (value: number) => formattedAmount(value, currency);

  if (rec.status === 'running') {
    return <p className="text-sm text-text-secondary">{intl.get('reconciliation.running')}</p>;
  }
  if (rec.status === 'failed') {
    return <p className="text-sm text-danger">{intl.get('reconciliation.failed', { error: rec.error ?? '' })}</p>;
  }
  const { missingHere, missingBank, open } = splitItems(rec.items ?? []);
  const headline = reconciliationHeadline(rec, money);

  const act = async (ids: number[], action: 'add' | 'delete' | 'ignore') => {
    try {
      await resolve({ id: Number(rec.id), itemIds: ids, action });
      AppToaster.show({ intent: 'success', message: intl.get(`reconciliation.done.${action}`, { count: ids.length }) });
      setSelected(new Set());
    } catch (error) {
      showApiError(error);
    }
  };
  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const chosenOf = (list: any[]) => list.filter((i) => selected.has(Number(i.id)) && !(i.resolved_as ?? i.resolvedAs)).map((i) => Number(i.id));

  const table = (list: any[], side: 'here' | 'bank') => (
    <div className="overflow-x-auto rounded-default border border-border">
      <table className="w-full text-sm">
        <tbody>
          {list.map((item) => {
            const resolved = item.resolved_as ?? item.resolvedAs;
            const deletedAt = item.deleted_at ?? item.deletedAt;
            return (
              <tr key={item.id} className="border-b border-border">
                <td className="w-8 p-2">
                  {!resolved && (
                    <Checkbox
                      checked={selected.has(Number(item.id))}
                      onCheckedChange={() => toggle(Number(item.id))}
                      aria-label={intl.get('reconciliation.select_row')}
                    />
                  )}
                </td>
                <td className="p-2 whitespace-nowrap">{formatDay(item.date)}</td>
                <td className="p-2">
                  {itemLabel(item)}
                  {side === 'here' && deletedAt && (
                    <span className="ml-2 text-xs text-warning">
                      {intl.get('reconciliation.was_deleted', {
                        date: formatDay(deletedAt),
                        who: item.deleted_by_name ?? item.deletedByName ?? '—',
                      })}
                    </span>
                  )}
                </td>
                <td className="p-2 text-right tabular-nums whitespace-nowrap">{money(Number(item.amount))}</td>
                <td className="p-2 text-xs text-text-muted">{resolved ? intl.get(`reconciliation.resolved.${resolved}`) : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-default border border-border bg-surface p-3 text-sm font-medium">{headline}</p>
      {open === 0 ? (
        <p className="text-sm">{intl.get('reconciliation.no_differences')}</p>
      ) : null}
      {missingHere.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">{intl.get('reconciliation.missing_here', { count: missingHere.length })}</h2>
          {table(missingHere, 'here')}
          <div className="flex gap-2">
            <Button size="sm" disabled={isLoading || chosenOf(missingHere).length === 0} onClick={() => act(chosenOf(missingHere), 'add')}>
              {intl.get('reconciliation.add')}
            </Button>
            <Button size="sm" variant="ghost" disabled={isLoading || chosenOf(missingHere).length === 0} onClick={() => act(chosenOf(missingHere), 'ignore')}>
              {intl.get('reconciliation.ignore')}
            </Button>
          </div>
        </section>
      )}
      {missingBank.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">{intl.get('reconciliation.missing_bank', { count: missingBank.length })}</h2>
          {table(missingBank, 'bank')}
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={isLoading || chosenOf(missingBank).length === 0} onClick={() => act(chosenOf(missingBank), 'delete')}>
              {intl.get('reconciliation.delete')}
            </Button>
            <Button size="sm" variant="ghost" disabled={isLoading || chosenOf(missingBank).length === 0} onClick={() => act(chosenOf(missingBank), 'ignore')}>
              {intl.get('reconciliation.ignore')}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
