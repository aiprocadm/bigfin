import React from 'react';

import BranchActivateForm from './BranchActivateForm';
import { BranchActivateFormProvider } from './BranchActivateFormProvider';

export default function BranchActivateDialogContent({
  // #ownProps
  dialogName,
}: any) {
  return (
    <BranchActivateFormProvider dialogName={dialogName}>
      <BranchActivateForm />
    </BranchActivateFormProvider>
  );
}
