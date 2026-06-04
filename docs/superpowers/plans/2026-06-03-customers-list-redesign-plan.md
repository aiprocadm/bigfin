# Редизайн списков (пилот «Клиенты») Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собрать переиспользуемый набор UI-примитивов списка в стиле shadcn (светлая тема в тёмной оболочке) и обкатать его на списке «Клиенты», за фиче-флагом `customers_list_v2` (default off), не трогая легаси.

**Architecture:** Strangler Fig. Новые компоненты живут в `components/ui/` рядом с легаси. Новый список «Клиенты» — в `containers/Customers/CustomersLandingV2/`, переиспользует существующие react-query хуки, диалог массового удаления и drawer карточки. Маршрут `/customers` рендерит новый список при включённом флаге, иначе — старый. Старый код не удаляется.

**Tech Stack:** React 18 + TypeScript, `react-table` v7 (уже в зависимостях), Tailwind 4 + shadcn-примитивы, `react-intl-universal`, Vitest, Storybook 8.

**Spec:** [../specs/2026-06-03-customers-list-redesign-design.md](../specs/2026-06-03-customers-list-redesign-design.md)

---

## Pre-flight (читать до старта)

- **Окружение:** Node 18.16.1 (`fnm use 18.16.1` / `nvm use 18.16.1`), только `pnpm`. Бэкенд не нужен — проверки локальные.
- **Без новых зависимостей.** Используем уже установленный `react-table` v7 (на нём построен легаси `components/Datatable`). НЕ запускать `pnpm install`.
- **Команды (из корня репозитория):**
  - Типы: `pnpm --filter @bigfin/webapp typecheck`
  - Один тест-файл разово: `pnpm --filter @bigfin/webapp test -- run <шаблон>`
  - Парность langs: `pnpm --filter @bigfin/webapp lang:check`
  - Storybook (визуальная приёмка): `pnpm --filter @bigfin/webapp storybook` → http://localhost:6006
- **Тест-раннер:** Vitest, глобальные `describe/it/expect` (импортировать не нужно). Алиас `@` → `packages/webapp/src`.
- **Тема:** корень новой страницы оборачиваем в `className="bigfin-ui light"` — `.bigfin-ui` включает скоуп-сброс новой DS, `.light` переключает токены на светлые (механизм уже есть в `styles/tokens.css` + `styles/globals.css`). Все `ui/`-компоненты и истории рендерим внутри `.bigfin-ui` (истории — внутри `.bigfin-ui light`).
- **i18n:** строки экрана — через `intl.get('...')`. Переиспользуем существующие ключи (`display_name`, `company_name`, `phone_number`, `receivable_balance`, `new_customer`, `delete`, `view_details`, `edit_customer`, `delete_customer`, `customers`). Новые ключи добавляем парно EN+RU (Task 11). После правок — `lang:check`.
- **commitlint:** conventional commits, заголовок ≤100 симв. без точки в конце. Проще — коммит только с заголовком.
- **Правила основателя:** маленькие шаги, после каждой задачи — проверка + откат. Всё additive, ничего не удаляем. Бренд везде — только `Bigfin`.
- **Флаг `customers_list_v2`** остаётся off по умолчанию → прод-поведение не меняется. Локально новый список смотрим в Storybook (история `DataTable` с примером клиентов).

---

## File Structure

| Файл | Ответственность | Действие |
|---|---|---|
| `components/ui/empty-state.tsx` (+ `.stories.tsx`) | Пустое состояние списка | Create |
| `components/ui/page-header.tsx` (+ `.stories.tsx`) | Заголовок страницы + основное действие | Create |
| `components/ui/data-table-pagination.tsx` (+ `.stories.tsx`) | Панель пагинации | Create |
| `components/ui/data-table.tsx` (+ `.stories.tsx`) | Таблица на react-table v7 (сортировка/выделение/скелетон/клик/пусто) | Create |
| `components/ui/list-toolbar.tsx` (+ `.stories.tsx`) | Поиск + панель массовых действий | Create |
| `containers/Customers/CustomersLandingV2/format.ts` (+ `format.spec.ts`) | Чистые функции: статус, формат баланса | Create |
| `containers/Customers/CustomersLandingV2/columns.tsx` | Определения колонок списка клиентов | Create |
| `containers/Customers/CustomersLandingV2/CustomersListV2.tsx` | Страница нового списка | Create |
| `containers/Customers/CustomersLandingV2/CustomersListSwitch.tsx` | Переключатель new/old по флагу | Create |
| `routes/dashboard.tsx` (~стр. 600) | Маршрут `/customers` → переключатель | Modify |
| `common/types/Features.ts` (server) | + флаг `CUSTOMERS_LIST_V2` | Modify |
| `modules/Features/FeaturesConfigure.ts` (server) | + регистрация флага (default false) | Modify |
| `lang/en/index.json`, `lang/ru/index.json` | + новые ключи (парно) | Modify |

