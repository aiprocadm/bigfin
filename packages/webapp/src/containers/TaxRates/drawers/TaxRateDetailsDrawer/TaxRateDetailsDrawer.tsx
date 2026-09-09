import React from 'react';
import { compose } from '@/utils';
import type { DrawerReduxProps } from '@/components/DialogReduxConnect';
import { Drawer, DrawerHeaderContent, DrawerSuspense } from '@/components';
import { withDrawers } from '@/containers/Drawer/withDrawers';
import { DRAWERS } from '@/constants/drawers';

const TaxRateDetailsDrawerContent = React.lazy(
  () => import('./TaxRateDetailsContent'),
);

/**
 * Tax rate details drawer.
 */
function TaxRateDetailsDrawer({
  name,
  // #withDrawer
  isOpen,
  payload: { taxRateId } = { taxRateId: null },
}: DrawerReduxProps<{ taxRateId: number | null }>) {
  return (
    <Drawer
      isOpen={isOpen}
      name={name}
      style={{ minWidth: '650px', maxWidth: '650px' }}
      size={'65%'}
    >
      <DrawerSuspense>
        <TaxRateDetailsDrawerContent name={name} taxRateId={taxRateId ?? undefined} />
      </DrawerSuspense>
    </Drawer>
  );
}

export default compose(withDrawers())(TaxRateDetailsDrawer);
