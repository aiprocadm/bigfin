import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Receipt } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { AbilitySubject, ExpenseAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { useExpensesListContext } from '../ExpensesListProvider';
import { withExpenses } from '../withExpenses';
import { withExpensesActions } from '../withExpensesActions';
import { useExpensesTableColumnsV2 } from './useExpensesTableColumnsV2';
import type { ExpenseRow } from './ExpensesActionsMenuV2';

const getExpenseRowId = (row: ExpenseRow) => String(row.id);

function ExpensesEmptyStateV2() {
  const history = useHistory();
  return (
    <EmptyState
      icon={<Receipt className="h-8 w-8" aria-hidden />}
      title={intl.get('expenses.empty_status.title')}
      description={intl.get('expenses.empty_status.description')}
      action={
        <Can I={ExpenseAction.Create} a={AbilitySubject.Expense}>
          <Button onClick={() => history.push('/expenses/new')}>
            {intl.get('new_expense')}
          </Button>
        </Can>
      }
    />
  );
}

function ExpensesTableV2Root({
  // #withExpensesActions
  setExpensesTableState,
  setExpensesSelectedRows,
  // #withExpenses
  expensesTableState,
  // #withAlertActions
  openAlert,
  // #withDrawerActions
  openDrawer,
}: any) {
  const history = useHistory();

  const {
    expenses,
    pagination,
    isExpensesLoading,
    isExpensesFetching,
    isEmptyStatus,
  } = useExpensesListContext() as any;

  const columns = useExpensesTableColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.EXPENSE_DETAILS, { expenseId: row.id }),
    onEdit: (row) => history.push(`/expenses/${row.id}/edit`),
    onPublish: (row) => openAlert('expense-publish', { expenseId: row.id }),
    onDelete: (row) => openAlert('expense-delete', { expenseId: row.id }),
  });

  const handleSortChange = useCallback(
    (sortBy: { id: string; desc: boolean }[]) => {
      setExpensesTableState({ sortBy });
    },
    [setExpensesTableState],
  );

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      setExpensesSelectedRows(ids.map(Number));
    },
    [setExpensesSelectedRows],
  );

  if (isEmptyStatus) {
    return <ExpensesEmptyStateV2 />;
  }
  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={expenses ?? []}
        getRowId={getExpenseRowId}
        loading={isExpensesLoading || isExpensesFetching}
        enableSelection
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
        onRowClick={(row: ExpenseRow) =>
          openDrawer(DRAWERS.EXPENSE_DETAILS, { expenseId: row.id })
        }
        emptyState={<ExpensesEmptyStateV2 />}
      />
      <DataTablePagination
        pageIndex={expensesTableState?.pageIndex ?? 0}
        pageSize={expensesTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) => setExpensesTableState({ pageIndex })}
        onPageSizeChange={(pageSize) =>
          setExpensesTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const ExpensesTableV2 = compose(
  withAlertActions,
  withDrawerActions,
  withExpensesActions,
  withExpenses(({ expensesTableState }: any) => ({ expensesTableState })),
)(ExpensesTableV2Root);
