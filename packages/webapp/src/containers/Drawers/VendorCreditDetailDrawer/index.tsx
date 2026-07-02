import { ComponentType, Suspense, lazy } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withDrawers } from '@/containers/Drawer/withDrawers';
import { compose } from '@/utils';

const VendorCreditDetailContentV2 = lazy(() =>
  import('./v2/VendorCreditDetailContentV2').then((module) => ({
    default: module.VendorCreditDetailContentV2,
  })),
);

interface VendorCreditDetailDrawerProps {
  name: string;
  // #withDrawers
  isOpen?: boolean;
  payload?: { vendorCreditId?: number | string };
}

interface WithDrawerActionsProps {
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Drawer «Детали возврата поставщику» (shadcn Drawer + вкладки на v2-контенте).
 * Механизм открытия прежний: redux openDrawer(DRAWERS.VENDOR_CREDIT_DETAILS,
 * { vendorCreditId }).
 */
function VendorCreditDetailDrawerRoot({
  name,
  isOpen,
  payload,
  closeDrawer,
}: VendorCreditDetailDrawerProps & WithDrawerActionsProps) {
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
        className="bigfin-ui w-full max-w-[820px] gap-0 overflow-hidden bg-background p-0"
      >
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center py-16 text-text-muted">
              <Spinner size="lg" />
            </div>
          }
        >
          <VendorCreditDetailContentV2 vendorCreditId={payload?.vendorCreditId} />
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
)(VendorCreditDetailDrawerRoot) as ComponentType<{ name: string }>;
