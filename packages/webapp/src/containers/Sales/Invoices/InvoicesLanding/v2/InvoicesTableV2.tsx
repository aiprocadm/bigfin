import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Intent } from '@blueprintjs/core';
import { FileText } from 'lucide-react';
import { AppToaster } from '@/components';
import { useDuplicateInvoice } from '@/hooks/query/invoices';

import { Can } from '@/components';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { DocumentMobileRow } from '@/components/ui/document-mobile-row';
import { AbilitySubject, SaleInvoiceAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import { useInvoicesListContext } from '../InvoicesListProvider';
import { withInvoices } from '../withInvoices';
import { withInvoiceActions } from '../withInvoiceActions';
import {
  InvoiceStatusBadgeV2,
  useInvoicesTableColumnsV2,
} from './useInvoicesTableColumnsV2';
import type { InvoiceRow } from './InvoicesActionsMenuV2';

const getInvoiceRowId = (row: InvoiceRow) => String(row.id);

function InvoicesEmptyStateV2() {
  const history = useHistory();
  return (
    <EmptyState
      icon={<FileText className="h-8 w-8" aria-hidden />}
      title={intl.get('the_organization_doesn_t_receive_money_yet')}
      description={intl.get('invoices_empty_status_description')}
      action={
        <Can I={SaleInvoiceAction.Create} a={AbilitySubject.Invoice}>
          <Button onClick={() => history.push('/invoices/new')}>
            {intl.get('new_invoice')}
          </Button>
        </Can>
      }
    />
  );
}

function InvoicesTableV2Root({
  // #withInvoiceActions
  setInvoicesTableState,
  setInvoicesSelectedRows,
  // #withInvoices
  invoicesTableState,
  // #withAlertActions
  openAlert,
  // #withDialogActions
  openDialog,
  // #withDrawerActions
  openDrawer,
}: any) {
  const history = useHistory();
  const { mutateAsync: duplicateInvoice } = useDuplicateInvoice();

  const handleDuplicate = useCallback(
    (row: InvoiceRow) => {
      duplicateInvoice(row.id)
        .then((res: any) => {
          const newId = res?.data?.id ?? res?.id;
          AppToaster.show({
            message: intl.get('invoice.duplicated'),
            intent: Intent.SUCCESS,
          });
          if (newId) history.push(`/invoices/${newId}/edit`);
        })
        .catch(() => {
          AppToaster.show({
            message: intl.get('something_wentwrong'),
            intent: Intent.DANGER,
          });
        });
    },
    [duplicateInvoice, history],
  );

  const {
    isEmptyStatus,
    invoices,
    pagination,
    isInvoicesLoading,
    isInvoicesFetching,
  } = useInvoicesListContext() as any;

  const columns = useInvoicesTableColumnsV2({
    onViewDetails: (row) =>
      openDrawer(DRAWERS.INVOICE_DETAILS, { invoiceId: row.id }),
    onEdit: (row) => history.push(`/invoices/${row.id}/edit`),
    onDuplicate: handleDuplicate,
    onConvertToCreditNote: (row) =>
      history.push(`/credit-notes/new?from_invoice_id=${row.id}`, {
        invoiceId: row.id,
      }),
    onMarkAsDelivered: (row) =>
      openAlert('invoice-deliver', { invoiceId: row.id }),
    onAddPayment: (row) =>
      openDialog('quick-payment-receive', { invoiceId: row.id }),
    onSendMail: (row) =>
      openDrawer(DRAWERS.INVOICE_SEND_MAIL, { invoiceId: row.id }),
    onPrint: (row) => openDialog('invoice-pdf-preview', { invoiceId: row.id }),
    onDelete: (row) => openAlert('invoice-delete', { invoiceId: row.id }),
  });

  const handleSortChange = useCallback(
    (sortBy: { id: string; desc: boolean }[]) => {
      setInvoicesTableState({ sortBy });
    },
    [setInvoicesTableState],
  );

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      setInvoicesSelectedRows(ids.map(Number));
    },
    [setInvoicesSelectedRows],
  );

  if (isEmptyStatus) {
    return <InvoicesEmptyStateV2 />;
  }
  return (
    <div className="flex flex-col p-4">
      <DataTable
        columns={columns}
        data={invoices ?? []}
        getRowId={getInvoiceRowId}
        loading={isInvoicesLoading || isInvoicesFetching}
        enableSelection
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
        onRowClick={(row: InvoiceRow) =>
          openDrawer(DRAWERS.INVOICE_DETAILS, { invoiceId: row.id })
        }
        // На телефоне строка выкладывается блоком: в таблице счёта семь
        // столбцов, а на экране в 390 точек помещаются два, и чтобы
        // увидеть сумму, приходится увести из вида покупателя.
        renderMobileRow={(row: InvoiceRow) => (
          <DocumentMobileRow
            title={row.customer?.display_name}
            number={row.invoice_no}
            date={row.invoice_date_formatted}
            amount={row.total_formatted}
            status={<InvoiceStatusBadgeV2 invoice={row} />}
          />
        )}
        emptyState={<InvoicesEmptyStateV2 />}
      />
      <DataTablePagination
        pageIndex={invoicesTableState?.pageIndex ?? 0}
        pageSize={invoicesTableState?.pageSize ?? 20}
        pageCount={pagination?.pagesCount ?? 0}
        total={pagination?.total}
        onPageChange={(pageIndex) => setInvoicesTableState({ pageIndex })}
        onPageSizeChange={(pageSize) =>
          setInvoicesTableState({ pageSize, pageIndex: 0 })
        }
      />
    </div>
  );
}

export const InvoicesTableV2 = compose(
  withAlertActions,
  withDialogActions,
  withDrawerActions,
  withInvoiceActions,
  withInvoices(({ invoicesTableState }: any) => ({ invoicesTableState })),
)(InvoicesTableV2Root);
