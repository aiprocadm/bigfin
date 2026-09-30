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
    // Метка для проверки доступности: к логотипу требование контраста не
    // относится (WCAG 1.4.3), и e2e/a11y.spec.ts его пропускает.
    data-brand-logo=""
    {...props}
  >
    {showMark && (
      <span className="inline-block h-[1em] w-[1em] rounded-sm bg-accent" aria-hidden />
    )}
    {/* Название — знак, а не текст: читалка слышит «Bigfin» целиком, а не
        «Big» и «fin» по отдельности. Жёлтое «fin» на белом — фирменный знак;
        требование контраста 4.5:1 к логотипам не относится (WCAG 1.4.3). */}
    <span role="img" aria-label="Bigfin" className="text-text-primary">
      <span aria-hidden>
        Big<span className="text-accent">fin</span>
      </span>
    </span>
  </div>
);
