import React, { lazy } from 'react';
import intl from 'react-intl-universal';
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { compose } from '@/utils';

const ExportDialogContent = lazy(() => import('./ExportDialogContent'));

// User form dialog.
function ExportDialogRoot({ dialogName, payload, isOpen }: DialogReduxProps) {
  const { resource = null, format = null } = payload;

  return (
    <Dialog
      name={dialogName}
      title={intl.get('export.dialog.title')}
      autoFocus={true}
      canEscapeKeyClose={true}
      isOpen={isOpen}
    >
      <DialogSuspense>
        {/* Имя окна содержимое не читает — свойство убрано (Д14 карты v84). */}
        <ExportDialogContent initialValues={{ resource, format }} />
      </DialogSuspense>
    </Dialog>
  );
}

export const ExportDialog = compose(withDialogRedux())(ExportDialogRoot);
