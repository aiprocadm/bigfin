# Редизайн страницы «Общие» (Preferences → General) на shadcn — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести форму «Настройки → Общие» с Formik + Blueprint на React Hook Form + Zod + shadcn, сохранив всё текущее поведение (поля, валидация, сабмит, перезагрузка при смене языка, блокировка базовой валюты при наличии проводок).

**Architecture:** Добавляем переиспользуемый shadcn-примитив `Combobox` (поиск по вводу, на базе Radix Popover — без новых зависимостей) для трёх длинных списков (страна/валюта/таймзона). Валидацию переносим с Yup на Zod. `GeneralFormProvider` (загрузка данных организации, форматов дат, прав на смену валюты) переиспользуем как есть. `GeneralFormPage` поднимает `useForm`+`zodResolver` и сабмит; `GeneralForm` рисует поля на shadcn `Form`/`Input`/`Select`/`Combobox`.

**Tech Stack:** React 18, react-hook-form ^7.76, zod ^3.23, @hookform/resolvers ^3.10, Radix (popover/select/label уже в `components/ui/`), lucide-react, react-intl-universal, vitest + @testing-library/react.

> **Политика типов:** новые файлы пишем БЕЗ `// @ts-nocheck` (guard `.husky/pre-commit` блокирует прагму в новых файлах). Существующие `@ts-nocheck`-файлы, которые переписываем целиком (`GeneralForm.tsx`, `GeneralFormPage.tsx`), делаем чистыми TS. `GeneralFormProvider.tsx` — оставляем `@ts-nocheck` (не трогаем логику данных). Тост — `AppToaster` (sonner `<Toaster/>` в дашборде монтируется отдельным PR; не зависим от него).

Спека/решения (зафиксированы в брейншторминге): вариант **B** (полный RHF+Zod+shadcn) + **собственный Combobox** для страна/валюта/таймзона. Короткие списки (язык, фин. год, формат даты) — обычный shadcn `Select`.

---

## Сводка файлов

| Файл | Действие | Ответственность |
|---|---|---|
| `packages/webapp/src/components/ui/combobox.tsx` | Create | Примитив: searchable select на Radix Popover |
| `packages/webapp/src/components/ui/combobox.spec.tsx` | Create | Юнит-тесты фильтрации/выбора |
| `packages/webapp/src/containers/Preferences/General/General.zod.ts` | Create | Zod-схема + тип значений формы |
| `packages/webapp/src/containers/Preferences/General/General.zod.spec.ts` | Create | Юнит-тесты валидации (required/optional) |
| `packages/webapp/src/containers/Preferences/General/options.ts` | Create | Маппинг источников опций → `{value,label}[]` |
| `packages/webapp/src/containers/Preferences/General/GeneralForm.tsx` | Rewrite | Поля формы на shadcn |
| `packages/webapp/src/containers/Preferences/General/GeneralFormPage.tsx` | Rewrite | `useForm`+submit+раскладка карточки |
| `packages/webapp/src/containers/Preferences/General/utils.tsx` | Delete (Task 8, с подтверждением) | Formik-only `shouldBaseCurrencyUpdate` — станет неиспользуемым |
| `packages/webapp/src/lang/{en,ru}/index.json` | Modify | 5 ключей: 3 заголовка секций + поиск/пусто для Combobox |

`GeneralFormProvider.tsx`, `General.tsx` — без изменений.

---

## Task 1: i18n-ключи (секции + Combobox)

**Files:**
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Добавить 5 ключей парно**

Вставить после `"preferences.general.success_message"` (найти строку: `grep -n '"preferences.general.success_message"' packages/webapp/src/lang/en/index.json`).

EN:
```json
  "preferences.general.section.organization": "Organization",
  "preferences.general.section.address": "Address",
  "preferences.general.section.localization": "Localization & format",
  "preferences.combobox.search": "Search…",
  "preferences.combobox.empty": "Nothing found",
```
RU (та же позиция в ru/index.json):
```json
  "preferences.general.section.organization": "Организация",
  "preferences.general.section.address": "Адрес",
  "preferences.general.section.localization": "Локализация и формат",
  "preferences.combobox.search": "Поиск…",
  "preferences.combobox.empty": "Ничего не найдено",
```

- [ ] **Step 2: Проверить парность**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: `0 missing`, `0 extra`.

- [ ] **Step 3: Ревью RU**

