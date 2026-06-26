import React from 'react';
import intl from 'react-intl-universal';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface TransactionRowActionsProps {
  status: string;
  onUncategorize: () => void;
  onUnmatch: () => void;
}

export function TransactionRowActions({
  status,
  onUncategorize,
  onUnmatch,
}: TransactionRowActionsProps) {
  // Действия зависят от статуса (паритет с легаси ActionsMenu).
  const hasUncategorize = status === 'categorized';
  const hasUnmatch = status === 'matched';
  if (!hasUncategorize && !hasUnmatch) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={intl.get('actions')}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {hasUncategorize && (
          <DropdownMenuItem onSelect={onUncategorize}>
            {intl.get('uncategorize')}
          </DropdownMenuItem>
        )}
        {hasUnmatch && (
          <DropdownMenuItem onSelect={onUnmatch}>
            {intl.get('unmatch')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
