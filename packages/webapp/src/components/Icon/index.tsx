/*
 * Copyright 2017 Palantir Technologies, Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import classNames from 'classnames';
import * as React from 'react';
import { Classes, Intent, MaybeElement, Props } from '@blueprintjs/core';
import IconSvgPaths from '@/static/json/icons';
/** Имена значков, какие есть в нашем наборе. */
export type IconNames = keyof typeof IconSvgPaths;

export interface IconProps extends Props {
  color?: string;
  htmlTitle?: string;
  /**
   * Имя значка из НАШЕГО набора (`static/json/icons`), а не из набора
   * Blueprint: у них имена через дефис (`small-cross`), у нас слитно
   * (`smallCross`). Раньше здесь стояло `IconName` — имя, которое в файле
   * даже не было ввезено (Д1 карты v64).
   */
  icon: IconNames | MaybeElement;
  iconSize?: number;
  /**
   * Высота и ширина значка в пикселях. Если не заданы, берётся `iconSize`.
   * Компонент их читает (`height || iconSize`), но в объявлении их не было —
   * и каждый `<Icon height={…} width={…} />` считался ошибкой (Д1 карты v64).
   */
  height?: number | string;
  width?: number | string;
  intent?: Intent;
  style?: object;
  tagName?: keyof JSX.IntrinsicElements;
  title?: string;
}

export class Icon extends React.Component<IconProps> {
  static displayName = `af.Icon`;

  static SIZE_STANDARD = 16;
  static SIZE_LARGE = 20;

  render() {
    const { icon } = this.props;
    if (icon == null || typeof icon === 'boolean') {
      return null;
    } else if (typeof icon !== 'string') {
      return icon;
    }

    const {
      className,
      color,
      htmlTitle,
      iconSize = Icon.SIZE_STANDARD,
      height,
      width,
      intent,
      title = icon,
      tagName = 'span',
      ...htmlprops
    } = this.props;

    // choose which pixel grid is most appropriate for given icon size
    const pixelGridSize =
      iconSize >= Icon.SIZE_LARGE ? Icon.SIZE_LARGE : Icon.SIZE_STANDARD;
    const iconPath = this.getSvgPath(icon);

    if (!iconPath) {
      return null;
    }

    // render path elements, or nothing if icon name is unknown.
    const paths = this.renderSvgPaths(iconPath.path);

    const classes = classNames(
      Classes.ICON,
      Classes.iconClass(icon),
      Classes.intentClass(intent),
      className,
    );
    const viewBox = iconPath.viewBox;

    const computedHeight = height || iconSize;
    const computedWidth = width || iconSize;

    return React.createElement(
      tagName,
      {
        ...htmlprops,
        className: classes,
        title: htmlTitle,
      },
      <svg
        fill={color}
        data-icon={icon}
        width={computedWidth}
        height={computedHeight}
        viewBox={viewBox}
      >
        {title && <desc>{title}</desc>}
        {paths}
      </svg>,
    );
  }

  /**
   * Пути значка по имени. Неизвестное имя (или элемент вместо имени) даёт
   * `undefined` — и значок не рисуется, как у Blueprint.
   */
  getSvgPath(iconName: string) {
    const svgPathsRecord: Record<string, { path: string[]; viewBox: string }> =
      IconSvgPaths;
    const pathStrings = svgPathsRecord[iconName];

    return pathStrings;
  }

  /** Render `<path>` elements for the given icon name. Returns `null` if name is unknown. */
  renderSvgPaths(pathStrings: string[] | null | undefined) {
    if (pathStrings == null) {
      return null;
    }
    return pathStrings.map((d, i) => (
      <path key={i} d={d} className={`path-${i + 1}`} fillRule="evenodd" />
    ));
  }
}

// Описания свойств через `prop-types` здесь больше нет: их дублировал
// интерфейс `IconProps` выше, и в нём же они проверяются при сборке, а не в
// работающем приложении (Д8 карты v87).
