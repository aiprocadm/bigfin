import React, { lazy } from 'react';
import { FormattedMessage as T } from '@/components';
import { Dialog, DialogSuspense } from '@/components';
import withDialogRedux from '@/components/DialogReduxConnect';
import { compose } from '@/utils';

const CurrencyFormDialogContent = lazy(() =>
  import('./v2/CurrencyFormDialogContentV2'),
);

/**
 * Currency form dialog.
 */
function CurrencyFormDialog({
  dialogName,
  payload = { action: '', id: null, currency: '' },
  isOpen,
}: any) {
  return (
    <Dialog
      name={dialogName}
      title={
        payload.action === 'edit' ? (
          <T id={'edit_currency'} />
        ) : (
          <T id={'new_currency'} />
        )
      }
      className={'dialog--currency-form'}
      isOpen={isOpen}
      autoFocus={true}
      canEscapeKeyClose={true}
      // Radix-поповер комбобокса рендерится вне DOM диалога Blueprint —
      // enforceFocus мешал бы вводу в поиске по валютам.
      enforceFocus={false}
      style={{ width: '400px', paddingBottom: 0 }}
    >
      <DialogSuspense>
        <CurrencyFormDialogContent
          dialogName={dialogName}
          currency={payload.currency}
          action={payload.action}
        />
      </DialogSuspense>
    </Dialog>
  );
}

export default compose(withDialogRedux())(CurrencyFormDialog);
