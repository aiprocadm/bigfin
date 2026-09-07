import React from 'react';
import intl from 'react-intl-universal';
import * as R from 'ramda';
import { useFormikContext } from 'formik';
import { Button, Classes, Intent } from '@blueprintjs/core';
import { DialogsName } from '@/constants/dialogs';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';

function TaxRateFormDialogFormFooterRoot({ closeDialog }: any) {
  const { isSubmitting } = useFormikContext<any>();

  const handleClose = () => {
    closeDialog(DialogsName.TaxRateForm);
  };

  return (
    <div className={Classes.DIALOG_FOOTER}>
      <div className={Classes.DIALOG_FOOTER_ACTIONS}>
        <Button
          disabled={isSubmitting}
          onClick={handleClose}
          style={{ minWidth: '75px' }}
        >
          {intl.get('close')}
        </Button>

        <Button
          intent={Intent.PRIMARY}
          loading={isSubmitting}
          style={{ minWidth: '95px' }}
          type="submit"
        >
          {intl.get('save')}
        </Button>
      </div>
    </div>
  );
}

export const TaxRateFormDialogFormFooter = R.compose(withDialogActions)(
  TaxRateFormDialogFormFooterRoot,
);
