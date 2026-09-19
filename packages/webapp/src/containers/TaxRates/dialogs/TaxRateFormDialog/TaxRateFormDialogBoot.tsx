import React from 'react';
import { DialogContent } from '@/components';
import { useTaxRate } from '@/hooks/query/taxRates';
import { DialogsName } from '@/constants/dialogs';

const TaxRateFormDialogContext = React.createContext<any>(undefined);

interface TaxRateFormDialogBootProps {
  /** У новой ставки номера нет — это и проверяет `enabled: !!taxRateId`. */
  taxRateId?: number;
  children?: JSX.Element;
}

interface TaxRateFormDialogBootContext {
  /** У новой ставки номера нет — это и проверяет `enabled: !!taxRateId`. */
  taxRateId?: number;
  taxRate: any;
  isTaxRateLoading: boolean;
  isTaxRateSuccess: boolean;
  isNewMode: boolean;
  /**
   * Имя окна. Оно КЛАДЁТСЯ в контекст ниже и читается формой, но объявлено
   * не было: слепая зона типов прятала расхождение между тем, что кладут,
   * и тем, что обещают.
   */
  dialogName: string;
}

/**
 * Money in dialog provider.
 */
function TaxRateFormDialogBoot({
  taxRateId,
  ...props
}: TaxRateFormDialogBootProps) {
  const {
    data: taxRate,
    isLoading: isTaxRateLoading,
    isSuccess: isTaxRateSuccess,
  } = useTaxRate(taxRateId, {
    enabled: !!taxRateId,
  });

  const isNewMode = !taxRateId;

  // Provider data.
  const provider = {
    taxRateId,
    taxRate,
    isTaxRateLoading,
    isTaxRateSuccess,
    isNewMode,
    dialogName: DialogsName.TaxRateForm,
  };
  const isLoading = isTaxRateLoading;

  return (
    <DialogContent isLoading={isLoading}>
      <TaxRateFormDialogContext.Provider value={provider} {...props} />
    </DialogContent>
  );
}

const useTaxRateFormDialogContext = () =>
  React.useContext<TaxRateFormDialogBootContext>(TaxRateFormDialogContext);

export { TaxRateFormDialogBoot, useTaxRateFormDialogContext };
