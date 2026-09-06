import React from 'react';

import '@/style/pages/PaymentMade/List.scss';

import { DashboardPageContent } from '@/components';
import { PaymentMadesListProvider } from './PaymentMadesListProvider';
import { PaymentsMadeToolbarV2 } from './v2/PaymentsMadeToolbarV2';
import { PaymentsMadeTableV2 } from './v2/PaymentsMadeTableV2';

import { withPaymentMade } from './withPaymentMade';
import { withPaymentMadeActions } from './withPaymentMadeActions';

import { compose, transformTableStateToQuery } from '@/utils';

/**
 * Payment mades list.
 */
function PaymentMadeList({
  // #withPaymentMade
  paymentMadesTableState,
  paymentsTableStateChanged,

  // #withPaymentMadeActions
  resetPaymentMadesTableState,
}: any) {
  // Resets the invoices table state once the page unmount.
  React.useEffect(
    () => () => {
      resetPaymentMadesTableState();
    },
    [resetPaymentMadesTableState],
  );

  return (
    <PaymentMadesListProvider
      query={transformTableStateToQuery(paymentMadesTableState)}
      tableStateChanged={paymentsTableStateChanged}
    >
      <PaymentsMadeToolbarV2 />

      <DashboardPageContent>
        <div className="bigfin-ui">
          <PaymentsMadeTableV2 />
        </div>
      </DashboardPageContent>
    </PaymentMadesListProvider>
  );
}

export default compose(
  withPaymentMade(({ paymentMadesTableState, paymentsTableStateChanged }: any) => ({
    paymentMadesTableState,
    paymentsTableStateChanged,
  })),
  withPaymentMadeActions,
)(PaymentMadeList);
