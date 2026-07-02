import { ComponentType, Suspense, lazy } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withDrawers } from '@/containers/Drawer/withDrawers';
import { compose } from '@/utils';

const BillDetailsContentV2 = lazy(() =>
  import('./v2/BillDetailsContentV2').then((module) => ({
    default: module.BillDetailsContentV2,
  })),
);

interface BillDrawerProps {
  name: string;
  // #withDrawers
  isOpen?: boolean;
  payload?: { billId?: number | string };
}

// withDrawerActions — легаси-HOC без типов: описываем инжектируемые
// пропсы локально, не трогая общий модуль.
interface WithDrawerActionsProps {
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Drawer «Детали счёта поставщика» (shadcn Drawer + вкладки на v2-контенте).
 * Механизм открытия прежний: redux openDrawer(DRAWERS.BILL_DETAILS,
 * { billId }).
 */
function BillDrawerRoot({
  name,
  isOpen,
  payload,
  closeDrawer,
}: BillDrawerProps & WithDrawerActionsProps) {
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
          <BillDetailsContentV2 billId={payload?.billId} />
        </Suspense>
      </DrawerContent>
    </Drawer>
  );
}

// withDrawers — легаси-HOC без типов: mapState фактически необязателен,
// кастуем сигнатуру локально.
const withDrawersLoose = withDrawers as unknown as (
  mapState?: unknown,
) => (component: ComponentType<any>) => ComponentType<{ name: string }>;

export default compose(
  withDrawersLoose(),
  withDrawerActions,
)(BillDrawerRoot) as ComponentType<{ name: string }>;
