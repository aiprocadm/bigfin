import * as React from 'react';
import intl from 'react-intl-universal';
import { SlidersHorizontal } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Button } from './button';
import { Sheet } from './sheet';

/**
 * Строка фильтров списка (UI-044-6 ТЗ-4, R12).
 *
 * Было: фильтры реестра — четыре строки на ноутбуке и весь первый экран на
 * телефоне, операций не видно. Стало: в строке только главное (период, тип,
 * поиск) и кнопка «Фильтры (N)»; всё остальное — в шторке, где видно,
 * сколько отборов включено, и есть «Сбросить».
 */
export interface FilterBarProps {
  /** Главные элементы строки: период, сегменты типа, поиск. */
  children: React.ReactNode;
  /** Остальные отборы — в шторке «Фильтры». Нет — нет и кнопки. */
  filters?: React.ReactNode;
  /** Сколько отборов из шторки включено — число на кнопке. */
  activeCount?: number;
  onReset?: () => void;
  /** Справа в строке: меню «Вид» (колонки), выгрузка. */
  trailing?: React.ReactNode;
  className?: string;
}

export function FilterBar({
  children,
  filters,
  activeCount = 0,
  onReset,
  trailing,
  className,
}: FilterBarProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {children}
      {filters && (
        <Button
          variant={activeCount > 0 ? 'primary' : 'secondary'}
          onClick={() => setOpen(true)}
          className="gap-1.5"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {activeCount > 0
            ? intl.get('filter_bar.button_count', { count: activeCount })
            : intl.get('filter_bar.button')}
        </Button>
      )}
      {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
      {filters && (
        <Sheet
          open={open}
          onOpenChange={setOpen}
          title={intl.get('filter_bar.title')}
          footer={
            <>
              {activeCount > 0 && onReset && (
                <Button variant="secondary" onClick={onReset}>
                  {intl.get('filter_bar.reset')}
                </Button>
              )}
              <Button onClick={() => setOpen(false)}>{intl.get('filter_bar.done')}</Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">{filters}</div>
        </Sheet>
      )}
    </div>
  );
}
