import * as React from 'react';
import { Search } from 'lucide-react';
import { Input } from './input';

export interface ListToolbarProps {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  selectedCount?: number;
  bulkActions?: React.ReactNode;
  children?: React.ReactNode;
}

export function ListToolbar({
  search = '',
  onSearchChange,
  searchPlaceholder,
  selectedCount = 0,
  bulkActions,
  children,
}: ListToolbarProps) {
  if (selectedCount > 0 && bulkActions) {
    return (
      <div className="mb-3 flex items-center gap-3 rounded-md border border-border bg-surface-elevated px-3 py-2">
        <span className="text-sm font-medium text-text-secondary tabular-nums">
          {selectedCount}
        </span>
        {bulkActions}
      </div>
    );
  }

  return (
    <div className="mb-3 flex items-center gap-2">
      {onSearchChange && (
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            placeholder={searchPlaceholder}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
      )}
      {children}
    </div>
  );
}
