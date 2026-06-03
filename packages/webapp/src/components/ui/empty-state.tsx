import * as React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
      {icon && <div className="text-text-muted">{icon}</div>}
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {action}
    </div>
  );
}
