import * as React from 'react';
import { Toaster as SonnerToaster } from 'sonner';

export const Toaster = (props: React.ComponentProps<typeof SonnerToaster>) => (
  <SonnerToaster
    position="top-right"
    toastOptions={{
      className: 'rounded-lg border border-border bg-surface text-text-primary shadow-lg',
      style: {
        fontFamily: 'var(--font-sans)',
      },
    }}
    {...props}
  />
);
