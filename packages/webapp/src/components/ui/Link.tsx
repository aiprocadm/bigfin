import * as React from 'react';
import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router-dom';

import { cn } from '@/lib/cn';

type LinkProps = RouterLinkProps & {
  variant?: 'default' | 'muted';
};

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <RouterLink
      ref={ref}
      className={cn(
        'underline-offset-4 transition-colors focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        variant === 'default' && 'text-accent hover:underline',
        variant === 'muted' && 'text-text-secondary hover:text-text-primary',
        className,
      )}
      {...props}
    />
  ),
);
Link.displayName = 'Link';
