import React from 'react';
import classnames from 'classnames';
import { LoadingIndicator } from '../Indicator';
import { ScreenError } from '@/components/ui/screen-error';

/**
 * Общая обёртка содержимого экрана.
 *
 * СОСТОЯНИЕ «ОШИБКА» (§5.3 ТЗ, остаток Д4). Раньше обёртка знала только про
 * загрузку. Если запрос списка падал, страница показывала ПУСТОЙ СПИСОК —
 * тот же самый экран, что и при честном «записей пока нет». Человек видел
 * «данных нет» и шёл искать несуществующую проблему в своих цифрах, вместо
 * того чтобы нажать «Повторить».
 *
 * Обёртка выбрана нарочно: она одна на все экраны-списки, и правило «сбой
 * виден» живёт в одном месте, а не в четырнадцати.
 */
export function DashboardInsider({
  loading,
  /** Запрос упал: показываем сбой вместо пустого экрана. */
  error,
  /** Что делать по кнопке «Повторить». */
  onRetry,
  children,
  name,
  mount = false,
  className,
  style,
}: any) {
  return (
    <div
      className={classnames(
        {
          dashboard__insider: true,
          'dashboard__insider--loading': loading,
          'dashboard__insider--error': !!error,
          [`dashboard__insider--${name}`]: !!name,
        },
        className,
      )}
      style={style}
    >
      {error ? (
        // Сбой ВАЖНЕЕ загрузки: пока показывается «грузим», человек ждёт.
        <ScreenError onRetry={onRetry} />
      ) : (
        <LoadingIndicator loading={loading} mount={mount}>
          {children}
        </LoadingIndicator>
      )}
    </div>
  );
}
