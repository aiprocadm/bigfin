import { ComponentType, Suspense, lazy } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withDrawers } from '@/containers/Drawer/withDrawers';
import { compose } from '@/utils';

const CustomerDetailsContentV2 = lazy(() =>
  import('./v2/CustomerDetailsContentV2').then((module) => ({
    default: module.CustomerDetailsContentV2,
  })),
);

interface CustomerDetailsDrawerProps {
  name: string;
  // #withDrawers
  isOpen?: boolean;
  payload?: { customerId?: number | string };
}

// withDrawerActions — легаси-HOC (ts-nocheck (директива легаси)): описываем инжектируемые
// пропсы локально, не трогая общий модуль.
interface WithDrawerActionsProps {
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Drawer «Детали клиента» (shadcn Drawer + карточки на v2-контенте).
 * Механизм открытия прежний: redux openDrawer(DRAWERS.CUSTOMER_DETAILS,
 * { customerId }).
 */
function CustomerDetailsDrawerRoot({
  name,
  isOpen,
  payload,
  closeDrawer,
}: CustomerDetailsDrawerProps & WithDrawerActionsProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDrawer(name);
    }
  };

  return (
    <Drawer open={Boolean(isOpen)} onOpenChange={handleOpenChange}>
      <DrawerContent
        side="right"
        aria-describedby={undefined}
        // bigfin-ui: контент рендерится в портале вне «нового» дерева —
        // подключаем reset/шрифт/tabular-nums вручную. Фон серый
        // (bg-background), карточки внутри — белые.
        className="bigfin-ui w-full max-w-[750px] gap-0 overflow-hidden bg-background p-0"
      >
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center py-16 text-text-muted">
              <Spinner size="lg" />
            </div>
          }
        >
          <CustomerDetailsContentV2 customerId={payload?.customerId} />
        </Suspense>
      </DrawerContent>
    </Drawer>
  );
}

// withDrawers — легаси-HOC (ts-nocheck (директива легаси)): mapState фактически необязателен,
// кастуем сигнатуру локально.
const withDrawersLoose = withDrawers as unknown as (
  mapState?: unknown,
) => (component: ComponentType<any>) => ComponentType<{ name: string }>;

export default compose(
  withDrawersLoose(),
  withDrawerActions,
)(CustomerDetailsDrawerRoot) as ComponentType<{ name: string }>;
