import { ComponentType, Suspense, lazy } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withDrawers } from '@/containers/Drawer/withDrawers';
import { compose } from '@/utils';

const ExpenseDrawerContentV2 = lazy(() =>
  import('./v2/ExpenseDrawerContentV2').then((module) => ({
    default: module.ExpenseDrawerContentV2,
  })),
);

interface ExpenseDrawerProps {
  name: string;
  // #withDrawers
  isOpen?: boolean;
  payload?: { expenseId?: number | string };
}

// withDrawerActions — легаси-HOC (ts-nocheck (директива легаси)): инжектируемые пропсы локально.
interface WithDrawerActionsProps {
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Drawer «Детали расхода» (shadcn Drawer + карточки на v2-контенте).
 * Механизм открытия прежний: redux openDrawer(DRAWERS.EXPENSE_DETAILS,
 * { expenseId }).
 */
function ExpenseDrawerRoot({
  name,
  isOpen,
  payload,
  closeDrawer,
}: ExpenseDrawerProps & WithDrawerActionsProps) {
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
        className="bigfin-ui w-full max-w-[750px] gap-0 overflow-hidden bg-background p-0"
      >
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center py-16 text-text-muted">
              <Spinner size="lg" />
            </div>
          }
        >
          <ExpenseDrawerContentV2 expenseId={payload?.expenseId} />
        </Suspense>
      </DrawerContent>
    </Drawer>
  );
}

const withDrawersLoose = withDrawers as unknown as (
  mapState?: unknown,
) => (component: ComponentType<any>) => ComponentType<{ name: string }>;

export default compose(
  withDrawersLoose(),
  withDrawerActions,
)(ExpenseDrawerRoot) as ComponentType<{ name: string }>;
