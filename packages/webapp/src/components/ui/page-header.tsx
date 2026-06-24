import * as React from 'react';

export interface PageHeaderProps {
  title: React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <h1 className="text-xl font-medium text-text-primary">{title}</h1>
      {action}
    </div>
  );
}
