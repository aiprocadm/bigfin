# Тираж редизайна списков: «Поставщики» + общий движок — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вынести из пилота «Клиенты» переиспользуемый движок списка (`ListView` + `useListController` + общие форматтеры), перевести на него (не-живой за флагом) список «Клиенты V2», и добавить новый список «Поставщики V2» за флагом `vendors_list_v2` (default off).

**Architecture:** Strangler Fig. Общий движок — в `components/ui/list-view/` (презентационный `ListView` + хук состояния `useListController` + чистые `filter-rows`/`list-format` с тестами). Каждый список — тонкий «адаптер»: вызывает свой react-query хук и HOC-действия, собирает колонки, рендерит `<ListView>`. Маршрут переключается по фиче-флагу; легаси не трогаем.

**Tech Stack:** React 18 + TypeScript (strict, без `@ts-nocheck`), `react-table` v7 (уже в зависимостях), Tailwind 4 + shadcn-примитивы, `react-intl-universal`, Vitest, Storybook 8.

**Spec:** [../specs/2026-06-05-vendors-list-redesign-design.md](../specs/2026-06-05-vendors-list-redesign-design.md)

---

## Pre-flight (читать до старта)

- **Ветка:** работу вести в `feat/vendors-list-redesign` от `develop` (создаётся на старте исполнения через `superpowers:using-git-worktrees`). НЕ на `chore/dependabot-config`. Спека и этот план коммитятся первым коммитом на ветке.
- **Окружение:** Node 18.16.1 (`fnm use 18.16.1` / `nvm use 18.16.1`), только `pnpm`. Бэкенд не нужен — проверки локальные.
- **Без новых зависимостей.** Используем уже установленный `react-table` v7. НЕ запускать `pnpm install`.
- **Команды (из корня репозитория):**
  - Типы (web): `pnpm --filter @bigfin/webapp typecheck`
  - Типы (server): `pnpm --filter @bigfin/server typecheck`
  - Один тест-файл разово: `pnpm --filter @bigfin/webapp test -- run <шаблон>`
  - Парность langs: `pnpm --filter @bigfin/webapp lang:check`
  - Storybook (визуальная приёмка): `pnpm --filter @bigfin/webapp storybook` → http://localhost:6006
- **Тест-раннер:** Vitest, глобальные `describe/it/expect` (импортировать не нужно). Алиас `@` → `packages/webapp/src`.
- **Тема:** корень новой страницы — `.bigfin-ui light` (механизм уже есть; `ListView` оборачивает сам).
- **i18n:** строки экрана — через `intl.get('...')`. Новые ключи (Task 11) добавляются парно EN+RU. До Task 11 `intl.get('vendors.*')` вернёт ключ как текст — это не ломает typecheck/Storybook.
- **commitlint:** conventional commits, заголовок ≤100 симв. без точки в конце.
- **Правила основателя:** маленькие шаги, после каждой задачи — проверка + откат. Всё additive, легаси не удаляем. Бренд везде — только `Bigfin`.
- **Флаги** `customers_list_v2` и `vendors_list_v2` остаются off по умолчанию → прод-поведение (`/customers`, `/vendors`) не меняется.

---

## File Structure

| Файл | Ответственность | Действие |
|---|---|---|
| `components/ui/list-view/list-format.ts` (+ `.spec.ts`) | Чистые форматтеры: баланс, отрицательность, статус | Create |
| `components/ui/list-view/filter-rows.ts` (+ `.spec.ts`) | Чистый клиентский поиск по странице | Create |
| `components/ui/list-view/use-list-controller.ts` | Хук состояния списка (страница/сорт/поиск/выделение) + query | Create |
| `components/ui/list-view/list-view.tsx` (+ `.stories.tsx`) | Презентационный экран списка (шапка/тулбар/таблица/пагинация) | Create |
| `containers/Customers/CustomersLandingV2/format.ts` | Тонкий ре-экспорт из общего `list-format` | Modify |
| `containers/Customers/CustomersLandingV2/CustomersListV2.tsx` | Перевод на `ListView` + `useListController` | Modify |
| `containers/Vendors/VendorsLandingV2/columns.tsx` | Колонки списка поставщиков | Create |
| `containers/Vendors/VendorsLandingV2/VendorsListV2.tsx` | Страница-адаптер поставщиков | Create |
| `containers/Vendors/VendorsLandingV2/VendorsListSwitch.tsx` | Переключатель new/old по флагу | Create |
| `routes/dashboard.tsx` (стр. 660-662) | Маршрут `/vendors` → переключатель | Modify |
| `common/types/Features.ts` (server) | + флаг `VENDORS_LIST_V2` | Modify |
| `modules/Features/FeaturesConfigure.ts` (server) | + регистрация флага (default false) | Modify |
| `lang/en/index.json`, `lang/ru/index.json` | + 8 ключей `vendors.*` (парно) | Modify |

