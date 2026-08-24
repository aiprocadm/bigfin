// @ts-nocheck
import React from 'react';
import * as R from 'ramda';
import { Drawer, DrawerSuspense } from '@/components';
import { withDrawers } from '@/containers/Drawer/withDrawers';

const CreditNoteSendMailContent = React.lazy(() =>
  import('./CreditNoteSendMailContent').then((module) => ({
    default: module.CreditNoteSendMailContent,
  })),
);

interface CreditNoteSendMailDrawerProps {
  name: string;
  isOpen?: boolean;
  payload?: any;
}

function CreditNoteSendMailDrawerRoot({
  name,

  // #withDrawer
  isOpen,
  payload,
}: CreditNoteSendMailDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      name={name}
      payload={payload}
      size={'calc(100% - 10px)'}
    >
      <DrawerSuspense>
        <CreditNoteSendMailContent />
      </DrawerSuspense>
    </Drawer>
  );
}

export const CreditNoteSendMailDrawer = R.compose(withDrawers())(
  CreditNoteSendMailDrawerRoot,
);
