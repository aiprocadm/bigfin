// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
// Дата — полем продукта, в формате организации, а не полем браузера.
import { DateField } from '@/components/ui/date-field';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  TrashItemRef,
  usePurgeTrash,
  useRestoreFromTrash,
  useTrash,
} from '@/hooks/query/bankingTrash';
import { formattedAmount } from '@/utils';
import { showApiError } from '@/utils/showApiError';
import { formatDay, TRASH_REASONS, trashKey } from './trashView';

/**
 * Корзина операций (FT-042 ТЗ-3): что удалено, кем и когда; вернуть или
 * удалить окончательно (только владелец). Хранится 90 дней.
 */
export default function TrashPage() {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirmPurge, setConfirmPurge] = React.useState(false);

  const { data, isLoading } = useTrash({
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
    ...(reason ? { reason } : {}),
  });
  const items: any[] = Array.isArray(data) ? data : [];
  const { mutateAsync: restore, isLoading: restoring } = useRestoreFromTrash();
  const { mutateAsync: purge, isLoading: purging } = usePurgeTrash();

  const chosen = (): TrashItemRef[] =>
    items.filter((item) => selected.has(trashKey(item))).map((item) => ({ kind: item.kind, id: item.id }));
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handleRestore = async () => {
    try {
      await restore(chosen());
      AppToaster.show({ intent: 'success', message: intl.get('trash.restored') });
      setSelected(new Set());
    } catch (error) {
      showApiError(error);
    }
  };
  const handlePurge = async () => {
    try {
      await purge(chosen());
      AppToaster.show({ intent: 'success', message: intl.get('trash.purged') });
      setSelected(new Set());
    } catch (error) {
      showApiError(error);
    } finally {
      setConfirmPurge(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold">{intl.get('trash.title')}</h1>
        <p className="text-sm text-text-secondary">{intl.get('trash.hint')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          {intl.get('trash.from')}
          <DateField className="h-9 w-40" value={fromDate} onChange={setFromDate} />
        </label>
        <label className="flex flex-col gap-1">
          {intl.get('trash.to')}
          <DateField className="h-9 w-40" value={toDate} onChange={setToDate} />
        </label>
        <label className="flex flex-col gap-1">
          {intl.get('trash.reason')}
          <select className="h-9 rounded-control border border-border px-2" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">{intl.get('trash.reason.any')}</option>
            {TRASH_REASONS.map((value) => (
              <option key={value} value={value}>
                {intl.get(`trash.reason.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <Button disabled={selected.size === 0 || restoring} onClick={handleRestore}>
            {intl.get('trash.restore', { count: selected.size })}
          </Button>
          <Button variant="destructive" disabled={selected.size === 0 || purging} onClick={() => setConfirmPurge(true)}>
            {intl.get('trash.purge', { count: selected.size })}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary">{intl.get('alert_content_is_loading')}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-secondary">{intl.get('trash.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-default border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="w-8 p-2" />
                <th className="p-2">{intl.get('trash.col.date')}</th>
                <th className="p-2">{intl.get('trash.col.account')}</th>
                <th className="p-2">{intl.get('trash.col.description')}</th>
                <th className="p-2 text-right">{intl.get('trash.col.amount')}</th>
                <th className="p-2">{intl.get('trash.col.deleted')}</th>
                <th className="p-2">{intl.get('trash.col.reason')}</th>
                <th className="p-2">{intl.get('trash.col.purge_at')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const key = trashKey(item);
                const sign = item.direction === 'in' ? '' : '−';
                return (
                  <tr key={key} className="border-b border-border">
                    <td className="p-2">
                      <Checkbox
                        checked={selected.has(key)}
                        onCheckedChange={() => toggle(key)}
                        aria-label={intl.get('trash.select_row')}
                      />
                    </td>
                    <td className="p-2 whitespace-nowrap">{formatDay(item.date)}</td>
                    <td className="p-2">{item.account_name ?? item.accountName ?? '—'}</td>
                    <td className="p-2">{item.description || '—'}</td>
                    <td className="p-2 text-right tabular-nums whitespace-nowrap">
                      {sign}
                      {formattedAmount(item.amount, item.currency_code ?? item.currencyCode ?? '')}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {formatDay(item.deleted_at ?? item.deletedAt)}
                      {(item.deleted_by ?? item.deletedBy) ? ` · ${item.deleted_by ?? item.deletedBy}` : ''}
                    </td>
                    <td className="p-2">{intl.get(`trash.reason.${item.delete_reason ?? item.deleteReason ?? 'manual'}`)}</td>
                    <td className="p-2 whitespace-nowrap">{formatDay(item.purge_at ?? item.purgeAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmPurge}
        title={intl.get('trash.purge_title')}
        description={intl.get('trash.purge_description')}
        confirmLabel={intl.get('trash.purge_confirm')}
        intent="danger"
        loading={purging}
        onConfirm={handlePurge}
        onCancel={() => setConfirmPurge(false)}
      />
    </div>
  );
}
