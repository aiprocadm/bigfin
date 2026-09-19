import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { Position, Drawer, DrawerProps } from '@blueprintjs/core';
import '@/style/containers/FinancialStatements/DrawerHeader.scss';

interface FinancialStatementHeaderProps {
  children?: React.ReactNode;
  /** Открыта ли шторка с настройками отчёта. */
  isOpen?: boolean;
  /** Что передать самой шторке: обычно только `onClose`. */
  drawerProps?: Partial<DrawerProps>;
  className?: string;
}

/**
 * Шапка отчёта со шторкой настроек.
 *
 * ВСЕ СВОЙСТВА, КРОМЕ ДЕТЕЙ, НЕОБЯЗАТЕЛЬНЫ — и это не послабление. Пять
 * шапок отчётов зовут этот компонент, и ни одна не передаёт `className`.
 * Пока свойства не были объявлены вовсе, проверка молчала; стоило объявить
 * их обязательными — и пять живых экранов оказались бы «сломанными», хотя
 * работают годами.
 */
export default function FinancialStatementHeader({
  children,
  isOpen,
  drawerProps,
  className,
}: FinancialStatementHeaderProps) {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Hides the content scrollbar and scroll to the top of the page once the drawer open.
  useEffect(() => {
    const contentPanel = document.body;
    contentPanel.classList.toggle('hide-scrollbar', isOpen);

    if (isOpen) {
      // Панель содержимого может отсутствовать: у отчёта, открытого в
      // отдельном окне печати, разделителя нет вовсе.
      document.querySelector('.Pane2')?.scrollTo(0, 0);
    }
    return () => {
      contentPanel.classList.remove('hide-scrollbar');
    };
  }, [isOpen]);

  useEffect(() => {
    clearTimeout(timeoutRef.current);

    if (isOpen) {
      setIsDrawerOpen(isOpen);
    } else {
      timeoutRef.current = setTimeout(() => setIsDrawerOpen(!!isOpen), 300);
    }
  }, [isOpen]);

  return (
    <div
      className={classNames(
        'financial-statement__header',
        'financial-header-drawer',
        {
          'is-hidden': !isDrawerOpen,
        },
        className,
      )}
    >
      <Drawer
        isOpen={isOpen}
        usePortal={false}
        hasBackdrop={true}
        position={Position.TOP}
        canOutsideClickClose={true}
        canEscapeKeyClose={true}
        {...drawerProps}
      >
        {children}
      </Drawer>
    </div>
  );
}
