import React from 'react';
import {
  Button,
  PopoverInteractionKind,
  Popover,
  Menu,
  MenuItem,
  MenuDivider,
  Classes,
  Tooltip,
  Position,
} from '@blueprintjs/core';
import clsx from 'classnames';
import { Icon, T } from '@/components';
import type { IconNames } from '@/components/Icon';

import Style from './style.module.scss';

/**
 * Значок кнопки для каждой высоты строки.
 *
 * Раньше имя значка склеивалось строкой — `table-row-${localSize}`. Склейка
 * даёт обычную строку, и опечатка в ней ничем не выдавала бы себя: значка
 * просто не было бы. Явное соответствие проверяется по нашему набору значков
 * (Д1 карты v64).
 */
const ROW_HEIGHT_ICONS: Record<string, IconNames> = {
  small: 'table-row-small',
  medium: 'table-row-medium',
};

/**
 * Dashboard rows height button control.
 */
export function DashboardRowsHeightButton({ initialValue, value, onChange }: any) {
  const [localSize, setLocalSize] = React.useState(initialValue);

  // Handle menu item click.
  const handleItemClick = (size: any) => (event: any) => {
    setLocalSize(size);
    onChange && onChange(size, event);
  };
  // Button icon name.
  const btnIcon = ROW_HEIGHT_ICONS[localSize] ?? ROW_HEIGHT_ICONS.small;

  return (
    <Popover
      minimal={true}
      content={
        <Menu className={Style.menu}>
          <MenuDivider title={<T id={'dashboard.rows_height'} />} />
          <MenuItem
            onClick={handleItemClick('small')}
            text={<T id={'dashboard.row_small'} />}
          />
          <MenuItem
            onClick={handleItemClick('medium')}
            text={<T id={'dashboard.row_medium'} />}
          />
        </Menu>
      }
      placement="bottom-start"
      modifiers={{
        offset: { offset: '0, 4' },
      }}
      interactionKind={PopoverInteractionKind.CLICK}
    >
      <Tooltip
        content={<T id={'dashboard.rows_height'} />}
        minimal={true}
        position={Position.BOTTOM}
      >
        <Button
          className={clsx(Classes.MINIMAL, Style.button)}
          icon={<Icon icon={btnIcon} iconSize={16} />}
        />
      </Tooltip>
    </Popover>
  );
}

DashboardRowsHeightButton.defaultProps = {
  initialValue: 'medium',
};
