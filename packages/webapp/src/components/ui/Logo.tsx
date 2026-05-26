import * as React from 'react';

import { cn } from '@/lib/cn';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showMark?: boolean;
}

const sizeClasses: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-5xl',
};

export const Logo = ({ size = 'md', showMark = false, className, ...props }: LogoProps) => (
  <div
    className={cn(
      'inline-flex items-center gap-2 font-bold tracking-tight',
      sizeClasses[size],
      className,
    )}
    {...props}
  >
    {showMark && (
      <span className="inline-block h-[1em] w-[1em] rounded-sm bg-accent" aria-hidden />
    )}
    <span className="text-text-primary">
      Big<span className="text-accent">fin</span>
    </span>
  </div>
);
