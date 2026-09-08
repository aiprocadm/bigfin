// @ts-nocheck
import React from 'react';
import { Tooltip, Position } from '@blueprintjs/core';

/**
 * Text overview tooltip cell.
 * @returns {JSX.Element}
 */
interface TextOverviewTooltipCellProps {
  /** Ячейка таблицы: нас интересует только её значение. */
  cell: { value?: React.ReactNode };
}

export function TextOverviewTooltipCell({
  cell: { value },
}: TextOverviewTooltipCellProps) {
  // Тип указан явно: без него настройки подложки выводятся как «строки» и
  // «числа», а чужая всплывашка ждёт свои перечисления (Д12 карты v76).
  const SUBMENU_POPOVER_MODIFIERS: any = {
    flip: { boundariesElement: 'viewport', padding: 20 },
    offset: { offset: '0, 10' },
    preventOverflow: { boundariesElement: 'viewport', padding: 40 },
  };

  return (
    <Tooltip
      content={value}
      position={Position.BOTTOM_LEFT}
      boundary={'viewport'}
      minimal={true}
      modifiers={SUBMENU_POPOVER_MODIFIERS}
      targetClassName={'table-tooltip-overview-target'}
    >
      {value}
    </Tooltip>
  );
}
