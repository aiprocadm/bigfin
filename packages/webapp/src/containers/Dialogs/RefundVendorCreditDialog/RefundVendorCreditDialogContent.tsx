import React from 'react';

import '@/style/pages/RefundVendorCredit/RefundVendorCredit.scss';

import { RefundVendorCreditFormProvider } from './RefundVendorCreditFormProvider';
import RefundVendorCreditForm from './RefundVendorCreditForm';

export default function RefundVendorCreditDialogContent({
  // #ownProps
  dialogName,
  vendorCreditId,
}: any) {
  return (
    <RefundVendorCreditFormProvider
      vendorCreditId={vendorCreditId}
      dialogName={dialogName}
    >
      <RefundVendorCreditForm />
    </RefundVendorCreditFormProvider>
  );
}
