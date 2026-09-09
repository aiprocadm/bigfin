import React from 'react';
import TaxRateFormDialogForm from './TaxRateFormDialogForm';
import { TaxRateFormDialogBoot } from './TaxRateFormDialogBoot';

interface TaxRateFormDialogContentProps {
  dialogName: string;
  /** У новой ставки номера нет — это и проверяет `enabled: !!taxRateId`. */
  taxRateId?: number;
}

/**
 * Tax rate form dialog content.
 */
export default function TaxRateFormDialogContent({
  dialogName,
  taxRateId,
}: TaxRateFormDialogContentProps) {
  return (
    <TaxRateFormDialogBoot taxRateId={taxRateId}>
      <TaxRateFormDialogForm />
    </TaxRateFormDialogBoot>
  );
}
