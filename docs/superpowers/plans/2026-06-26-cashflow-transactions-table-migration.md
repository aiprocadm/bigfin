# Миграция таблицы «Все транзакции» (D-redesign, слайс 2) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести таблицу вкладки «Все транзакции» с легаси-`DataTable` на примитив `components/ui/data-table.tsx`, включаемую параллельно со старой одной строкой.

**Architecture:** Параллельный безопасный режим (как слайс 1). Новые файлы рядом со старыми; старый код не правится, кроме одной строки-переключателя в `AccountsTransactionsAll.tsx`. Данные и бесконечная подгрузка переиспользуются из `AccountTransactionsAllProvider` (наблюдатель подгрузки живёт в провайдере). 8 колонок переносятся на shape react-table v7 нового примитива; статус — `Badge`, действия строки — видимое кебаб-меню (`dropdown-menu`) вместо правого клика. Виртуализация и ресайз колонок отложены.

**Tech Stack:** React 18, TanStack react-table v7 (через `data-table.tsx`), Radix/shadcn `components/ui` (Badge, DropdownMenu), react-query (переиспускаем), Vitest (тесты чистых функций), TypeScript strict (без `// @ts-nocheck`).

**Базовый каталог новых файлов:** `packages/webapp/src/containers/CashFlow/AccountTransactions/v2/`

---

## Файловая структура

| Файл | Ответственность |
|---|---|
| `components/ui/badge.tsx` (правка) | Добавить вариант `success` (зелёный) |
| `…/v2/TransactionStatusBadge.tsx` | `getStatusBadgeVariant(status)` + компонент статуса |
| `…/v2/TransactionStatusBadge.spec.ts` | Vitest: маппинг статус→вариант |
| `…/v2/TransactionRowActions.tsx` | Кебаб-меню действий строки (разкатегоризировать/отвязать) |
| `…/v2/useAccountTransactionsColumnsV2.tsx` | 8 колонок + колонка-действий под примитив |
| `…/v2/AccountTransactionsDataTableV2.tsx` | Обёртка: данные, выбор→Redux, клик→дровер, рендер `<DataTable>` |
| `AccountsTransactionsAll.tsx` (правка 1 строки) | Переключение на V2 |

**Переиспользуем без изменений:** `useAccountTransactionsAllContext`, `useAccountTransactionsContext` (scrollableRef), `handleCashFlowTransactionType` (`./utils`), `withDrawerActions`, `withBankingActions`, `useUncategorizeTransaction`, `useUnmatchMatchedUncategorizedTransaction`, `compose`, `AppToaster`, intl-ключи (`date`, `type`, `transaction_number`, `reference_no`, `status`, `banking.label.deposit`, `banking.label.withdrawal`, `banking.label.running_balance`, `cashflow.notify.transaction_uncategorized`, `cashflow.notify.transaction_unmatched`, `something_went_wrong`).

**Решение о выборе (уточнение к спеку):** выбор строк делаем **неконтролируемым** в примитиве (не передаём `selectedIds`), на каждое изменение пушим `uncategorized_transaction_id` выбранных строк в Redux. Это проще контролируемого варианта и совпадает с легаси-поведением: после массового действия данные перезагружаются, выбранные строки исчезают из вкладки «Все», и выделение естественно очищается (строки размонтируются).

---

## Task 1: Вариант `success` в Badge

**Files:**
- Modify: `packages/webapp/src/components/ui/badge.tsx`
- Test: `packages/webapp/src/components/ui/badge.spec.ts`

- [ ] **Step 1: Написать падающий тест**