Запустить сабагент `ru-translation-reviewer` на 5 новых RU-ключей. Поправить замечания, повторить lang-check.

- [ ] **Step 4: Коммит**

```bash
git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "i18n(webapp): ключи секций «Общие» и строки Combobox (EN+RU)"
```

---

## Task 2: примитив Combobox (TDD)

**Files:**
- Create: `packages/webapp/src/components/ui/combobox.tsx`
- Test: `packages/webapp/src/components/ui/combobox.spec.tsx`

- [ ] **Step 1: Написать падающий тест**

`packages/webapp/src/components/ui/combobox.spec.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Combobox } from './combobox';

const items = [
  { value: 'RUB', label: 'Российский рубль' },
  { value: 'USD', label: 'Доллар США' },
  { value: 'EUR', label: 'Евро' },
];

describe('Combobox', () => {
  it('показывает label выбранного значения на триггере', () => {
    render(<Combobox items={items} value="USD" onChange={() => {}} placeholder="—" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Доллар США');
  });

  it('фильтрует список по вводу и вызывает onChange при выборе', () => {
    const onChange = vi.fn();
    render(<Combobox items={items} value="" onChange={onChange} placeholder="—" searchPlaceholder="Поиск" emptyText="Пусто" />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByPlaceholderText('Поиск'), { target: { value: 'евр' } });
    expect(screen.queryByText('Доллар США')).toBeNull();
    fireEvent.click(screen.getByText('Евро'));
    expect(onChange).toHaveBeenCalledWith('EUR');
  });

  it('показывает emptyText, когда нет совпадений', () => {
    render(<Combobox items={items} value="" onChange={() => {}} placeholder="—" searchPlaceholder="Поиск" emptyText="Пусто" />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByPlaceholderText('Поиск'), { target: { value: 'zzz' } });
    expect(screen.getByText('Пусто')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает**

Run: `pnpm --filter @bigfin/webapp test -- src/components/ui/combobox.spec.tsx`
Expected: FAIL — `Cannot find module './combobox'`.

- [ ] **Step 3: Реализовать примитив**

`packages/webapp/src/components/ui/combobox.tsx`:
```tsx
import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface ComboboxItem {
  value: string;
  label: string;
}

export interface ComboboxProps {
  items: ComboboxItem[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    { items, value, onChange, placeholder, searchPlaceholder, emptyText, disabled, id, className },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');

    const selected = items.find((item) => item.value === value);
    const filtered = query
      ? items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
      : items;

    const handleSelect = (next: string) => {
      onChange(next);
      setOpen(false);
      setQuery('');
    };

    return (
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'flex h-11 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm sm:h-10',
              'focus:outline-none focus-visible:border-action focus-visible:ring-2 focus-visible:ring-action',
              'disabled:cursor-not-allowed disabled:opacity-50',
              selected ? 'text-text-primary' : 'text-text-muted',
              className,
            )}
          >
            <span className="line-clamp-1 text-left">{selected ? selected.label : placeholder}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
        >
          <div className="border-b border-border p-2">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-text-muted">{emptyText}</div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleSelect(item.value)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm',
                    'hover:bg-surface-elevated focus:bg-surface-elevated focus:outline-none',
                    item.value === value ? 'text-text-primary' : 'text-text-secondary',
                  )}
                >
                  <span className="line-clamp-1">{item.label}</span>
                  {item.value === value ? <Check className="h-4 w-4 shrink-0 text-action" aria-hidden /> : null}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);
Combobox.displayName = 'Combobox';
```

- [ ] **Step 4: Прогнать — убедиться, что проходит**

Run: `pnpm --filter @bigfin/webapp test -- src/components/ui/combobox.spec.tsx`
Expected: PASS (3 теста). Если Radix Popover в jsdom не порталит контент — заменить проверку на `screen.findByText` (async) и `await`.

- [ ] **Step 5: Typecheck + коммит**

Run: `pnpm --filter @bigfin/webapp typecheck` → без ошибок.
```bash
git add packages/webapp/src/components/ui/combobox.tsx packages/webapp/src/components/ui/combobox.spec.tsx
git commit -m "feat(webapp): примитив Combobox (searchable select на Radix Popover)"
```

---

## Task 3: Zod-схема (TDD)

**Files:**
- Create: `packages/webapp/src/containers/Preferences/General/General.zod.ts`
- Test: `packages/webapp/src/containers/Preferences/General/General.zod.spec.ts`

- [ ] **Step 1: Написать падающий тест**

`General.zod.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generalSchema } from './General.zod';

