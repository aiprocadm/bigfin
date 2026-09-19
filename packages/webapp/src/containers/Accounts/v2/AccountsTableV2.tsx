import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { ListTree } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { EntityMobileRow } from '@/components/ui/entity-mobile-row';
import { accountTypeLabel } from '@/utils/accountTypeLabel';
import { EmptyState } from '@/components/ui/empty-state';
import { AbilitySubject, AccountAction } from '@/constants/abilityOption';
import { DialogsName } from '@/constants/dialogs';
import { DRAWERS } from '@/constants/drawers';
import { AccountDialogAction } from '@/containers/Dialogs/AccountDialog/utils';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { useAccountsChartContext } from '../AccountsChartProvider';
import { withAccountsTableActions } from '../withAccountsTableActions';
import {
  ACCOUNTS_TREE_COLUMN_ID,
  useAccountsTableColumnsV2,
} from './useAccountsTableColumnsV2';
import type { AccountRow } from './AccountsActionsMenuV2';

const getAccountRowId = (row: AccountRow) => String(row.id);

const getAccountSubRows = (row: AccountRow) => row.children;

function AccountsEmptyStateV2({
  onNewAccount,
}: {
  onNewAccount: () => void;
}) {
  return (
    <EmptyState
      icon={<ListTree className="h-8 w-8" aria-hidden />}
      title={intl.get('accounts.empty_status.title')}
      description={intl.get('accounts.empty_status.description')}
      action={
        <Can I={AccountAction.Create} a={AbilitySubject.Account}>
          <Button onClick={onNewAccount}>{intl.get('new_account')}</Button>
        </Can>
      }
    />
  );
}

function AccountsTableV2Root({
  // #withAccountsTableActions
  setAccountsTableState,
  setAccountsSelectedRows,
  // #withAlertActions
  openAlert,
  // #withDialogActions
  openDialog,
  // #withDrawerActions
  openDrawer,
}: any) {
  const { accounts, isAccountsLoading, isAccountsFetching } =
    useAccountsChartContext() as {
      accounts?: AccountRow[];
      isAccountsLoading: boolean;
      isAccountsFetching: boolean;
    };

  // Обработчики те же, что в легаси-таблице: алерты/диалоги/дровер.
  const columns = useAccountsTableColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.ACCOUNT_DETAILS, { accountId: row.id }),
    onEdit: (row) =>
      openDialog(DialogsName.AccountForm, {
        action: AccountDialogAction.Edit,
        accountId: row.id,
      }),
    onNewChild: (row) =>
      openDialog(DialogsName.AccountForm, {
        action: AccountDialogAction.NewChild,
        parentAccountId: row.id,
        accountType: row.account_type,
      }),
    onActivate: (row) => openAlert('account-activate', { accountId: row.id }),
    onInactivate: (row) =>
      openAlert('account-inactivate', { accountId: row.id }),
    onDelete: (row) => openAlert('account-delete', { accountId: row.id }),
  });

  const handleSortChange = useCallback(
    (sortBy: { id: string; desc: boolean }[]) => {
      setAccountsTableState({ sortBy });
    },
    [setAccountsTableState],
  );

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      setAccountsSelectedRows(ids.map(Number));
    },
    [setAccountsSelectedRows],
  );

  const handleNewAccount = useCallback(() => {
    openDialog(DialogsName.AccountForm, {});
  }, [openDialog]);

  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={accounts ?? []}
        getRowId={getAccountRowId}
        getSubRows={getAccountSubRows}
        defaultExpanded
        treeColumnId={ACCOUNTS_TREE_COLUMN_ID}
        loading={isAccountsLoading || isAccountsFetching}
        enableSelection
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
        onRowClick={(row: AccountRow) =>
          openDrawer(DRAWERS.ACCOUNT_DETAILS, { accountId: row.id })
        }
        renderMobileRow={(row: AccountRow) => (
          <EntityMobileRow
            title={row.name}
            subtitle={accountTypeLabel(row.account_type, row.account_type_label)}
            amount={row.formatted_amount}
          />
        )}
        emptyState={<AccountsEmptyStateV2 onNewAccount={handleNewAccount} />}
      />
    </div>
  );
}

export const AccountsTableV2 = compose(
  withAlertActions,
  withDialogActions,
  withDrawerActions,
  withAccountsTableActions,
)(AccountsTableV2Root);
