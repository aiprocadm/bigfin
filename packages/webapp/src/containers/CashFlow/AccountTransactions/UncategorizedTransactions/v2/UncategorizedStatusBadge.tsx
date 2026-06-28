import React from 'react';
import intl from 'react-intl-universal';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface UncategorizedStatusBadgeProps {
  transaction: any;
}

/**
 * Колонка «Статус» таблицы «без категории» (D-redesign, слайс 4d).
 * Для распознанных строк — бейдж «Распознано» с подсказкой «категория → счёт»
 * (паритет с легаси statusAccessor: Tag + Tooltip). Для остальных — пусто.
 */
export function UncategorizedStatusBadge({
  transaction,
}: UncategorizedStatusBadgeProps) {
  if (!transaction.is_recognized) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Badge variant="success">{intl.get('recognized')}</Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <span className="inline-flex items-center gap-2">
            <span>{transaction.assigned_category_formatted}</span>
            <ArrowRight className="h-3 w-3 text-text-muted" />
            <span>{transaction.assigned_account_name}</span>
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
