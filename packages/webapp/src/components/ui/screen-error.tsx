// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';

import { Button } from './button';

interface ScreenErrorProps {
  /** Что именно не получилось — человеческим языком. */
  message?: React.ReactNode;
  onRetry?: () => void;
}

/**
 * Состояние «ошибка» (этап 5 ТЗ, §5.3).
 *
 * Два требования, и оба про человека, а не про технику: сказать, что
 * случилось, обычными словами — и дать кнопку «Повторить». Экран, который
 * просто пуст после сбоя, читается как «данных нет», и человек идёт искать
 * несуществующую проблему в своих цифрах.
 */
export function ScreenError({ message, onRetry }: ScreenErrorProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-control border border-border p-6">
      <p className="text-sm text-text-primary">
        {message ?? intl.get('screen_state.error')}
      </p>
      {onRetry && (
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
          {intl.get('screen_state.retry')}
        </Button>
      )}
    </div>
  );
}

export default ScreenError;
