import React from 'react';
import { Position, Tooltip, TooltipProps } from '@blueprintjs/core';
import { Icon } from '../Icon';

import '@/style/components/Hint.scss';

interface HintProps {
  /**
   * Текст подсказки. Необязателен: во всех 30 местах продукта `<FieldHint />`
   * стоит вообще без текста, то есть значок висит, а под ним пусто. Тексты —
   * отдельная работа (задел карты v62); объявление приведено в соответствие
   * с тем, как компонент используют.
   *
   * Принимает строку или элемент, но не любой узел: так объявлено у самой
   * всплывашки (Д44 карты v75).
   */
  content?: string | JSX.Element;
  position?: Position;
  iconSize?: number;
  /**
   * Свойства всплывашки берутся из ТОГО ЖЕ набора, откуда сама всплывашка.
   * Раньше здесь стоял тип из `@blueprintjs/popover2` — он держится на второй
   * версии движка подложек, а всплывашка из `@blueprintjs/core` — на первой.
   * Два разных `Boundary` сталкивались лбами (Д44 карты v75).
   */
  tooltipProps?: Partial<TooltipProps>;
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