Порядок: примитивы UI → чистые функции (TDD) → колонки → страница → переключатель+маршрут → флаг (сервер) → i18n → финальная проверка.

---

## Task 1: `empty-state.tsx`

**Files:**
- Create: `packages/webapp/src/components/ui/empty-state.tsx`
- Create: `packages/webapp/src/components/ui/empty-state.stories.tsx`

- [ ] **Step 1: Создать компонент**

Create `packages/webapp/src/components/ui/empty-state.tsx`:

```tsx
import * as React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
      {icon && <div className="text-text-muted">{icon}</div>}
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {action}
    </div>
  );
}
```

- [ ] **Step 2: Создать историю**

Create `packages/webapp/src/components/ui/empty-state.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Users } from 'lucide-react';
import { EmptyState } from './empty-state';
import { Button } from './button';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  decorators: [
    (Story) => (
      <div className="bigfin-ui light bg-background p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof EmptyState> = {
  args: {
    icon: <Users className="h-8 w-8" />,
    title: 'Пока нет клиентов',
    description: 'Добавьте первого клиента, чтобы начать.',
    action: <Button>+ Новый клиент</Button>,
  },
};
```

- [ ] **Step 3: Типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 4: Визуальная проверка (Storybook)**

Run: `pnpm --filter @bigfin/webapp storybook` → открыть http://localhost:6006 → `UI/EmptyState`.
Expected: карточка пустого состояния на светлом фоне.

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/components/ui/empty-state.tsx packages/webapp/src/components/ui/empty-state.stories.tsx
git commit -m "feat(webapp): add EmptyState UI primitive"
```
Откат: `git checkout -- <файлы>` или удалить новые файлы.

---

## Task 2: `page-header.tsx`

**Files:**
- Create: `packages/webapp/src/components/ui/page-header.tsx`
- Create: `packages/webapp/src/components/ui/page-header.stories.tsx`

- [ ] **Step 1: Создать компонент**

Create `packages/webapp/src/components/ui/page-header.tsx`:

```tsx
import * as React from 'react';

export interface PageHeaderProps {
  title: React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
      {action}
    </div>
  );
}
```

- [ ] **Step 2: Создать историю**

Create `packages/webapp/src/components/ui/page-header.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { PageHeader } from './page-header';
import { Button } from './button';

