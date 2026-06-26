# Виртуализация и ресайз колонок в примитиве `data-table.tsx` (D-redesign, слайс 3) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в общий примитив `components/ui/data-table.tsx` две опциональные, по умолчанию выключенные способности — виртуализацию строк и ресайз колонок — чтобы следующие слайсы могли перенести 4 таблицы вкладки «без категории».

**Architecture:** Подход A (без новых зависимостей). Ядро — две чистые функции (`computeVirtualWindow`, `applyColumnResize`), пишутся по TDD. Затем они подключаются в рендер за опциональными пропсами; при выключенных флагах путь рендера и поведение текущей таблицы «Все транзакции» (слайс 2) не меняются.

**Tech Stack:** React 18, react-table v7 (через существующий `useTable`/`useSortBy`), Vitest + jsdom (тесты чистых функций — как `badge.spec.ts`), TypeScript strict (без `// @ts-nocheck`). Никаких новых npm-зависимостей.

**Спек:** `docs/superpowers/specs/2026-06-27-datatable-virtualization-resize-design.md`

---

## Файловая структура

| Файл | Ответственность |
|---|---|
| `packages/webapp/src/components/ui/data-table.tsx` (правка) | Экспорт 2 чистых функций + подключение виртуализации и ресайза за опциональными пропсами |
| `packages/webapp/src/components/ui/data-table.spec.ts` (создать) | Vitest: `computeVirtualWindow` и `applyColumnResize` |

Все функции экспортируются из `data-table.tsx` (новых файлов кода нет — только тест-файл), тесты импортируют их из `./data-table`.

---

## Task 1: Чистая функция `computeVirtualWindow` (TDD)

**Files:**
- Test: `packages/webapp/src/components/ui/data-table.spec.ts`
- Modify: `packages/webapp/src/components/ui/data-table.tsx`

- [ ] **Step 1: Написать падающий тест**

Создать `packages/webapp/src/components/ui/data-table.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeVirtualWindow } from './data-table';

describe('computeVirtualWindow', () => {
  const base = { viewportHeight: 400, rowHeight: 40, rowCount: 100, overscan: 0 };

  it('верх списка: scrollTop=0 показывает первые строки', () => {
    const w = computeVirtualWindow({ ...base, scrollTop: 0 });
    expect(w.startIndex).toBe(0);
    expect(w.endIndex).toBe(10); // ceil(400/40)
    expect(w.padTop).toBe(0);
    expect(w.padBottom).toBe(90 * 40);
  });

  it('середина: сдвигает окно по scrollTop', () => {
    const w = computeVirtualWindow({ ...base, scrollTop: 400 });
    expect(w.startIndex).toBe(10); // floor(400/40)
    expect(w.endIndex).toBe(20); // ceil((400+400)/40)
    expect(w.padTop).toBe(10 * 40);
  });

  it('низ: endIndex клампится по rowCount', () => {
    const w = computeVirtualWindow({ ...base, scrollTop: 100000 });
    expect(w.endIndex).toBe(100);
    expect(w.padBottom).toBe(0);
  });

  it('overscan расширяет окно в обе стороны', () => {
    const w = computeVirtualWindow({ ...base, scrollTop: 400, overscan: 3 });
    expect(w.startIndex).toBe(7); // 10 - 3
    expect(w.endIndex).toBe(23); // 20 + 3
  });

  it('инвариант: padTop + видимые*rowHeight + padBottom = rowCount*rowHeight', () => {
    const w = computeVirtualWindow({ ...base, scrollTop: 400, overscan: 5 });
    const middle = (w.endIndex - w.startIndex) * base.rowHeight;
    expect(w.padTop + middle + w.padBottom).toBe(base.rowCount * base.rowHeight);
  });

  it('пустой список: всё по нулям', () => {
    const w = computeVirtualWindow({ ...base, rowCount: 0, scrollTop: 0 });
    expect(w).toEqual({ startIndex: 0, endIndex: 0, padTop: 0, padBottom: 0 });
  });
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `pnpm --filter @bigfin/webapp exec vitest run src/components/ui/data-table.spec.ts`
Expected: FAIL — `computeVirtualWindow` не экспортируется (нет такого имени).

- [ ] **Step 3: Реализовать функцию**

В `data-table.tsx`, сразу после импортов (до `export interface DataTableProps`), добавить:
```tsx
export interface VirtualWindow {
  startIndex: number;
  endIndex: number;
  padTop: number;
  padBottom: number;
}

/**
 * Чистый расчёт окна виртуализации (фиксированная высота строки).
 * endIndex — полуоткрытый (для Array.slice).
 */
