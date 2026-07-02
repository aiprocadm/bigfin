import { ComponentType, Suspense, lazy } from 'react';
import intl from 'react-intl-universal';

import withDialogRedux from '@/components/DialogReduxConnect';
import { Spinner } from '@/components/ui/Spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';

const ContactDuplicateFormV2 = lazy(() =>
  import('./v2/ContactDuplicateFormV2').then((module) => ({
    default: module.ContactDuplicateFormV2,
  })),
);

interface ContactDuplicateDialogProps {
  dialogName: string;
  // #withDialogRedux
  isOpen?: boolean;
  payload?: { contactId?: number | string };
}

/**
 * Диалог дублирования контакта (shadcn Dialog + RHF/Zod-форма).
 * Механизм открытия прежний: redux openDialog('contact-duplicate', { contactId }).
 */
function ContactDuplicateDialogRoot({
  dialogName,
  isOpen,
  payload,
  closeDialog,
}: ContactDuplicateDialogProps & WithDialogActionsProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog(dialogName);
    }
  };

  return (
    <Dialog open={Boolean(isOpen)} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{intl.get('duplicate_contact')}</DialogTitle>
          <DialogDescription>
            {intl.get('are_you_sure_want_to_duplicate')}
          </DialogDescription>
        </DialogHeader>

        <Suspense
          fallback={
            <div className="flex justify-center py-8 text-text-muted">
              <Spinner size="lg" />
            </div>
          }
        >
          <ContactDuplicateFormV2
            contactId={payload?.contactId}
            onClose={() => closeDialog(dialogName)}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

// DialogReduxConnect — легаси-HOC (ts-nocheck (директива легаси)): параметр mapState фактически
// необязателен, кастуем сигнатуру локально, не трогая общий модуль.
const withDialogReduxLoose = withDialogRedux as unknown as (
  mapState?: unknown,
) => (component: ComponentType<any>) => ComponentType<{ dialogName: string }>;

export default compose(
  withDialogReduxLoose(),
  withDialogActions,
)(ContactDuplicateDialogRoot) as ComponentType<{ dialogName: string }>;
