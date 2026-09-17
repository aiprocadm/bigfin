import React from 'react';
import { If } from './If';

interface ChooseProps {
  children?: React.ReactNode;
}

/** Свойства ветки «иначе»: обе части необязательны — рисуем либо то, либо это. */
interface OtherwiseProps {
  children?: React.ReactNode;
  render?: () => React.ReactNode;
}

export const Choose = (props: ChooseProps): React.ReactElement | null => {
  let when: React.ReactElement | null = null;
  let otherwise: React.ReactElement | null = null;

  React.Children.forEach(props.children, (child) => {
    // Считаем ветками только элементы: строку или пустоту спрашивать про
    // условие бессмысленно — раньше на таком ребёнке разбор падал бы
    // (Д14 карты v88).
    if (!React.isValidElement(child)) return;

    const condition = (child.props as { condition?: boolean }).condition;

    if (condition === undefined) {
      otherwise = child;
    } else if (!when && condition === true) {
      when = child;
    }
  });

  return when || otherwise;
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
