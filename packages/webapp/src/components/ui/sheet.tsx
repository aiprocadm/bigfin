import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import intl from 'react-intl-universal';
import { X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { DrawerOverlay } from './drawer';
import { useIsPhone } from './use-media-query';

/**
 * Шторка (UI-044-3 ТЗ-4): на ноутбуке выезжает справа, на телефоне — снизу,
 * с «ручкой», за которую её можно стянуть пальцем (R13).
 *
 * Для фильтров, форм «Приход / Расход», карточек записи. Окно по центру на
 * телефоне неудобно: до его кнопок не дотянуться большим пальцем, а шторка
 * снизу — привычный жест iPhone.
 */
export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Закреплённая полоса действий внизу: главная кнопка + «Отмена». */
  footer?: React.ReactNode;
  /** Сторона на ноутбуке; на телефоне шторка всегда снизу. */
  side?: 'right' | 'bottom';
  size?: 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

/** Насколько стянуть вниз, чтобы шторка закрылась. */
export const SWIPE_CLOSE_DISTANCE = 80;

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  side = 'right',
  size = 'md',
  children,
  className,
}: SheetProps) {
  const isPhone = useIsPhone();
  const bottom = isPhone || side === 'bottom';
  const [drag, setDrag] = React.useState(0);
  const start = React.useRef<number | null>(null);

  const onPointerDown = (event: React.PointerEvent) => {
    start.current = event.clientY;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (start.current === null) return;
    const delta = event.clientY - start.current;
    setDrag(Number.isFinite(delta) ? Math.max(0, delta) : 0);
  };
  const onPointerUp = () => {
    if (start.current === null) return;
    start.current = null;
    if (drag > SWIPE_CLOSE_DISTANCE) onOpenChange(false);
    setDrag(0);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DrawerOverlay />
        <DialogPrimitive.Content
          style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
          className={cn(
            'bigfin-portal box-border font-sans fixed z-50 flex flex-col bg-surface text-text-primary shadow-elev-3',
            'data-[state=open]:animate-in data-[state=closed]:animate-out duration-320 ease-spring',
            bottom
              ? 'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-default pb-[env(safe-area-inset-bottom)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom'
              : cn(
                  'inset-y-0 right-0 h-full w-full border-l border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
                  size === 'lg' ? 'max-w-2xl' : 'max-w-md',
                ),
            className,
          )}
        >
          {bottom && (
            <div
              data-testid="sheet-handle"
              className="flex cursor-grab touch-none justify-center pb-1 pt-2"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <span aria-hidden className="h-1 w-9 rounded-full bg-fill-2" />
            </div>
          )}
          <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-title-3">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-subhead text-text-secondary">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fill-1 text-text-secondary hover:bg-fill-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
              aria-label={intl.get('close')}
            >
              <X className="h-4 w-4" aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-3 sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