const valid = {
  name: 'ООО Ромашка',
  tax_number: '',
  industry: '',
  location: 'RU',
  base_currency: 'RUB',
  fiscal_year: 'january',
  language: 'ru',
  timezone: 'Europe/Moscow',
  date_format: 'DD/MM/YYYY',
  address: {},
};

describe('generalSchema', () => {
  it('пропускает валидные значения', () => {
    expect(generalSchema.safeParse(valid).success).toBe(true);
  });

  it('требует name', () => {
    const r = generalSchema.safeParse({ ...valid, name: '' });
    expect(r.success).toBe(false);
  });

  it('требует base_currency, fiscal_year, language, timezone, date_format', () => {
    for (const key of ['base_currency', 'fiscal_year', 'language', 'timezone', 'date_format']) {
      expect(generalSchema.safeParse({ ...valid, [key]: '' }).success).toBe(false);
    }
  });

  it('tax_number/industry/location необязательны', () => {
    expect(generalSchema.safeParse({ ...valid, tax_number: '', industry: '', location: '' }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Прогнать — FAIL** (`Cannot find module './General.zod'`).
Run: `pnpm --filter @bigfin/webapp test -- src/containers/Preferences/General/General.zod.spec.ts`

- [ ] **Step 3: Реализовать схему**

`General.zod.ts`:
```ts
import intl from 'react-intl-universal';
import { z } from 'zod';

const required = (label: string) =>
  z.string({ required_error: label }).trim().min(1, label);

export const generalSchema = z.object({
  name: required(intl.get('organization_name_')),
  tax_number: z.string().optional().default(''),
  industry: z.string().optional().default(''),
  location: z.string().optional().default(''),
  base_currency: required(intl.get('base_currency_')),
  fiscal_year: required(intl.get('fiscal_year_')),
  language: required(intl.get('language')),
  timezone: required(intl.get('time_zone_')),
  date_format: required(intl.get('date_format_')),
  address: z
    .object({
      address1: z.string().optional().default(''),
      address2: z.string().optional().default(''),
      city: z.string().optional().default(''),
      postal_code: z.string().optional().default(''),
      state_province: z.string().optional().default(''),
      phone: z.string().optional().default(''),
    })
    .partial()
    .optional()
    .default({}),
});

export type GeneralFormValues = z.infer<typeof generalSchema>;
```

- [ ] **Step 4: Прогнать — PASS** (4 теста).

- [ ] **Step 5: Коммит**
```bash
git add packages/webapp/src/containers/Preferences/General/General.zod.ts packages/webapp/src/containers/Preferences/General/General.zod.spec.ts
git commit -m "feat(webapp): Zod-схема формы «Общие» (замена Yup)"
```

---

## Task 4: маппинг опций

**Files:**
- Create: `packages/webapp/src/containers/Preferences/General/options.ts`

- [ ] **Step 1: Создать хелперы опций**

Источники (как в текущем `GeneralForm.tsx`): `getAllCountries()` из `@bigfin/utils` → `{ countryCode, name }`; `getAllCurrenciesOptions()` из `@/constants/currencies` → `{ key, name }`; `getFiscalYear()` → `{ key, name }`; `getLanguages()` → `{ value, name }`; форматы дат приходят из контекста (`{ key, label }`). Таймзоны — `Intl.supportedValuesOf('timeZone')`.

`options.ts`:
```ts
import { getAllCountries } from '@bigfin/utils';
import { getAllCurrenciesOptions } from '@/constants/currencies';
import { getFiscalYear } from '@/constants/fiscalYearOptions';
import { getLanguages } from '@/constants/languagesOptions';
import type { ComboboxItem } from '@/components/ui/combobox';

export const countryOptions = (): ComboboxItem[] =>
  getAllCountries().map((c: any) => ({ value: c.countryCode, label: c.name }));

export const currencyOptions = (): ComboboxItem[] =>
  getAllCurrenciesOptions().map((c: any) => ({ value: c.key, label: c.name }));

export const timezoneOptions = (): ComboboxItem[] => {
  const list: string[] =
    typeof (Intl as any).supportedValuesOf === 'function'
      ? (Intl as any).supportedValuesOf('timeZone')
      : ['UTC', 'Europe/Moscow', 'Europe/London', 'America/New_York'];
  return list.map((tz) => ({ value: tz, label: tz }));
};

export const fiscalYearOptions = (): { value: string; label: string }[] =>
  getFiscalYear().map((f: any) => ({ value: f.key, label: f.name }));

export const languageOptions = (): { value: string; label: string }[] =>
  getLanguages().map((l: any) => ({ value: l.value, label: l.name }));

export const dateFormatOptions = (
  dateFormats: { key: string; label: string }[],
): { value: string; label: string }[] =>
  (dateFormats ?? []).map((d) => ({ value: d.key, label: d.label }));
```

- [ ] **Step 2: Typecheck**
Run: `pnpm --filter @bigfin/webapp typecheck` → без ошибок.

- [ ] **Step 3: Коммит**
```bash
git add packages/webapp/src/containers/Preferences/General/options.ts
git commit -m "feat(webapp): хелперы опций формы «Общие» ({value,label})"
```

---

## Task 5: GeneralForm на shadcn

**Files:**
- Rewrite: `packages/webapp/src/containers/Preferences/General/GeneralForm.tsx`

- [ ] **Step 1: Переписать компонент полей**

Использует `useFormContext<GeneralFormValues>()` (из shadcn `Form`=FormProvider) и `useGeneralFormContext()` (данные/права). Текстовые поля — `Input`; страна/валюта/таймзона — `Combobox`; язык/фин.год/формат даты — `Select`. Базовая валюта `disabled`, когда `baseCurrencyMutateAbility.length > 0`.

`GeneralForm.tsx` (полностью):
```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';

import { Combobox } from '@/components/ui/combobox';
import {
  FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useGeneralFormContext } from './GeneralFormProvider';
import {
  countryOptions, currencyOptions, dateFormatOptions, fiscalYearOptions,
  languageOptions, timezoneOptions,
} from './options';
import type { GeneralFormValues } from './General.zod';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-4">
    <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
    {children}
  </div>
);

export default function GeneralForm() {
  const form = useFormContext<GeneralFormValues>();
  const { dateFormats, baseCurrencyMutateAbility } = useGeneralFormContext();
  const baseCurrencyDisabled = (baseCurrencyMutateAbility?.length ?? 0) > 0;

  const search = intl.get('preferences.combobox.search');
  const empty = intl.get('preferences.combobox.empty');

  const countries = React.useMemo(countryOptions, []);
  const currencies = React.useMemo(currencyOptions, []);
  const timezones = React.useMemo(timezoneOptions, []);
  const fiscalYears = React.useMemo(fiscalYearOptions, []);
  const languages = React.useMemo(languageOptions, []);
  const dateFmts = React.useMemo(() => dateFormatOptions(dateFormats), [dateFormats]);

  return (
    <div className="flex flex-col gap-8">
      <Section title={intl.get('preferences.general.section.organization')}>
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('organization_name')}</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormDescription>{intl.get('shown_on_sales_forms_and_purchase_orders')}</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="tax_number" render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('organization_tax_number')}</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="industry" render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('organization_industry')}</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="location" render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('business_location')}</FormLabel>
            <FormControl>
              <Combobox
                items={countries}
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder={intl.get('select_business_location')}
                searchPlaceholder={search}
                emptyText={empty}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </Section>

      <Section title={intl.get('preferences.general.section.address')}>
        {(['address1', 'address2', 'city', 'postal_code', 'state_province', 'phone'] as const).map((part) => (
          <FormField key={part} control={form.control} name={`address.${part}` as const} render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  placeholder={intl.get(
                    part === 'phone' ? 'phone_number_' : `preferences.general.${
                      part === 'postal_code' ? 'zip_code' : part === 'address1' ? 'address_1' : part === 'address2' ? 'address_2' : part
                    }`,
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        ))}
      </Section>

      <Section title={intl.get('preferences.general.section.localization')}>
        <FormField control={form.control} name="base_currency" render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('base_currency')}</FormLabel>
            <FormControl>
              <Combobox
                items={currencies}
                value={field.value ?? ''}
                onChange={field.onChange}
                disabled={baseCurrencyDisabled}
                placeholder={intl.get('select_base_currency')}
                searchPlaceholder={search}
                emptyText={empty}
              />
            </FormControl>
            {baseCurrencyDisabled ? (
              <FormDescription>
                {intl.get('you_can_t_change_the_base_currency_as_there_are_transactions')}
              </FormDescription>
            ) : null}
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="fiscal_year" render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('fiscal_year')}</FormLabel>
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue placeholder={intl.get('select_fiscal_year')} /></SelectTrigger></FormControl>
              <SelectContent>
                {fiscalYears.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormDescription>{intl.get('for_reporting_you_can_specify_any_month')}</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="language" render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('language')}</FormLabel>
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue placeholder={intl.get('select_language')} /></SelectTrigger></FormControl>
              <SelectContent>
                {languages.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="timezone" render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('time_zone')}</FormLabel>
            <FormControl>
              <Combobox
                items={timezones}
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder={intl.get('select_time_zone')}
                searchPlaceholder={search}
                emptyText={empty}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="date_format" render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('date_format')}</FormLabel>
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue placeholder={intl.get('select_date_format')} /></SelectTrigger></FormControl>
              <SelectContent>
                {dateFmts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </Section>
    </div>
  );
}
```

> Примечание: ключи плейсхолдеров адреса (`preferences.general.address_1/address_2/city/zip_code/state_province`, `phone_number_`) уже существуют — используются в текущем `GeneralForm.tsx`. Новых i18n-ключей здесь не требуется.

- [ ] **Step 2: Typecheck**
Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок. (На этом шаге `GeneralFormPage.tsx` ещё старый — typecheck может ругаться на несоответствие пропсов; допустимо до Task 6. Если ругается — перейти к Task 6 и прогнать typecheck там.)

- [ ] **Step 3: Коммит**
```bash
git add packages/webapp/src/containers/Preferences/General/GeneralForm.tsx
git commit -m "feat(webapp): поля формы «Общие» на shadcn (Form/Input/Select/Combobox)"
```

---

## Task 6: GeneralFormPage на RHF

**Files:**
- Rewrite: `packages/webapp/src/containers/Preferences/General/GeneralFormPage.tsx`

- [ ] **Step 1: Переписать страницу**

Сохранить: заголовок страницы, `transformToForm(organization.metadata, defaultValues)` для начальных значений, сабмит через `updateOrganization`, тост `AppToaster`, перезагрузку при смене языка. Обернуть в shadcn `Card` + `<Form>` + `<form>`. Кнопки «Сохранить»/«Закрыть» в футере.

`GeneralFormPage.tsx` (полностью, чистый TS):
```tsx
import React, { useEffect } from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHistory } from 'react-router-dom';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import GeneralForm from './GeneralForm';
import { generalSchema, type GeneralFormValues } from './General.zod';
import { useGeneralFormContext } from './GeneralFormProvider';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { compose, transformToForm } from '@/utils';

const defaultValues: GeneralFormValues = {
  name: '', tax_number: '', industry: '', location: '',
  base_currency: '', language: '', fiscal_year: '', date_format: '',
  timezone: '', address: {},
};

interface GeneralFormPageProps {
  changePreferencesPageTitle: (title: string) => void;
}

function GeneralFormPage({ changePreferencesPageTitle }: GeneralFormPageProps) {
  const history = useHistory();
  const { updateOrganization, organization } = useGeneralFormContext();

  useEffect(() => {
    changePreferencesPageTitle(intl.get('general'));
  }, [changePreferencesPageTitle]);

  const initialValues: GeneralFormValues = {
    ...defaultValues,
    ...transformToForm(organization.metadata, defaultValues),
  };

  const form = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: GeneralFormValues) => {
    try {
      await updateOrganization({ ...values });
      AppToaster.show({
        message: intl.get('preferences.general.success_message'),
        intent: Intent.SUCCESS,
      });
      if (organization.metadata?.language !== values.language) {
        window.location.reload();
      }
    } catch {
      // ошибки полей возвращает бэкенд; глобальный тост не показываем (как в легаси)
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-8">
            <GeneralForm />
            <div className="flex gap-3 border-t border-border pt-6">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {intl.get('save')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => history.go(-1)}>
                {intl.get('close')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default compose(withDashboardActions)(GeneralFormPage);
```

- [ ] **Step 2: Typecheck (полный)**
Run: `pnpm typecheck`
Expected: без ошибок во всех пакетах. Если `Button` не имеет `variant="secondary"` — проверить `components/ui/button.tsx` и взять существующий вариант (например `outline`); поправить.

- [ ] **Step 3: Прогнать все новые юнит-тесты**
Run: `pnpm --filter @bigfin/webapp test -- src/components/ui/combobox.spec.tsx src/containers/Preferences/General/General.zod.spec.ts`
Expected: все PASS.

- [ ] **Step 4: Коммит**
```bash
git add packages/webapp/src/containers/Preferences/General/GeneralFormPage.tsx
git commit -m "feat(webapp): страница «Общие» на React Hook Form + Zod + shadcn"
```

---

## Task 7: живая приёмка

- [ ] **Step 1: Поднять стек**
Через скилл `run-bigfin`: API + webapp. Войти `founder@bigfin.local` / `Bigfin2026!dev`.

- [ ] **Step 2: Открыть Настройки → Общие**
Expected: карточка с 3 секциями (Организация · Адрес · Локализация и формат), поля на shadcn, без визуального микса.

- [ ] **Step 3: Combobox**
Открыть «Часовой пояс» → поиск «Moscow» → выбрать `Europe/Moscow`. Аналогично страна/валюта. Expected: поиск фильтрует, выбор подставляется.

- [ ] **Step 4: Валидация**
Очистить «Название организации» → «Сохранить». Expected: под полем сообщение об обязательности, сабмит не уходит.

- [ ] **Step 5: Сабмит**
Изменить «Отрасль» → «Сохранить». Expected: тост `preferences.general.success_message`; перезагрузка `GET` показывает сохранённое значение.

- [ ] **Step 6: Смена языка → перезагрузка**
Сменить «Язык» → «Сохранить». Expected: тост, затем `window.location.reload()` (страница перезагружается).

- [ ] **Step 7: Блокировка базовой валюты**
Если у организации есть проводки (`baseCurrencyMutateAbility.length > 0`) — поле «Базовая валюта» disabled + подпись-пояснение. (Если проводок нет — пропустить, отметить в отчёте.)

---

## Task 8: чистка (с подтверждением основателя)

- [ ] **Step 1: Проверить, что `utils.tsx` (`shouldBaseCurrencyUpdate`) больше не используется**
Run: `git grep -n "shouldBaseCurrencyUpdate" packages/webapp/src`
Expected: совпадений нет (только определение). Если так — спросить основателя разрешение на удаление файла (правило «не удалять без разрешения»).

- [ ] **Step 2: Удалить (после «да»)**
```bash
git rm packages/webapp/src/containers/Preferences/General/utils.tsx
git commit -m "chore(webapp): удалить неиспользуемый Formik-хелпер shouldBaseCurrencyUpdate"
```

---

## Self-review (выполнено при написании плана)

**Покрытие:** поля name/tax_number/industry/location/base_currency/fiscal_year/language/timezone/date_format/address.* → Task 5; валидация (required/optional) → Task 3; Combobox для 3 длинных списков → Task 2 + Task 5; сабмит + перезагрузка при смене языка + тост → Task 6; блокировка базовой валюты → Task 5 (disabled) + Task 7 (приёмка); i18n секций/Combobox → Task 1; данные/права из провайдера → переиспользованы без изменений.

**Плейсхолдеры:** нет — весь код приведён. Источники опций берутся из тех же модулей, что и легаси (`getAllCountries`/`getAllCurrenciesOptions`/`getFiscalYear`/`getLanguages`/`useDateFormats`).

**Согласованность типов:** `GeneralFormValues` (Task 3) используется в Task 5/6; `ComboboxItem` (Task 2) — в `options.ts` (Task 4) и форме; имена опций-хелперов совпадают между Task 4 и Task 5; ключи i18n из Task 1 используются в Task 5/GeneralForm.

**Риски/допущения:** (1) `Intl.supportedValuesOf('timeZone')` доступен в целевых браузерах и Node 18 — есть fallback-список. (2) Radix Popover в jsdom — тест может потребовать async-запросов (отмечено в Task 2 Step 4). (3) `transformToForm` маппит `organization.metadata` в плоские значения, включая `address` — поведение сохранено из легаси. (4) Вариант кнопки `secondary` — проверить в `button.tsx` (Task 6 Step 2).

---

## Execution Handoff

После сохранения — выбор способа исполнения (см. навык). Рекомендация основателя: маленькие шаги с паузой после каждого Task, инструкцией проверки и отката.
