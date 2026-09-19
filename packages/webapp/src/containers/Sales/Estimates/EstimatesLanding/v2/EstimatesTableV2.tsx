import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { FileText } from 'lucide-react';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DocumentMobileRow } from '@/components/ui/document-mobile-row';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { AbilitySubject, SaleEstimateAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { useEstimatesListContext } from '../EstimatesListProvider';
import { withEstimates } from '../withEstimates';
import { withEstimatesActions } from '../withEstimatesActions';
import { useEstimatesTableColumnsV2 } from './useEstimatesTableColumnsV2';
import type { EstimateRow } from './EstimatesActionsMenuV2';

const getEstimateRowId = (row: EstimateRow) => String(row.id);

function EstimatesEmptyStateV2() {
  const history = useHistory();
  return (
    <EmptyState
      icon={<FileText className="h-8 w-8" aria-hidden />}
      title={intl.get('it_s_time_to_send_estimates_to_your_customers')}
      description={intl.get('estimate_is_used_to_create_bid_proposal_or_quote')}
      action={
        <Can I={SaleEstimateAction.Create} a={AbilitySubject.Estimate}>
          <Button onClick={() => history.push('/estimates/new')}>
            {intl.get('new_sale_estimate')}
          </Button>
        </Can>
      }
    />
  );
}

function EstimatesTableV2Root({
  // #withEstimatesActions
  setEstimatesTableState,
  setEstimatesSelectedRows,
  // #withEstimates
  estimatesTableState,
  // #withAlertActions
  openAlert,
  // #withDialogActions
  openDialog,
  // #withDrawerActions
  openDrawer,
}: any) {
  const history = useHistory();

  const {
    isEmptyStatus,
    estimates,
    pagination,
    isEstimatesLoading,
    isEstimatesFetching,
  } = useEstimatesListContext() as any;

  const columns = useEstimatesTableColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.ESTIMATE_DETAILS, { estimateId: row.id }),
    onEdit: (row) => history.push(`/estimates/${row.id}/edit`),
    onConvert: (row) =>
      history.push(`/invoices/new?from_estimate_id=${row.id}`, {
        action: row.id,
      }),
    onDeliver: (row) => openAlert('estimate-deliver', { estimateId: row.id }),
    // Регистр имени алерта — как в легаси ('estimate-Approve').
    onApprove: (row) => openAlert('estimate-Approve', { estimateId: row.id }),
    onReject: (row) => openAlert('estimate-reject', { estimateId: row.id }),
    onSendMail: (row) =>
      openDrawer(DRAWERS.ESTIMATE_SEND_MAIL, { estimateId: row.id }),
    onPrint: (row) => openDialog('estimate-pdf-preview', { estimateId: row.id }),
    onDelete: (row) => openAlert('estimate-delete', { estimateId: row.id }),
  });

  const handleSortChange = useCallback(
    (sortBy: { id: string; desc: boolean }[]) => {
      setEstimatesTableState({ sortBy });
    },
    [setEstimatesTableState],
  );

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      setEstimatesSelectedRows(ids.map(Number));
    },
    [setEstimatesSelectedRows],
  );

  if (isEmptyStatus) {
    return <EstimatesEmptyStateV2 />;
  }
  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={estimates ?? []}
        getRowId={getEstimateRowId}
        loading={isEstimatesLoading || isEstimatesFetching}
        enableSelection
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
        onRowClick={(row: EstimateRow) =>
          openDrawer(DRAWERS.ESTIMATE_DETAILS, { estimateId: row.id })
        }
        renderMobileRow={(row: EstimateRow) => (
          <DocumentMobileRow
            title={row.customer?.display_name}
            number={row.estimate_number}
            date={row.formatted_estimate_date}
            amount={row.amount}
            currency={row.currency_code}
          />
        )}
        emptyState={<EstimatesEmptyStateV2 />}
      />
      <DataTablePagination
        pageIndex={estimatesTableState?.pageIndex ?? 0}
        pageSize={estimatesTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) => setEstimatesTableState({ pageIndex })}
        onPageSizeChange={(pageSize) =>
          setEstimatesTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const EstimatesTableV2 = compose(
  withAlertActions,
  withDialogActions,
  withDrawerActions,
  withEstimatesActions,
  withEstimates(({ estimatesTableState }: any) => ({ estimatesTableState })),
)(EstimatesTableV2Root);
