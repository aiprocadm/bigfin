import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { compose } from '@/utils';
import { useExpensesListContext } from './ExpensesListProvider';
import { useMemorizedColumnsWidths } from '@/hooks';
import {
  DashboardContentTable,
  DataTable,
  TableSkeletonRows,
  TableSkeletonHeader,
} from '@/components';
import { TABLES } from '@/constants/tables';

import ExpensesEmptyStatus from './ExpensesEmptyStatus';

import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { withExpensesActions } from './withExpensesActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withSettings } from '@/containers/Settings/withSettings';
import { withExpenses } from './withExpenses';

import { ActionsMenu, useExpensesTableColumns } from './components';
import { DRAWERS } from '@/constants/drawers';

/**
 * Expenses datatable.
 */
function ExpensesDataTable({
  // #withExpensesActions
  setExpensesTableState,
  setExpensesSelectedRows,

  // #withDrawerActions
  openDrawer,

  // #withAlertActions
  openAlert,

  // #withSettings
  expensesTableSize,

  // #withExpenses
  expensesTableState,
}: any) {
  // Expenses list context.
  const {
    expenses,
    pagination,

    isExpensesLoading,
    isExpensesFetching,
    isEmptyStatus,
  } = useExpensesListContext();

  const history = useHistory();

  // Expenses table columns.
  const columns = useExpensesTableColumns();

  // Local storage memorizing columns widths.
  const [initialColumnsWidths, , handleColumnResizing] =
    useMemorizedColumnsWidths(TABLES.EXPENSES);

  // Handle fetch data of manual jouranls datatable.
  const handleFetchData = useCallback(
    ({ pageIndex, pageSize, sortBy }: any) => {
      setExpensesTableState({
        pageIndex,
        pageSize,
        sortBy,
      });
    },
    [setExpensesTableState],
  );

  // Handle the expense publish action.
  const handlePublishExpense = (expense: any) => {
    openAlert('expense-publish', { expenseId: expense.id });
  };

  // Handle the expense edit action.
  const handleEditExpense = ({ id }: any) => {
    history.push(`/expenses/${id}/edit`);
  };

  // Handle the expense delete action.
  const handleDeleteExpense = (expense: any) => {
    openAlert('expense-delete', { expenseId: expense.id });
  };

  // Handle view detail expense.
  const handleViewDetailExpense = ({ id }: any) => {
    openDrawer(DRAWERS.EXPENSE_DETAILS, {
      expenseId: id,
    });
  };

  // Handle cell click.
  const handleCellClick = (cell: any, event: any) => {
    openDrawer(DRAWERS.EXPENSE_DETAILS, { expenseId: cell.row.original.id });
  };

  // Handle selected rows change.
  const handleSelectedRowsChange = (selectedFlatRows: any) => {
    const selectedIds = selectedFlatRows?.map((row: any) => row.original.id) || [];
    setExpensesSelectedRows(selectedIds);
  };

  // Display empty status instead of the table.
  if (isEmptyStatus) {
    return <ExpensesEmptyStatus />;
  }

  return (
    <DashboardContentTable>
      <DataTable
        columns={columns}
        data={expenses}
        loading={isExpensesLoading}
        headerLoading={isExpensesLoading}
        progressBarLoading={isExpensesFetching}
        selectionColumn={true}
        noInitialFetch={true}
        sticky={true}
        onFetchData={handleFetchData}
        pagination={true}
        initialPageSize={expensesTableState.pageSize}
        manualSortBy={true}
        manualPagination={true}
        pagesCount={pagination.pagesCount}
        autoResetSortBy={false}
        autoResetPage={false}
        TableLoadingRenderer={TableSkeletonRows}
        TableHeaderSkeletonRenderer={TableSkeletonHeader}
        ContextMenu={ActionsMenu}
        onCellClick={handleCellClick}
        initialColumnsWidths={initialColumnsWidths}
        onColumnResizing={handleColumnResizing}
        onSelectedRowsChange={handleSelectedRowsChange}
        size={expensesTableSize}
        payload={{
          onPublish: handlePublishExpense,
          onDelete: handleDeleteExpense,
          onEdit: handleEditExpense,
          onViewDetails: handleViewDetailExpense,
        }}
      />
    </DashboardContentTable>
  );
}

export default compose(
  withDashboardActions,
  withAlertActions,
  withDrawerActions,
  withExpensesActions,
  withSettings(({ expenseSettings }: any) => ({
    expensesTableSize: expenseSettings?.tableSize,
  })),
  withExpenses(({ expensesTableState }: any) => ({ expensesTableState })),
)(ExpensesDataTable);
