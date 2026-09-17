import React from 'react';
import {
  DrawerHeaderContent,
  DrawerBody,
  FormattedMessage as T,
} from '@/components';

import QuickVendorFormDrawer from './QuickVendorFormDrawer';
import { DRAWERS } from '@/constants/drawers';

/**
 * Quick create/edit vendor drawer.
 */
export default function QuickWriteVendorDrawerContent({
  displayName,
  autofillRef,
}: {
  displayName?: string;
  autofillRef?: any;
}) {
  return (
    <React.Fragment>
      <DrawerHeaderContent
        title={<T id={'create_a_new_vendor'} />}
      />
      <DrawerBody>
        <QuickVendorFormDrawer displayName={displayName} autofillRef={autofillRef} />
      </DrawerBody>
    </React.Fragment>
  );
}
