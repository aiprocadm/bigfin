import * as React from 'react';
import intl from 'react-intl-universal';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';

export interface ConfirmDialogProps {
  /** Управляемое состояние: открыт ли диалог. */
  open: boolean;
  /** Заголовок — что именно подтверждаем («Удалить клиента»). */
  title: React.ReactNode;
  /** Пояснение под заголовком (подойдёт и intl.getHTML для ключей с разметкой). */
  description?: React.ReactNode;
  /** Подпись кнопки подтверждения («Удалить», «Отключить»…). */
  confirmLabel: React.ReactNode;
  /** Подпись кнопки отмены; по умолчанию intl.get('cancel'). */
  cancelLabel?: React.ReactNode;
  /** danger — красная кнопка подтверждения (необратимые действия). */
  intent?: 'danger' | 'default';
  /** Мутация в полёте: спиннер на кнопке, закрытие заблокировано. */
  loading?: boolean;
  /** Подтверждение действия (закрытие диалога — на вызывающей стороне). */
  onConfirm: () => void;
  /** Отмена: кнопка «Отмена», крестик, Esc и клик по подложке. */
  onCancel: () => void;
  /** Дополнительные классы контента (например, другая ширина). */
  className?: string;
}

/**
 * Диалог подтверждения действия — shadcn-замена легаси Blueprint `<Alert>`.
 *
 * Управляемый снаружи (open + onConfirm/onCancel), поэтому напрямую ложится
 * на механизм redux-алертов: openAlert(name, payload) → open, closeAlert(name)
 * → onCancel. Контент рендерится в портале вне «нового» дерева, поэтому несёт
 * класс `bigfin-ui` (шрифт, reset, tabular-nums).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  intent = 'default',
  loading = false,
  onConfirm,
  onCancel,
  className,
}: ConfirmDialogProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    // Пока мутация в полёте — не даём закрыть диалог (Esc/подложка/крестик).
    if (!nextOpen && !loading) {
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn('bigfin-ui sm:max-w-md', className)}
        // Без описания Radix ждёт явного aria-describedby={undefined}.
        {...(description == null ? { 'aria-describedby': undefined } : {})}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description != null && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel ?? intl.get('cancel')}
          </Button>
          <Button
            type="button"
            variant={intent === 'danger' ? 'destructive' : 'primary'}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading && <Spinner size="sm" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
