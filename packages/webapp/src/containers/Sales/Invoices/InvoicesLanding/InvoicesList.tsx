import React from 'react';

import '@/style/pages/SaleInvoice/List.scss';

import { DashboardPageContent } from '@/components';
import { InvoicesListProvider } from './InvoicesListProvider';

import { InvoicesToolbarV2 } from './v2/InvoicesToolbarV2';
import { InvoicesTableV2 } from './v2/InvoicesTableV2';

import { withInvoices } from './withInvoices';
import { withInvoiceActions } from './withInvoiceActions';

import { transformTableStateToQuery, compose } from '@/utils';

/**
 * Sale invoices list.
 */
function InvoicesList({
  // #withInvoice
  invoicesTableState,
  invoicesTableStateChanged,

  // #withInvoicesActions
  resetInvoicesTableState,
  resetInvoicesSelectedRows,
}: any) {
  // Resets the invoices table state once the page unmount.
  React.useEffect(
    () => () => {
      resetInvoicesTableState();
      resetInvoicesSelectedRows();
    },
    [resetInvoicesTableState, resetInvoicesSelectedRows],
  );

  return (
    <InvoicesListProvider
      query={transformTableStateToQuery(invoicesTableState)}
      tableStateChanged={invoicesTableStateChanged}
    >
      <InvoicesToolbarV2 />

      <DashboardPageContent>
        <div className="bigfin-ui">
          <InvoicesTableV2 />
        </div>
      </DashboardPageContent>
    </InvoicesListProvider>
  );
}

export default compose(
  withInvoices(({ invoicesTableState, invoicesTableStateChanged }: any) => ({
    invoicesTableState,
    invoicesTableStateChanged,
  })),
  withInvoiceActions,
)(InvoicesList);
