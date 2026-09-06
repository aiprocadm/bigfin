import React from 'react';

import WarehouseActivateForm from './WarehouseActivateForm';
import { WarehouseActivateFormProvider } from './WarehouseActivateFormProvider';

export default function WarehouseActivateDialogContent({
  // #ownProps
  dialogName,
}: any) {
  return (
    <WarehouseActivateFormProvider dialogName={dialogName}>
      <WarehouseActivateForm />
    </WarehouseActivateFormProvider>
  );
}
