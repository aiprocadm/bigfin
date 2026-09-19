import intl from 'react-intl-universal';
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux from '@/components/DialogReduxConnect';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';
import { Button, Classes, Intent } from '@blueprintjs/core';

/**
 * Invoice number dialog.
 */
function InvoiceExchangeRateChangeDialog({
  dialogName,
  isOpen,
  // #withDialogActions
  closeDialog,
}: any) {
  const handleConfirm = () => {
    closeDialog(dialogName);
  };

  return (
    <Dialog
      name={dialogName}
      title={intl.get('invoice_form.exchange_rate_change.dialog_title')}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
      onClose={() => {}}
    >
      <DialogSuspense>
        <div className={Classes.DIALOG_BODY}>
          <p>
            {intl.get('invoice.exchange_rate_change.rates_adjusted')}
          </p>

          <p style={{ marginBottom: '30px' }}>
            {intl.get('invoice.exchange_rate_change.check_rates')}
          </p>
        </div>

        <div className={Classes.DIALOG_FOOTER}>
          <Button onClick={handleConfirm} intent={Intent.PRIMARY} fill>
            Ok
          </Button>
        </div>
      </DialogSuspense>
    </Dialog>
  );
}

export default compose(
  withDialogRedux(),
  withDialogActions,
)(InvoiceExchangeRateChangeDialog);
