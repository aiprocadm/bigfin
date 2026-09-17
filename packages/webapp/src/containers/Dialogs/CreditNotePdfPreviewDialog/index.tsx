import React from 'react';
import classNames from 'classnames';

import { T, Dialog, DialogSuspense } from '@/components';

import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';

import { CLASSES } from '@/constants/classes';
import { compose } from '@/utils';

const PdfPreviewDialogContent = React.lazy(() =>
  import('./CreditNotePdfPreviewDialogContent'),
);

/**
 * Credit note PDF previwe dialog.
 */
function CreditNotePdfPreviewDialog({
  dialogName,
  payload = { creditNoteId: null },
  isOpen,
}: DialogReduxProps<{ creditNoteId: number | null }>) {
  return (
    <Dialog
      name={dialogName}
      title={<T id={'credit_note_preview.dialog.title'} />}
      className={classNames(CLASSES.DIALOG_PDF_PREVIEW)}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
      style={{ width: '1000px' }}
    >
      <DialogSuspense>
        <PdfPreviewDialogContent creditNoteId={payload.creditNoteId} />
      </DialogSuspense>
    </Dialog>
  );
}
export default compose(withDialogRedux())(CreditNotePdfPreviewDialog);
