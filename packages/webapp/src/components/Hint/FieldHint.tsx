// @ts-nocheck
import React from 'react';
import { Position, Tooltip } from '@blueprintjs/core';
import { Icon } from '../Icon';

import '@/style/components/Hint.scss';
import { Tooltip2Props } from '@blueprintjs/popover2';

interface HintProps {
  /**
   * Текст подсказки. Необязателен: во всех 30 местах продукта `<FieldHint />`
   * стоит вообще без текста, то есть значок висит, а под ним пусто. Тексты —
   * отдельная работа (задел карты v62); объявление приведено в соответствие
   * с тем, как компонент используют.
   */
  content?: React.ReactNode;
  position?: Position;
  iconSize?: number;
  tooltipProps?: Partial<Tooltip2Props>;
}

/**
 * Field hint.
 */
export function FieldHint({
  content,
  position,
  iconSize = 12,
  tooltipProps,
}: HintProps) {
  return (
    <span className="hint">
      <Tooltip content={content} position={position} {...tooltipProps}>
        <Icon icon="info-circle" iconSize={iconSize} />
      </Tooltip>
    </span>
  );
}

export const Hint = FieldHint;
