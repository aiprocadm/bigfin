import React from 'react';
import clsx from 'classnames';
import { CLASSES } from '@/constants/classes';
import styles from '@/style/components/BigAmount.module.scss';

interface PageFormBigNumberProps {
  /**
   * Подпись над суммой. Почти всегда это `<T id={…} />`, то есть элемент, а не
   * строка — на строке настаивала прежняя запись, и три шапки формы считались
   * ошибкой (Д4 карты v75).
   */
  label: React.ReactNode;
  amount: string | number;
}
export function PageFormBigNumber({ label, amount }: PageFormBigNumberProps) {
  return (
    <div className={clsx(CLASSES.PAGE_FORM_HEADER_BIG_NUMBERS)}>
      <div className={clsx(styles.root)}>
        <span className={clsx(styles.label)}>{label}</span>
        <h1 className={clsx(styles.number)}>{amount}</h1>
      </div>
    </div>
  );
}