Порядок: движок (чистые функции TDD → хук → ListView) → рефактор «Клиентов» → адаптер «Поставщиков» → маршрут → флаг (сервер) → i18n → финальная проверка.

---

## Task 1: `list-format.ts` — общие форматтеры (TDD)

**Files:**
- Create: `packages/webapp/src/components/ui/list-view/list-format.ts`
- Test: `packages/webapp/src/components/ui/list-view/list-format.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Create `packages/webapp/src/components/ui/list-view/list-format.spec.ts`:

```ts
import { activeStatus, formatBalance, isNegativeBalance } from './list-format';

describe('activeStatus', () => {
  it('maps active flag to status key', () => {
    expect(activeStatus(true)).toBe('active');
    expect(activeStatus(false)).toBe('inactive');
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
    expect(s.replace(/ |\s/g, '')).toContain('124500');
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

Run: `pnpm --filter @bigfin/webapp test -- run list-format`
Expected: FAIL — `Failed to resolve import './list-format'`.

- [ ] **Step 3: Реализовать**

Create `packages/webapp/src/components/ui/list-view/list-format.ts`:

```ts
export type ActiveStatus = 'active' | 'inactive';

/** Boolean флаг активности → ключ статуса (для i18n и бейджа). */
export function activeStatus(active: boolean): ActiveStatus {
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

Run: `pnpm --filter @bigfin/webapp test -- run list-format`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/components/ui/list-view/list-format.ts packages/webapp/src/components/ui/list-view/list-format.spec.ts
git commit -m "feat(webapp): add shared list-format helpers with tests"
```
Откат: удалить новые файлы.

---

## Task 2: `filter-rows.ts` — клиентский поиск (TDD)

**Files:**
- Create: `packages/webapp/src/components/ui/list-view/filter-rows.ts`
- Test: `packages/webapp/src/components/ui/list-view/filter-rows.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Create `packages/webapp/src/components/ui/list-view/filter-rows.spec.ts`:

```ts
import { filterRows } from './filter-rows';

const rows = [
  { display_name: 'ООО «Ромашка»', company_name: 'Ромашка', work_phone: '+7 495 123-45-67' },
  { display_name: 'ИП Сидоров', company_name: '', work_phone: '+7 916 555-22-11' },
  { display_name: 'ТехноСтрой', company_name: 'ТехноСтрой', work_phone: null },
];
const fields = ['display_name', 'company_name', 'work_phone'];

describe('filterRows', () => {
  it('returns all rows for empty / whitespace query', () => {
    expect(filterRows(rows, '', fields)).toHaveLength(3);
    expect(filterRows(rows, '   ', fields)).toHaveLength(3);
  });

  it('matches a substring case-insensitively', () => {
    expect(filterRows(rows, 'ромашка', fields)).toHaveLength(1);
    expect(filterRows(rows, 'РОМАШ', fields)).toHaveLength(1);
  });

  it('matches across any of the listed fields', () => {
    expect(filterRows(rows, '555-22-11', fields)).toHaveLength(1);
    expect(filterRows(rows, 'Сидоров', fields)).toHaveLength(1);
  });

  it('ignores null/empty field values without throwing', () => {
    expect(filterRows(rows, 'ТехноСтрой', fields)).toHaveLength(1);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterRows(rows, 'нет-такого', fields)).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/webapp test -- run filter-rows`
Expected: FAIL — `Failed to resolve import './filter-rows'`.

- [ ] **Step 3: Реализовать**

Create `packages/webapp/src/components/ui/list-view/filter-rows.ts`:

```ts
/**
 * Клиентский поиск по загруженной странице: оставляет строки, где запрос
 * (подстрока, регистронезависимо, с trim) встречается хотя бы в одном из
 * перечисленных полей. Пустой запрос → исходные строки без изменений.
 */
export function filterRows<T extends Record<string, any>>(
  rows: T[],
  search: string,
  fields: string[],
): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    fields
      .map((field) => row[field])
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q)),
  );
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/webapp test -- run filter-rows`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/components/ui/list-view/filter-rows.ts packages/webapp/src/components/ui/list-view/filter-rows.spec.ts
git commit -m "feat(webapp): add filterRows client-side list search with tests"
```
Откат: удалить новые файлы.

---

## Task 3: `use-list-controller.ts` — хук состояния списка

**Files:**
- Create: `packages/webapp/src/components/ui/list-view/use-list-controller.ts`

> Хук-«клей»: держит состояние таблицы (страница/размер/сортировка/поиск/выделение), строит серверный `query` через инъекцию `transform`, и отдаёт `applySearch` (делегирует в протестированный `filterRows`). Выделение сбрасывается при смене страницы/размера (поведение пилота после ревью — выделение per-page). Чистая логика уже покрыта тестами Task 1–2; здесь проверка — typecheck.

- [ ] **Step 1: Создать хук**

Create `packages/webapp/src/components/ui/list-view/use-list-controller.ts`:

```ts
import * as React from 'react';
import { filterRows } from './filter-rows';

export interface ListControllerState {
  pageIndex: number;
  pageSize: number;
  sortBy: { id: string; desc: boolean }[];
  inactiveMode: boolean;
}

export interface ListControllerOptions {
  /** Преобразование состояния таблицы в серверный query (per-list). */
  transform: (state: ListControllerState) => any;
  /** Поля строки, по которым идёт клиентский поиск. Передавать стабильную ссылку. */
  searchFields: string[];
  initialPageSize?: number;
}

export function useListController({
  transform,
  searchFields,
  initialPageSize = 20,
}: ListControllerOptions) {
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [sortBy, setSortBy] = React.useState<{ id: string; desc: boolean }[]>([]);
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState<string[]>([]);

  const query = React.useMemo(
    () => transform({ pageIndex, pageSize, sortBy, inactiveMode: false }),
    [pageIndex, pageSize, sortBy], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Выделение — per-page: при навигации по страницам сбрасываем.
  const onPageChange = React.useCallback((idx: number) => {
    setPageIndex(idx);
    setSelected([]);
  }, []);
  const onPageSizeChange = React.useCallback((size: number) => {
    setPageSize(size);
    setPageIndex(0);
    setSelected([]);
  }, []);

  const applySearch = React.useCallback(
    (rows: any[]) => filterRows(rows, search, searchFields),
    [search, searchFields],
  );

  return {
    pageIndex,
    pageSize,
    sortBy,
    search,
    selected,
    query,
    setSortBy,
    setSearch,
    setSelected,
    onPageChange,
    onPageSizeChange,
    applySearch,
  };
}
```

- [ ] **Step 2: Типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/components/ui/list-view/use-list-controller.ts
git commit -m "feat(webapp): add useListController list state hook"
```
Откат: удалить файл.

---

## Task 4: `list-view.tsx` — презентационный экран + история

**Files:**
- Create: `packages/webapp/src/components/ui/list-view/list-view.tsx`
- Create: `packages/webapp/src/components/ui/list-view/list-view.stories.tsx`

> Энтити-независимый экран: `.bigfin-ui light` обёртка + `PageHeader` + `ListToolbar` + `DataTable` + `DataTablePagination`. Пустое состояние и колонки приходят пропсами. Пагинация скрыта, пока идёт загрузка пустого списка (поведение пилота после ревью).

- [ ] **Step 1: Создать компонент**

Create `packages/webapp/src/components/ui/list-view/list-view.tsx`:

```tsx
import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { ListToolbar } from '@/components/ui/list-toolbar';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

export interface ListViewProps {
  title: React.ReactNode;
  primaryAction?: { label: React.ReactNode; onClick: () => void };
  columns: any[];
  data: any[];
  getRowId: (row: any) => string;
  loading?: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  bulkDelete?: { label: React.ReactNode; onClick: (ids: string[]) => void };
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  total?: number;
  onPageChange: (idx: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortChange?: (sortBy: { id: string; desc: boolean }[]) => void;
  onRowClick?: (row: any) => void;
  emptyState?: React.ReactNode;
}

export function ListView({
  title,
  primaryAction,
  columns,
  data,
  getRowId,
  loading = false,
  search,
  onSearchChange,
  searchPlaceholder,
  selectedIds,
  onSelectionChange,
  bulkDelete,
  pageIndex,
  pageSize,
  pageCount,
  total,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onRowClick,
  emptyState,
}: ListViewProps) {
  return (
    <div className="bigfin-ui light min-h-full bg-background p-6">
      <PageHeader
        title={title}
        action={
          primaryAction && (
            <Button onClick={primaryAction.onClick}>
              <Plus className="h-4 w-4" />
              {primaryAction.label}
            </Button>
          )
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        selectedCount={selectedIds.length}
        bulkActions={
          bulkDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => bulkDelete.onClick(selectedIds)}
            >
              <Trash2 className="h-4 w-4" />
              {bulkDelete.label}
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={data}
        getRowId={getRowId}
        loading={loading}
        enableSelection
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        onSortChange={onSortChange}
        onRowClick={onRowClick}
        emptyState={emptyState}
      />

      {(!loading || data.length > 0) && (
        <DataTablePagination
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageCount={pageCount}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Создать историю**

Create `packages/webapp/src/components/ui/list-view/list-view.stories.tsx`:

```tsx
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Building2 } from 'lucide-react';
import { ListView } from './list-view';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

const meta: Meta<typeof ListView> = {
  title: 'UI/ListView',
  component: ListView,
};
export default meta;

const data = [
  { id: 1, display_name: 'ООО «Ромашка»', company_name: 'Ромашка', work_phone: '+7 495 123-45-67', closing_balance: 124500, currency_code: 'RUB', active: true },
  { id: 2, display_name: 'ИП Сидоров А.В.', company_name: '', work_phone: '+7 916 555-22-11', closing_balance: -8200, currency_code: 'RUB', active: true },
  { id: 3, display_name: 'ООО «ТехноСтрой»', company_name: 'ТехноСтрой', work_phone: '+7 812 700-10-20', closing_balance: 0, currency_code: 'RUB', active: false },
];

const columns = [
  { id: 'display_name', Header: 'Название', accessor: 'display_name' },
  { id: 'company_name', Header: 'Компания', accessor: 'company_name' },
  { id: 'work_phone', Header: 'Телефон', accessor: 'work_phone', disableSortBy: true },
  { id: 'balance', Header: 'Баланс', accessor: 'closing_balance', align: 'right' },
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

export const Default: StoryObj<typeof ListView> = {
  render: () => {
    const [search, setSearch] = React.useState('');
    const [selected, setSelected] = React.useState<string[]>([]);
    return (
      <ListView
        title="Поставщики"
        primaryAction={{ label: 'Новый поставщик', onClick: () => {} }}
        columns={columns}
        data={data}
        getRowId={(r) => String(r.id)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Поиск по странице…"
        selectedIds={selected}
        onSelectionChange={setSelected}
        bulkDelete={{ label: 'Удалить выбранные', onClick: () => {} }}
        pageIndex={0}
        pageSize={20}
        pageCount={1}
        total={3}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        onRowClick={() => {}}
      />
    );
  },
};

export const Empty: StoryObj<typeof ListView> = {
  render: () => (
    <ListView
      title="Поставщики"
      columns={columns}
      data={[]}
      getRowId={(r) => String(r.id)}
      search=""
      onSearchChange={() => {}}
      selectedIds={[]}
      onSelectionChange={() => {}}
      pageIndex={0}
      pageSize={20}
      pageCount={1}
      onPageChange={() => {}}
      onPageSizeChange={() => {}}
      emptyState={
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="Пока нет поставщиков"
          description="Добавьте первого поставщика, чтобы начать."
        />
      }
    />
  ),
};
```

- [ ] **Step 3: Типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 4: Визуальная проверка**

Run: `pnpm --filter @bigfin/webapp storybook` → http://localhost:6006 → `UI/ListView`.
Expected: история `Default` — светлый экран со списком, поиском, чекбоксами, пагинацией; `Empty` — пустое состояние.

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/components/ui/list-view/list-view.tsx packages/webapp/src/components/ui/list-view/list-view.stories.tsx
git commit -m "feat(webapp): add generic ListView screen"
```
Откат: удалить новые файлы.

---

## Task 5: Рефактор `Customers/.../format.ts` → ре-экспорт

**Files:**
- Modify: `packages/webapp/src/containers/Customers/CustomersLandingV2/format.ts`

> `format.ts` становится тонким ре-экспортом из общего `list-format`. `customerStatus`/`CustomerStatus` — алиасы `activeStatus`/`ActiveStatus`. Существующий `format.spec.ts` и `columns.tsx` (импортируют из `./format`) продолжают работать без правок.

- [ ] **Step 1: Заменить содержимое файла**

Replace the entire content of `packages/webapp/src/containers/Customers/CustomersLandingV2/format.ts` with:

```ts
// Форматтеры списка клиентов переехали в общий движок (components/ui/list-view).
// Здесь — тонкий ре-экспорт для совместимости (columns.tsx, format.spec.ts).
export {
  isNegativeBalance,
  formatBalance,
  activeStatus as customerStatus,
} from '@/components/ui/list-view/list-format';
export type { ActiveStatus as CustomerStatus } from '@/components/ui/list-view/list-format';
```

- [ ] **Step 2: Тест клиентских форматтеров остаётся зелёным**

Run: `pnpm --filter @bigfin/webapp test -- run format`
Expected: PASS (существующий `CustomersLandingV2/format.spec.ts` — 5 тестов через ре-экспорт).

- [ ] **Step 3: Типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/containers/Customers/CustomersLandingV2/format.ts
git commit -m "refactor(webapp): customers format re-exports shared list-format"
```
Откат: `git checkout -- packages/webapp/src/containers/Customers/CustomersLandingV2/format.ts`.

---

## Task 6: Рефактор `CustomersListV2.tsx` на `ListView`

**Files:**
- Modify: `packages/webapp/src/containers/Customers/CustomersLandingV2/CustomersListV2.tsx`

> Адаптер теряет ручную вёрстку и ручной `useState` — берёт их из `useListController` + `<ListView>`. Поведение не меняется (поиск по `display_name`/`company_name`/`personal_phone`, выделение per-page, пагинация скрыта при пустой загрузке). Код за флагом off → не в проде.

- [ ] **Step 1: Заменить содержимое файла**

Replace the entire content of `packages/webapp/src/containers/Customers/CustomersLandingV2/CustomersListV2.tsx` with:

```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListView } from '@/components/ui/list-view/list-view';
import { useListController } from '@/components/ui/list-view/use-list-controller';

import { useCustomers } from '@/hooks/query/customers';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { DRAWERS } from '@/constants/drawers';
import { compose } from '@/utils';

import { transformCustomersStateToQuery } from '../CustomersLanding/utils';
import { useBulkDeleteCustomersDialog } from '../CustomersLanding/hooks/use-bulk-delete-customers-dialog';
import { useCustomersColumns } from './columns';

const SEARCH_FIELDS = ['display_name', 'company_name', 'personal_phone'];

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

  const ctl = useListController({
    transform: transformCustomersStateToQuery,
    searchFields: SEARCH_FIELDS,
  });

  const {
    data: { customers, pagination },
    isFetching,
  } = useCustomers(ctl.query, { keepPreviousData: true });

  const rows = ctl.applySearch(customers);
  const goNew = React.useCallback(() => history.push('/customers/new'), [history]);

  return (
    <ListView
      title={intl.get('customers')}
      primaryAction={{ label: intl.get('new_customer'), onClick: goNew }}
      columns={columns}
      data={rows}
      getRowId={(c) => String(c.id)}
      loading={isFetching}
      search={ctl.search}
      onSearchChange={ctl.setSearch}
      searchPlaceholder={intl.get('customers.search_placeholder')}
      selectedIds={ctl.selected}
      onSelectionChange={ctl.setSelected}
      bulkDelete={{
        label: intl.get('customers.list.bulk_delete'),
        onClick: (ids) => openBulkDeleteDialog(ids.map(Number)),
      }}
      pageIndex={ctl.pageIndex}
      pageSize={ctl.pageSize}
      pageCount={pagination.pagesCount}
      total={pagination.total}
      onPageChange={ctl.onPageChange}
      onPageSizeChange={ctl.onPageSizeChange}
      onSortChange={ctl.setSortBy}
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
  );
}

const ComposedCustomersListV2 = compose(
  withDrawerActions,
  withAlertActions,
)(CustomersListV2);

export { ComposedCustomersListV2 as CustomersListV2 };
export default ComposedCustomersListV2;
```

- [ ] **Step 2: Типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 3: Визуальная проверка (по желанию)**

Storybook `UI/ListView` уже подтверждает движок. Живой экран `/customers` — за флагом off (не в проде); приёмка V2 — на staging при включении флага.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/containers/Customers/CustomersLandingV2/CustomersListV2.tsx
git commit -m "refactor(webapp): CustomersListV2 uses shared ListView engine"
```
Откат: `git checkout -- packages/webapp/src/containers/Customers/CustomersLandingV2/CustomersListV2.tsx`.

---

## Task 7: `VendorsLandingV2/columns.tsx`

**Files:**
- Create: `packages/webapp/src/containers/Vendors/VendorsLandingV2/columns.tsx`

> Колонки react-table v7 для поставщиков. Поля из API: `display_name`, `company_name`, `work_phone`, `closing_balance`, `currency_code`, `active`, `id`. Баланс/статус — через общий `list-format` и `Badge`. Меню действий — `DropdownMenu` (открыть/изменить/удалить). Ключи `view_details`/`edit_vendor`/`delete_vendor` уже существуют; `vendors.*` — добавляются в Task 11.

- [ ] **Step 1: Создать колонки**

Create `packages/webapp/src/containers/Vendors/VendorsLandingV2/columns.tsx`:

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
import {
  activeStatus,
  formatBalance,
  isNegativeBalance,
} from '@/components/ui/list-view/list-format';

export interface VendorsColumnHandlers {
  onView: (vendor: any) => void;
  onEdit: (vendor: any) => void;
  onDelete: (vendor: any) => void;
}

export function useVendorsColumns({
  onView,
  onEdit,
  onDelete,
}: VendorsColumnHandlers) {
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
        accessor: 'work_phone',
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
        Header: intl.get('vendors.col.status'),
        accessor: 'active',
        disableSortBy: true,
        Cell: ({ row: { original } }: any) => {
          const st = activeStatus(!!original.active);
          return (
            <Badge variant={st === 'active' ? 'secondary' : 'outline'}>
              {intl.get(`vendors.status.${st}`)}
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
              aria-label={intl.get('vendors.row_actions')}
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
                {intl.get('edit_vendor')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger"
                onClick={() => onDelete(original)}
              >
                {intl.get('delete_vendor')}
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
git add packages/webapp/src/containers/Vendors/VendorsLandingV2/columns.tsx
git commit -m "feat(webapp): add vendors list columns"
```
Откат: удалить файл.

---

## Task 8: `VendorsLandingV2/VendorsListV2.tsx`

**Files:**
- Create: `packages/webapp/src/containers/Vendors/VendorsLandingV2/VendorsListV2.tsx`

> Адаптер поставщиков: `useVendors` → `{ vendors, pagination }`; `useListController` с `transformVendorsStateToQuery`; массовое удаление через `useBulkDeleteVendorsDialog`. Обработчики строки: drawer `{ vendorId }`, алерт `vendor-delete { contactId }`, изменить `/vendors/:id/edit`, новый `/vendors/new`.

- [ ] **Step 1: Создать страницу**

Create `packages/webapp/src/containers/Vendors/VendorsLandingV2/VendorsListV2.tsx`:

```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Plus, Building2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListView } from '@/components/ui/list-view/list-view';
import { useListController } from '@/components/ui/list-view/use-list-controller';

import { useVendors } from '@/hooks/query/vendors';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { DRAWERS } from '@/constants/drawers';
import { compose } from '@/utils';

import { transformVendorsStateToQuery } from '../VendorsLanding/utils';
import { useBulkDeleteVendorsDialog } from '../VendorsLanding/hooks/use-bulk-delete-vendors-dialog';
import { useVendorsColumns } from './columns';

const SEARCH_FIELDS = ['display_name', 'company_name', 'work_phone'];

function VendorsListV2({
  openDrawer,
  openAlert,
}: {
  openDrawer: (name: string, payload?: any) => void;
  openAlert: (name: string, payload?: any) => void;
}) {
  const history = useHistory();
  const { openBulkDeleteDialog } = useBulkDeleteVendorsDialog();

  const openVendor = React.useCallback(
    (v: any) => openDrawer(DRAWERS.VENDOR_DETAILS, { vendorId: v.id }),
    [openDrawer],
  );
  const editVendor = React.useCallback(
    (v: any) => history.push(`/vendors/${v.id}/edit`),
    [history],
  );
  const deleteVendor = React.useCallback(
    (v: any) => openAlert('vendor-delete', { contactId: v.id }),
    [openAlert],
  );
  const columns = useVendorsColumns({
    onView: openVendor,
    onEdit: editVendor,
    onDelete: deleteVendor,
  });

  const ctl = useListController({
    transform: transformVendorsStateToQuery,
    searchFields: SEARCH_FIELDS,
  });

  const {
    data: { vendors, pagination },
    isFetching,
  } = useVendors(ctl.query, { keepPreviousData: true });

  const rows = ctl.applySearch(vendors);
  const goNew = React.useCallback(() => history.push('/vendors/new'), [history]);

  return (
    <ListView
      title={intl.get('vendors')}
      primaryAction={{ label: intl.get('new_vendor'), onClick: goNew }}
      columns={columns}
      data={rows}
      getRowId={(v) => String(v.id)}
      loading={isFetching}
      search={ctl.search}
      onSearchChange={ctl.setSearch}
      searchPlaceholder={intl.get('vendors.search_placeholder')}
      selectedIds={ctl.selected}
      onSelectionChange={ctl.setSelected}
      bulkDelete={{
        label: intl.get('vendors.list.bulk_delete'),
        onClick: (ids) => openBulkDeleteDialog(ids.map(Number)),
      }}
      pageIndex={ctl.pageIndex}
      pageSize={ctl.pageSize}
      pageCount={pagination.pagesCount}
      total={pagination.total}
      onPageChange={ctl.onPageChange}
      onPageSizeChange={ctl.onPageSizeChange}
      onSortChange={ctl.setSortBy}
      onRowClick={openVendor}
      emptyState={
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title={intl.get('vendors.empty.title')}
          description={intl.get('vendors.empty.description')}
          action={
            <Button onClick={goNew}>
              <Plus className="h-4 w-4" />
              {intl.get('new_vendor')}
            </Button>
          }
        />
      }
    />
  );
}

const ComposedVendorsListV2 = compose(
  withDrawerActions,
  withAlertActions,
)(VendorsListV2);

export { ComposedVendorsListV2 as VendorsListV2 };
export default ComposedVendorsListV2;
```

- [ ] **Step 2: Типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/containers/Vendors/VendorsLandingV2/VendorsListV2.tsx
git commit -m "feat(webapp): add VendorsListV2 page (flagged)"
```
Откат: удалить файл.

---

## Task 9: Переключатель + маршрут

**Files:**
- Create: `packages/webapp/src/containers/Vendors/VendorsLandingV2/VendorsListSwitch.tsx`
- Modify: `packages/webapp/src/routes/dashboard.tsx` (стр. 660-662)

- [ ] **Step 1: Создать переключатель**

Create `packages/webapp/src/containers/Vendors/VendorsLandingV2/VendorsListSwitch.tsx`:

```tsx
import React from 'react';
import { useFeatureCan } from '@/hooks/state/feature';
import VendorsList from '../VendorsLanding/VendorsList';
import { VendorsListV2 } from './VendorsListV2';

/**
 * Рендерит новый список «Поставщики» при включённом флаге vendors_list_v2,
 * иначе — текущий (легаси) список. Strangler Fig: старый код не трогаем.
 */
export default function VendorsListSwitch() {
  const { featureCan } = useFeatureCan();
  return featureCan('vendors_list_v2') ? <VendorsListV2 /> : <VendorsList />;
}
```

- [ ] **Step 2: Показать текущий маршрут**

Открыть `packages/webapp/src/routes/dashboard.tsx`, строки 660-662:

```tsx
    component: lazy(
      () => import('@/containers/Vendors/VendorsLanding/VendorsList'),
    ),
```

- [ ] **Step 3: Перенаправить маршрут на переключатель**

Заменить эти три строки на:

```tsx
    component: lazy(
      () => import('@/containers/Vendors/VendorsLandingV2/VendorsListSwitch'),
    ),
```

(Меняется только путь ленивого импорта компонента маршрута `/vendors`. Остальное не трогаем.)

- [ ] **Step 4: Типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/containers/Vendors/VendorsLandingV2/VendorsListSwitch.tsx packages/webapp/src/routes/dashboard.tsx
git commit -m "feat(webapp): route /vendors through new-list feature switch"
```
Откат: `git checkout -- packages/webapp/src/routes/dashboard.tsx` + удалить переключатель.

---

## Task 10: Фиче-флаг на сервере (additive)

**Files:**
- Modify: `packages/server/src/common/types/Features.ts`
- Modify: `packages/server/src/modules/Features/FeaturesConfigure.ts`

- [ ] **Step 1: Добавить флаг в enum**

В `packages/server/src/common/types/Features.ts`, в enum `Features`, добавить строку после `CUSTOMERS_LIST_V2 = 'customers_list_v2',`:

```ts
  VENDORS_LIST_V2 = 'vendors_list_v2',
```

- [ ] **Step 2: Зарегистрировать флаг с default false**

В `packages/server/src/modules/Features/FeaturesConfigure.ts`, в массив `getConfigure()`, добавить после блока `Features.CUSTOMERS_LIST_V2` (перед закрывающей `];`):

```ts
      {
        name: Features.VENDORS_LIST_V2,
        defaultValue: false,
      },
```

- [ ] **Step 3: Типы сервера**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: без ошибок.

> Прогон сервера/миграций локально не требуется: изменение additive и конфигурационное (без БД).

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/common/types/Features.ts packages/server/src/modules/Features/FeaturesConfigure.ts
git commit -m "feat(server): register vendors_list_v2 feature flag (default off)"
```
Откат: `git checkout -- <оба файла>`.

---

## Task 11: i18n-ключи

**Files:**
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Добавить ключи в EN**

В `packages/webapp/src/lang/en/index.json`, сразу после строки `"customers.list.bulk_delete": "Delete selected",`, добавить:

```json
  "vendors.col.status": "Status",
  "vendors.status.active": "Active",
  "vendors.status.inactive": "Inactive",
  "vendors.row_actions": "Actions",
  "vendors.search_placeholder": "Search this page…",
  "vendors.empty.title": "No vendors yet",
  "vendors.empty.description": "Add your first vendor to get started.",
  "vendors.list.bulk_delete": "Delete selected",
```

- [ ] **Step 2: Добавить те же ключи в RU**

В `packages/webapp/src/lang/ru/index.json`, сразу после строки `"customers.list.bulk_delete": "Удалить выбранные",`, добавить (тот же набор ключей):

```json
  "vendors.col.status": "Статус",
  "vendors.status.active": "Активен",
  "vendors.status.inactive": "Неактивен",
  "vendors.row_actions": "Действия",
  "vendors.search_placeholder": "Поиск по странице…",
  "vendors.empty.title": "Пока нет поставщиков",
  "vendors.empty.description": "Добавьте первого поставщика, чтобы начать.",
  "vendors.list.bulk_delete": "Удалить выбранные",
```

- [ ] **Step 3: Проверить парность**

Run: `pnpm --filter @bigfin/webapp lang:check`
Expected: `✅ OK: парность ключей en↔ru соблюдена.`

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(webapp): i18n keys for vendors list redesign"
```
Откат: `git checkout -- <оба lang-файла>`.

---

## Финальная проверка (после всех задач)

- [ ] **Юнит-тесты:** `pnpm --filter @bigfin/webapp test -- run list-format` (5), `... run filter-rows` (5), `... run format` (5 — клиентские, через ре-экспорт) — всё зелёное.
- [ ] **Типы (web):** `pnpm --filter @bigfin/webapp typecheck` — 0 ошибок.
- [ ] **Типы (server):** `pnpm --filter @bigfin/server typecheck` — 0 ошибок.
- [ ] **Парность langs:** `pnpm --filter @bigfin/webapp lang:check` — exit 0.
- [ ] **Storybook:** `pnpm --filter @bigfin/webapp storybook` → `UI/ListView` (`Default`/`Empty`) рендерятся в светлой теме.
- [ ] **Флаги off:** маршруты `/customers` и `/vendors` рендерят легаси-списки (оба флага default false). Легаси-файлы не удалены.
- [ ] **Ничего не удалено**, новых зависимостей нет (`git diff --stat develop` не трогает `package.json`/lockfile).

---

## Открытые вопросы / follow-up (вне этого плана)

1. **Серверный поиск** (сейчас клиентский по странице) — общий механизм в `useListController` (например, проброс `search` в `query`), затем подключение по спискам.
2. **Тираж дальше:** Товары/Счета и прочие списки — тонкими адаптерами на том же движке. Для «Счетов» сперва нужны `useBulkDeleteInvoicesDialog` и выделенный transform (их сейчас нет).
3. **Заголовок баланса для поставщиков:** сейчас `receivable_balance` (паритет с легаси). Корректный термин (кредиторская) — отдельным срезом по всем спискам.
4. **Поле баланса/телефона:** план опирается на `closing_balance`/`currency_code`/`work_phone`. Если в API поставщика имена иные — правка в `columns.tsx` (1 место).
5. **Извлечение `withDrawerActions`/`withAlertActions`-обвязки** в общий адаптер-HOC — когда станет ясно по 3-4 спискам (сейчас преждевременно).
