import * as React from 'react';
import intl from 'react-intl-universal';
import { TrendingUp, BarChart3, Wallet } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Logo } from './Logo';
import { Link } from './Link';

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Три обещания продукта на левой половине экрана входа.
 *
 * Собирается ФУНКЦИЕЙ, а не значением модуля: значение вычисляется при
 * загрузке файла — раньше, чем загрузится словарь, — и подписи оказались бы
 * пустыми.
 */
const heroFeatures = () =>
  [
    { icon: TrendingUp, label: intl.get('auth.hero.feature_income_expenses') },
    { icon: BarChart3, label: intl.get('auth.hero.feature_profit_loss') },
    { icon: Wallet, label: intl.get('auth.hero.feature_cashflow') },
  ] as const;

export const AuthLayout = ({ children, className }: AuthLayoutProps) => {
  const year = new Date().getFullYear();
  const features = heroFeatures();

  return (
    <div
      className={cn(
        'bigfin-ui flex min-h-screen flex-col md:flex-row',
        className,
      )}
    >
      <aside
        className="relative hidden flex-col items-center justify-center overflow-hidden bg-background p-12 md:flex md:w-1/2"
        aria-hidden
      >
        <div className="relative z-10 flex flex-col items-center gap-8 text-center">
          <Logo size="xl" showMark />
          <p className="max-w-sm text-2xl font-semibold text-text-primary">
            {intl.get('auth.hero.tagline')}
          </p>
          <ul className="flex flex-col gap-3">
            {features.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 text-text-secondary"
              >
                <Icon className="h-5 w-5 text-accent" strokeWidth={2} />
                <span className="text-base">{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(circle at 30% 50%, rgba(255,211,0,0.15) 0%, transparent 50%)',
          }}
        />
      </aside>

      <main className="relative flex flex-1 flex-col bg-surface">
        <div className="absolute left-6 top-6 md:hidden">
          <Logo size="md" />
        </div>
        <div className="flex flex-1 items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <footer className="px-6 pb-6 text-center text-xs text-text-muted md:px-12 md:pb-8">
          <span>© {year} Bigfin</span>
          <span aria-hidden className="mx-2">
            ·
          </span>
          <Link to="/privacy" variant="muted" className="text-xs">
            {intl.get('auth.footer.privacy')}
          </Link>
          <span aria-hidden className="mx-2">
            ·
          </span>
          <Link to="/terms" variant="muted" className="text-xs">
            {intl.get('auth.footer.terms')}
          </Link>
        </footer>
      </main>
    </div>
  );
};
