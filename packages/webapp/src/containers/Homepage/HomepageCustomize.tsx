import React from 'react';
import intl from 'react-intl-universal';
import { ReactSortable, type ReactSortableProps } from 'react-sortablejs';
import { GripVertical, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { HomepageWidgetId, sameOrder } from './homepageWidgets';

type SortableItem = { id: HomepageWidgetId };

// Типы библиотеки писались до React 18: у классового компонента там нет
// `children`, хотя строки списка он принимает именно так. Сам компонент
// тот же — уточняется только его описание.
const Sortable = ReactSortable as unknown as React.ComponentType<
  ReactSortableProps<SortableItem> & { children?: React.ReactNode }
>;

export interface HomepageCustomizeProps {
  order: HomepageWidgetId[];
  hidden: HomepageWidgetId[];
  onOrderChange: (order: HomepageWidgetId[]) => void;
  onHiddenChange: (id: HomepageWidgetId, hidden: boolean) => void;
  onReset: () => void;
}

/**
 * «Настроить главную» (FT-064 ТЗ-3): какие блоки видеть и в каком порядке.
 *
 * Порядок меняется перетаскиванием за ручку — у Финтабло порядка нет вовсе,
 * только галочки видимости. Ручка отдельная, а не вся строка: иначе на
 * телефоне попытка поставить галочку или прокрутить список сдвигала бы блок.
 */
export function HomepageCustomize({
  order,
  hidden,
  onOrderChange,
  onHiddenChange,
  onReset,
}: HomepageCustomizeProps) {
  const items: SortableItem[] = order.map((id) => ({ id }));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {intl.get('homepage.widgets.customize')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <h2 className="text-sm font-medium text-text-primary">
          {intl.get('homepage.widgets.title')}
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          {intl.get('homepage.widgets.hint')}
        </p>

        <Sortable
          tag="ul"
          list={items}
          setList={(next) => {
            const ids = next.map((item) => item.id);
            // Библиотека зовёт это и при простом касании строки — без
            // перестановки. Сохранять неизменившийся порядок незачем.
            if (!sameOrder(ids, order)) onOrderChange(ids);
          }}
          handle=".homepage-widget-handle"
          animation={150}
          className="mt-3 flex flex-col"
        >
          {items.map(({ id }) => {
            const checkboxId = `homepage-widget-${id}`;
            return (
              <li
                key={id}
                className="flex min-h-11 items-center gap-2 rounded-control sm:min-h-9"
              >
                <button
                  type="button"
                  className="homepage-widget-handle flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-text-muted hover:text-text-primary sm:h-9"
                  aria-label={intl.get('homepage.widgets.drag')}
                >
                  <GripVertical className="h-4 w-4" aria-hidden />
                </button>
                <Checkbox
                  id={checkboxId}
                  checked={!hidden.includes(id)}
                  onCheckedChange={(checked) =>
                    onHiddenChange(id, checked !== true)
                  }
                />
                <label
                  htmlFor={checkboxId}
                  className="flex-1 cursor-pointer py-2 text-sm text-text-primary"
                >
                  {intl.get(`homepage.widgets.${id}`)}
                </label>
              </li>
            );
          })}
        </Sortable>

        <div className="mt-3 border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={onReset}>
            {intl.get('homepage.widgets.reset')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default HomepageCustomize;
