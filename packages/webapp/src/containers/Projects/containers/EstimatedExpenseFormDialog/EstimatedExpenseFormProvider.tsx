import React from 'react';
import { DialogContent } from '@/components';

const EstimatedExpenseFormContext = React.createContext<any>(undefined);

/**
 * Estimated expense form provider.
 * @returns
 */
function EstimatedExpenseFormProvider({
  //#OwnProps
  dialogName,
  estimatedExpenseId,
  ...props
}: any) {
  // state provider.
  const provider = {
    dialogName,
  };
  return (
    <DialogContent>
      <EstimatedExpenseFormContext.Provider value={provider} {...props} />
    </DialogContent>
  );
}

const useEstimatedExpenseFormContext = () =>
  React.useContext(EstimatedExpenseFormContext);

export { EstimatedExpenseFormProvider, useEstimatedExpenseFormContext };
