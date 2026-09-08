import React from 'react';
import clsx from 'classnames';

import '@/style/components/Details.scss';

const DIRECTION = {
  VERTICAL: 'vertical',
  HORIZANTAL: 'horizantal',
};

const DetailsMenuContext = React.createContext<any>(undefined);
const useDetailsMenuContext = () => React.useContext(DetailsMenuContext);

/**
 * Details menu.
 */
/**
 * Свойства описи. Все необязательные: опись может быть без выравнивания и без
 * заданной ширины подписи (Д1 карты v62).
 */
export interface DetailsMenuProps {
  children?: React.ReactNode;
  direction?: string;
  textAlign?: string;
  minLabelSize?: number | string;
  className?: string;
}

export function DetailsMenu({
  children,
  direction = DIRECTION.VERTICAL,
  textAlign,
  minLabelSize,
  className,
}: DetailsMenuProps) {
  return (
    <div
      className={clsx(
        'details-menu',
        {
          'details-menu--vertical': direction === DIRECTION.VERTICAL,
          'details-menu--horizantal': direction === DIRECTION.HORIZANTAL,
          [`align-${textAlign}`]: textAlign,
        },
        className,
      )}
    >
      <DetailsMenuContext.Provider value={{ minLabelSize }}>
        {children}
      </DetailsMenuContext.Provider>
    </div>
  );
}

/**
 * Detail item.
 */
/**
 * Свойства пункта описи. Все необязательные: пункт может быть и без имени, и
 * без выравнивания. Раньше типа не было вовсе — проверка считала каждое
 * свойство обязательным, и `<DetailItem label={…}>` был ошибкой (Д1 карты v59).
 */
export interface DetailItemProps {
  label?: React.ReactNode;
  children?: React.ReactNode;
  name?: string;
  align?: string;
  multiline?: boolean;
  className?: string;
}

export function DetailItem({
  label,
  children,
  name,
  align,
  multiline,
  className,
}: DetailItemProps) {
  const { minLabelSize } = useDetailsMenuContext();

  return (
    <div
      className={clsx(
        'detail-item',
        {
          [`detail-item--${name}`]: name,
          [`align-${align}`]: align,
          [`detail-item--multilines`]: multiline,
        },
        className,
      )}
    >
      <div
        style={{
          // Именно `minWidth`, а не `'min-width'`: React в объекте оформления
          // понимает только запись через заглавную букву, а ключ через дефис
          // молча выбрасывает. Ширина подписи не применялась вовсе
          // (Д6 карты v75).
          minWidth: minLabelSize,
        }}
        className="detail-item__label"
      >
        {label}
      </div>
      <div className={clsx('detail-item__content')}>{children}</div>
    </div>
  );
}
