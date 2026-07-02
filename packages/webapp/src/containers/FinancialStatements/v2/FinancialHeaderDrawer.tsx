import * as React from 'react';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface FinancialHeaderDrawerProps {
  /** Открыт ли настройщик (redux-флаг конкретного отчёта, механизм не меняем). */
  isOpen: boolean;
  /** Закрытие настройщика (диспатчит toggle(false) конкретного отчёта). */
  onClose: () => void;
  /** Человеческий заголовок панели, например «Настроить отчёт». */
  title: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Общий каркас панели настроек финансового отчёта (замена легаси
 * FinancialStatementHeader на Blueprint Drawer). Выезжает сверху,
 * содержимое — форма конкретного отчёта (вкладки, поля, футер).
 *
 * Механизм открытия прежний: каждый отчёт хранит флаг в redux
 * (financial-statements reducer) и передаёт его сюда через isOpen/onClose.
 */
export function FinancialHeaderDrawer({
  isOpen,
  onClose,
  title,
  children,
}: FinancialHeaderDrawerProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent
        side="top"
        aria-describedby={undefined}
        // bigfin-ui: контент рендерится в портале вне «нового» дерева —
        // класс нужен, чтобы токены и типографика применялись внутри.
        className="bigfin-ui max-h-[85vh] gap-0"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-1">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>

          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
