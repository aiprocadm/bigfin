import React, { Suspense } from 'react';
import { DrawerLoading } from '@/components';

/**
 * Loading content.
 */
function LoadingContent() {
  return <DrawerLoading loading={true} />;
}

export function DrawerSuspense({ children }: any) {
  return <Suspense fallback={<LoadingContent />}>{children}</Suspense>;
}
