import * as React from 'react';

import { cn } from '@/lib/cn';

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('animate-pulse rounded-md bg-surface-elevated', className)} {...props} />
);
