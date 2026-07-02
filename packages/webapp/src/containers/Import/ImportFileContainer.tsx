import type { ReactNode } from 'react';

interface ImportFileContainerProps {
  children: ReactNode;
}

/** Центрированный контейнер контента шага мастера импорта. */
export function ImportFileContainer({ children }: ImportFileContainerProps) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      {children}
    </div>
  );
}
