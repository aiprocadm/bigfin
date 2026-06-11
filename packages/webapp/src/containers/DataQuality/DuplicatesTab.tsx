// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useDrawerActions } from '@/hooks/state/dashboard';
import { useDataQualityDuplicates } from '@/hooks/query/dataQuality';
import { resolveReferenceDrawer } from './drawerUtils';
import { fmt, fmtDate, refTypeLabel } from './utils';

interface Props {
  fromDate: string;
  toDate: string;
}

function DuplicateGroupRow({ group }: { group: any }) {
  const [open, setOpen] = React.useState(false);
  const { openDrawer } = useDrawerActions();

  const entries: any[] = group.entries ?? [];

  const handleEntryClick = (entry: any) => {
    const target = resolveReferenceDrawer(
      entry.referenceType,
      entry.referenceId,
    );
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
          <span className="font-medium">
            {fmtDate(group.date)} · {group.accountName}
          </span>
          <span className="text-muted-foreground text-xs">
            {intl.get(`data_quality.side.${group.side}`)}
          </span>
        </span>
        <span className="flex items-center gap-4">
          <span className="text-muted-foreground">
            {intl.get('data_quality.operations_count', {
              count: entries.length,
            })}
          </span>
          <span className="font-medium">{fmt(group.amount)}</span>
        </span>
      </button>

      {open && (
        <div className="bg-muted/30 flex flex-col gap-1 px-4 py-3">
          {entries.map((entry) => {
            const clickable = !!resolveReferenceDrawer(
              entry.referenceType,
              entry.referenceId,
            );
            return (
              <div
                key={entry.transactionId}
                className={
                  'flex items-center justify-between gap-3 rounded px-2 py-1.5 text-sm' +
                  (clickable ? ' cursor-pointer hover:bg-muted/60' : '')
                }
                onClick={clickable ? () => handleEntryClick(entry) : undefined}
              >
                <span className="text-muted-foreground">
                  {refTypeLabel(entry.referenceType)}
                  {(entry.referenceNumber || entry.transactionNumber) &&
                    ` · ${entry.referenceNumber || entry.transactionNumber}`}
                </span>
                <span>{fmt(group.amount)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DuplicatesTab({ fromDate, toDate }: Props) {
  const { data } = useDataQualityDuplicates({ fromDate, toDate }, {});

  const groups: any[] = data?.groups ?? [];

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">
        {intl.get('data_quality.duplicates.title')}
      </h2>
      <p className="text-muted-foreground text-sm">
        {intl.get('data_quality.duplicates.hint')}
      </p>
      {groups.length > 0 && (
        <div className="text-muted-foreground text-sm">
          {intl.get('data_quality.duplicates.total', {
            count: data?.totalGroups ?? groups.length,
          })}
        </div>
      )}
      <div className="flex flex-col divide-y rounded-md border">
        {groups.length === 0 && (
          <div className="text-muted-foreground p-4 text-sm">
            {intl.get('data_quality.duplicates.empty')}
          </div>
        )}
        {groups.map((group, index) => (
          <DuplicateGroupRow
            key={`${group.date}-${group.accountId}-${group.amount}-${group.side}-${index}`}
            group={group}
          />
        ))}
      </div>
    </div>
  );
}
