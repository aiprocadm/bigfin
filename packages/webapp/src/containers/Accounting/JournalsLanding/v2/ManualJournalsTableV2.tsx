import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import intl from 'react-intl-universal';
import { BookOpen } from 'lucide-react';

import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import ManualJournalsEmptyStatus from '../ManualJournalsEmptyStatus';
import { useManualJournalsContext } from '../ManualJournalsListProvider';
import { withManualJournals } from '../withManualJournals';
import { withManualJournalsActions } from '../withManualJournalsActions';
import { useManualJournalsTableColumnsV2 } from './useManualJournalsTableColumnsV2';
import type { ManualJournalRow } from './ManualJournalsActionsMenuV2';

const getJournalRowId = (row: ManualJournalRow) => String(row.id);

/**
 * Пустой результат отбора (Г3 карты v20).
 *
 * У раздела уже была подсказка «проводок пока нет» — она показывается,
 * когда журнал пуст целиком. А вот когда отбор или поиск ничего не нашли,
 * оставалась голая таблица без единого слова: единственный такой список из
 * двадцати одного.
 */
function ManualJournalsEmptyResultV2() {
  return (
    <EmptyState
      icon={<BookOpen className="h-8 w-8" aria-hidden />}
      title={intl.get('manual_journals.empty_result.title')}
      description={intl.get('manual_journals.empty_result.description')}
    />
  );
}

function ManualJournalsTableV2Root({
  // #withManualJournalsActions
  setManualJournalsTableState,
  setManualJournalsSelectedRows,
  // #withManualJournals
  manualJournalsTableState,
  // #withAlertActions
  openAlert,
  // #withDrawerActions
  openDrawer,
}: any) {
  const history = useHistory();

  const {
    manualJournals,
    pagination,
    isManualJournalsLoading,
    isManualJournalsFetching,
    isEmptyStatus,
  } = useManualJournalsContext() as any;

  const columns = useManualJournalsTableColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.JOURNAL_DETAILS, { manualJournalId: row.id }),
    onPublish: (row) => openAlert('journal-publish', { manualJournalId: row.id }),
    onEdit: (row) => history.push(`/manual-journals/${row.id}/edit`),
    onDelete: (row) => openAlert('journal-delete', { manualJournalId: row.id }),
  });

  const handleSortChange = useCallback(
    (sortBy: { id: string; desc: boolean }[]) => {
      setManualJournalsTableState({ sortBy });
    },
    [setManualJournalsTableState],
  );

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      setManualJournalsSelectedRows(ids.map(Number));
    },
    [setManualJournalsSelectedRows],
  );

  if (isEmptyStatus) {
    return <ManualJournalsEmptyStatus />;
  }
  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={manualJournals ?? []}
        getRowId={getJournalRowId}
        loading={isManualJournalsLoading || isManualJournalsFetching}
        enableSelection
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
        onRowClick={(row: ManualJournalRow) =>
          openDrawer(DRAWERS.JOURNAL_DETAILS, { manualJournalId: row.id })
        }
        emptyState={<ManualJournalsEmptyResultV2 />}
      />
      <DataTablePagination
        pageIndex={manualJournalsTableState?.pageIndex ?? 0}
        pageSize={manualJournalsTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) => setManualJournalsTableState({ pageIndex })}
        onPageSizeChange={(pageSize) =>
          setManualJournalsTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const ManualJournalsTableV2 = compose(
  withManualJournalsActions,
  withManualJournals(({ manualJournalsTableState }: any) => ({
    manualJournalsTableState,
  })),
  withAlertActions,
  withDrawerActions,
)(ManualJournalsTableV2Root);
