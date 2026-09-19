import React from 'react';
import intl from 'react-intl-universal';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface CategorizeExcludeRowActionsProps {
  onCategorize: () => void;
  onExclude: () => void;
}

/**
 * Общее меню действий строки банковских таблиц «без категории» (D-redesign, слайс 4):
 * «Категоризировать» + «Исключить». Появилось на втором экране (Recognized→Uncategorized),
 * поэтому вынесено в общий v2-слой (паритет с легаси ActionsMenu обоих экранов).
 * stopPropagation — чтобы клик по меню не запускал row-click категоризации.
 */
export function CategorizeExcludeRowActions({
  onCategorize,
  onExclude,
}: CategorizeExcludeRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={intl.get('actions')}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-7 w-7 items-center justify-center rounded-control text-text-muted hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={onCategorize}>
          {intl.get('categorize')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onExclude}>
          {intl.get('exclude')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
