import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';

/**
 * Сворачиваемые разделы (UI-044-8 ТЗ-4): детали — за шевроном, как в
 * настройках iOS. Заголовок — кнопка с `aria-expanded`, содержимое — область,
 * связанная с ним: экранный диктор говорит «развёрнуто / свёрнуто».
 */
export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** 'single' — открыт один раздел, 'multiple' — сколько угодно. */
  type?: 'single' | 'multiple';
  defaultOpen?: string[];
  className?: string;
}

export function Accordion({ items, type = 'single', defaultOpen = [], className }: AccordionProps) {
  const [open, setOpen] = React.useState<string[]>(defaultOpen);
  const baseId = React.useId();

  const toggle = (id: string) =>
    setOpen((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : type === 'single'
          ? [id]
          : [...current, id],
    );

  return (
    <div className={cn('divide-y divide-border rounded-default border border-border bg-surface', className)}>
      {items.map((item) => {
        const expanded = open.includes(item.id);
        const headerId = `${baseId}-${item.id}-header`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <div key={item.id}>
            <button
              id={headerId}
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-headline hover:bg-fill-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-action"
            >
              {item.title}
              <ChevronDown
                aria-hidden
                className={cn(
                  'h-4 w-4 shrink-0 text-text-secondary transition-transform duration-220 ease-standard',
                  expanded && 'rotate-180',
                )}
              />
            </button>
            <div id={panelId} role="region" aria-labelledby={headerId} hidden={!expanded} className="px-4 pb-4">
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
