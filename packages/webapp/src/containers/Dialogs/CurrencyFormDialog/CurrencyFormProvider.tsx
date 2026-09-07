import React, { createContext } from 'react';
import { useEditCurrency, useCreateCurrency } from '@/hooks/query';
import { DialogContent } from '@/components';

const CurrencyFormContext = createContext<any>(undefined);

/**
 * Currency Form page provider.
 */
function CurrencyFormProvider({ isEditMode, currency, dialogName, ...props }: any) {
  // Create and edit item currency mutations.
  const { mutateAsync: createCurrencyMutate } = useCreateCurrency();
  const { mutateAsync: editCurrencyMutate } = useEditCurrency();

  // Provider state.
  const provider = {
    createCurrencyMutate,
    editCurrencyMutate,
    dialogName,
    currency,
    isEditMode,
  };

  return (
    <DialogContent name={'currency-form'}>
      <CurrencyFormContext.Provider value={provider} {...props} />
    </DialogContent>
  );
}

const useCurrencyFormContext = () => React.useContext(CurrencyFormContext);

export { CurrencyFormProvider, useCurrencyFormContext };
