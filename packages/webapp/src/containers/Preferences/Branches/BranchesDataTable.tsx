import { useCallback } from 'react';
import intl from 'react-intl-universal';
// Intent используется только для AppToaster-тостов — легитимный паттерн проекта.
import { Intent } from '@blueprintjs/core';

import { DataTable } from '@/components/ui/data-table';
import { AppToaster } from '@/components';
import { useMarkBranchAsPrimary } from '@/hooks/query';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { compose } from '@/utils';

import { useBranchesContext } from './BranchesProvider';
import { useBranchesTableColumns, type BranchRow } from './components';

const getBranchRowId = (row: BranchRow) => String(row.id);

/**
 * Таблица филиалов (новый DataTable).
 */
function BranchesDataTable({
  // #withDialogActions
  openDialog,
  // #withAlertActions
  openAlert,
}: any) {
  const { branches, isBranchesLoading } = useBranchesContext() as any;

  // Легаси-хук без типов — типизируем мутацию локально.
  const { mutateAsync: markBranchAsPrimaryMutate } =
    useMarkBranchAsPrimary({}) as unknown as {
      mutateAsync: (id: number) => Promise<unknown>;
    };

  // Редактирование филиала.
  const handleEditBranch = useCallback(
    (branch: BranchRow) => {
      openDialog('branch-form', { branchId: branch.id, action: 'edit' });
    },
    [openDialog],
  );

  // Удаление филиала.
  const handleDeleteBranch = useCallback(
    (branch: BranchRow) => {
      openAlert('branch-delete', { branchId: branch.id });
    },
    [openAlert],
  );

  // Отметить филиал как основной.
  const handleMarkBranchAsPrimary = useCallback(
    (branch: BranchRow) => {
      markBranchAsPrimaryMutate(branch.id).then(() => {
        AppToaster.show({
          message: intl.get('branch.alert.mark_primary_message'),
          intent: Intent.SUCCESS,
        });
      });
    },
    [markBranchAsPrimaryMutate],
  );

  const columns = useBranchesTableColumns({
    onEdit: handleEditBranch,
    onDelete: handleDeleteBranch,
    onMarkPrimary: handleMarkBranchAsPrimary,
  });

  return (
    <div className="bigfin-ui p-4">
      <DataTable
        columns={columns}
        data={branches ?? []}
        getRowId={getBranchRowId}
        loading={isBranchesLoading}
      />
    </div>
  );
}

export default compose(withDialogActions, withAlertActions)(BranchesDataTable);
