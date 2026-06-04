import * as React from 'react';

export interface PageHeaderProps {
  title: React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
      {action}
    </div>
  );
}
