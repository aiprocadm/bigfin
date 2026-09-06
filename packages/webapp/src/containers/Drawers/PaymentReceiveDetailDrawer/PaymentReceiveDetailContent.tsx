import React from 'react';

import { DrawerBody } from '@/components';
import PaymentReceiveDetail from './PaymentReceiveDetail';
import { PaymentReceiveDetailProvider } from './PaymentReceiveDetailProvider';

/**
 * Payment receive detail content.
 */
export default function PaymentReceiveDetailContent({
  // #ownProp
  paymentReceiveId,
}: any) {
  return (
    <PaymentReceiveDetailProvider paymentReceiveId={paymentReceiveId}>
      <DrawerBody>
        <PaymentReceiveDetail />
      </DrawerBody>
    </PaymentReceiveDetailProvider>
  );
}
