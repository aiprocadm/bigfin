import React from 'react';
import { DrawerBody } from '@/components';

import EstimateDetail from './EstimateDetail';
import { EstimateDetailDrawerProvider } from './EstimateDetailDrawerProvider';

/**
 * Estimate detail drawer content.
 */
export default function EstimateDetailDrawerContent({
  // #ownProp
  estimateId,
}: any) {
  return (
    <EstimateDetailDrawerProvider estimateId={estimateId}>
      <DrawerBody>
        <EstimateDetail />
      </DrawerBody>
    </EstimateDetailDrawerProvider>
  );
}
