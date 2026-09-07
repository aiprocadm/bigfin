// @ts-nocheck
import React from 'react';
import PropTypes from 'prop-types';
import { If } from './If';

interface ChooseProps {
  children?: React.ReactNode;
}

/** Свойства ветки «иначе»: обе части необязательны — рисуем либо то, либо это. */
interface OtherwiseProps {
  children?: React.ReactNode;
  render?: () => React.ReactNode;
}

export const Choose = (props: ChooseProps) => {
  let when = null;
  let otherwise = null;

  React.Children.forEach(props.children, (children) => {
    if (children.props.condition === undefined) {
      otherwise = children;
    } else if (!when && children.props.condition === true) {
      when = children;
    }
  });

  return when || otherwise;
};

Choose.propTypes = {
  children: PropTypes.node,
};

Choose.When = If;

/**
 * Возвращаем именно элемент, а не `ReactNode`.
 *
 * Карта v65 объявила свойства и на этом остановилась — и обменяла одно
 * замечание на другое: `ReactNode` включает строку и `undefined`, а React
 * требует от компонента `ReactElement | null`. Тридцать мест переехали из
 * «не хватает свойства» в «нельзя использовать как компонент». Образец
 * правильного объявления лежал рядом — в `If`.
 */
Choose.Otherwise = ({
  render,
  children,
}: OtherwiseProps): React.ReactElement | null => (
  <>{render ? render() : children}</>
);

Choose.Otherwise.propTypes = {
  children: PropTypes.node,
  render: PropTypes.func,
};
