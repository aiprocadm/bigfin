import React, { lazy } from 'react';
import classNames from 'classnames';

import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { CLASSES } from '@/constants/classes';
import { compose } from '@/utils';

// Lazy loading the content.
const ARAgingSummaryPdfDialogContent = lazy(
  () => import('./ARAgingSummaryPdfDialogContent'),
);

/**
 * Balance sheet pdf preview dialog.
 * @returns {React.ReactNode}
 */
function ARAgingSummaryPdfDialogRoot({ dialogName, payload, isOpen }: DialogReduxProps) {
  return (
    <Dialog
      name={dialogName}
      title={<T id={'ar_aging_summary_preview.dialog.title'} />}
      className={classNames(CLASSES.DIALOG_PDF_PREVIEW)}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
      style={{ width: '1000px' }}
    >
      <DialogSuspense>
        {/* Содержимое окна не принимает свойств вовсе: `dialogName` сюда
            передавали, но никто его не читал (Д2 карты v83). */}
        <ARAgingSummaryPdfDialogContent />
      </DialogSuspense>
    </Dialog>
  );
}

export const ARAgingSummaryPdfDialog = compose(withDialogRedux())(
  ARAgingSummaryPdfDialogRoot,
);
