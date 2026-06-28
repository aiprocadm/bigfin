import React from 'react';
import intl from 'react-intl-universal';

interface DataTableEmptyProps {
  /** i18n-ключ текста «ничего не найдено». */
  messageKey: string;
}

/**
 * Пустое состояние V2-таблиц вкладки «без категории» (D-redesign): единый стиль
 * для всех пяти таблиц (Pending/Excluded/Recognized/Uncategorized/Все).
 * Раньше один и тот же `<div>` со стилями дублировался в каждой таблице —
 * различался только i18n-ключ.
 */
export function DataTableEmpty({ messageKey }: DataTableEmptyProps) {
  return (
    <div className="px-3 py-8 text-center text-sm text-text-muted">
      {intl.get(messageKey)}
    </div>
  );
}