export function computeVirtualWindow(params: {
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  rowCount: number;
  overscan: number;
}): VirtualWindow {
  const { scrollTop, viewportHeight, rowHeight, rowCount, overscan } = params;
  if (rowCount <= 0 || rowHeight <= 0) {
    return { startIndex: 0, endIndex: 0, padTop: 0, padBottom: 0 };
  }
  const first = Math.floor(scrollTop / rowHeight);
  const last = Math.ceil((scrollTop + viewportHeight) / rowHeight);
  const startIndex = Math.max(0, first - overscan);
  const endIndex = Math.min(rowCount, last + overscan);
  return {
    startIndex,
    endIndex,
    padTop: startIndex * rowHeight,
    padBottom: (rowCount - endIndex) * rowHeight,
  };
}
```

- [ ] **Step 4: Запустить — пройдёт**

Run: `pnpm --filter @bigfin/webapp exec vitest run src/components/ui/data-table.spec.ts`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/components/ui/data-table.tsx packages/webapp/src/components/ui/data-table.spec.ts
git commit -m "feat(webapp): чистый расчёт окна виртуализации в data-table (D-redesign)"
```
(Заверши тело коммита строкой `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Task 2: Чистая функция `applyColumnResize` (TDD)

**Files:**
- Test: `packages/webapp/src/components/ui/data-table.spec.ts` (дополнить)
- Modify: `packages/webapp/src/components/ui/data-table.tsx`

- [ ] **Step 1: Дополнить тест**

В конец `data-table.spec.ts` добавить новый импорт в первой строке и блок describe:
```ts
import { computeVirtualWindow, applyColumnResize } from './data-table';
```
(замени существующую строку импорта на эту — добавляется `applyColumnResize`.)

И в конце файла:
```ts
describe('applyColumnResize', () => {
  it('увеличивает ширину на delta', () => {
    const out = applyColumnResize({ a: 100 }, 'a', 30, 48);
    expect(out.a).toBe(130);
  });
  it('уменьшает ширину на отрицательный delta', () => {
    const out = applyColumnResize({ a: 100 }, 'a', -30, 48);
    expect(out.a).toBe(70);
  });
  it('клампит по minWidth', () => {
    const out = applyColumnResize({ a: 100 }, 'a', -200, 48);
    expect(out.a).toBe(48);
  });
  it('отсутствующий columnId: база = minWidth', () => {
    const out = applyColumnResize({}, 'a', 10, 48);
    expect(out.a).toBe(58);
  });
  it('не мутирует исходный объект и сохраняет другие колонки', () => {
    const input = { a: 100, b: 200 };
    const out = applyColumnResize(input, 'a', 10, 48);
    expect(out).toEqual({ a: 110, b: 200 });
    expect(input.a).toBe(100);
  });
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `pnpm --filter @bigfin/webapp exec vitest run src/components/ui/data-table.spec.ts`
Expected: FAIL — `applyColumnResize` не экспортируется.

- [ ] **Step 3: Реализовать функцию**

В `data-table.tsx`, сразу после `computeVirtualWindow`, добавить:
```tsx
/** Минимальная ширина колонки в px (нельзя схлопнуть). */
export const MIN_COLUMN_WIDTH = 48;

/**
 * Чистое применение ресайза к map ширин колонок.
 * При отсутствующем columnId база = minWidth.
 */
export function applyColumnResize(
  widths: Record<string, number>,
  columnId: string,
  deltaPx: number,
  minWidth: number,
): Record<string, number> {
  const baseWidth = widths[columnId] ?? minWidth;
  const next = Math.max(minWidth, baseWidth + deltaPx);
  return { ...widths, [columnId]: next };
}
```

- [ ] **Step 4: Запустить — пройдёт**

Run: `pnpm --filter @bigfin/webapp exec vitest run src/components/ui/data-table.spec.ts`
Expected: PASS (11 тестов: 6 + 5).

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/components/ui/data-table.tsx packages/webapp/src/components/ui/data-table.spec.ts
git commit -m "feat(webapp): чистое применение ресайза колонок в data-table (D-redesign)"
```
(Тело — с `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Task 3: Подключить виртуализацию в рендер

**Files:**
- Modify: `packages/webapp/src/components/ui/data-table.tsx`

- [ ] **Step 1: Расширить `DataTableProps`**

В интерфейсе `DataTableProps` добавить после `emptyState?`:
```tsx
  // Виртуализация (опционально; выключена по умолчанию)
  virtualized?: boolean;
  rowHeight?: number;
  overscan?: number;
  maxBodyHeight?: number;
```

- [ ] **Step 2: Принять новые пропсы с дефолтами**

В сигнатуре `export function DataTable({ ... })` добавить в деструктуризацию после `emptyState,`:
```tsx
  virtualized = false,
  rowHeight = 40,
  overscan = 8,
  maxBodyHeight = 480,
```

- [ ] **Step 3: Завести state прокрутки и расчёт окна**

Добавить **после** блока `React.useEffect(() => { onSortChange?.(sortBy); }, [sortByKey]);` и **до** раннего возврата `if (!loading && data.length === 0 && emptyState) { ... }` (хук `useState` обязан стоять до условного `return`):
```tsx
  const [scrollTop, setScrollTop] = React.useState(0);
  const vwin =
    virtualized && !loading
      ? computeVirtualWindow({
          scrollTop,
          viewportHeight: maxBodyHeight,
          rowHeight,
          rowCount: rows.length,
          overscan,
        })
      : null;
  const visibleRows = vwin ? rows.slice(vwin.startIndex, vwin.endIndex) : rows;
```

- [ ] **Step 4: Сделать контейнер прокручиваемым в режиме виртуализации**

Заменить открывающий `<div className="overflow-x-auto rounded-lg border border-border bg-surface">` на:
```tsx
    <div
      className={cn(
        'rounded-lg border border-border bg-surface',
        virtualized ? 'overflow-auto' : 'overflow-x-auto',
      )}
      style={virtualized ? { maxHeight: maxBodyHeight } : undefined}
      onScroll={
        virtualized
          ? (e) => setScrollTop((e.currentTarget as HTMLElement).scrollTop)
          : undefined
      }
    >
```

- [ ] **Step 5: Сделать шапку «липкой» при виртуализации**

Заменить `<thead className="bg-surface-elevated">` на:
```tsx
        <thead
          className={cn(
            'bg-surface-elevated',
            virtualized && 'sticky top-0 z-10',
          )}
        >
```

- [ ] **Step 6: Рендерить окно строк со строками-распорками**

Заменить ветку `: rows.map((row: any) => { ... })` (внутри тернарника `loading ? skeleton : ...`) на блок с распорками:
```tsx
            : (
              <>
                {vwin && vwin.padTop > 0 && (
                  <tr aria-hidden="true" style={{ height: vwin.padTop }}>
                    <td colSpan={tableColumns.length} className="p-0" />
                  </tr>
                )}
                {visibleRows.map((row: any) => {
                  prepareRow(row);
                  return (
                    <tr
                      {...row.getRowProps()}
                      onClick={() => onRowClick?.(row.original)}
                      style={virtualized ? { height: rowHeight } : undefined}
                      className={cn(
                        'border-t border-border',
                        onRowClick && 'cursor-pointer hover:bg-surface-elevated',
                      )}
                    >
                      {row.cells.map((cell: any) => (
                        <td
                          {...cell.getCellProps()}
                          className={cn(
                            'px-3 py-2 text-text-primary',
                            cell.column.align === 'right' &&
                              'text-right tabular-nums whitespace-nowrap',
                          )}
                        >
                          {cell.render('Cell')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {vwin && vwin.padBottom > 0 && (
                  <tr aria-hidden="true" style={{ height: vwin.padBottom }}>
                    <td colSpan={tableColumns.length} className="p-0" />
                  </tr>
                )}
              </>
            )}
```
(Логика `loading ? (skeleton) : (...)` сохраняется; меняется только вторая ветка. `visibleRows === rows`, когда виртуализация выключена, поэтому поведение текущей таблицы не меняется.)

- [ ] **Step 7: Проверить типы**

Run: `pnpm typecheck`
Expected: PASS (3 пакета). Новые пропсы опциональны — вызовы `DataTable` в слайсе 2 не ломаются.

- [ ] **Step 8: Полный vitest вебаппа**

Run: `pnpm --filter @bigfin/webapp exec vitest run`
Expected: PASS (прежние тесты + 11 новых; ничего не сломано).

- [ ] **Step 9: Commit**

```bash
git add packages/webapp/src/components/ui/data-table.tsx
git commit -m "feat(webapp): виртуализация строк в примитиве data-table (D-redesign)"
```
(Тело — с `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Task 4: Подключить ресайз колонок в рендер

**Files:**
- Modify: `packages/webapp/src/components/ui/data-table.tsx`

- [ ] **Step 1: Расширить `DataTableProps`**

В интерфейсе `DataTableProps` добавить после `maxBodyHeight?` (из Task 3):
```tsx
  // Ресайз колонок (опционально; выключен по умолчанию)
  resizableColumns?: boolean;
  columnWidths?: Record<string, number>;
  onColumnWidthsChange?: (widths: Record<string, number>) => void;
```

- [ ] **Step 2: Принять новые пропсы с дефолтами**

В деструктуризацию `DataTable({ ... })` добавить после `maxBodyHeight = 480,`:
```tsx
  resizableColumns = false,
  columnWidths = {},
  onColumnWidthsChange,
```

- [ ] **Step 3: Обработчик начала перетаскивания**

Сразу после блока `const visibleRows = ...` (из Task 3) добавить:
```tsx
  const startColumnResize = React.useCallback(
    (e: React.MouseEvent, columnId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const thEl = (e.currentTarget as HTMLElement)
        .parentElement as HTMLElement | null;
      const startWidth =
        columnWidths[columnId] ?? thEl?.offsetWidth ?? MIN_COLUMN_WIDTH;
      const seeded = { ...columnWidths, [columnId]: startWidth };
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        onColumnWidthsChange?.(
          applyColumnResize(seeded, columnId, delta, MIN_COLUMN_WIDTH),
        );
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [columnWidths, onColumnWidthsChange],
  );
```

- [ ] **Step 4: Применить ширины и хэндл к `<th>`**

Заменить открывающий `<th {...col.getHeaderProps(...)}` блок целиком на вариант с `style`, `relative` и ручкой ресайза. Найти:
```tsx
                <th
                  {...col.getHeaderProps(
                    col.getSortByToggleProps ? col.getSortByToggleProps() : undefined,
                  )}
                  className={cn(
                    'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary',
                    col.align === 'right' && 'text-right',
                    !col.disableSortBy && 'cursor-pointer select-none',
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.render('Header')}
                    {col.isSorted &&
                      (col.isSortedDesc ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronUp className="h-3 w-3" />
                      ))}
                  </span>
                </th>
```
заменить на:
```tsx
                <th
                  {...col.getHeaderProps(
                    col.getSortByToggleProps ? col.getSortByToggleProps() : undefined,
                  )}
                  style={
                    resizableColumns && columnWidths[col.id] != null
                      ? { width: columnWidths[col.id] }
                      : undefined
                  }
                  className={cn(
                    'relative px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary',
                    col.align === 'right' && 'text-right',
                    !col.disableSortBy && 'cursor-pointer select-none',
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.render('Header')}
                    {col.isSorted &&
                      (col.isSortedDesc ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronUp className="h-3 w-3" />
                      ))}
                  </span>
                  {resizableColumns && col.id !== '__select__' && (
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label="resize-column"
                      onMouseDown={(e) => startColumnResize(e, col.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none hover:bg-action"
                    />
                  )}
                </th>
```

- [ ] **Step 5: Проверить типы**

Run: `pnpm typecheck`
Expected: PASS (3 пакета).

- [ ] **Step 6: Полный vitest вебаппа**

Run: `pnpm --filter @bigfin/webapp exec vitest run`
Expected: PASS (11 новых тестов + прежние; ничего не сломано).

- [ ] **Step 7: Commit**

```bash
git add packages/webapp/src/components/ui/data-table.tsx
git commit -m "feat(webapp): ресайз колонок в примитиве data-table (D-redesign)"
```
(Тело — с `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Task 5: Финальные гейты

**Files:** (без правок кода — только проверки)

- [ ] **Step 1: Типы (3 пакета)**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 2: Парность лангов**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: `EN === RU` (этот слайс не трогает lang-файлы — счётчики должны быть как до него).

- [ ] **Step 3: Полный vitest вебаппа**

Run: `pnpm --filter @bigfin/webapp exec vitest run`
Expected: PASS — прежние тесты зелёные + 11 новых (`computeVirtualWindow` 6, `applyColumnResize` 5).

- [ ] **Step 4: Зафиксировать готовность слайса**

Слайс — энейблер: видимых изменений в приложении нет (пропсы выключены по умолчанию). Живой прогон в браузере — на следующем слайсе, при подключении к реальным таблицам вкладки «без категории».

---

## Откат

Изменения изолированы в `components/ui/data-table.tsx` за опциональными выключенными по умолчанию пропсами. Откат = `git revert` коммитов ветки `feat/d-redesign-datatable-virtualization` (или сброс ветки). На существующие экраны влияния нет.

## Вне объёма (следующие слайсы)

- Переменная высота строк, горизонтальная виртуализация, drag-reorder колонок.
- Render-тесты компонента через @testing-library/react (инфра старая, v9 + React 18 — риск; держим тесты на чистых функциях, как в `badge.spec.ts`).
- Подключение виртуализации/ресайза к 4 реальным таблицам (uncategorized / recognized / excluded / pending) и каркас страницы.
