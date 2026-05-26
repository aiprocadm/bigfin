import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/cn';

interface SpinnerProps extends React.SVGAttributes<SVGElement> {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export const Spinner = ({ size = 'md', className, ...props }: SpinnerProps) => (
  <Loader2
    className={cn('animate-spin text-current', sizeClasses[size], className)}
    {...props}
  />
);
