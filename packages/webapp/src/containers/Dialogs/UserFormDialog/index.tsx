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

const UserFormV2 = lazy(() =>
  import('./v2/UserFormV2').then((module) => ({
    default: module.UserFormV2,
  })),
);

interface UserFormDialogProps {
  dialogName: string;
  // #withDialogRedux
  isOpen?: boolean;
  payload?: { action?: string; userId?: number };
}

/**
 * Диалог редактирования пользователя (shadcn Dialog + RHF/Zod-форма).
 * Механизм открытия прежний: redux openDialog('user-form', { userId }).
 */
function UserFormDialogRoot({
  dialogName,
  isOpen,
  payload,
  closeDialog,
}: UserFormDialogProps & WithDialogActionsProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog(dialogName);
    }
  };

  return (
    <Dialog open={Boolean(isOpen)} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{intl.get('edit_user')}</DialogTitle>
          <DialogDescription />
        </DialogHeader>

        <Suspense
          fallback={
            <div className="flex justify-center py-8 text-text-muted">
              <Spinner size="lg" />
            </div>
          }
        >
          {payload?.userId != null && (
            <UserFormV2
              userId={payload.userId}
              onClose={() => closeDialog(dialogName)}
            />
          )}
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
)(UserFormDialogRoot) as ComponentType<{ dialogName: string }>;
