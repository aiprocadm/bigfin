import intl from 'react-intl-universal';
import React, { lazy } from 'react';
import styled from 'styled-components';
import { Dialog, DialogSuspense } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { compose } from '@/utils';

const TaxRateFormDialogContent = lazy(
  () => import('./TaxRateFormDialogContent'),
);

/**
 * Tax rate form dialog.
 */
function TaxRateFormDialog({
  dialogName,
  payload = { action: '', id: null },
  isOpen,
}: DialogReduxProps<{ action: string; id: number | null }>) {
  return (
    <TaxRateDialog
      name={dialogName}
      title={
        payload.id
          ? intl.get('tax_rates.dialog.edit_title')
          : intl.get('tax_rates.dialog.create_title')
      }
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
    >
      <DialogSuspense>
        <TaxRateFormDialogContent
          dialogName={dialogName}
          taxRateId={payload.id ?? undefined}
        />
      </DialogSuspense>
    </TaxRateDialog>
  );
}

const TaxRateDialog = styled(Dialog)`
  max-width: 450px;
`;

export default compose(withDialogRedux())(TaxRateFormDialog);
