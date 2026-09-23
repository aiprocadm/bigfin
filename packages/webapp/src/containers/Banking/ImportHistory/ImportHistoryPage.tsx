// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useCashflowAccounts } from '@/hooks/query/cashflowAccounts';
import { useImportBatches, useRollbackImport } from '@/hooks/query/bankingTrash';
import { showApiError } from '@/utils/showApiError';
import { formatDay } from '../Trash/trashView';

/**
 * История импорта выписок и откат (FT-043 ТЗ-3). Откат переводит все строки
 * импорта в корзину одной транзакцией — остаток счёта возвращается к
 * значению до импорта, а исправленный файл можно загрузить заново.
 */
export default function ImportHistoryPage() {
  const { data: accounts } = useCashflowAccounts({}, {});
  const { data, isLoading } = useImportBatches();
  const batches: any[] = Array.isArray(data) ? data : [];
  const { mutateAsync: rollback, isLoading: rollingBack } = useRollbackImport();
  const [pending, setPending] = React.useState<any | null>(null);

  const accountName = (id: number) =>
    ((accounts as any[]) ?? []).find((a) => Number(a.id) === Number(id))?.name ?? `№ ${id}`;

  const handleRollback = async () => {
    try {
      const result: any = await rollback(Number(pending.id));
      AppToaster.show({
        intent: 'success',
        message: intl.get('import_history.rolled_back', { count: result?.trashed ?? 0 }),
      });
    } catch (error) {
      showApiError(error);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold">{intl.get('import_history.title')}</h1>
        <p className="text-sm text-text-secondary">{intl.get('import_history.hint')}</p>
      </div>
      {isLoading ? (
        <p className="text-sm text-text-secondary">{intl.get('alert_content_is_loading')}</p>
      ) : batches.length === 0 ? (
        <p className="text-sm text-text-secondary">{intl.get('import_history.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-default border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="p-2">{intl.get('import_history.col.date')}</th>
                <th className="p-2">{intl.get('import_history.col.account')}</th>
                <th className="p-2">{intl.get('import_history.col.source')}</th>
                <th className="p-2 text-right">{intl.get('import_history.col.rows')}</th>
                <th className="p-2 text-right">{intl.get('import_history.col.active')}</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => {
                const rolledBack = batch.rolled_back_at ?? batch.rolledBackAt;
                const canRollback = batch.can_rollback ?? batch.canRollback;
                return (
                  <tr key={batch.id} className="border-b border-border">
                    <td className="p-2 whitespace-nowrap">{formatDay(batch.created_at ?? batch.createdAt)}</td>
                    <td className="p-2">{accountName(batch.account_id ?? batch.accountId)}</td>
                    <td className="p-2">
                      {intl.get(`import_history.source.${batch.source}`)}
                      {(batch.file_name ?? batch.fileName) ? ` · ${batch.file_name ?? batch.fileName}` : ''}
                    </td>
                    <td className="p-2 text-right tabular-nums">{batch.rows_count ?? batch.rowsCount}</td>
                    <td className="p-2 text-right tabular-nums">{batch.active_rows ?? batch.activeRows}</td>
                    <td className="p-2 text-right">
                      {rolledBack ? (
                        <span className="text-xs text-text-muted">
                          {intl.get('import_history.rolled_back_at', { date: formatDay(rolledBack) })}
                        </span>
                      ) : (
                        <Button size="sm" variant="secondary" disabled={!canRollback} onClick={() => setPending(batch)}>
                          {intl.get('import_history.rollback')}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(pending)}
        title={intl.get('import_history.rollback_title')}
        description={intl.get('import_history.rollback_description', {
          count: pending?.active_rows ?? pending?.activeRows ?? 0,
        })}
        confirmLabel={intl.get('import_history.rollback')}
        intent="danger"
        loading={rollingBack}
        onConfirm={handleRollback}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
