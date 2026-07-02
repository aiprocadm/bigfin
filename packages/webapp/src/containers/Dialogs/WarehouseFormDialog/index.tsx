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

const WarehouseFormV2 = lazy(() =>
  import('./v2/WarehouseFormV2').then((module) => ({
    default: module.WarehouseFormV2,
  })),
);

interface WarehouseFormDialogProps {
  dialogName: string;
  // #withDialogRedux
  isOpen?: boolean;
  payload?: { warehouseId?: number | null; action?: string };
}

/**
 * Диалог формы склада (shadcn Dialog + RHF/Zod-форма).
 * Механизм открытия прежний: redux openDialog('warehouse-form', { warehouseId, action }).
 */
function WarehouseFormDialogRoot({
  dialogName,
  isOpen,
  payload,
  closeDialog,
}: WarehouseFormDialogProps & WithDialogActionsProps) {
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
              ? intl.get('warehouse.dialog.label.edit_warehouse')
              : intl.get('warehouse.dialog.label.new_warehouse')}
          </DialogTitle>
        </DialogHeader>

        <Suspense
          fallback={
            <div className="flex justify-center py-8 text-text-muted">
              <Spinner size="lg" />
            </div>
          }
        >
          <WarehouseFormV2
            warehouseId={payload?.warehouseId}
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
)(WarehouseFormDialogRoot) as ComponentType<{ dialogName: string }>;