const meta: Meta<typeof PageHeader> = {
  title: 'UI/PageHeader',
  component: PageHeader,
  decorators: [
    (Story) => (
      <div className="bigfin-ui light bg-background p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof PageHeader> = {
  args: { title: 'Клиенты', action: <Button>+ Новый клиент</Button> },
};
```

- [ ] **Step 3: Типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 4: Визуальная проверка**

Storybook → `UI/PageHeader`. Expected: заголовок слева, кнопка справа.

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/components/ui/page-header.tsx packages/webapp/src/components/ui/page-header.stories.tsx
git commit -m "feat(webapp): add PageHeader UI primitive"
```
Откат: удалить новые файлы.

---

## Task 3: `data-table-pagination.tsx`

**Files:**
- Create: `packages/webapp/src/components/ui/data-table-pagination.tsx`
- Create: `packages/webapp/src/components/ui/data-table-pagination.stories.tsx`

- [ ] **Step 1: Создать компонент**

Create `packages/webapp/src/components/ui/data-table-pagination.tsx`:

```tsx
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export interface DataTablePaginationProps {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  total?: number;
  pageSizeOptions?: number[];
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function DataTablePagination({
  pageIndex,
  pageSize,
  pageCount,
  total,
  pageSizeOptions = [20, 50, 100],
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to =
    total != null
      ? Math.min((pageIndex + 1) * pageSize, total)
      : (pageIndex + 1) * pageSize;

  return (
    <div className="flex items-center justify-between py-3 text-sm text-text-secondary">
      <span>
        {from}–{to}
        {total != null ? ` / ${total}` : ''}
      </span>
      <div className="flex items-center gap-2">
        <select
          className="h-8 rounded-md border border-border bg-surface-elevated px-2 text-text-primary"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {pageSizeOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          size="sm"
          disabled={pageIndex <= 0}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="tabular-nums">
          {pageIndex + 1} / {Math.max(pageCount, 1)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={pageIndex + 1 >= pageCount}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Создать историю**

Create `packages/webapp/src/components/ui/data-table-pagination.stories.tsx`:

```tsx
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DataTablePagination } from './data-table-pagination';

const meta: Meta<typeof DataTablePagination> = {
  title: 'UI/DataTablePagination',
  component: DataTablePagination,
  decorators: [
    (Story) => (
      <div className="bigfin-ui light bg-background p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof DataTablePagination> = {
  render: () => {
    const [pageIndex, setPageIndex] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(20);
    return (
      <DataTablePagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={7}
        total={124}
        onPageChange={setPageIndex}
        onPageSizeChange={setPageSize}
      />
    );
  },
};
```

- [ ] **Step 3: Типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 4: Визуальная проверка**

Storybook → `UI/DataTablePagination`. Expected: «1–20 / 124», селектор размера, стрелки (назад выключена).

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/components/ui/data-table-pagination.tsx packages/webapp/src/components/ui/data-table-pagination.stories.tsx
git commit -m "feat(webapp): add DataTablePagination UI primitive"
```
Откат: удалить новые файлы.

---

## Task 4: `data-table.tsx`

**Files:**
- Create: `packages/webapp/src/components/ui/data-table.tsx`
- Create: `packages/webapp/src/components/ui/data-table.stories.tsx`

> Логика — `react-table` v7 (`useTable` + `useSortBy`, ручная сортировка). Выделение управляется внутри компонента через `Set` id (без `useRowSelect`, чтобы не зависеть от инъекции колонки). Колонки react-table типизированы свободно (`any`) — это нормальная практика для v7 и не требует `@ts-nocheck`.

- [ ] **Step 1: Создать компонент**

Create `packages/webapp/src/components/ui/data-table.tsx`:

```tsx
import * as React from 'react';
import { useTable, useSortBy } from 'react-table';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Checkbox } from './checkbox';
import { Skeleton } from './skeleton';

export interface DataTableProps {
  columns: any[];
  data: any[];
  getRowId: (row: any) => string;
  loading?: boolean;
  enableSelection?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (row: any) => void;
  onSortChange?: (sortBy: { id: string; desc: boolean }[]) => void;
  emptyState?: React.ReactNode;
}

export function DataTable({
  columns,
  data,
  getRowId,
  loading = false,
  enableSelection = false,
  selectedIds,
  onSelectionChange,
  onRowClick,
  onSortChange,
  emptyState,
}: DataTableProps) {
  const [internalSel, setInternalSel] = React.useState<string[]>([]);
  const selected = selectedIds ?? internalSel;

  const setSelected = (ids: string[]) => {
    if (selectedIds === undefined) setInternalSel(ids);
    onSelectionChange?.(ids);
  };

  const allIds = React.useMemo(() => data.map(getRowId), [data, getRowId]);
  const allChecked = allIds.length > 0 && selected.length === allIds.length;
  const someChecked = selected.length > 0 && !allChecked;

  const toggleAll = (checked: boolean) => setSelected(checked ? allIds : []);
  const toggleRow = (id: string, checked: boolean) =>
    setSelected(checked ? [...selected, id] : selected.filter((x) => x !== id));

  const selectionColumn = React.useMemo(
    () => ({
      id: '__select__',
      disableSortBy: true,
      width: 40,
      Header: () => (
        <Checkbox
          aria-label="select-all"
          checked={allChecked ? true : someChecked ? 'indeterminate' : false}
          onCheckedChange={(v: boolean | 'indeterminate') => toggleAll(v === true)}
        />
      ),
      Cell: ({ row }: any) => {
        const id = getRowId(row.original);
        return (
          <Checkbox
            aria-label="select-row"
            checked={selected.includes(id)}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            onCheckedChange={(v: boolean | 'indeterminate') => toggleRow(id, v === true)}
          />
        );
      },
    }),
    [allChecked, someChecked, selected, allIds], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const tableColumns = React.useMemo(
    () => (enableSelection ? [selectionColumn, ...columns] : columns),
    [enableSelection, selectionColumn, columns],
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow, state } =
    useTable(
      {
        columns: tableColumns,
        data,
        manualSortBy: true,
        autoResetSortBy: false,
        disableSortRemove: true,
      } as any,
      useSortBy,
    ) as any;

  const sortBy = state.sortBy;
  React.useEffect(() => {
    onSortChange?.(sortBy);
  }, [sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loading && data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table {...getTableProps()} className="w-full border-collapse text-sm">
        <thead className="bg-surface-elevated">
          {headerGroups.map((hg: any) => (
            <tr {...hg.getHeaderGroupProps()}>
              {hg.headers.map((col: any) => (
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
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-t border-border">
                  {tableColumns.map((_c, ci) => (
                    <td key={ci} className="px-3 py-2">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row: any) => {
                prepareRow(row);
                return (
                  <tr
                    {...row.getRowProps()}
                    onClick={() => onRowClick?.(row.original)}
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
                          cell.column.align === 'right' && 'text-right',
                        )}
                      >
                        {cell.render('Cell')}
                      </td>
                    ))}
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
```

> `Skeleton` — именованный экспорт из `components/ui/skeleton.tsx` (проверено).

- [ ] **Step 2: Создать историю с примером «Клиенты»** (главная визуальная приёмка)

Create `packages/webapp/src/components/ui/data-table.stories.tsx`:

```tsx
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DataTable } from './data-table';
import { Badge } from './badge';

const meta: Meta<typeof DataTable> = {
  title: 'UI/DataTable',
  component: DataTable,
  decorators: [
    (Story) => (
      <div className="bigfin-ui light bg-background p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;

const data = [
  { id: 1, display_name: 'ООО «Ромашка»', email: 'info@romashka.ru', phone: '+7 495 123-45-67', balance: '124 500 ₽', active: true },
  { id: 2, display_name: 'ИП Сидоров А.В.', email: 'sidorov@mail.ru', phone: '+7 916 555-22-11', balance: '−8 200 ₽', active: true },
  { id: 3, display_name: 'ООО «ТехноСтрой»', email: 'buh@technostroy.ru', phone: '+7 812 700-10-20', balance: '0 ₽', active: false },
  { id: 4, display_name: 'Кафе «Уют»', email: 'cafe.uyut@yandex.ru', phone: '+7 999 888-77-66', balance: '45 300 ₽', active: true },
];

const columns = [
  { id: 'display_name', Header: 'Название', accessor: 'display_name' },
  { id: 'email', Header: 'Email', accessor: 'email', disableSortBy: true },
  { id: 'phone', Header: 'Телефон', accessor: 'phone', disableSortBy: true },
  { id: 'balance', Header: 'Баланс', accessor: 'balance', align: 'right' },
  {
    id: 'status',
    Header: 'Статус',
    accessor: 'active',
    disableSortBy: true,
    Cell: ({ row: { original } }: any) => (
      <Badge variant={original.active ? 'secondary' : 'outline'}>
        {original.active ? 'Активен' : 'Неактивен'}
      </Badge>
    ),
  },
];

export const CustomersExample: StoryObj<typeof DataTable> = {
  render: () => {
    const [selected, setSelected] = React.useState<string[]>([]);
    return (
      <DataTable
        columns={columns}
        data={data}
        getRowId={(r) => String(r.id)}
        enableSelection
        selectedIds={selected}
        onSelectionChange={setSelected}
        onRowClick={() => {}}
      />
    );
  },
};

export const Loading: StoryObj<typeof DataTable> = {
  args: { columns, data: [], getRowId: (r: any) => String(r.id), loading: true },
};
```

- [ ] **Step 3: Типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок. (Если TS ругается на `react-table` — проверьте, что приведения `as any` на месте у вызова `useTable`.)

- [ ] **Step 4: Визуальная проверка**

Storybook → `UI/DataTable` → `CustomersExample`. Expected: светлая таблица, чекбоксы выделения, клик по «Название» сортирует (стрелка), статус-бейджи. История `Loading` — скелетоны.

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/components/ui/data-table.tsx packages/webapp/src/components/ui/data-table.stories.tsx
git commit -m "feat(webapp): add DataTable UI primitive (react-table v7)"
```
Откат: удалить новые файлы.

---

## Task 5: `list-toolbar.tsx`

**Files:**
- Create: `packages/webapp/src/components/ui/list-toolbar.tsx`
- Create: `packages/webapp/src/components/ui/list-toolbar.stories.tsx`

- [ ] **Step 1: Создать компонент**

Create `packages/webapp/src/components/ui/list-toolbar.tsx`:

```tsx
import * as React from 'react';
import { Search } from 'lucide-react';
import { Input } from './input';

export interface ListToolbarProps {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  selectedCount?: number;
  bulkActions?: React.ReactNode;
  children?: React.ReactNode;
}

export function ListToolbar({
  search = '',
  onSearchChange,
  searchPlaceholder,
  selectedCount = 0,
  bulkActions,
  children,
}: ListToolbarProps) {
  if (selectedCount > 0 && bulkActions) {
    return (
      <div className="mb-3 flex items-center gap-3 rounded-md border border-border bg-surface-elevated px-3 py-2">
        <span className="text-sm font-medium text-text-secondary tabular-nums">
          {selectedCount}
        </span>
        {bulkActions}
      </div>
    );
  }

  return (
    <div className="mb-3 flex items-center gap-2">
      {onSearchChange && (
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            placeholder={searchPlaceholder}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
      )}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Создать историю**

Create `packages/webapp/src/components/ui/list-toolbar.stories.tsx`:

```tsx
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ListToolbar } from './list-toolbar';
import { Button } from './button';

const meta: Meta<typeof ListToolbar> = {
  title: 'UI/ListToolbar',
  component: ListToolbar,
  decorators: [
    (Story) => (
      <div className="bigfin-ui light bg-background p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;

export const Search: StoryObj<typeof ListToolbar> = {
  render: () => {
    const [s, setS] = React.useState('');
    return <ListToolbar search={s} onSearchChange={setS} searchPlaceholder="Поиск…" />;
  },
};

export const WithSelection: StoryObj<typeof ListToolbar> = {
  args: {
    selectedCount: 3,
    bulkActions: (
      <Button variant="destructive" size="sm">
        Удалить выбранные
      </Button>
    ),
  },
};
```

- [ ] **Step 3: Типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 4: Визуальная проверка**

Storybook → `UI/ListToolbar`. Expected: история `Search` — поле поиска; `WithSelection` — панель «3 + Удалить выбранные».

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/components/ui/list-toolbar.tsx packages/webapp/src/components/ui/list-toolbar.stories.tsx
git commit -m "feat(webapp): add ListToolbar UI primitive"
```
Откат: удалить новые файлы.

---

## Task 6: Чистые функции `format.ts` (TDD)

**Files:**
- Create: `packages/webapp/src/containers/Customers/CustomersLandingV2/format.ts`
- Test: `packages/webapp/src/containers/Customers/CustomersLandingV2/format.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Create `packages/webapp/src/containers/Customers/CustomersLandingV2/format.spec.ts`:

```ts
import { customerStatus, formatBalance, isNegativeBalance } from './format';

describe('customerStatus', () => {
  it('maps active flag to status key', () => {
    expect(customerStatus(true)).toBe('active');
    expect(customerStatus(false)).toBe('inactive');
  });
});

describe('isNegativeBalance', () => {
  it('detects negative balances only', () => {
    expect(isNegativeBalance(-8200)).toBe(true);
    expect(isNegativeBalance(0)).toBe(false);
    expect(isNegativeBalance(124500)).toBe(false);
  });
});

describe('formatBalance', () => {
  it('formats RUB amounts in ru-RU with the currency sign', () => {
    const s = formatBalance(124500, 'RUB');
    expect(s).toContain('₽');
    expect(s.replace(/ |\s/g, '')).toContain('124500');
  });

  it('falls back to RUB when currency is missing', () => {
    expect(formatBalance(0)).toContain('₽');
  });

  it('treats non-numeric input as zero', () => {
    expect(formatBalance(undefined as unknown as number, 'RUB')).toContain('0');
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/webapp test -- run format`
Expected: FAIL — `Failed to resolve import './format'`.

- [ ] **Step 3: Реализовать**

Create `packages/webapp/src/containers/Customers/CustomersLandingV2/format.ts`:

```ts
export type CustomerStatus = 'active' | 'inactive';

/** Boolean флаг активности → ключ статуса (для i18n и бейджа). */
export function customerStatus(active: boolean): CustomerStatus {
  return active ? 'active' : 'inactive';
}

/** Отрицательный ли баланс (для подсветки красным). */
export function isNegativeBalance(amount: number): boolean {
  return Number(amount) < 0;
}

/** Денежный формат ru-RU. Пустой/нечисловой вход → 0. Валюта по умолчанию — RUB. */
export function formatBalance(amount: number, currencyCode = 'RUB'): string {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currencyCode || 'RUB',
    maximumFractionDigits: 2,
  }).format(value);
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/webapp test -- run format`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/containers/Customers/CustomersLandingV2/format.ts packages/webapp/src/containers/Customers/CustomersLandingV2/format.spec.ts
git commit -m "feat(webapp): add customers list format helpers with tests"
```
Откат: удалить новые файлы.

---

## Task 7: `columns.tsx`

**Files:**
- Create: `packages/webapp/src/containers/Customers/CustomersLandingV2/columns.tsx`

> Колонки react-table v7 для клиентов. Поля из API клиента (`display_name`, `company_name`, `personal_phone`, `closing_balance`, `currency_code`, `active`, `id`). Баланс/статус — через `format.ts` и `Badge`. Последняя колонка — меню действий строки (открыть/изменить/удалить) на `DropdownMenu`; обработчики приходят из страницы (Task 8). Ключи `view_details`/`edit_customer`/`delete_customer` уже существуют.

- [ ] **Step 1: Создать колонки**

Create `packages/webapp/src/containers/Customers/CustomersLandingV2/columns.tsx`:

```tsx
import * as React from 'react';
import intl from 'react-intl-universal';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/cn';
import { customerStatus, formatBalance, isNegativeBalance } from './format';

export interface CustomersColumnHandlers {
  onView: (customer: any) => void;
  onEdit: (customer: any) => void;
  onDelete: (customer: any) => void;
}

export function useCustomersColumns({
  onView,
  onEdit,
  onDelete,
}: CustomersColumnHandlers) {
  return React.useMemo(
    () => [
      {
        id: 'display_name',
        Header: intl.get('display_name'),
        accessor: 'display_name',
      },
      {
        id: 'company_name',
        Header: intl.get('company_name'),
        accessor: 'company_name',
      },
      {
        id: 'work_phone',
        Header: intl.get('phone_number'),
        accessor: 'personal_phone',
        disableSortBy: true,
      },
      {
        id: 'balance',
        Header: intl.get('receivable_balance'),
        accessor: 'closing_balance',
        align: 'right',
        Cell: ({ row: { original } }: any) => (
          <span
            className={cn(
              isNegativeBalance(original.closing_balance) && 'text-danger',
            )}
          >
            {formatBalance(original.closing_balance, original.currency_code)}
          </span>
        ),
      },
      {
        id: 'status',
        Header: intl.get('customers.col.status'),
        accessor: 'active',
        disableSortBy: true,
        Cell: ({ row: { original } }: any) => {
          const st = customerStatus(!!original.active);
          return (
            <Badge variant={st === 'active' ? 'secondary' : 'outline'}>
              {intl.get(`customers.status.${st}`)}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        Header: '',
        disableSortBy: true,
        align: 'right',
        width: 48,
        Cell: ({ row: { original } }: any) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={intl.get('customers.row_actions')}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="rounded-md p-1 text-text-secondary hover:bg-surface-elevated"
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={() => onView(original)}>
                {intl.get('view_details')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(original)}>
                {intl.get('edit_customer')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger"
                onClick={() => onDelete(original)}
              >
                {intl.get('delete_customer')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onView, onEdit, onDelete],
  );
}
```

- [ ] **Step 2: Типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/containers/Customers/CustomersLandingV2/columns.tsx
git commit -m "feat(webapp): add customers list columns"
```
Откат: удалить файл.

> Примечание: ключи `customers.col.status`, `customers.status.active`, `customers.status.inactive` добавляются в Task 11. До этого `intl.get` вернёт ключ как текст — это не ломает typecheck/Storybook.

---

## Task 8: Страница `CustomersListV2.tsx`

**Files:**
- Create: `packages/webapp/src/containers/Customers/CustomersLandingV2/CustomersListV2.tsx`

> Переиспользуем существующие: `useCustomers` (данные), `useBulkDeleteCustomersDialog` (диалог массового удаления + валидация), drawer карточки (`withDrawerActions` + `DRAWERS.CUSTOMER_DETAILS`), алерт удаления (`withAlertActions` + `customer-delete`), `transformCustomersStateToQuery`. Поиск — клиентский по загруженной странице (серверный поиск — follow-up к паритету). Корень — `.bigfin-ui light`.

- [ ] **Step 1: Создать страницу**

Create `packages/webapp/src/containers/Customers/CustomersLandingV2/CustomersListV2.tsx`:

```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Plus, Trash2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { ListToolbar } from '@/components/ui/list-toolbar';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';

import { useCustomers } from '@/hooks/query/customers';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { DRAWERS } from '@/constants/drawers';
import { compose } from '@/utils';

import { transformCustomersStateToQuery } from '../CustomersLanding/utils';
import { useBulkDeleteCustomersDialog } from '../CustomersLanding/hooks/use-bulk-delete-customers-dialog';
import { useCustomersColumns } from './columns';

function CustomersListV2({
  openDrawer,
  openAlert,
}: {
  openDrawer: (name: string, payload?: any) => void;
  openAlert: (name: string, payload?: any) => void;
}) {
  const history = useHistory();
  const { openBulkDeleteDialog } = useBulkDeleteCustomersDialog();

  const openCustomer = React.useCallback(
    (c: any) => openDrawer(DRAWERS.CUSTOMER_DETAILS, { customerId: c.id }),
    [openDrawer],
  );
  const editCustomer = React.useCallback(
    (c: any) => history.push(`/customers/${c.id}/edit`),
    [history],
  );
  const deleteCustomer = React.useCallback(
    (c: any) => openAlert('customer-delete', { contactId: c.id }),
    [openAlert],
  );
  const columns = useCustomersColumns({
    onView: openCustomer,
    onEdit: editCustomer,
    onDelete: deleteCustomer,
  });

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(20);
  const [sortBy, setSortBy] = React.useState<{ id: string; desc: boolean }[]>([]);
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState<string[]>([]);

  const query = React.useMemo(
    () =>
      transformCustomersStateToQuery({
        pageIndex,
        pageSize,
        sortBy,
        inactiveMode: false,
      }),
    [pageIndex, pageSize, sortBy],
  );

  const {
    data: { customers, pagination },
    isFetching,
  } = useCustomers(query, { keepPreviousData: true });

  // Клиентский поиск по загруженной странице (серверный — follow-up к паритету).
  const rows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c: any) =>
      [c.display_name, c.company_name, c.personal_phone]
        .filter(Boolean)
        .some((v: any) => String(v).toLowerCase().includes(q)),
    );
  }, [customers, search]);

  const goNew = () => history.push('/customers/new');

  return (
    <div className="bigfin-ui light min-h-full bg-background p-6">
      <PageHeader
        title={intl.get('customers')}
        action={
          <Button onClick={goNew}>
            <Plus className="h-4 w-4" />
            {intl.get('new_customer')}
          </Button>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={intl.get('customers.search_placeholder')}
        selectedCount={selected.length}
        bulkActions={
          <Button
            variant="destructive"
            size="sm"
            onClick={() => openBulkDeleteDialog(selected.map(Number))}
          >
            <Trash2 className="h-4 w-4" />
            {intl.get('customers.list.bulk_delete')}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(c) => String(c.id)}
        loading={isFetching}
        enableSelection
        selectedIds={selected}
        onSelectionChange={setSelected}
        onSortChange={setSortBy}
        onRowClick={openCustomer}
        emptyState={
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={intl.get('customers.empty.title')}
            description={intl.get('customers.empty.description')}
            action={
              <Button onClick={goNew}>
                <Plus className="h-4 w-4" />
                {intl.get('new_customer')}
              </Button>
            }
          />
        }
      />

      <DataTablePagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={pagination.pagesCount}
        total={pagination.total}
        onPageChange={setPageIndex}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPageIndex(0);
        }}
      />
    </div>
  );
}

const ComposedCustomersListV2 = compose(
  withDrawerActions,
  withAlertActions,
)(CustomersListV2);

export { ComposedCustomersListV2 as CustomersListV2 };
export default ComposedCustomersListV2;
```

> `pagination` (из `transformPagination`) содержит `pagesCount` и, как правило, `total`. Проп `total` опционален: если его нет — `DataTablePagination` покажет только диапазон.

- [ ] **Step 2: Типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/containers/Customers/CustomersLandingV2/CustomersListV2.tsx
git commit -m "feat(webapp): add CustomersListV2 page (flagged)"
```
Откат: удалить файл.

---

## Task 9: Переключатель + маршрут

**Files:**
- Create: `packages/webapp/src/containers/Customers/CustomersLandingV2/CustomersListSwitch.tsx`
- Modify: `packages/webapp/src/routes/dashboard.tsx` (~стр. 600)

- [ ] **Step 1: Создать переключатель**

Create `packages/webapp/src/containers/Customers/CustomersLandingV2/CustomersListSwitch.tsx`:

```tsx
import React from 'react';
import { useFeatureCan } from '@/hooks/state/feature';
import CustomersList from '../CustomersLanding/CustomersList';
import { CustomersListV2 } from './CustomersListV2';

/**
 * Рендерит новый список «Клиенты» при включённом флаге customers_list_v2,
 * иначе — текущий (легаси) список. Strangler Fig: старый код не трогаем.
 */
export default function CustomersListSwitch() {
  const { featureCan } = useFeatureCan();
  return featureCan('customers_list_v2') ? <CustomersListV2 /> : <CustomersList />;
}
```

- [ ] **Step 2: Показать текущий маршрут**

Открыть `packages/webapp/src/routes/dashboard.tsx`, найти около строки 600:

```tsx
      () => import('@/containers/Customers/CustomersLanding/CustomersList'),
```

- [ ] **Step 3: Перенаправить маршрут на переключатель**

Заменить эту строку на:

```tsx
      () => import('@/containers/Customers/CustomersLandingV2/CustomersListSwitch'),
```

(Меняется только путь импорта в ленивой загрузке компонента маршрута `/customers`. Остальное не трогаем.)

- [ ] **Step 4: Типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/containers/Customers/CustomersLandingV2/CustomersListSwitch.tsx packages/webapp/src/routes/dashboard.tsx
git commit -m "feat(webapp): route /customers through new-list feature switch"
```
Откат: `git checkout -- packages/webapp/src/routes/dashboard.tsx` + удалить переключатель.

---

## Task 10: Фиче-флаг на сервере (additive)

**Files:**
- Modify: `packages/server/src/common/types/Features.ts`
- Modify: `packages/server/src/modules/Features/FeaturesConfigure.ts`

- [ ] **Step 1: Добавить флаг в enum**

В `packages/server/src/common/types/Features.ts`, в enum `Features`, добавить строку после `BUDGETS`:

```ts
  CUSTOMERS_LIST_V2 = 'customers_list_v2',
```

- [ ] **Step 2: Зарегистрировать флаг с default false**

В `packages/server/src/modules/Features/FeaturesConfigure.ts`, в массив `getConfigure()`, добавить после блока `Features.BUDGETS`:

```ts
      {
        name: Features.CUSTOMERS_LIST_V2,
        defaultValue: false,
      },
```

- [ ] **Step 3: Типы сервера**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: без ошибок.

> Прогон сервера/миграций локально не требуется: изменение additive и конфигурационное (без БД). Включение флага для организации — операционная задача (staging), локально новый список смотрим в Storybook.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/common/types/Features.ts packages/server/src/modules/Features/FeaturesConfigure.ts
git commit -m "feat(server): register customers_list_v2 feature flag (default off)"
```
Откат: `git checkout -- <оба файла>`.

---

## Task 11: i18n-ключи

**Files:**
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Добавить ключи в EN**

В `packages/webapp/src/lang/en/index.json` добавить (рядом с другими `customers.*`, либо в конец перед закрывающей `}` — соблюдая запятые):

```json
  "customers.col.status": "Status",
  "customers.status.active": "Active",
  "customers.status.inactive": "Inactive",
  "customers.row_actions": "Actions",
  "customers.search_placeholder": "Search this page…",
  "customers.empty.title": "No customers yet",
  "customers.empty.description": "Add your first customer to get started.",
  "customers.list.bulk_delete": "Delete selected",
```

- [ ] **Step 2: Добавить те же ключи в RU**

В `packages/webapp/src/lang/ru/index.json` (тот же набор ключей, тот же порядок):

```json
  "customers.col.status": "Статус",
  "customers.status.active": "Активен",
  "customers.status.inactive": "Неактивен",
  "customers.row_actions": "Действия",
  "customers.search_placeholder": "Поиск по странице…",
  "customers.empty.title": "Пока нет клиентов",
  "customers.empty.description": "Добавьте первого клиента, чтобы начать.",
  "customers.list.bulk_delete": "Удалить выбранные",
```

- [ ] **Step 3: Проверить парность**

Run: `pnpm --filter @bigfin/webapp lang:check`
Expected: `✅ OK: парность ключей en↔ru соблюдена.`

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(webapp): i18n keys for customers list redesign"
```
Откат: `git checkout -- <оба lang-файла>`.

---

## Финальная проверка (после всех задач)

- [ ] **Юнит-тесты:** `pnpm --filter @bigfin/webapp test -- run format` — 5 зелёных.
- [ ] **Типы (web):** `pnpm --filter @bigfin/webapp typecheck` — 0 ошибок.
- [ ] **Типы (server):** `pnpm --filter @bigfin/server typecheck` — 0 ошибок.
- [ ] **Парность langs:** `pnpm --filter @bigfin/webapp lang:check` — exit 0.
- [ ] **Storybook:** `pnpm --filter @bigfin/webapp storybook` → проверить `UI/DataTable → CustomersExample`, `UI/ListToolbar`, `UI/EmptyState`, `UI/PageHeader`, `UI/DataTablePagination` — рендерятся в светлой теме.
- [ ] **Флаг off:** маршрут `/customers` рендерит старый список (флаг `customers_list_v2` по умолчанию false). Старые файлы не удалены.
- [ ] **Ничего не удалено**, новых зависимостей нет (`git diff --stat` не трогает `package.json`/lockfile).

---

## Открытые вопросы / follow-up (вне этого плана)

1. **Серверный поиск** (сейчас клиентский по странице) — подключить к фильтр-механизму `customers`.
2. **Паритет:** сохранённые виды, продвинутый фильтр, печать/экспорт PDF, импорт, «неактивные», высота строк — отдельными срезами теми же примитивами.
3. **Тиражирование шаблона** на Поставщиков/Товары/Счета; при этом — общий флаг `lists_redesign` вместо пер-списочного.
4. **Поле баланса:** в плане используется `closing_balance`/`currency_code`. Если в API клиента имена иные — поправить в `columns.tsx` (1 место).
