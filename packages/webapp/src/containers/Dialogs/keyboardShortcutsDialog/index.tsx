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
      // Настройка закрытия по Esc стояла внутри заголовка — у перевода, а не у
      // окна. Видимого вреда не было: Blueprint и так закрывает по Esc по
      // умолчанию, поэтому свойство просто ничего не делало (Д4 карты v82).
      canEscapeKeyClose={true}
      title={<T id={'keyboard_shortcuts'} />}
    >
      <DialogSuspense>
        <KeyboardShortcutsContent />
      </DialogSuspense>
    </Dialog>
  );
}

export default compose(withDialogRedux())(KeyboardShortcutsDialog);
