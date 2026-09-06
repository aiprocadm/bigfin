import React from 'react';

import '@/style/pages/PaymentReceive/List.scss';

import { DashboardPageContent } from '@/components';
import { PaymentsReceivedListProvider } from './PaymentsReceivedListProvider';
import { PaymentsReceivedTableV2 } from './v2/PaymentsReceivedTableV2';
import { PaymentsReceivedToolbarV2 } from './v2/PaymentsReceivedToolbarV2';

import { withPaymentsReceived } from './withPaymentsReceived';
import { withPaymentsReceivedActions } from './withPaymentsReceivedActions';

import { compose, transformTableStateToQuery } from '@/utils';

function PaymentsReceivedList({
  // #withPaymentsReceived
  paymentReceivesTableState,
  paymentsTableStateChanged,

  // #withPaymentsReceivedActions
  resetPaymentReceivesTableState,
  setPaymentReceivesSelectedRows,
}: any) {
  // Resets the payment receives table state once the page unmount.
  React.useEffect(
    () => () => {
      resetPaymentReceivesTableState();
      setPaymentReceivesSelectedRows([]);
    },
    [resetPaymentReceivesTableState, setPaymentReceivesSelectedRows],
  );

  return (
    <PaymentsReceivedListProvider
      query={transformTableStateToQuery(paymentReceivesTableState)}
      tableStateChanged={paymentsTableStateChanged}
    >
      <PaymentsReceivedToolbarV2 />

      <DashboardPageContent>
        <div className="bigfin-ui">
          <PaymentsReceivedTableV2 />
        </div>
      </DashboardPageContent>
    </PaymentsReceivedListProvider>
  );
}

export default compose(
  withPaymentsReceived(
    ({ paymentReceivesTableState, paymentsTableStateChanged }: any) => ({
      paymentReceivesTableState,
      paymentsTableStateChanged,
    }),
  ),
  withPaymentsReceivedActions,
)(PaymentsReceivedList);
