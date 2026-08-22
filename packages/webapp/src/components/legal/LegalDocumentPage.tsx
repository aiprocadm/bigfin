import * as React from 'react';

import { Logo } from '@/components/ui/Logo';
import { Link } from '@/components/ui/Link';

interface LegalDocumentPageProps {
  title: string;
  /** «Редакция от 22.08.2026». */
  revision: string;
  children: React.ReactNode;
}

/**
 * Страница юридического документа: шапка с логотипом, колонка текста,
 * футер — тот же каркас, что у LegalPlaceholderPage (С1 карты v18).
 */
export const LegalDocumentPage = ({
  title,
  revision,
  children,
}: LegalDocumentPageProps) => {
  const year = new Date().getFullYear();

  return (
    <div className="bigfin-ui flex min-h-screen flex-col bg-background">
      <header className="border-b border-border px-6 py-4 md:px-12">
        <Logo size="md" />
      </header>
      <main className="flex flex-1 justify-center px-6 py-12 md:px-12">
        <article className="w-full max-w-3xl">
          <h1 className="text-3xl font-semibold text-text-primary">{title}</h1>
          <p className="mt-2 text-sm text-text-muted">{revision}</p>
          <div className="mt-8 flex flex-col gap-6 text-base leading-relaxed text-text-secondary [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-text-primary [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1">
            {children}
          </div>
          <div className="mt-12">
            <Link to="/auth/login" variant="muted">
              ← Вернуться ко входу
            </Link>
          </div>
        </article>
      </main>
      <footer className="px-6 pb-6 text-center text-xs text-text-muted md:px-12 md:pb-8">
        © {year} Bigfin
      </footer>
    </div>
  );
};
