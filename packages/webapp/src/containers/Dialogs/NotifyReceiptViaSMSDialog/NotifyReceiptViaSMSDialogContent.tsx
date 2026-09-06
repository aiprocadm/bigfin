import React from 'react';

import { NotifyReceiptViaSMSFormProvider } from './NotifyReceiptViaSMSFormProvider';
import NotifyReceiptViaSMSForm from './NotifyReceiptViaSMSForm';

export default function NotifyReceiptViaSMSDialogContent({
  // #ownProps
  dialogName,
  receipt,
}: any) {
  return (
    <NotifyReceiptViaSMSFormProvider
      receiptId={receipt}
      dialogName={dialogName}
    >
      <NotifyReceiptViaSMSForm />
    </NotifyReceiptViaSMSFormProvider>
  );
}
