// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useDrawerActions } from '@/hooks/state/dashboard';
import { useDataQualityUnmapped } from '@/hooks/query/dataQuality';
import { resolveReferenceDrawer } from './drawerUtils';
import { fmt, fmtDate, refTypeLabel } from './utils';

interface Props {
  fromDate: string;
  toDate: string;
}

function UnmappedAccountRow({ account }: { account: any }) {
  const [open, setOpen] = React.useState(false);
  const { openDrawer } = useDrawerActions();

  const operations: any[] = account.operations ?? [];

  const handleOperationClick = (op: any) => {
    const target = resolveReferenceDrawer(op.referenceType, op.referenceId);
    if (target) openDrawer(target.name, target.payload);
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="hover:bg-muted/50 flex items-center justify-between gap-3 px-4 py-3 text-left text-sm"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex flex-col">
          <span className="font-medium">{account.accountName}</span>
          {account.accountCode && (
            <span className="text-muted-foreground text-xs">
              {account.accountCode}
            </span>
          )}
        </span>
        <span className="flex items-center gap-4">
          <span className="text-muted-foreground">
            {intl.get('data_quality.operations_count', {
              count: account.operationsCount ?? 0,
            })}
          </span>
          <span className="font-medium">{fmt(account.totalAmount)}</span>
        </span>
      </button>

      {open && (
        <div className="bg-muted/30 flex flex-col gap-1 px-4 py-3">
          {operations.map((op) => {
            const clickable = !!resolveReferenceDrawer(
              op.referenceType,
              op.referenceId,
            );
            return (
              <div
                key={op.transactionId}
                className={
                  'flex items-center justify-between gap-3 rounded px-2 py-1.5 text-sm' +
                  (clickable ? ' cursor-pointer hover:bg-muted/60' : '')
                }
                onClick={clickable ? () => handleOperationClick(op) : undefined}
              >
                <span className="flex items-center gap-2">
                  <span>{fmtDate(op.date)}</span>
                  <span className="text-muted-foreground">
                    {refTypeLabel(op.referenceType)}
                    {(op.referenceNumber || op.transactionNumber) &&
                      ` · ${op.referenceNumber || op.transactionNumber}`}
                  </span>
                </span>
                <span>
                  {op.side === 'out' ? '−' : '+'}
                  {fmt(op.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function UnmappedTab({ fromDate, toDate }: Props) {
  const { data } = useDataQualityUnmapped({ fromDate, toDate }, {});

  const accounts: any[] = data?.accounts ?? [];

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">
        {intl.get('data_quality.unmapped.title')}
      </h2>
      <p className="text-muted-foreground text-sm">
        {intl.get('data_quality.unmapped.hint')}
      </p>
      {accounts.length > 0 && (
        <div className="text-muted-foreground text-sm">
          {intl.get('data_quality.unmapped.total', {
            count: data?.totalCount ?? accounts.length,
          })}
        </div>
      )}
      <div className="flex flex-col divide-y rounded-md border">
        {accounts.length === 0 && (
          <div className="text-muted-foreground p-4 text-sm">
            {intl.get('data_quality.unmapped.empty')}
          </div>
        )}
        {accounts.map((account) => (
          <UnmappedAccountRow key={account.accountId} account={account} />
        ))}
      </div>
    </div>
  );
}
