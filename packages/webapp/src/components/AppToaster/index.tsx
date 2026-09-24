import type * as React from 'react';
import { toast } from 'sonner';

/**
 * Общий показчик всплывающих сообщений — на sonner (UI-044-9 ТЗ-4).
 *
 * Был показчик Blueprint, а новые экраны звали sonner: в продукте жили два
 * вида уведомлений, разные на вид и в разных углах экрана. Теперь один.
 * Прежний способ вызова сохранён — `AppToaster.show({ message, intent })` в
 * 437 местах не переписывается: окраску `intent` Blueprint переводим в вид
 * сообщения sonner, «висеть без таймера» (`timeout: 0`), обновление по ключу
 * и `onDismiss` поддержаны.
 *
 * Сам показчик sonner подключён один раз — в корне приложения (`App.tsx`).
 */
export interface AppToastProps {
  message: React.ReactNode;
  /** Окраска Blueprint: 'success' | 'danger' | 'warning' | 'primary' | 'none'. */
  intent?: string;
  /** Сколько показывать, мс; 0 — пока не закроют. По умолчанию 5 с. */
  timeout?: number;
  /** Закрыто: `true` — само по таймеру, `false` — человеком или кодом. */
  onDismiss?: (didTimeoutExpire: boolean) => void;
  /** Кнопка в сообщении. Лишние поля действия Blueprint (ссылка) не переносятся. */
  action?: { text?: React.ReactNode; onClick?: (event?: any) => void };
  /** Значок, класс и крестик Blueprint не переносятся: у sonner свои по виду. */
  icon?: unknown;
  className?: string;
  isCloseButtonShown?: boolean;
}

let counter = 0;

const BY_INTENT: Record<string, typeof toast.success> = {
  success: toast.success,
  danger: toast.error,
  warning: toast.warning,
  primary: toast.info,
};

export const AppToaster = {
  /** Показать; с ключом — обновить уже показанное. Возвращает ключ. */
  show(props: AppToastProps, key?: string): string {
    const id = key ?? `app-toast-${(counter += 1)}`;
    const show = (props.intent && BY_INTENT[props.intent]) || toast;
    show(props.message, {
      id,
      duration: props.timeout === 0 ? Infinity : props.timeout ?? 5000,
      onDismiss: () => props.onDismiss?.(false),
      onAutoClose: () => props.onDismiss?.(true),
      action:
        props.action?.onClick && props.action.text
          ? { label: props.action.text, onClick: () => props.action?.onClick?.() }
          : undefined,
    });
    return id;
  },
  dismiss(key?: string | null): void {
    if (key != null) toast.dismiss(key);
  },
  clear(): void {
    toast.dismiss();
  },
};
