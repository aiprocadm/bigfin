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

const ItemCategoryFormV2 = lazy(() =>
  import('./v2/ItemCategoryFormV2').then((module) => ({
    default: module.ItemCategoryFormV2,
  })),
);

interface ItemCategoryDialogProps {
  dialogName: string;
  // #withDialogRedux
  isOpen?: boolean;
  payload?: { action?: string; id?: number | null };
}

/**
 * Диалог категории товара (shadcn Dialog + RHF/Zod-форма).
 * Механизм открытия прежний: redux openDialog('item-category-form', ...).
 */
function ItemCategoryDialogRoot({
  dialogName,
  isOpen,
  payload,
  closeDialog,
}: ItemCategoryDialogProps & WithDialogActionsProps) {
  const isEdit = payload?.action === 'edit';

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog(dialogName);
    }
  };

  return (
    <Dialog open={Boolean(isOpen)} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? intl.get('edit_category') : intl.get('new_category')}
          </DialogTitle>
          <DialogDescription />
        </DialogHeader>

        <Suspense
          fallback={
            <div className="flex justify-center py-8 text-text-muted">
              <Spinner size="lg" />
            </div>
          }
        >
          <ItemCategoryFormV2
            itemCategoryId={payload?.id ?? null}
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
)(ItemCategoryDialogRoot) as ComponentType<{ dialogName: string }>;
