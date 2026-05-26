import * as React from 'react';

import { cn } from '@/lib/cn';
import { Logo } from './Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const AuthLayout = ({ children, className }: AuthLayoutProps) => (
  <div className={cn('bigfin-ui flex min-h-screen flex-col md:flex-row', className)}>
    <aside
      className="relative hidden items-center justify-center overflow-hidden bg-background p-12 md:flex md:w-1/2"
      aria-hidden
    >
      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <Logo size="xl" showMark />
        <p className="max-w-xs text-base text-text-secondary">Управляй деньгами как профи.</p>
      </div>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(circle at 30% 50%, rgba(255,211,0,0.15) 0%, transparent 50%)',
        }}
      />
    </aside>

    <main className="relative flex flex-1 items-center justify-center bg-surface p-6 md:p-12">
      <div className="absolute left-6 top-6 md:hidden">
        <Logo size="md" />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </main>
  </div>
);
