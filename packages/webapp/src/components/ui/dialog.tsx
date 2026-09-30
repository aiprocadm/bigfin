import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/cn';
import intl from 'react-intl-universal';
import { useIsPhone } from './use-media-query';
import { SWIPE_CLOSE_DISTANCE } from './sheet';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-scrim',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Окно. На ноутбуке — по центру; на телефоне (< 768) — ШТОРКОЙ СНИЗУ с
 * «ручкой» и закрытием смахиванием (R13, этап 53 ТЗ-4). До кнопок окна по
 * центру большим пальцем не дотянуться, а шторка снизу — привычный жест
 * iPhone. Переключение — здесь, в ките: все окна на `DialogContent`
 * получают его разом, без правки каждого.
 */
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, style, ...props }, ref) => {
  const isPhone = useIsPhone();
  const closeRef = React.useRef<HTMLButtonElement>(null);
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
    if (drag > SWIPE_CLOSE_DISTANCE) closeRef.current?.click();
    setDrag(0);
  };

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        style={drag ? { ...style, transform: `translateY(${drag}px)`, transition: 'none' } : style}
        // font-sans + box-border: содержимое в портале вне .bigfin-ui, поэтому
        // подключаем шрифт и border-box-модель отступов вручную.
        className={cn(
          'bigfin-portal box-border font-sans',
          'fixed z-50 grid gap-4 border border-border bg-surface p-6 text-text-primary shadow-elev-3',
          isPhone
            ? cn(
                'inset-x-0 bottom-0 max-h-[92dvh] w-full overflow-y-auto rounded-t-default border-b-0 pt-8',
                'pb-[calc(1.5rem+env(safe-area-inset-bottom))]',
                'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
                'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom duration-320 ease-spring',
              )
            : cn(
                'left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-default',
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              ),
          className,
        )}
        {...props}
      >
        {isPhone && (
          // «Ручка» шторки: за неё тянут вниз, чтобы закрыть.
          <div
            aria-hidden
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            data-dialog-handle
            className="absolute inset-x-0 top-0 flex h-7 cursor-grab touch-none items-center justify-center"
          >
            <span className="h-1 w-10 rounded-full bg-fill-2" />
          </div>
        )}
        {children}
        <DialogPrimitive.Close
          ref={closeRef}
          className={cn(
            'absolute right-4 top-4 rounded-sm text-text-muted opacity-70 transition-opacity hover:opacity-100',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:pointer-events-none',
          )}
        >
          <X className="h-4 w-4" aria-hidden />
          <span className="sr-only">{intl.get('close')}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

export const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    // На мобильном кнопки в столбик (главная сверху), на десктопе — в ряд справа.
    className={cn(
      'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-medium text-text-primary', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-text-secondary', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