`packages/webapp/src/components/ui/badge.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { badgeVariants } from './badge';

describe('badgeVariants', () => {
  it('вариант success даёт зелёный фон', () => {
    expect(badgeVariants({ variant: 'success' })).toContain('bg-success');
  });
  it('существующий destructive не сломан', () => {
    expect(badgeVariants({ variant: 'destructive' })).toContain('bg-danger');
  });
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `pnpm --filter @bigfin/webapp exec vitest run src/components/ui/badge.spec.ts`
Expected: FAIL — вариант `success` не определён (тип/значение).

- [ ] **Step 3: Добавить вариант**

В `components/ui/badge.tsx`, в объект `variants.variant`, после `destructive`:
```tsx
        destructive: 'border-transparent bg-danger text-white',
        success: 'border-transparent bg-success text-white',
        outline: 'border-border text-text-primary',
```
(добавляется только строка `success`; остальные не трогаем.)

- [ ] **Step 4: Запустить — пройдёт**

Run: `pnpm --filter @bigfin/webapp exec vitest run src/components/ui/badge.spec.ts`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/components/ui/badge.tsx packages/webapp/src/components/ui/badge.spec.ts
git commit -m "feat(webapp): вариант success в Badge (D-redesign)"
```
(Заверши тело коммита строкой `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Task 2: TransactionStatusBadge (TDD)

**Files:**
- Create: `…/v2/TransactionStatusBadge.tsx`
- Test: `…/v2/TransactionStatusBadge.spec.ts`

- [ ] **Step 1: Написать падающий тест**

`…/v2/TransactionStatusBadge.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { getStatusBadgeVariant } from './TransactionStatusBadge';

describe('getStatusBadgeVariant', () => {
  it('categorized → success', () => {
    expect(getStatusBadgeVariant('categorized')).toBe('success');
  });
  it('matched → success', () => {
    expect(getStatusBadgeVariant('matched')).toBe('success');
  });
  it('manual → secondary', () => {
    expect(getStatusBadgeVariant('manual')).toBe('secondary');
  });
  it('неизвестный статус → secondary', () => {
    expect(getStatusBadgeVariant('whatever')).toBe('secondary');
  });
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `pnpm --filter @bigfin/webapp exec vitest run src/containers/CashFlow/AccountTransactions/v2/TransactionStatusBadge.spec.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать**

`…/v2/TransactionStatusBadge.tsx`:
```tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';

type BadgeVariant = 'success' | 'secondary';

/** Маппинг статуса банковской транзакции в вариант Badge (паритет с легаси Tag). */
export function getStatusBadgeVariant(status: string): BadgeVariant {
  if (status === 'categorized' || status === 'matched') return 'success';
  return 'secondary';
}

interface TransactionStatusBadgeProps {
  status: string;
  label: string;
}

export function TransactionStatusBadge({ status, label }: TransactionStatusBadgeProps) {
  return <Badge variant={getStatusBadgeVariant(status)}>{label}</Badge>;
}
```

- [ ] **Step 4: Запустить — пройдёт**

Run: `pnpm --filter @bigfin/webapp exec vitest run src/containers/CashFlow/AccountTransactions/v2/TransactionStatusBadge.spec.ts`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/containers/CashFlow/AccountTransactions/v2/TransactionStatusBadge.tsx packages/webapp/src/containers/CashFlow/AccountTransactions/v2/TransactionStatusBadge.spec.ts
git commit -m "feat(webapp): статус транзакции в виде Badge (D-redesign)"
```
(Тело коммита — с `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Task 3: TransactionRowActions (кебаб-меню)

**Files:**
- Create: `…/v2/TransactionRowActions.tsx`

- [ ] **Step 1: Реализовать**

`…/v2/TransactionRowActions.tsx`:
```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface TransactionRowActionsProps {
  status: string;
  onUncategorize: () => void;
  onUnmatch: () => void;
}

export function TransactionRowActions({
  status,
  onUncategorize,
  onUnmatch,
}: TransactionRowActionsProps) {
  // Действия зависят от статуса (паритет с легаси ActionsMenu).
  const hasUncategorize = status === 'categorized';
  const hasUnmatch = status === 'matched';
  if (!hasUncategorize && !hasUnmatch) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={intl.get('actions')}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {hasUncategorize && (
          <DropdownMenuItem onSelect={onUncategorize}>
            {intl.get('uncategorize')}
          </DropdownMenuItem>
        )}
        {hasUnmatch && (
          <DropdownMenuItem onSelect={onUnmatch}>
            {intl.get('unmatch')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Проверить lang-ключи `actions` / `uncategorize` / `unmatch`**

Run: `grep -n '"actions"\|"uncategorize"\|"unmatch"' packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json`
Легаси-меню использовало хардкод-строки `'Uncategorize'` / `'Unmatch'` — в новом коде нельзя хардкодить. Если каких-то ключей нет, добавить ПАРНО в `en` и `ru` index.json:
- `uncategorize`: en `"Uncategorize"`, ru `"Разкатегоризировать"`
- `unmatch`: en `"Unmatch"`, ru `"Отвязать"`
- `actions`: en `"Actions"`, ru `"Действия"` (если отсутствует)
Затем: `node packages/webapp/scripts/lang-check.js` — EN-счётчик должен равняться RU. Русский: натуральный, без калек; бренд только «Bigfin».

- [ ] **Step 3: Проверить типы**

Run: `pnpm typecheck`
Expected: PASS (нет новых ошибок из этого файла).

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/containers/CashFlow/AccountTransactions/v2/TransactionRowActions.tsx packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(webapp): кебаб-меню действий строки транзакции (D-redesign)"
```
(Тело — с `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Если lang не менялся — не добавляй его в commit.)

---

## Task 4: Колонки V2

**Files:**
- Create: `…/v2/useAccountTransactionsColumnsV2.tsx`

- [ ] **Step 1: Реализовать**

`…/v2/useAccountTransactionsColumnsV2.tsx`:
```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { TransactionStatusBadge } from './TransactionStatusBadge';
import { TransactionRowActions } from './TransactionRowActions';

interface ColumnsHandlers {
  onUncategorize: (row: any) => void;
  onUnmatch: (row: any) => void;
}

/**
 * Колонки таблицы «Все транзакции» под примитив components/ui/data-table.tsx
 * (react-table v7 shape: id, Header, accessor, align, disableSortBy, Cell).
 */
export function useAccountTransactionsColumnsV2({
  onUncategorize,
  onUnmatch,
}: ColumnsHandlers) {
  return React.useMemo(
    () => [
      { id: 'date', Header: intl.get('date'), accessor: 'formatted_date' },
      { id: 'type', Header: intl.get('type'), accessor: 'formatted_transaction_type' },
      {
        id: 'transaction_number',
        Header: intl.get('transaction_number'),
        accessor: 'transaction_number',
      },
      {
        id: 'reference_number',
        Header: intl.get('reference_no'),
        accessor: 'reference_number',
      },
      {
        id: 'status',
        Header: intl.get('status'),
        accessor: 'status',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <TransactionStatusBadge
            status={row.original.status}
            label={row.original.formatted_status}
          />
        ),
      },
      {
        id: 'deposit',
        Header: intl.get('banking.label.deposit'),
        accessor: 'formatted_deposit',
        align: 'right',
      },
      {
        id: 'withdrawal',
        Header: intl.get('banking.label.withdrawal'),
        accessor: 'formatted_withdrawal',
        align: 'right',
      },
      {
        id: 'running_balance',
        Header: intl.get('banking.label.running_balance'),
        accessor: 'formatted_running_balance',
        align: 'right',
      },
      {
        id: 'actions',
        Header: '',
        disableSortBy: true,
        align: 'right',
        Cell: ({ row }: any) => (
          <TransactionRowActions
            status={row.original.status}
            onUncategorize={() => onUncategorize(row.original)}
            onUnmatch={() => onUnmatch(row.original)}
          />
        ),
      },
    ],
    [onUncategorize, onUnmatch],
  );
}
```

- [ ] **Step 2: Проверить типы**

Run: `pnpm typecheck`
Expected: PASS. Примитив `data-table.tsx` типизирует `columns: any[]`, так что shape принимается; `align`/`Cell`/`disableSortBy` он использует.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/containers/CashFlow/AccountTransactions/v2/useAccountTransactionsColumnsV2.tsx
git commit -m "feat(webapp): колонки таблицы «Все транзакции» под новый примитив (D-redesign)"
```
(Тело — с `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Task 5: Обёртка таблицы V2

**Files:**
- Create: `…/v2/AccountTransactionsDataTableV2.tsx`

- [ ] **Step 1: Реализовать**

`…/v2/AccountTransactionsDataTableV2.tsx`:
```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { DataTable } from '@/components/ui/data-table';
import { AppToaster } from '@/components';
import { compose } from '@/utils';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withBankingActions } from '../../withBankingActions';
import { useUncategorizeTransaction } from '@/hooks/query';
import { useUnmatchMatchedUncategorizedTransaction } from '@/hooks/query/bank-rules';
import { useAccountTransactionsAllContext } from '../AccountTransactionsAllBoot';
import { handleCashFlowTransactionType } from '../utils';
import { useAccountTransactionsColumnsV2 } from './useAccountTransactionsColumnsV2';

function AccountTransactionsDataTableV2Root({
  // #withDrawerActions
  openDrawer,
  // #withBankingActions
  setCategorizedTransactionsSelected,
}: any) {
  const {
    cashflowTransactions,
    isCashFlowTransactionsLoading,
  } = useAccountTransactionsAllContext();

  const { mutateAsync: uncategorizeTransaction } = useUncategorizeTransaction();
  const { mutateAsync: unmatchTransaction } =
    useUnmatchMatchedUncategorizedTransaction();

  const handleUncategorize = React.useCallback(
    (row: any) => {
      uncategorizeTransaction(row.uncategorized_transaction_id)
        .then(() =>
          AppToaster.show({
            message: intl.get('cashflow.notify.transaction_uncategorized'),
            intent: Intent.SUCCESS,
          }),
        )
        .catch(() =>
          AppToaster.show({
            message: intl.get('something_went_wrong'),
            intent: Intent.DANGER,
          }),
        );
    },
    [uncategorizeTransaction],
  );

  const handleUnmatch = React.useCallback(
    (row: any) => {
      unmatchTransaction({ id: row.uncategorized_transaction_id })
        .then(() =>
          AppToaster.show({
            message: intl.get('cashflow.notify.transaction_unmatched'),
            intent: Intent.SUCCESS,
          }),
        )
        .catch(() =>
          AppToaster.show({
            message: intl.get('something_went_wrong'),
            intent: Intent.DANGER,
          }),
        );
    },
    [unmatchTransaction],
  );

  const columns = useAccountTransactionsColumnsV2({
    onUncategorize: handleUncategorize,
    onUnmatch: handleUnmatch,
  });

  const handleRowClick = (row: any) =>
    handleCashFlowTransactionType(row, openDrawer);

  // Неконтролируемый выбор: пушим uncategorized_transaction_id выбранных строк в Redux
  // (для массового «разкатегоризировать» в панели действий).
  const handleSelectionChange = (ids: string[]) => {
    const selectedUncatIds = cashflowTransactions
      .filter(
        (t: any) =>
          ids.includes(String(t.id)) && t.uncategorized_transaction_id,
      )
      .map((t: any) => t.uncategorized_transaction_id);
    setCategorizedTransactionsSelected(selectedUncatIds);
  };

  return (
    <DataTable
      columns={columns}
      data={cashflowTransactions}
      getRowId={(row: any) => String(row.id)}
      loading={isCashFlowTransactionsLoading}
      enableSelection
      onSelectionChange={handleSelectionChange}
      onRowClick={handleRowClick}
      emptyState={
        <div className="px-3 py-8 text-center text-sm text-text-muted">
          {intl.get('cash_flow.account_transactions.no_results')}
        </div>
      }
    />
  );
}

export const AccountTransactionsDataTableV2 = compose(
  withDrawerActions,
  withBankingActions,
)(AccountTransactionsDataTableV2Root);
```

- [ ] **Step 2: Проверить стабильный `id` строки**

Run: `grep -rn "id:\|uncategorized_transaction_id" packages/webapp/src/hooks/query/cashflowAccounts.tsx | head`
Подтвердить, что у транзакций вкладки «Все» есть стабильное поле `id`. Если основной идентификатор называется иначе (напр. только `uncategorized_transaction_id` у части строк) — в `getRowId` использовать гарантированно присутствующее поле и согласовать с маппингом выбора. Если `id` есть у всех строк — оставить как есть.

- [ ] **Step 3: Проверить типы**

Run: `pnpm typecheck`
Expected: PASS. Проверь точные пути импортов `withDrawerActions` (`@/containers/Drawer/withDrawerActions`), `withBankingActions` (`../../withBankingActions` от `v2/` — т.е. `containers/CashFlow/withBankingActions`), `useUnmatchMatchedUncategorizedTransaction` (`@/hooks/query/bank-rules`) — сверь с легаси `AccountTransactionsDataTable.tsx` (рабочие импорты). Поправь относительные пути, если уровень вложенности `v2/` сдвигает их.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/containers/CashFlow/AccountTransactions/v2/AccountTransactionsDataTableV2.tsx
git commit -m "feat(webapp): обёртка таблицы «Все транзакции» на примитиве (D-redesign)"
```
(Тело — с `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Task 6: Переключение и проверка

**Files:**
- Modify: `packages/webapp/src/containers/CashFlow/AccountTransactions/AccountsTransactionsAll.tsx`

- [ ] **Step 1: Переключить вкладку «Все» на V2**

В `AccountsTransactionsAll.tsx`:
- заменить импорт
  `import AccountTransactionsDataTable from './AccountTransactionsDataTable';`
  на
  `import { AccountTransactionsDataTableV2 } from './v2/AccountTransactionsDataTableV2';`
- в JSX заменить `<AccountTransactionsDataTable />` на `<AccountTransactionsDataTableV2 />`.

Старый файл `AccountTransactionsDataTable.tsx` остаётся (откат = вернуть строку).

- [ ] **Step 2: Гейты — типы и парность строк**

Run: `pnpm typecheck`
Expected: PASS (3 пакета).

Run: `node packages/webapp/scripts/lang-check.js`
Expected: `EN === RU`.

- [ ] **Step 3: Полный vitest вебаппа**

Run: `pnpm --filter @bigfin/webapp exec vitest run`
Expected: PASS (прежние тесты + новые badge/status; ничего не сломано).

- [ ] **Step 4: Живой прогон**

Поднять стек (skill `run-bigfin`). Открыть счёт с транзакциями → вкладка «Все».
Чек-лист:
- таблица в новом стиле (токены, статус-Badge зелёный для categorized/matched);
- прокрутка вниз подгружает следующие страницы (бесконечная подгрузка работает);
- клик по строке открывает детальный дровер;
- чекбоксы выбирают строки; массовое «разкатегоризировать» в панели действий видит выбор;
- кебаб-меню строки: «разкатегоризировать» (categorized) и «отвязать» (matched) работают, тосты появляются;
- денежные колонки выровнены вправо.

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/containers/CashFlow/AccountTransactions/AccountsTransactionsAll.tsx
git commit -m "feat(webapp): включить новую таблицу «Все транзакции» (D-redesign, слайс 2)"
```
(Тело — с `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Откат
Вернуть строку импорта/использования в `AccountsTransactionsAll.tsx` на
`AccountTransactionsDataTable` — мгновенный фолбэк на старую таблицу.

## Вне объёма (следующие слайсы)
- 4 таблицы вкладки «без категории» (uncategorized / recognized / excluded / pending).
- Виртуализация строк и ресайз колонок в примитиве `data-table.tsx`.
- Каркас страницы, бар балансов, фильтр-вкладки, панель действий, фильтр дат.
