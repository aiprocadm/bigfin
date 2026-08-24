import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer relative h-4 w-4 shrink-0 rounded-sm border border-border bg-surface-elevated',
      // На телефоне сам квадратик — цель 16×16, и ячейка списка не шире:
      // пальцем в такое не попасть (рекомендации — от 44 px). Расширяем
      // ТОЛЬКО область нажатия и только на узких экранах: вид чекбокса
      // одинаков во всех списках, менять его нельзя (К4 карты v19).
      "max-md:after:absolute max-md:after:-inset-[14px] max-md:after:content-['']",
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-action data-[state=checked]:text-action-fg data-[state=checked]:border-action',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3 w-3" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
