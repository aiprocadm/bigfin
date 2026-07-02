import { ComponentType, Suspense, lazy } from 'react';
import intl from 'react-intl-universal';

import withDialogRedux from '@/components/DialogReduxConnect';
import { Spinner } from '@/components/ui/Spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';

const BranchFormV2 = lazy(() =>
  import('./v2/BranchFormV2').then((module) => ({
    default: module.BranchFormV2,
  })),
);

interface BranchFormDialogProps {
  dialogName: string;
  // #withDialogRedux
  isOpen?: boolean;
  payload?: { branchId?: number | null; action?: string };
}

/**
 * Диалог формы филиала (shadcn Dialog + RHF/Zod-форма).
 * Механизм открытия прежний: redux openDialog('branch-form', { branchId, action }).
 */
function BranchFormDialogRoot({
  dialogName,
  isOpen,
  payload,
  closeDialog,
}: BranchFormDialogProps & WithDialogActionsProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog(dialogName);
    }
  };

  return (
    <Dialog open={Boolean(isOpen)} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {payload?.action === 'edit'
              ? intl.get('branch.dialog.label_edit_branch')
              : intl.get('branch.dialog.label_new_branch')}
          </DialogTitle>
        </DialogHeader>

        <Suspense
          fallback={
            <div className="flex justify-center py-8 text-text-muted">
              <Spinner size="lg" />
            </div>
          }
        >
          <BranchFormV2
            branchId={payload?.branchId}
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
)(BranchFormDialogRoot) as ComponentType<{ dialogName: string }>;
