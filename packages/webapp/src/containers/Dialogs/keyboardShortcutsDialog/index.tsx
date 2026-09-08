// @ts-nocheck
import React, { lazy } from 'react';
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import { compose } from '@/utils';
const KeyboardShortcutsContent = lazy(
  () => import('./KeyboardShortcutsDialogContent'),
);

/**
 * Keyboard shortcuts dialog.
 */
function KeyboardShortcutsDialog({ dialogName, isOpen }: DialogReduxProps) {
  return (
    <Dialog
      name={dialogName}
      isOpen={isOpen}
      className={'dialog--keyboard-shortcuts'}
      title={<T id={'keyboard_shortcuts'} canEscapeKeyClose={true} />}
    >
      <DialogSuspense>
        <KeyboardShortcutsContent />
      </DialogSuspense>
    </Dialog>
  );
}

export default compose(withDialogRedux())(KeyboardShortcutsDialog);
