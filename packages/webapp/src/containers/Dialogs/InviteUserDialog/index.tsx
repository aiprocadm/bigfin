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

const InviteUserFormV2 = lazy(() =>
  import('./v2/InviteUserFormV2').then((module) => ({
    default: module.InviteUserFormV2,
  })),
);

interface InviteUserDialogProps {
  dialogName: string;
  // #withDialogRedux
  isOpen?: boolean;
  payload?: { action?: string; id?: number | null };
}

/**
 * Диалог приглашения пользователя (shadcn Dialog + RHF/Zod-форма).
 * Механизм открытия прежний: redux openDialog('invite-user').
 */
function InviteUserDialogRoot({
  dialogName,
  isOpen,
  closeDialog,
}: InviteUserDialogProps & WithDialogActionsProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog(dialogName);
    }
  };

  return (
    <Dialog open={Boolean(isOpen)} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{intl.get('invite_user')}</DialogTitle>
          <DialogDescription />
        </DialogHeader>

        <Suspense
          fallback={
            <div className="flex justify-center py-8 text-text-muted">
              <Spinner size="lg" />
            </div>
          }
        >
          <InviteUserFormV2 onClose={() => closeDialog(dialogName)} />
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
)(InviteUserDialogRoot) as ComponentType<{ dialogName: string }>;
