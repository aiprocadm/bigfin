# Миграция формы категоризации транзакции (D-redesign, слайс 1) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить форму категоризации банковской транзакции (Formik+Blueprint) на новую форму D-redesign (React Hook Form + Zod + примитивы `components/ui/`), включаемую параллельно со старой одной строкой.

**Architecture:** Параллельный безопасный режим. Новые файлы создаются рядом со старыми; старый код не правится, кроме одной строки-переключателя в `CategorizeTransactionTabs.tsx`. Слой данных (хуки React Query), Redux-экшены и утилиты-трансформации переиспользуются без изменений. 6 типов операций реализованы одним конфиг-управляемым компонентом (а не 6 копиями). «Умные» селекты (счета, контрагенты, подразделение) — тонкие контролируемые адаптеры над существующими Blueprint-компонентами.

**Tech Stack:** React 18, React Hook Form, Zod, `@hookform/resolvers/zod`, Radix/shadcn-примитивы (`components/ui/`), Blueprint `Select` (внутри адаптеров), react-query (переиспускаем), Vitest (тесты схемы/конфига), TypeScript strict (без `// @ts-nocheck`).

**Базовый каталог новых файлов:**
`packages/webapp/src/containers/CashFlow/CategorizeTransaction/drawers/CategorizeTransactionDrawer/v2/`

---

## Файловая структура

| Файл | Ответственность |
|---|---|
| `components/ui/textarea.tsx` | Недостающий примитив многострочного ввода (поле «Описание») |
| `…/v2/categorizeTransaction.schema.ts` | Zod-схема + тип `CategorizeTransactionFormValues` |
| `…/v2/categorizeTransaction.config.ts` | Карта подтипов (подписи счетов + фильтр), список типов |
| `…/v2/categorizeTransaction.schema.spec.ts` | Vitest: схема и резолвер конфига |
| `…/v2/ControlledAccountsSelect.tsx` | Контролируемый адаптер счёта (value/onChange) |
| `…/v2/ControlledBranchSelect.tsx` | Контролируемый адаптер подразделения |
| `…/v2/CategorizeTransactionSubFields.tsx` | Конфиг-управляемые подтиповые поля (дата, счета, номер, описание, подразделение) |
| `…/v2/CategorizeTransactionFormV2.tsx` | RHF-форма: сумма, категория, контрагент, подтиповые поля, футер, сабмит |
| `…/v2/CategorizeTransactionContentV2.tsx` | Оболочка: бутстрап данных + форма |
| `CategorizeTransactionTabs.tsx` (правка 1 строки) | Точка переключения на V2 |

**Переиспользуем без изменений:** `useCategorizeTransaction`, `useCategorizeTransactionBoot`, `useCategorizeTransactionFormInitialValues`, `tranformToRequest`, `useCategorizeTransactionTabsBoot`, `getAddMoneyInOptions`/`getAddMoneyOutOptions`, `ContactSelectField`, `usePreprocessingAccounts`, `accountPredicate`, `useCreateCustomer`/`useCreateVendor`, `withBankingActions`, `AppToaster`.

**Решения о паритете (важно):**
- Тосты — через существующий `AppToaster` (Blueprint), как в легаси: сообщения идентичны, тостер уже смонтирован глобально. Перевод на `sonner` — вне объёма слайса.
- Дата хранится в форме строкой ISO `YYYY-MM-DD`; `DatePicker` конвертирует строку↔`Date`. Сабмит проходит через существующий `tranformToRequest` без изменений. Паритет полезной нагрузки проверяется в Task 6 (сравнение сетевого запроса со старой формой).

---

## Task 1: Примитив `textarea`

**Files:**
- Create: `packages/webapp/src/components/ui/textarea.tsx`

- [ ] **Step 1: Написать примитив**

```tsx
import * as React from 'react';
import { cn } from '@/lib/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:border-action',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
```

- [ ] **Step 2: Проверить типы**

Run: `pnpm --filter @bigfin/webapp exec tsc --noEmit`
Expected: PASS (без ошибок по новому файлу). Если нет filter-скрипта — `pnpm typecheck`.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/components/ui/textarea.tsx
git commit -m "feat(webapp): примитив Textarea (D-redesign)"
```

---

## Task 2: Zod-схема и конфиг подтипов (TDD)

**Files:**
- Create: `…/v2/categorizeTransaction.schema.ts`
- Create: `…/v2/categorizeTransaction.config.ts`
- Test: `…/v2/categorizeTransaction.schema.spec.ts`

- [ ] **Step 1: Написать падающий тест**

`…/v2/categorizeTransaction.schema.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { categorizeTransactionSchema } from './categorizeTransaction.schema';
import { resolveSubtypeConfig } from './categorizeTransaction.config';

