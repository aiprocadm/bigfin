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

const MoneyInFormV2 = lazy(() =>
  import('./v2/MoneyInFormV2').then((module) => ({
    default: module.MoneyInFormV2,
  })),
);

interface MoneyInDialogProps {
  dialogName: string;
  // #withDialogRedux
  isOpen?: boolean;
  payload?: {
    account_id?: number | null;
    account_type?: string | null;
    account_name?: string;
    /** Поля копируемой операции (FT-022 ТЗ-3). */
    prefill?: Record<string, unknown> | null;
  };
}

/**
 * Диалог «Деньги пришли» (shadcn Dialog + RHF/Zod-форма).
 * Механизм открытия прежний: redux openDialog('money-in', { account_id,
 * account_type, account_name }).
 */
function MoneyInDialogRoot({
  dialogName,
  isOpen,
  payload,
  closeDialog,
}: MoneyInDialogProps & WithDialogActionsProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog(dialogName);
    }
  };

  return (
    <Dialog open={Boolean(isOpen)} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[calc(100vh-3rem)] overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>
            {intl
              .get('cash_flow_transaction.money_in', {
                value: payload?.account_name ?? '',
              })
              .trim()}
          </DialogTitle>
        </DialogHeader>

        <Suspense
          fallback={
            <div className="flex justify-center py-8 text-text-muted">
              <Spinner size="lg" />
            </div>
          }
        >
          <MoneyInFormV2
            accountId={payload?.account_id ?? null}
            accountType={payload?.account_type ?? null}
            prefill={payload?.prefill ?? null}
            onClose={() => closeDialog(dialogName)}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

// DialogReduxConnect — легаси-HOC: параметр mapState фактически
// необязателен, кастуем сигнатуру локально, не трогая общий модуль.
const withDialogReduxLoose = withDialogRedux as unknown as (
  mapState?: unknown,
) => (component: ComponentType<any>) => ComponentType<{ dialogName: string }>;

export default compose(
  withDialogReduxLoose(),
  withDialogActions,
)(MoneyInDialogRoot) as ComponentType<{ dialogName: string }>;
