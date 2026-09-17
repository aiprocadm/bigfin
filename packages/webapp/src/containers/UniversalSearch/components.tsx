import React from 'react';
import { MenuItem } from '@blueprintjs/core';

import { highlightText } from '@/utils';
import { getUniversalSearchBind } from './utils';

/**
 * Default univesal search item component.
 */
function UniversalSearchItemDetail(
  item: any,
  { handleClick, modifiers, query }: any,
) {
  return (
    <MenuItem
      active={modifiers.active}
      disabled={modifiers.disabled}
      text={
        <div>
          <div>{highlightText(item.text, query)}</div>

          {item.subText && (
            <span className="bp4-text-muted">
              {highlightText(item.subText, query)}
            </span>
          )}
        </div>
      }
      // Подсветка совпадения — это разметка, а не строка. У `label` строка,
      // для разметки в библиотеке есть `labelElement` (Д12 карты v88).
      labelElement={item.label ? highlightText(item.label, query) : ''}
      onClick={handleClick}
    />
  );
}

/**
 *
 * @param {*} props
 * @param {*} actions
 * @returns
 */
export const DashboardUniversalSearchItem = (props: any, actions: any) => {
    const itemRenderer = getUniversalSearchBind(props._type, 'itemRenderer');

    return typeof itemRenderer !== 'undefined'
      ? itemRenderer(props, actions)
      : UniversalSearchItemDetail(props, actions);
  };
