import * as React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /**
   * Уровень заголовка. По умолчанию h3 — пустое состояние внутри экрана.
   * h1 — когда пустое состояние и есть весь экран (заглушка режима
   * «Бухгалтер»): у экрана должен быть ровно один главный заголовок.
   */
  headingAs?: 'h1' | 'h2' | 'h3';
}

export function EmptyState({ icon, title, description, action, headingAs: Heading = 'h3' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-default border border-dashed border-border bg-surface px-6 py-16 text-center">
      {icon && <div className="text-text-muted">{icon}</div>}
      <Heading className="text-base font-medium text-text-primary">{title}</Heading>
      {description && (
        <p className="max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {action}
    </div>
  );
}
