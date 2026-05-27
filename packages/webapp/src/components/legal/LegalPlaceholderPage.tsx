import * as React from 'react';

import { Logo } from '@/components/ui/Logo';
import { Link } from '@/components/ui/Link';

interface LegalPlaceholderPageProps {
  title: string;
  description: string;
}

export const LegalPlaceholderPage = ({
  title,
  description,
}: LegalPlaceholderPageProps) => {
  const year = new Date().getFullYear();

  return (
    <div className="bigfin-ui flex min-h-screen flex-col bg-background">
      <header className="border-b border-border px-6 py-4 md:px-12">
        <Logo size="md" />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 md:px-12">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-3xl font-semibold text-text-primary">{title}</h1>
          <p className="mt-4 text-base text-text-secondary">{description}</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link to="/auth/login" variant="muted">
              ← Вернуться ко входу
            </Link>
          </div>
        </div>
      </main>
      <footer className="px-6 pb-6 text-center text-xs text-text-muted md:px-12 md:pb-8">
        © {year} Bigfin
      </footer>
    </div>
  );
};
