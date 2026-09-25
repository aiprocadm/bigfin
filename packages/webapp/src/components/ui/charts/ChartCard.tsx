import * as React from 'react';
import intl from 'react-intl-universal';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Skeleton } from '../skeleton';
import { Button } from '../button';
import { SegmentedControl } from '../segmented-control';
import { ChartDataTable, type ChartColumn } from './ChartDataTable';
import { useChartSize } from './useChartSize';

export type ChartState = 'ready' | 'loading' | 'empty' | 'error';

export interface ChartCardProps<Row> {
  /** Вопрос словами: «Хватит ли денег до конца месяца?» */
  title: React.ReactNode;
  /** Вывод одной строкой — ответ на вопрос. */
  summary?: React.ReactNode;
  /** Тот же график таблицей — для «Таблица» (правило 9 §6.1). */
  table: { columns: ChartColumn<Row>[]; rows: Row[] };
  /** Сам график. Получает высоту под текущую ширину экрана. */
  children: (size: { height: number; isPhone: boolean; xInterval: number | 'preserveStartEnd' }) => React.ReactNode;
  /** Сколько точек по оси X — чтобы проредить подписи на телефоне. */
  pointCount?: number;
  state?: ChartState;
  /** Пусто: одна строка и (необязательно) действие. */
  emptyText?: React.ReactNode;
  emptyAction?: React.ReactNode;
  onRetry?: () => void;
  /** Ошибка словами именно этого графика. */
  errorText?: React.ReactNode;
  /** Метки рядов под графиком. */
  legend?: React.ReactNode;
  /** Действия справа от заголовка (переключатель 30/90 дней и т. п.). */
  actions?: React.ReactNode;
  /**
   * Сворачиваемый график (архетип «Отчёт», §8): над таблицей отчёта он по
   * умолчанию свёрнут на телефоне и на низком ноутбуке. Ключ — чтобы
   * запомнить выбор человека.
   */
  collapsible?: { storageKey: string; defaultCollapsed?: boolean };
  /**
   * Своя высота вместо 240 / 200 — для графика со строками (вертикальный
   * водопад на телефоне: тринадцать ступеней в 200 точек не влезают).
   */
  heightOverride?: { desktop?: number; phone?: number };
  className?: string;
}

const readCollapsed = (key: string, fallback: boolean) => {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored === '1';
  } catch {
    return fallback;
  }
};

/**
 * Карточка графика (§6.1 ТЗ-4). Каждый график продукта живёт в ней:
 * заголовок-вопрос, вывод словами, «График / Таблица», скелет той же высоты
 * при загрузке, пустое состояние строкой, ошибка с «Повторить».
 *
 * До этапа 46 у тринадцати графиков было тринадцать обёрток, и ни у одного —
 * таблицы: цифру с графика нельзя было прочитать ни глазами точно, ни
 * программой чтения с экрана.
 */
export function ChartCard<Row extends Record<string, any>>({
  title,
  summary,
  table,
  children,
  pointCount = 0,
  state = 'ready',
  emptyText,
  emptyAction,
  onRetry,
  errorText,
  legend,
  actions,
  collapsible,
  heightOverride,
  className,
}: ChartCardProps<Row>) {
  const baseSize = useChartSize(pointCount);
  const override = baseSize.isPhone ? heightOverride?.phone : heightOverride?.desktop;
  const size = override ? { ...baseSize, height: override } : baseSize;
  const [view, setView] = React.useState<'chart' | 'table'>('chart');
  const titleId = React.useId();

  const defaultCollapsed =
    collapsible?.defaultCollapsed ??
    (typeof window !== 'undefined' && (size.isPhone || window.innerHeight < 900));
  const [collapsed, setCollapsed] = React.useState(() =>
    collapsible ? readCollapsed(collapsible.storageKey, !!defaultCollapsed) : false,
  );
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        if (collapsible) window.localStorage.setItem(collapsible.storageKey, next ? '1' : '0');
      } catch {
        // Хранилище недоступно (частное окно) — выбор живёт до ухода с экрана.
      }
      return next;
    });
  };

  const body = (() => {
    if (state === 'loading') {
      // Скелет той же высоты — страница не прыгает, когда график приходит.
      return <Skeleton className="w-full" style={{ height: size.height }} />;
    }
    if (state === 'error') {
      return (
        <div className="flex flex-col items-start gap-2 py-6">
          <p className="text-body text-text-primary">{errorText ?? intl.get('charts.error')}</p>
          {onRetry && (
            <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
              {intl.get('screen_state.retry')}
            </Button>
          )}
        </div>
      );
    }
    if (state === 'empty') {
      return (
        <div className="flex flex-col items-start gap-2 py-6">
          <p className="text-body text-text-secondary">{emptyText ?? intl.get('charts.empty')}</p>
          {emptyAction}
        </div>
      );
    }
    if (view === 'table') {
      return <ChartDataTable caption={title} columns={table.columns} rows={table.rows} />;
    }
    return (
      <>
        <div className="w-full" style={{ height: size.height }}>
          {children(size)}
        </div>
        {legend && <div className="mt-3">{legend}</div>}
      </>
    );
  })();

  return (
    <section
      aria-labelledby={titleId}
      className={cn('rounded-default border border-border bg-surface p-4', className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-headline text-text-primary">
            {title}
          </h2>
          {summary && state === 'ready' && (
            <p className="mt-0.5 text-subhead text-text-secondary">{summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!collapsed && actions}
          {!collapsed && state === 'ready' && (
            <SegmentedControl
              size="sm"
              aria-label={intl.get('charts.view')}
              value={view}
              onChange={setView}
              options={[
                { value: 'chart', label: intl.get('charts.view.chart') },
                { value: 'table', label: intl.get('charts.view.table') },
              ]}
            />
          )}
          {collapsible && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={!collapsed}
              onClick={toggleCollapsed}
              className="gap-1"
            >
              {intl.get(collapsed ? 'charts.show' : 'charts.hide')}
              <ChevronDown
                aria-hidden
                className={cn('h-4 w-4 transition-transform duration-200', collapsed && '-rotate-90')}
              />
            </Button>
          )}
        </div>
      </div>
      {!collapsed && <div className="mt-3">{body}</div>}
    </section>
  );
}
