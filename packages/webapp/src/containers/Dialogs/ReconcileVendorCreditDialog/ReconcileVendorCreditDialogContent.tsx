import React from 'react';
import { ReconcileVendorCreditFormProvider } from './ReconcileVendorCreditFormProvider';
import ReconcileVendorCreditForm from './ReconcileVendorCreditForm';

export default function ReconcileVendorCreditDialogContent({
  // #ownProps
  dialogName,
  vendorCreditId,
}: any) {
  return (
    <ReconcileVendorCreditFormProvider
      vendorCreditId={vendorCreditId}
      dialogName={dialogName}
    >
      <ReconcileVendorCreditForm />
    </ReconcileVendorCreditFormProvider>
  );
}