const valid = {
  amount: '60000',
  exchangeRate: '1',
  transactionType: 'other_expense',
  date: '2026-06-11',
  debitAccountId: 1001,
  creditAccountId: 2002,
  referenceNo: '',
  description: '',
  branchId: null,
  contactId: null,
};

describe('categorizeTransactionSchema', () => {
  it('принимает валидные значения', () => {
    expect(categorizeTransactionSchema.safeParse(valid).success).toBe(true);
  });

  it('требует transactionType', () => {
    const r = categorizeTransactionSchema.safeParse({ ...valid, transactionType: '' });
    expect(r.success).toBe(false);
  });

  it('требует creditAccountId', () => {
    const r = categorizeTransactionSchema.safeParse({ ...valid, creditAccountId: '' });
    expect(r.success).toBe(false);
  });

  it('требует дату', () => {
    const r = categorizeTransactionSchema.safeParse({ ...valid, date: '' });
    expect(r.success).toBe(false);
  });

  it('допускает пустые referenceNo/description и null контрагента', () => {
    const r = categorizeTransactionSchema.safeParse({
      ...valid, referenceNo: '', description: '', contactId: null,
    });
    expect(r.success).toBe(true);
  });
});

describe('resolveSubtypeConfig', () => {
  it('для расхода даёт счёт расхода с фильтром expense', () => {
    const c = resolveSubtypeConfig('other_expense');
    expect(c.creditFilterRootTypes).toEqual(['expense']);
    expect(c.creditAccountLabelKey).toBe('expense_account');
  });

  it('для прочего дохода — фильтр income', () => {
    expect(resolveSubtypeConfig('other_income').creditFilterRootTypes).toEqual(['income']);
  });

  it('для перевода — фильтр asset', () => {
    expect(resolveSubtypeConfig('transfer_to_account').creditFilterRootTypes).toEqual(['asset']);
  });

  it('неизвестный тип → null', () => {
    expect(resolveSubtypeConfig('nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/webapp exec vitest run src/containers/CashFlow/CategorizeTransaction/drawers/CategorizeTransactionDrawer/v2/categorizeTransaction.schema.spec.ts`
Expected: FAIL — «Cannot find module './categorizeTransaction.schema'».

- [ ] **Step 3: Написать схему**

`…/v2/categorizeTransaction.schema.ts`:

```ts
import { z } from 'zod';

/** id может прийти строкой (из input) или числом (из API). Пусто = невыбрано. */
const requiredId = z.union([z.string().min(1), z.number()]);
const optionalId = z.union([z.string(), z.number()]).nullable().optional();

export const categorizeTransactionSchema = z.object({
  amount: z.string().min(1),
  exchangeRate: z.string().min(1),
  transactionType: z.string().min(1),
  date: z.string().min(1),
  debitAccountId: optionalId,
  creditAccountId: requiredId,
  referenceNo: z.string().optional().default(''),
  description: z.string().optional().default(''),
  branchId: optionalId,
  contactId: z.number().nullable().optional(),
});

export type CategorizeTransactionFormValues = z.infer<
  typeof categorizeTransactionSchema
>;
```

- [ ] **Step 4: Написать конфиг подтипов**

`…/v2/categorizeTransaction.config.ts`:

```ts
export interface SubtypeFieldConfig {
  /** intl-ключ подписи счёта списания (debit). */
  debitAccountLabelKey: string;
  /** intl-ключ подписи счёта зачисления (credit). */
  creditAccountLabelKey: string;
  /** Фильтр счёта зачисления по корневому типу. */
  creditFilterRootTypes: string[];
}

/** Карта по transactionType. Переносит различия 6 легаси-компонентов 1:1. */
export const SUBTYPE_FIELD_CONFIG: Record<string, SubtypeFieldConfig> = {
  other_income: {
    debitAccountLabelKey: 'cashflow.label.to_account',
    creditAccountLabelKey: 'cashflow.label.income_account',
    creditFilterRootTypes: ['income'],
  },
  owner_contribution: {
    debitAccountLabelKey: 'cashflow.label.from_account',
    creditAccountLabelKey: 'cashflow.label.equity_account',
    creditFilterRootTypes: ['equity'],
  },
  transfer_from_account: {
    debitAccountLabelKey: 'cashflow.label.from_account',
    creditAccountLabelKey: 'cashflow.label.to_account',
    creditFilterRootTypes: ['asset'],
  },
  other_expense: {
    debitAccountLabelKey: 'payment_account',
    creditAccountLabelKey: 'expense_account',
    creditFilterRootTypes: ['expense'],
  },
  owner_drawing: {
    debitAccountLabelKey: 'cashflow.label.debit_account',
    creditAccountLabelKey: 'cashflow.label.equity_account',
    creditFilterRootTypes: ['equity'],
  },
  transfer_to_account: {
    debitAccountLabelKey: 'cashflow.label.from_account',
    creditAccountLabelKey: 'cashflow.label.to_account',
    creditFilterRootTypes: ['asset'],
  },
};

export const resolveSubtypeConfig = (
  transactionType: string,
): SubtypeFieldConfig | null => SUBTYPE_FIELD_CONFIG[transactionType] ?? null;
```

- [ ] **Step 5: Запустить тест — должен пройти**

Run: `pnpm --filter @bigfin/webapp exec vitest run src/containers/CashFlow/CategorizeTransaction/drawers/CategorizeTransactionDrawer/v2/categorizeTransaction.schema.spec.ts`
Expected: PASS (9 тестов).

- [ ] **Step 6: Commit**

```bash
git add packages/webapp/src/containers/CashFlow/CategorizeTransaction/drawers/CategorizeTransactionDrawer/v2/
git commit -m "feat(webapp): Zod-схема и конфиг подтипов категоризации (D-redesign)"
```

---

## Task 3: Контролируемые адаптеры селектов

**Files:**
- Create: `…/v2/ControlledAccountsSelect.tsx`
- Create: `…/v2/ControlledBranchSelect.tsx`

Адаптеры строятся на Blueprint `Select` (как `ContactSelectField`), принимают `value`/`onChange` — встают в RHF `Controller`. Старые файлы не трогаем; маленький рендерер `MenuItem` повторяем локально (10 строк) ради изоляции.

- [ ] **Step 1: Написать `ControlledAccountsSelect`**

`…/v2/ControlledAccountsSelect.tsx`:

```tsx
import React, { useMemo } from 'react';
import intl from 'react-intl-universal';
import { Button, MenuItem } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { accountPredicate } from '@/components/Accounts/_components';
import { usePreprocessingAccounts } from '@/components/Accounts/_hooks';

interface AccountItem {
  id: number;
  name: string;
  code?: string;
  account_level?: number;
}

interface ControlledAccountsSelectProps {
  items: AccountItem[];
  value: number | string | null;
  onChange: (accountId: number | null) => void;
  filterByRootTypes?: string[];
  disabled?: boolean;
  placeholder?: string;
}

const accountRenderer = (item: AccountItem, { handleClick, modifiers }: any) => {
  if (!modifiers.matchesPredicate) return null;
  return (
    <MenuItem
      active={modifiers.active}
      disabled={modifiers.disabled}
      label={item.code}
      key={item.id}
      text={item.name}
      onClick={handleClick}
    />
  );
};

export function ControlledAccountsSelect({
  items,
  value,
  onChange,
  filterByRootTypes,
  disabled = false,
  placeholder,
}: ControlledAccountsSelectProps) {
  const filtered = usePreprocessingAccounts(items, { filterByRootTypes });

  const selected = useMemo(
    () => filtered.find((a: AccountItem) => String(a.id) === String(value)),
    [filtered, value],
  );

  return (
    <Select
      items={filtered}
      itemRenderer={accountRenderer}
      itemPredicate={accountPredicate}
      filterable
      disabled={disabled}
      onItemSelect={(item: AccountItem) => onChange(item ? item.id : null)}
      popoverProps={{ minimal: true, usePortal: true }}
      inputProps={{ placeholder: intl.get('filter_') }}
    >
      <Button
        fill
        disabled={disabled}
        alignText="left"
        text={selected ? selected.name : placeholder || intl.get('select_account')}
        rightIcon="caret-down"
        style={{ justifyContent: 'space-between' }}
      />
    </Select>
  );
}
```

- [ ] **Step 2: Написать `ControlledBranchSelect`**

`…/v2/ControlledBranchSelect.tsx`:

```tsx
import React, { useMemo } from 'react';
import intl from 'react-intl-universal';
import { Button, MenuItem } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';

interface BranchItem {
  id: number;
  name: string;
  code?: string;
}

interface ControlledBranchSelectProps {
  items: BranchItem[];
  value: number | string | null;
  onChange: (branchId: number | null) => void;
  disabled?: boolean;
}

const branchPredicate = (query: string, item: BranchItem) =>
  item.name.toLowerCase().includes(query.toLowerCase());

const branchRenderer = (item: BranchItem, { handleClick, modifiers }: any) => {
  if (!modifiers.matchesPredicate) return null;
  return (
    <MenuItem
      active={modifiers.active}
      key={item.id}
      label={item.code}
      text={item.name}
      onClick={handleClick}
    />
  );
};

export function ControlledBranchSelect({
  items,
  value,
  onChange,
  disabled = false,
}: ControlledBranchSelectProps) {
  const selected = useMemo(
    () => (items || []).find((b) => String(b.id) === String(value)),
    [items, value],
  );

  return (
    <Select
      items={items || []}
      itemRenderer={branchRenderer}
      itemPredicate={branchPredicate}
      filterable
      disabled={disabled}
      onItemSelect={(item: BranchItem) => onChange(item ? item.id : null)}
      popoverProps={{ minimal: true, usePortal: true }}
    >
      <Button
        fill
        disabled={disabled}
        alignText="left"
        text={selected ? selected.name : intl.get('select_branch')}
        rightIcon="caret-down"
        style={{ justifyContent: 'space-between' }}
      />
    </Select>
  );
}
```

- [ ] **Step 3: Проверить типы**

Run: `pnpm typecheck`
Expected: PASS. Если `accountPredicate`/`usePreprocessingAccounts` не экспортируются из указанных путей — найти точный экспорт: `grep -rn "accountPredicate\|usePreprocessingAccounts" packages/webapp/src/components/Accounts/` и поправить импорт. Если ключи `select_account`/`select_branch` отсутствуют — заменить на существующие (`grep -rn "\"select_account\"\|\"select_branch\"" packages/webapp/src/lang/en/index.json`) или добавить парно через skill i18n-add-string.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/containers/CashFlow/CategorizeTransaction/drawers/CategorizeTransactionDrawer/v2/Controlled*.tsx
git commit -m "feat(webapp): контролируемые адаптеры счёта и подразделения для RHF (D-redesign)"
```

---

## Task 4: Подтиповые поля (конфиг-управляемые)

**Files:**
- Create: `…/v2/CategorizeTransactionSubFields.tsx`

Один компонент для всех 6 типов: дата, счёт списания (disabled), счёт зачисления (по конфигу), номер документа, описание, подразделение (под фичей).

- [ ] **Step 1: Написать компонент**

`…/v2/CategorizeTransactionSubFields.tsx`:

```tsx
import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { useFormContext } from 'react-hook-form';
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { FeatureCan } from '@/components';
import { Features } from '@/constants';
import { useCategorizeTransactionBoot } from '../CategorizeTransactionBoot';
import { resolveSubtypeConfig } from './categorizeTransaction.config';
import { ControlledAccountsSelect } from './ControlledAccountsSelect';
import { ControlledBranchSelect } from './ControlledBranchSelect';
import type { CategorizeTransactionFormValues } from './categorizeTransaction.schema';

export function CategorizeTransactionSubFields() {
  const { control, watch } = useFormContext<CategorizeTransactionFormValues>();
  const { accounts, branches } = useCategorizeTransactionBoot();
  const transactionType = watch('transactionType');

  const config = resolveSubtypeConfig(transactionType);
  if (!config) return null;

  return (
    <>
      <FormField
        control={control}
        name="date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('date')}</FormLabel>
            <FormControl>
              <DatePicker
                value={field.value ? new Date(field.value) : undefined}
                onChange={(d) =>
                  field.onChange(d ? moment(d).format('YYYY-MM-DD') : '')
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex gap-3">
        <FormField
          control={control}
          name="debitAccountId"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>{intl.get(config.debitAccountLabelKey)}</FormLabel>
              <FormControl>
                <ControlledAccountsSelect
                  items={accounts}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  disabled
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="creditAccountId"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>{intl.get(config.creditAccountLabelKey)}</FormLabel>
              <FormControl>
                <ControlledAccountsSelect
                  items={accounts}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  filterByRootTypes={config.creditFilterRootTypes}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="referenceNo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('reference_no')}</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('description')}</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FeatureCan feature={Features.Branches}>
        <FormField
          control={control}
          name="branchId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('branch')}</FormLabel>
              <FormControl>
                <ControlledBranchSelect
                  items={branches}
                  value={field.value ?? null}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FeatureCan>
    </>
  );
}
```

- [ ] **Step 2: Проверить типы**

Run: `pnpm typecheck`
Expected: PASS. Если `FeatureCan`/`Features` импортируются иначе — сверить с `CategorizeTransactionBranchField.tsx` (там рабочие импорты).

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/containers/CashFlow/CategorizeTransaction/drawers/CategorizeTransactionDrawer/v2/CategorizeTransactionSubFields.tsx
git commit -m "feat(webapp): конфиг-управляемые подтиповые поля категоризации (D-redesign)"
```

---

## Task 5: Форма и оболочка V2

**Files:**
- Create: `…/v2/CategorizeTransactionFormV2.tsx`
- Create: `…/v2/CategorizeTransactionContentV2.tsx`

- [ ] **Step 1: Написать форму**

`…/v2/CategorizeTransactionFormV2.tsx`:

```tsx
import React, { useMemo } from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from 'react-query';
import { Intent } from '@blueprintjs/core';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AppToaster } from '@/components';
import { ContactSelectField } from '@/components/Contacts/ContactSelectField';
import { getAddMoneyInOptions, getAddMoneyOutOptions } from '@/constants';
import { useCategorizeTransaction, useCreateCustomer, useCreateVendor } from '@/hooks/query';
import { useCurrentOrganization } from '@/hooks/state';
import { useCategorizeTransactionTabsBoot } from '@/containers/CashFlow/CategorizeTransactionAside/CategorizeTransactionTabsBoot';
import { withBankingActions } from '@/containers/CashFlow/withBankingActions';
import { compose } from '@/utils';
import { useCategorizeTransactionBoot } from '../CategorizeTransactionBoot';
import {
  tranformToRequest,
  useCategorizeTransactionFormInitialValues,
} from '../_utils';
import {
  categorizeTransactionSchema,
  type CategorizeTransactionFormValues,
} from './categorizeTransaction.schema';
import { CategorizeTransactionSubFields } from './CategorizeTransactionSubFields';

function CategorizeTransactionFormV2Root({ closeMatchingTransactionAside }: any) {
  const { uncategorizedTransactionIds } = useCategorizeTransactionTabsBoot();
  const { autofillCategorizeValues, contacts } = useCategorizeTransactionBoot();
  const { mutateAsync: categorizeTransaction } = useCategorizeTransaction();
  const queryClient = useQueryClient();
  const organization = useCurrentOrganization();
  const { mutateAsync: createCustomer, isLoading: creatingCustomer } = useCreateCustomer();
  const { mutateAsync: createVendor, isLoading: creatingVendor } = useCreateVendor();

  const initialValues = useCategorizeTransactionFormInitialValues();
  const form = useForm<CategorizeTransactionFormValues>({
    resolver: zodResolver(categorizeTransactionSchema),
    defaultValues: initialValues as CategorizeTransactionFormValues,
  });

  const isDeposit = autofillCategorizeValues?.isDepositTransaction;
  const formattedAmount = autofillCategorizeValues?.formattedAmount;
  const payee = autofillCategorizeValues?.payee;
  const payeeInn = autofillCategorizeValues?.payeeInn;
  const typeOptions = useMemo(
    () => (isDeposit ? getAddMoneyInOptions() : getAddMoneyOutOptions()),
    [isDeposit],
  );

  const contactId = form.watch('contactId');
  const canCreateContact = Boolean(payeeInn && payee && !contactId);

  const handleCreateContact = async () => {
    const baseCurrency = organization?.base_currency;
    if (!baseCurrency) {
      AppToaster.show({ message: intl.get('bank_import.contact_create_failed'), intent: Intent.DANGER });
      return;
    }
    const payload = {
      display_name: payee, currency_code: baseCurrency, inn: payeeInn,
      ...(isDeposit ? { customer_type: 'business' } : {}),
    };
    try {
      const res = isDeposit ? await createCustomer(payload) : await createVendor(payload);
      await queryClient.invalidateQueries(['CONTACTS', 'AUTO-COMPLETE']);
      const newId = res?.data?.id;
      if (newId) form.setValue('contactId', newId);
      AppToaster.show({ message: intl.get('bank_import.contact_created'), intent: Intent.SUCCESS });
    } catch {
      AppToaster.show({ message: intl.get('bank_import.contact_create_failed'), intent: Intent.DANGER });
    }
  };

  const onSubmit = async (values: CategorizeTransactionFormValues) => {
    const payload = tranformToRequest(values, uncategorizedTransactionIds);
    try {
      await categorizeTransaction(payload);
      AppToaster.show({ message: intl.get('cashflow.notify.transaction_categorized'), intent: Intent.SUCCESS });
      closeMatchingTransactionAside();
    } catch (err: any) {
      const branchRequired = err?.response?.data?.errors?.some(
        (e: any) => e.type === 'BRANCH_ID_REQUIRED',
      );
      if (branchRequired) {
        form.setError('branchId', { message: intl.get('branch') });
      } else {
        AppToaster.show({ message: intl.get('something_went_wrong'), intent: Intent.DANGER });
      }
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-1 flex-col bigfin-ui"
      >
        <div className="flex flex-col gap-4 p-5">
          {/* Сумма — только показ */}
          <div>
            <div className="text-xs uppercase tracking-wide text-text-muted">
              {intl.get('amount')}
            </div>
            <div className={isDeposit ? 'text-xl font-medium text-success' : 'text-xl font-medium text-danger'}>
              {formattedAmount}
            </div>
          </div>

          {/* Категория (тип операции) */}
          <FormField
            control={form.control}
            name="transactionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('category')}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={intl.get('category')} />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Контрагент */}
          <FormField
            control={form.control}
            name="contactId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('bank_import.counterparty')}</FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-1">
                    <ContactSelectField
                      contacts={contacts}
                      selectedContactId={field.value || null}
                      onContactSelected={(c: any) => field.onChange(c ? c.id : null)}
                      popoverFill
                    />
                    {canCreateContact && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={creatingCustomer || creatingVendor}
                        onClick={handleCreateContact}
                      >
                        {intl.get('bank_import.create_contact')}
                      </Button>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <CategorizeTransactionSubFields />
        </div>

        {/* Футер */}
        <div className="mt-auto flex gap-2 border-t border-border p-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {intl.get('save')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={form.formState.isSubmitting}
            onClick={() => closeMatchingTransactionAside()}
          >
            {intl.get('close')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export const CategorizeTransactionFormV2 = compose(withBankingActions)(
  CategorizeTransactionFormV2Root,
);
```

- [ ] **Step 2: Написать оболочку контента**

`…/v2/CategorizeTransactionContentV2.tsx`:

```tsx
import React, { Suspense } from 'react';
import * as R from 'ramda';
import { Spinner } from '@/components/ui/Spinner';
import { CategorizeTransactionBoot } from '../CategorizeTransactionBoot';
import { withBanking } from '@/containers/CashFlow/withBanking';
import { CategorizeTransactionFormV2 } from './CategorizeTransactionFormV2';

function CategorizeTransactionContentV2Root({
  transactionsToCategorizeIdsSelected,
}: any) {
  return (
    <CategorizeTransactionBoot
      uncategorizedTransactionsIds={transactionsToCategorizeIdsSelected}
    >
      <div className="flex flex-1 flex-col">
        <Suspense fallback={<Spinner size="md" />}>
          <CategorizeTransactionFormV2 />
        </Suspense>
      </div>
    </CategorizeTransactionBoot>
  );
}

export const CategorizeTransactionContentV2 = R.compose(
  withBanking(({ transactionsToCategorizeIdsSelected }: any) => ({
    transactionsToCategorizeIdsSelected,
  })),
)(CategorizeTransactionContentV2Root);
```

- [ ] **Step 3: Проверить типы**

Run: `pnpm typecheck`
Expected: PASS. Сверить точные экспортируемые имена: `Button` `variant`/`size` (`grep -n "variant\|size" packages/webapp/src/components/ui/button.tsx`), `Spinner` `size` (`packages/webapp/src/components/ui/Spinner.tsx`). Если `intl.get('save')`/`'close'` отсутствуют — найти аналоги (`grep -rn "\"save\"\|\"close\"" packages/webapp/src/lang/en/index.json`).

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/containers/CashFlow/CategorizeTransaction/drawers/CategorizeTransactionDrawer/v2/CategorizeTransactionFormV2.tsx packages/webapp/src/containers/CashFlow/CategorizeTransaction/drawers/CategorizeTransactionDrawer/v2/CategorizeTransactionContentV2.tsx
git commit -m "feat(webapp): форма категоризации транзакции на RHF+Zod (D-redesign)"
```

---

## Task 6: Переключение и проверка

**Files:**
- Modify: `packages/webapp/src/containers/CashFlow/CategorizeTransactionAside/CategorizeTransactionTabs.tsx` (1 строка импорта + использование)

- [ ] **Step 1: Переключить вкладку «Категоризировать» на V2**

В `CategorizeTransactionTabs.tsx`:
- заменить импорт
  `import { CategorizeTransactionContent } from '../CategorizeTransaction/drawers/CategorizeTransactionDrawer/CategorizeTransactionContent';`
  на
  `import { CategorizeTransactionContentV2 } from '../CategorizeTransaction/drawers/CategorizeTransactionDrawer/v2/CategorizeTransactionContentV2';`
- в `panel={<CategorizeTransactionContent />}` заменить на `panel={<CategorizeTransactionContentV2 />}`.

Старый файл `CategorizeTransactionContent.tsx` остаётся в коде (мгновенный откат = вернуть строку).

- [ ] **Step 2: Типы + парность строк**

Run: `pnpm typecheck`
Expected: PASS (3 пакета).

Run: `node packages/webapp/scripts/lang-check.js`
Expected: `EN === RU` (равные счётчики). Если добавлялись ключи — они парные.

- [ ] **Step 3: Запустить стек и проверить визуально**

Поднять локальный стек (skill `run-bigfin`: docker mariadb+redis, API:3000, webapp:4000). Войти (founder@bigfin.local). Открыть счёт с банковскими транзакциями → выбрать некатегоризированную транзакцию → правая панель, вкладка «Категоризировать».

Проверить по чек-листу:
- форма отрисована в новом стиле (подписи над полями, в столбик);
- селект «Категория» переключает поля; подписи счетов и фильтр меняются по типу;
- для **всех 6 типов** (3 прихода + 3 расхода) выбор счёта/контрагента/даты/описания работает;
- кнопка «создать контрагента» появляется при наличии ИНН в выписке и создаёт контрагента;
- **сохранение каждого из 6 типов** проходит, появляется тост успеха, панель закрывается, транзакция уходит из «Без категории».

- [ ] **Step 4: Проверить паритет сетевого запроса (де-риск даты)**

В DevTools → Network сравнить тело POST-запроса категоризации, сделанного **новой** формой, с телом, которое отправляла **старая** (вернуть строку в `CategorizeTransactionTabs.tsx`, сделать тестовую категоризацию, сравнить, вернуть V2). Поля и формат `date` (`YYYY-MM-DD`), `credit_account_id`, `debit_account_id`, `transaction_type`, `contact_id`, `branch_id` должны совпадать. Если сервер ожидал иной формат даты — поправить конвертацию в `CategorizeTransactionSubFields` (Step plan: заменить `moment(d).format('YYYY-MM-DD')` на нужный формат) и перепроверить.

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/containers/CashFlow/CategorizeTransactionAside/CategorizeTransactionTabs.tsx
git commit -m "feat(webapp): включить новую форму категоризации в панели (D-redesign, слайс 1)"
```

---

## Откат

- Полный откат экрана: вернуть строку импорта/использования в `CategorizeTransactionTabs.tsx` на `CategorizeTransactionContent`.
- Откат кода: новые файлы лежат в каталоге `v2/` и в `ui/textarea.tsx` — изолированы, удаление не затрагивает легаси.

## Вне объёма (следующие слайсы)
- Вкладка «Сопоставление со счётом/актом» (③).
- Список транзакций (① таблица/панель/вкладки).
- Диалоги Money In / Money Out.
- Универсальный searchable-дропдаун на Radix (замена Blueprint-адаптеров).
- Перевод тостов на `sonner`.
