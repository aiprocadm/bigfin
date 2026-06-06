# Долги (дебиторка/кредиторка, ⑭) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Единая страница «Долги» в режиме «Бизнес» — дебиторка/кредиторка со старением по корзинам, напоминаниями должникам и планом погашения (рассрочкой), за флагом `DEBTS`.

**Architecture:** Новый бэкенд-модуль `Debts` зеркалит `PaymentCalendar`. Сводка и старение считаются «на лету» из существующих `SaleInvoice`/`Bill` теми же модификаторами модели, что и AR/AP aging-отчёты (цифры совпадают) — через чистые функции с юнит-тестами (TDD). Единственная новая БД-сущность — план погашения (2 additive-таблицы). Напоминания переиспользуют существующий механизм писем по счёту. Фронт переиспользует движок списков `ListView` + `useRequestQuery`.

**Tech Stack:** NestJS 10, Objection/Knex (tenant-схема), TypeScript, Jest (backend); React 18 + React Query + React Hook Form + Zod + shadcn `components/ui` (frontend); `react-intl-universal` (i18n).

**Spec:** [2026-06-05-debts-ar-ap-design.md](../specs/2026-06-05-debts-ar-ap-design.md)

**Статус исполнения (2026-06-06):** ✅ Part A (сводка/старение), ✅ Part B (drill-down + напоминание), ✅ Part C (план погашения) — **бэкенд готов**, 21 тест зелёный, typecheck чистый, 24 локальных коммита на `feat/debts-ar-ap` (не запушено). ✅ **Part D (фронт)** — готов: страница «Долги», drill-down, план погашения; lang-check + webapp typecheck чистые (визуально — staging). Изменение по ходу: «Напомнить» переиспользует `SendSaleInvoiceMail.triggerMail` — выделенный invoice-reminder оказался заглушкой (решение основателя 2026-06-06).

---

## Pre-flight (единая, для всех задач)

- **Node:** `fnm use 18.16.1` (или `nvm use 18.16.1`) перед любыми командами. Только `pnpm`.
- **Серверные тесты:** `pnpm --filter @bigfin/server test -- <путь>` (моки, работают без БД и даже на глобальном Node).
- **Типы:** `pnpm typecheck` (3 пакета) — зелёный обязателен.
- **Миграции:** локально БД нет — пишем с рабочим `down()`; прогон `latest→rollback→latest` в CI/staging. Создавать через скилл `make-migration` (корректный timestamp) ИЛИ вручную по образцу `20260531120000_create_planned_operations_table.ts`.
- **i18n:** строки экрана только через `intl.get('debts.*')` / `<T id="debts.*" />`; сообщения Zod — тоже `intl.get`. После правок lang-файлов — `node packages/webapp/scripts/lang-check.js` (парность EN↔RU).
- **SDK:** `shared/sdk-ts` руками не трогаем (регенерится в CI); фронт-хуки строим по образцу `payment-calendar`.
- **Бренд:** везде только `Bigfin`. **Копирайт** новых файлов: «© 2026 Bigfin».
- **Правила основателя:** перед правкой существующего файла — показать фрагмент; всё additive (без удалений); коммиты атомарные, **локальные** (push/PR — только по явному запросу основателя).
- **Ветка:** `feat/debts-ar-ap` (уже создана от `origin/develop`).

---

## File Structure

**Backend — новый модуль** `packages/server/src/modules/Debts/`:

| Файл | Ответственность |
|---|---|
| `constants.ts` | стороны, статусы, корзины старения, коды ошибок |
| `Debts.interfaces.ts` | типы сводки/контакта/корзины/прогресса |
| `utils/bucketIndexForOverdueDays.ts` (+`.spec.ts`) | чистая: индекс корзины по дням просрочки |
| `utils/aggregateAging.ts` (+`.spec.ts`) | чистая: суммы по корзинам |
| `utils/summarizeSide.ts` (+`.spec.ts`) | чистая: итоги стороны + ТОП |
| `utils/computePlanProgress.ts` (+`.spec.ts`) | чистая: прогресс плана погашения |
| `queries/GetDebtsOverview.service.ts` (+`.spec.ts`) | сводка дебиторки+кредиторки |
| `queries/GetContactDebts.service.ts` (+`.spec.ts`) | drill-down по контрагенту |
| `queries/GetRepaymentPlans.service.ts` | список планов + прогресс |
| `commands/CreateRepaymentPlan.service.ts` (+`.spec.ts`) | создать план + график |
| `commands/EditRepaymentPlan.service.ts` | правка плана + переинсерт графика |
| `commands/DeleteRepaymentPlan.service.ts` | удалить план (каскад) |
| `commands/MarkInstallmentPaid.service.ts` | отметить платёж оплаченным |
| `commands/SendDebtReminder.service.ts` | напоминание дебитору (reuse) |
| `commands/CommandRepaymentPlanValidator.service.ts` | проверки плана |
| `models/DebtRepaymentPlan.model.ts` / `DebtRepaymentInstallment.model.ts` | Objection-модели |
| `dtos/*.dto.ts` | DTO запросов и команд |
| `Debts.application.ts` / `Debts.controller.ts` / `Debts.module.ts` | фасад/HTTP/NestJS-модуль |

**Backend — правки существующих файлов:**
- `packages/server/src/common/types/Features.ts` — `DEBTS = 'debts'`.
- `packages/server/src/modules/Features/FeaturesConfigure.ts` — регистрация флага.
- `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts` — импорт+регистрация 2 моделей.
- `packages/server/src/modules/App/App.module.ts` — импорт `DebtsModule`.
- `packages/server/src/database/tenant/migrations/` — 1 файл миграции (2 таблицы).

**Frontend** `packages/webapp/src/`:
- `hooks/query/Debts.tsx`, `containers/Debts/*`, маршрут+меню, `lang/{en,ru}/index.json`.

---

# PART A — Сводка долгов (read-only, чистые функции)

## Task A1: Feature flag `DEBTS`

**Files:**
- Modify: `packages/server/src/common/types/Features.ts`
- Modify: `packages/server/src/modules/Features/FeaturesConfigure.ts`

- [ ] **Step 1: Добавить значение в enum**

В `Features.ts`, внутри `export enum Features { … }` после `VENDORS_LIST_V2 = 'vendors_list_v2',` добавить:

```ts
  DEBTS = 'debts',
```

- [ ] **Step 2: Зарегистрировать дефолт (off)**

В `FeaturesConfigure.ts`, в массив `getConfigure()` после блока `Features.VENDORS_LIST_V2` добавить:

```ts
      {
        name: Features.DEBTS,
        defaultValue: false,
      },
```

- [ ] **Step 3: Проверка типов**

Run: `pnpm typecheck`
Expected: PASS (без новых ошибок).

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/common/types/Features.ts packages/server/src/modules/Features/FeaturesConfigure.ts
git commit -m "feat(debts): add DEBTS feature flag (default off)"
```

---

## Task A2: Константы и интерфейсы модуля

**Files:**
- Create: `packages/server/src/modules/Debts/constants.ts`
- Create: `packages/server/src/modules/Debts/Debts.interfaces.ts`

- [ ] **Step 1: constants.ts**

```ts
// eslint-disable-next-line import/prefer-default-export
export const ERRORS = {
  REPAYMENT_PLAN_NOT_FOUND: 'REPAYMENT_PLAN_NOT_FOUND',
  INSTALLMENT_NOT_FOUND: 'INSTALLMENT_NOT_FOUND',
  CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
  INVALID_SIDE: 'INVALID_SIDE',
  INVALID_PLAN_TOTAL: 'INVALID_PLAN_TOTAL',
  EMPTY_INSTALLMENTS: 'EMPTY_INSTALLMENTS',
};

export const DEBT_SIDES = ['receivable', 'payable'] as const;
export const PLAN_STATUSES = ['active', 'completed', 'cancelled'] as const;
export const INSTALLMENT_STATUSES = ['planned', 'paid'] as const;

// Корзины старения по дням просрочки. toDays=null — «90+».
// Логика принадлежности к корзине совпадает с AgingSummaryReport:
//   beforeDays <= overdueDays && (toDays > overdueDays || toDays === null)
export const AGING_PERIODS = [
  { key: '0-30', beforeDays: 0, toDays: 30 },
  { key: '31-60', beforeDays: 30, toDays: 60 },
  { key: '61-90', beforeDays: 60, toDays: 90 },
  { key: '90+', beforeDays: 90, toDays: null },
] as const;
```

- [ ] **Step 2: Debts.interfaces.ts**

```ts
/** Корзина старения с суммой. */
export interface AgingBucket {
  key: string;
  amount: number; // в базовой валюте
}

/** Один неоплаченный документ (счёт/счёт поставщика) для drill-down. */
export interface DebtDocument {
  id: number;
  side: 'receivable' | 'payable';
  number: string;
  date: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  total: number;
  dueAmount: number; // остаток к оплате, базовая валюта
  overdueDays: number;
}

/** Контрагент в реестре долгов. */
export interface DebtContact {
  contactId: number;
  contactName: string;
  current: number; // ещё не просрочено
  buckets: number[]; // суммы по AGING_PERIODS (просрочка)
  overdueTotal: number;
  total: number; // current + overdueTotal
  worstBucketIndex: number; // -1 если просрочки нет
}

/** Итоги одной стороны (дебиторка ИЛИ кредиторка). */
export interface DebtsSideSummary {
  total: number;
  current: number;
  overdueTotal: number;
  buckets: number[]; // суммы по AGING_PERIODS
  contacts: DebtContact[];
  top: DebtContact[]; // ТОП-должники по total
}

/** Полный ответ сводки. */
export interface DebtsOverviewResponse {
  baseCurrency: string;
  asDate: string;
  receivable?: DebtsSideSummary;
  payable?: DebtsSideSummary;
  net?: number; // дебиторка.total − кредиторка.total (когда есть обе)
}

/** Прогресс плана погашения. */
export interface PlanProgress {
  plannedTotal: number;
  paidTotal: number;
  remaining: number;
  percentPaid: number; // 0..100
  nextDueDate: string | null;
  isOverdue: boolean;
}
```

- [ ] **Step 3: Проверка типов**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/modules/Debts/constants.ts packages/server/src/modules/Debts/Debts.interfaces.ts
git commit -m "feat(debts): module constants and interfaces"
```

---

## Task A3: Чистая функция `bucketIndexForOverdueDays` (TDD)

**Files:**
- Test: `packages/server/src/modules/Debts/utils/bucketIndexForOverdueDays.spec.ts`
- Create: `packages/server/src/modules/Debts/utils/bucketIndexForOverdueDays.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
import { bucketIndexForOverdueDays } from './bucketIndexForOverdueDays';
import { AGING_PERIODS } from '../constants';

describe('bucketIndexForOverdueDays', () => {
  const idx = (d: number) => bucketIndexForOverdueDays(d, AGING_PERIODS);

  it('кладёт 1..30 дней в корзину 0', () => {
    expect(idx(1)).toBe(0);
    expect(idx(30)).toBe(1); // граница 30 уходит в 31-60 (как в aging-отчёте)
  });

  it('границы корзин совпадают с aging-логикой', () => {
    expect(idx(31)).toBe(1);
    expect(idx(60)).toBe(2);
    expect(idx(61)).toBe(2);
    expect(idx(90)).toBe(3);
    expect(idx(91)).toBe(3);
  });

  it('нулевая просрочка попадает в первую корзину', () => {
    expect(idx(0)).toBe(0);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/Debts/utils/bucketIndexForOverdueDays.spec.ts`
Expected: FAIL («Cannot find module './bucketIndexForOverdueDays'»).

- [ ] **Step 3: Минимальная реализация**

```ts
type Period = { beforeDays: number; toDays: number | null };

/**
 * Индекс корзины старения по дням просрочки.
 * Правило совпадает с AgingSummaryReport.getContactAgingDueAmount:
 *   beforeDays <= overdueDays && (toDays > overdueDays || toDays === null)
 * @returns индекс корзины, либо -1 если не подходит ни одна.
 */
export function bucketIndexForOverdueDays(
  overdueDays: number,
  periods: readonly Period[],
): number {
  return periods.findIndex(
    (p) =>
      p.beforeDays <= overdueDays &&
      (p.toDays === null || p.toDays > overdueDays),
  );
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/Debts/utils/bucketIndexForOverdueDays.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Debts/utils/bucketIndexForOverdueDays.ts packages/server/src/modules/Debts/utils/bucketIndexForOverdueDays.spec.ts
git commit -m "feat(debts): bucketIndexForOverdueDays pure fn (TDD)"
```

---

## Task A4: Чистая функция `aggregateAging` (TDD)

**Files:**
- Test: `packages/server/src/modules/Debts/utils/aggregateAging.spec.ts`
- Create: `packages/server/src/modules/Debts/utils/aggregateAging.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
import { aggregateAging } from './aggregateAging';
import { AGING_PERIODS } from '../constants';

describe('aggregateAging', () => {
  it('суммирует dueAmount по корзинам и считает worstBucketIndex', () => {
    const res = aggregateAging(
      [
        { dueAmount: 100, overdueDays: 10 }, // корзина 0
        { dueAmount: 50, overdueDays: 20 }, // корзина 0
        { dueAmount: 200, overdueDays: 75 }, // корзина 2 (61-90)
      ],
      AGING_PERIODS,
    );
    expect(res.buckets).toEqual([150, 0, 200, 0]);
    expect(res.overdueTotal).toBe(350);
    expect(res.worstBucketIndex).toBe(2);
  });

  it('пустой вход даёт нули и worstBucketIndex = -1', () => {
    const res = aggregateAging([], AGING_PERIODS);
    expect(res.buckets).toEqual([0, 0, 0, 0]);
    expect(res.overdueTotal).toBe(0);
    expect(res.worstBucketIndex).toBe(-1);
  });

  it('округляет до 3 знаков (без float-дрейфа)', () => {
    const res = aggregateAging(
      [
        { dueAmount: 0.1, overdueDays: 5 },
        { dueAmount: 0.2, overdueDays: 5 },
      ],
      AGING_PERIODS,
    );
    expect(res.buckets[0]).toBe(0.3);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/Debts/utils/aggregateAging.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Минимальная реализация**

```ts
import { bucketIndexForOverdueDays } from './bucketIndexForOverdueDays';

type Period = { beforeDays: number; toDays: number | null };
type OverdueItem = { dueAmount: number; overdueDays: number };

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Раскладывает просроченные документы по корзинам старения.
 * @returns { buckets[], overdueTotal, worstBucketIndex }
 */
export function aggregateAging(
  items: OverdueItem[],
  periods: readonly Period[],
): { buckets: number[]; overdueTotal: number; worstBucketIndex: number } {
  const buckets = periods.map(() => 0);

  items.forEach((item) => {
    const i = bucketIndexForOverdueDays(item.overdueDays, periods);
    if (i >= 0) buckets[i] += item.dueAmount;
  });

  const rounded = buckets.map(round3);
  const overdueTotal = round3(rounded.reduce((a, b) => a + b, 0));
  const worstBucketIndex = rounded.reduce(
    (worst, amount, i) => (amount > 0 ? i : worst),
    -1,
  );

  return { buckets: rounded, overdueTotal, worstBucketIndex };
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/Debts/utils/aggregateAging.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Debts/utils/aggregateAging.ts packages/server/src/modules/Debts/utils/aggregateAging.spec.ts
git commit -m "feat(debts): aggregateAging pure fn (TDD)"
```

---

## Task A5: Чистая функция `summarizeSide` (TDD)

**Files:**
- Test: `packages/server/src/modules/Debts/utils/summarizeSide.spec.ts`
- Create: `packages/server/src/modules/Debts/utils/summarizeSide.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
import { summarizeSide } from './summarizeSide';
import { DebtContact } from '../Debts.interfaces';

const contact = (over: Partial<DebtContact>): DebtContact => ({
  contactId: 1,
  contactName: 'X',
  current: 0,
  buckets: [0, 0, 0, 0],
  overdueTotal: 0,
  total: 0,
  worstBucketIndex: -1,
  ...over,
});

describe('summarizeSide', () => {
  it('суммирует контакты и сортирует ТОП по total', () => {
    const res = summarizeSide(
      [
        contact({ contactId: 1, total: 100, current: 100 }),
        contact({ contactId: 2, total: 300, overdueTotal: 300, buckets: [0, 300, 0, 0] }),
      ],
      5,
    );
    expect(res.total).toBe(400);
    expect(res.current).toBe(100);
    expect(res.overdueTotal).toBe(300);
    expect(res.buckets).toEqual([0, 300, 0, 0]);
    expect(res.top.map((c) => c.contactId)).toEqual([2, 1]);
  });

  it('ограничивает ТОП размером topN', () => {
    const res = summarizeSide(
      [1, 2, 3].map((id) => contact({ contactId: id, total: id })),
      2,
    );
    expect(res.top.map((c) => c.contactId)).toEqual([3, 2]);
  });

  it('пустой вход — нули и пустой ТОП', () => {
    const res = summarizeSide([], 5);
    expect(res).toEqual({
      total: 0,
      current: 0,
      overdueTotal: 0,
      buckets: [0, 0, 0, 0],
      contacts: [],
      top: [],
    });
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/Debts/utils/summarizeSide.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Минимальная реализация**

```ts
import { DebtContact, DebtsSideSummary } from '../Debts.interfaces';

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Сводит контакты стороны в итоги: total/current/overdue, суммы по корзинам, ТОП.
 */
export function summarizeSide(
  contacts: DebtContact[],
  topN: number,
): DebtsSideSummary {
  const bucketCount = contacts[0]?.buckets.length ?? 4;
  const buckets = new Array(bucketCount).fill(0);
  let total = 0;
  let current = 0;
  let overdueTotal = 0;

  contacts.forEach((c) => {
    total += c.total;
    current += c.current;
    overdueTotal += c.overdueTotal;
    c.buckets.forEach((b, i) => {
      buckets[i] += b;
    });
  });

  const top = [...contacts].sort((a, b) => b.total - a.total).slice(0, topN);

  return {
    total: round3(total),
    current: round3(current),
    overdueTotal: round3(overdueTotal),
    buckets: buckets.map(round3),
    contacts,
    top,
  };
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/Debts/utils/summarizeSide.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Debts/utils/summarizeSide.ts packages/server/src/modules/Debts/utils/summarizeSide.spec.ts
git commit -m "feat(debts): summarizeSide pure fn (TDD)"
```

---

## Task A6: DTO запросов сводки и drill-down

**Files:**
- Create: `packages/server/src/modules/Debts/dtos/GetDebtsOverviewQuery.dto.ts`
- Create: `packages/server/src/modules/Debts/dtos/GetContactDebtsQuery.dto.ts`

- [ ] **Step 1: GetDebtsOverviewQuery.dto.ts** (образец — `GetPaymentCalendarQuery.dto.ts`)

```ts
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsIn, IsInt, IsString } from 'class-validator';
import { DEBT_SIDES } from '../constants';

export class GetDebtsOverviewQueryDto {
  @IsString()
  @IsIn(DEBT_SIDES as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: DEBT_SIDES, description: 'Сторона; без неё — обе' })
  side?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-06-05', description: 'Дата отсчёта старения' })
  asDate?: string;

  @ToNumber()
  @IsInt({ each: true })
  @IsArray()
  @IsOptional()
  @ApiPropertyOptional({ type: [Number], description: 'Фильтр по направлениям' })
  branchesIds?: number[];
}
```

- [ ] **Step 2: GetContactDebtsQuery.dto.ts**

```ts
import { IsOptional } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsString } from 'class-validator';
import { DEBT_SIDES } from '../constants';

export class GetContactDebtsQueryDto {
  @IsString()
  @IsIn(DEBT_SIDES as unknown as string[])
  @ApiPropertyOptional({ enum: DEBT_SIDES })
  side: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-06-05' })
  asDate?: string;
}
```

- [ ] **Step 3: Проверка типов**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/modules/Debts/dtos/GetDebtsOverviewQuery.dto.ts packages/server/src/modules/Debts/dtos/GetContactDebtsQuery.dto.ts
git commit -m "feat(debts): overview and contact query DTOs"
```

---

## Task A7: Сервис сводки `GetDebtsOverview.service.ts`

**Files:**
- Create: `packages/server/src/modules/Debts/queries/GetDebtsOverview.service.ts`

Образец инъекции моделей/валюты — `GetPaymentCalendarForecast.service.ts`; образец загрузки обязательств по контрагенту — `ARAgingSummaryRepository` (`overdueInvoicesFromDate`/`dueInvoicesFromDate`, `groupBy customerId`).

- [ ] **Step 1: Реализация**

```ts
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { groupBy, isEmpty } from 'lodash';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';
import { Customer } from '@/modules/Customers/models/Customer';
import { Vendor } from '@/modules/Vendors/models/Vendor';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { GetDebtsOverviewQueryDto } from '../dtos/GetDebtsOverviewQuery.dto';
import {
  DebtContact,
  DebtsOverviewResponse,
  DebtsSideSummary,
} from '../Debts.interfaces';
import { aggregateAging } from '../utils/aggregateAging';
import { summarizeSide } from '../utils/summarizeSide';
import { AGING_PERIODS } from '../constants';

const TOP_N = 5;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const toBase = (dueAmount: number, rate: any): number =>
  round3(Number(dueAmount) * Number(rate || 1));

@Injectable()
export class GetDebtsOverviewService {
  constructor(
    @Inject(SaleInvoice.name)
    private readonly saleInvoiceModel: TenantModelProxy<typeof SaleInvoice>,

    @Inject(Bill.name)
    private readonly billModel: TenantModelProxy<typeof Bill>,

    @Inject(Customer.name)
    private readonly customerModel: TenantModelProxy<typeof Customer>,

    @Inject(Vendor.name)
    private readonly vendorModel: TenantModelProxy<typeof Vendor>,

    private readonly tenancyContext: TenancyContext,
  ) {}

  public async getOverview(
    query: GetDebtsOverviewQueryDto,
  ): Promise<DebtsOverviewResponse> {
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const baseCurrency = metadata?.baseCurrency;
    const asDate = query.asDate || moment().format('YYYY-MM-DD');

    const wantReceivable = query.side !== 'payable';
    const wantPayable = query.side !== 'receivable';

    const receivable = wantReceivable
      ? await this.buildReceivable(asDate, query.branchesIds)
      : undefined;
    const payable = wantPayable
      ? await this.buildPayable(asDate, query.branchesIds)
      : undefined;

    const net =
      receivable && payable
        ? round3(receivable.total - payable.total)
        : undefined;

    return { baseCurrency, asDate, receivable, payable, net };
  }

  /** Дебиторка: неоплаченные счета покупателям, сгруппированные по customerId. */
  private async buildReceivable(
    asDate: string,
    branchesIds?: number[],
  ): Promise<DebtsSideSummary> {
    const overdue = await this.saleInvoiceModel()
      .query()
      .modify('overdueInvoicesFromDate', asDate)
      .onBuild((q) => {
        if (!isEmpty(branchesIds)) q.modify('filterByBranches', branchesIds);
      });
    const current = await this.saleInvoiceModel()
      .query()
      .modify('dueInvoicesFromDate', asDate)
      .onBuild((q) => {
        if (!isEmpty(branchesIds)) q.modify('filterByBranches', branchesIds);
      });

    const names = await this.contactNames(this.customerModel);
    const contacts = this.assemble(
      groupBy(overdue as any[], 'customerId'),
      groupBy(current as any[], 'customerId'),
      names,
    );
    return summarizeSide(contacts, TOP_N);
  }

  /** Кредиторка: неоплаченные счета поставщиков, сгруппированные по vendorId. */
  private async buildPayable(
    asDate: string,
    branchesIds?: number[],
  ): Promise<DebtsSideSummary> {
    const overdue = await this.billModel()
      .query()
      .modify('overdueBillsFromDate', asDate)
      .onBuild((q) => {
        if (!isEmpty(branchesIds)) q.modify('filterByBranches', branchesIds);
      });
    const current = await this.billModel()
      .query()
      .modify('dueBillsFromDate', asDate)
      .onBuild((q) => {
        if (!isEmpty(branchesIds)) q.modify('filterByBranches', branchesIds);
      });

    const names = await this.contactNames(this.vendorModel);
    const contacts = this.assemble(
      groupBy(overdue as any[], 'vendorId'),
      groupBy(current as any[], 'vendorId'),
      names,
    );
    return summarizeSide(contacts, TOP_N);
  }

  /** id → отображаемое имя контрагента. */
  private async contactNames(
    model: TenantModelProxy<any>,
  ): Promise<Record<number, string>> {
    const rows = await model().query();
    return (rows as any[]).reduce((acc, r) => {
      acc[r.id] = r.displayName || r.companyName || `#${r.id}`;
      return acc;
    }, {} as Record<number, string>);
  }

  /** Сборка строк реестра из сгруппированных просроченных и текущих документов. */
  private assemble(
    overdueByContact: Record<string, any[]>,
    currentByContact: Record<string, any[]>,
    names: Record<number, string>,
  ): DebtContact[] {
    const ids = new Set<number>([
      ...Object.keys(overdueByContact).map(Number),
      ...Object.keys(currentByContact).map(Number),
    ]);

    const contacts: DebtContact[] = [];
    ids.forEach((contactId) => {
      const overdueDocs = (overdueByContact[contactId] || []).map((d) => ({
        dueAmount: toBase(d.dueAmount, d.exchangeRate),
        overdueDays: Number(d.overdueDays) || 0,
      }));
      const currentDocs = currentByContact[contactId] || [];
      const current = round3(
        currentDocs.reduce(
          (sum, d) => sum + toBase(d.dueAmount, d.exchangeRate),
          0,
        ),
      );

      const { buckets, overdueTotal, worstBucketIndex } = aggregateAging(
        overdueDocs,
        AGING_PERIODS,
      );

      contacts.push({
        contactId,
        contactName: names[contactId] || `#${contactId}`,
        current,
        buckets,
        overdueTotal,
        total: round3(current + overdueTotal),
        worstBucketIndex,
      });
    });

    return contacts.filter((c) => c.total > 0);
  }
}
```

> ⚠️ На этапе исполнения подтвердить именами геттеров/полей: `SaleInvoice.dueAmount`, `.overdueDays`, `.exchangeRate`, `.customerId`; `Bill` — `.vendorId`; модификаторы `overdueBillsFromDate`/`dueBillsFromDate`/`filterByBranches`. Проверены в `AgingSummary.ts` и `ARAgingSummaryRepository.ts`; для `Bill` сверить `APAgingSummaryRepository.ts`.

- [ ] **Step 2: Проверка типов**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/modules/Debts/queries/GetDebtsOverview.service.ts
git commit -m "feat(debts): GetDebtsOverview service (reuses aging modifiers + pure fns)"
```

---

## Task A8: Application + Controller + Module + wiring

**Files:**
- Create: `packages/server/src/modules/Debts/Debts.application.ts`
- Create: `packages/server/src/modules/Debts/Debts.controller.ts`
- Create: `packages/server/src/modules/Debts/Debts.module.ts`
- Modify: `packages/server/src/modules/App/App.module.ts`

- [ ] **Step 1: Debts.application.ts** (на Part A — только overview; расширяется в B/C)

```ts
import { Injectable } from '@nestjs/common';
import { GetDebtsOverviewService } from './queries/GetDebtsOverview.service';
import { GetDebtsOverviewQueryDto } from './dtos/GetDebtsOverviewQuery.dto';

@Injectable()
export class DebtsApplication {
  constructor(private readonly overviewService: GetDebtsOverviewService) {}

  public getOverview(query: GetDebtsOverviewQueryDto) {
    return this.overviewService.getOverview(query);
  }
}
```

- [ ] **Step 2: Debts.controller.ts**

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { DebtsApplication } from './Debts.application';
import { GetDebtsOverviewQueryDto } from './dtos/GetDebtsOverviewQuery.dto';

@Controller('debts')
@ApiTags('Debts')
@ApiCommonHeaders()
export class DebtsController {
  constructor(private readonly application: DebtsApplication) {}

  @Get('overview')
  @ApiOperation({ summary: 'Debts overview: AR/AP totals, aging buckets, top.' })
  getOverview(@Query() query: GetDebtsOverviewQueryDto) {
    return this.application.getOverview(query);
  }
}
```

- [ ] **Step 3: Debts.module.ts**

```ts
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { DebtsController } from './Debts.controller';
import { DebtsApplication } from './Debts.application';
import { GetDebtsOverviewService } from './queries/GetDebtsOverview.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule],
  controllers: [DebtsController],
  providers: [DebtsApplication, GetDebtsOverviewService],
})
export class DebtsModule {}
```

- [ ] **Step 4: Wire в App.module.ts**

Показать фрагмент перед правкой. Добавить импорт рядом со строкой `import { BudgetsModule } …` (≈ строка 39):

```ts
import { DebtsModule } from '../Debts/Debts.module';
```

И в массив `imports` после `BudgetsModule,` (≈ строка 207):

```ts
    DebtsModule,
```

- [ ] **Step 5: Проверка типов**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/modules/Debts/Debts.application.ts packages/server/src/modules/Debts/Debts.controller.ts packages/server/src/modules/Debts/Debts.module.ts packages/server/src/modules/App/App.module.ts
git commit -m "feat(debts): application, controller, module + app wiring"
```

---

## Task A9: Юнит-тест сервиса сводки (моки моделей)

**Files:**
- Test: `packages/server/src/modules/Debts/queries/GetDebtsOverview.service.spec.ts`

Образец моков `TenantModelProxy` — `GetPaymentCalendarForecast.service.spec.ts` (на этапе исполнения открыть и повторить стиль построения мок-моделей и `Test.createTestingModule`).

- [ ] **Step 1: Тест «сводка из мок-счетов»**

```ts
import { Test } from '@nestjs/testing';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';
import { Customer } from '@/modules/Customers/models/Customer';
import { Vendor } from '@/modules/Vendors/models/Vendor';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { GetDebtsOverviewService } from './GetDebtsOverview.service';

// Мок query-builder: .query().modify(...).onBuild(...) → отдаёт rows.
const queryReturning = (rows: any[]) => {
  const qb: any = {
    modify: () => qb,
    onBuild: () => Promise.resolve(rows),
    then: (res: any) => Promise.resolve(rows).then(res),
  };
  return () => qb;
};

describe('GetDebtsOverviewService', () => {
  it('сводит дебиторку: корзины, итоги, нетто', async () => {
    const saleInvoiceModel = jest.fn();
    // overdue, затем current (две последовательные .query())
    saleInvoiceModel
      .mockImplementationOnce(queryReturning([
        { customerId: 1, dueAmount: 100, overdueDays: 10, exchangeRate: 1 },
      ]))
      .mockImplementationOnce(queryReturning([
        { customerId: 1, dueAmount: 50, overdueDays: 0, exchangeRate: 1 },
      ]));

    const billModel = jest.fn(queryReturning([]));
    const customerModel = jest.fn(
      queryReturning([{ id: 1, displayName: 'ООО Ромашка' }]),
    );
    const vendorModel = jest.fn(queryReturning([]));

    const moduleRef = await Test.createTestingModule({
      providers: [
        GetDebtsOverviewService,
        { provide: SaleInvoice.name, useValue: saleInvoiceModel },
        { provide: Bill.name, useValue: billModel },
        { provide: Customer.name, useValue: customerModel },
        { provide: Vendor.name, useValue: vendorModel },
        {
          provide: TenancyContext,
          useValue: { getTenantMetadata: async () => ({ baseCurrency: 'RUB' }) },
        },
      ],
    }).compile();

    const service = moduleRef.get(GetDebtsOverviewService);
    const res = await service.getOverview({ side: 'receivable', asDate: '2026-06-05' } as any);

    expect(res.receivable!.total).toBe(150);
    expect(res.receivable!.overdueTotal).toBe(100);
    expect(res.receivable!.current).toBe(50);
    expect(res.receivable!.buckets).toEqual([100, 0, 0, 0]);
    expect(res.receivable!.top[0].contactName).toBe('ООО Ромашка');
  });
});
```

> ⚠️ На исполнении сверить форму мока с `GetPaymentCalendarForecast.service.spec.ts` — если там `.query()` строится иначе (напр. возвращает thenable иначе), повторить ровно их паттерн.

- [ ] **Step 2: Запустить — PASS**

Run: `pnpm --filter @bigfin/server test -- src/modules/Debts/queries/GetDebtsOverview.service.spec.ts`
Expected: PASS.

- [ ] **Step 3: Прогнать все тесты модуля + типы**

Run: `pnpm --filter @bigfin/server test -- src/modules/Debts` && `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/modules/Debts/queries/GetDebtsOverview.service.spec.ts
git commit -m "test(debts): GetDebtsOverview service unit test"
```

**✅ Контрольная точка Part A:** бэкенд-сводка долгов работает и покрыта тестами. Флаг off — невидимо в проде.

---

# PART B — Drill-down + напоминание

## Task B1: `GetContactDebts.service.ts` (drill-down) + тест

**Files:**
- Create: `packages/server/src/modules/Debts/queries/GetContactDebts.service.ts`
- Test: `packages/server/src/modules/Debts/queries/GetContactDebts.service.spec.ts`

- [ ] **Step 1: Реализация** — по `side` грузит неоплаченные документы одного контрагента в `DebtDocument[]`.

```ts
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DebtDocument } from '../Debts.interfaces';

const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const toBase = (a: number, rate: any): number => round3(Number(a) * Number(rate || 1));
const d = (v: any): string => moment(v).format('YYYY-MM-DD');

@Injectable()
export class GetContactDebtsService {
  constructor(
    @Inject(SaleInvoice.name)
    private readonly saleInvoiceModel: TenantModelProxy<typeof SaleInvoice>,
    @Inject(Bill.name)
    private readonly billModel: TenantModelProxy<typeof Bill>,
  ) {}

  public async getContactDebts(
    contactId: number,
    side: string,
  ): Promise<DebtDocument[]> {
    if (side === 'payable') {
      const bills = await this.billModel()
        .query()
        .modify('dueBills')
        .onBuild((q) => q.where('vendorId', contactId));
      return (bills as any[]).map((b) => ({
        id: b.id,
        side: 'payable' as const,
        number: `${b.billNumber ?? b.id}`,
        date: d(b.billDate ?? b.createdAt),
        dueDate: d(b.dueDate),
        total: toBase(b.total ?? b.amount, b.exchangeRate),
        dueAmount: toBase(b.dueAmount, b.exchangeRate),
        overdueDays: Number(b.overdueDays) || 0,
      }));
    }
    const invoices = await this.saleInvoiceModel()
      .query()
      .modify('dueInvoices')
      .modify('delivered')
      .onBuild((q) => q.where('customerId', contactId));
    return (invoices as any[]).map((inv) => ({
      id: inv.id,
      side: 'receivable' as const,
      number: `${inv.invoiceNo ?? inv.id}`,
      date: d(inv.invoiceDate ?? inv.createdAt),
      dueDate: d(inv.dueDate),
      total: toBase(inv.total, inv.exchangeRate),
      dueAmount: toBase(inv.dueAmount, inv.exchangeRate),
      overdueDays: Number(inv.overdueDays) || 0,
    }));
  }
}
```

> ⚠️ На исполнении сверить поля `billNumber`/`billDate`/`invoiceNo`/`invoiceDate`/`total` с моделями `Bill`/`SaleInvoice`.

- [ ] **Step 2: Тест (мок одного контакта)** — по образцу A9, ассертит маппинг 1 счёта в `DebtDocument`.

```ts
import { Test } from '@nestjs/testing';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';
import { GetContactDebtsService } from './GetContactDebts.service';

const queryReturning = (rows: any[]) => {
  const qb: any = { modify: () => qb, onBuild: () => Promise.resolve(rows), then: (r: any) => Promise.resolve(rows).then(r) };
  return () => qb;
};

describe('GetContactDebtsService', () => {
  it('маппит неоплаченный счёт в DebtDocument (дебиторка)', async () => {
    const saleInvoiceModel = jest.fn(queryReturning([
      { id: 7, invoiceNo: '12', invoiceDate: '2026-05-01', dueDate: '2026-05-15', total: 200, dueAmount: 120, overdueDays: 22, exchangeRate: 1 },
    ]));
    const billModel = jest.fn(queryReturning([]));
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetContactDebtsService,
        { provide: SaleInvoice.name, useValue: saleInvoiceModel },
        { provide: Bill.name, useValue: billModel },
      ],
    }).compile();
    const res = await moduleRef.get(GetContactDebtsService).getContactDebts(1, 'receivable');
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ id: 7, number: '12', dueAmount: 120, overdueDays: 22, side: 'receivable' });
  });
});
```

- [ ] **Step 3: PASS + типы**

Run: `pnpm --filter @bigfin/server test -- src/modules/Debts/queries/GetContactDebts.service.spec.ts` && `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/modules/Debts/queries/GetContactDebts.service.ts packages/server/src/modules/Debts/queries/GetContactDebts.service.spec.ts
git commit -m "feat(debts): GetContactDebts drill-down service (TDD)"
```

---

## Task B2: `SendDebtReminder.service.ts` (переиспользование напоминания)

**Files:**
- Read first: `packages/server/src/modules/SaleInvoices/commands/SendSaleInvoiceMailReminderJob.ts`, `packages/server/src/modules/SaleInvoices/queries/GetSaleInvoiceMailReminder.ts`
- Create: `packages/server/src/modules/Debts/commands/SendDebtReminder.service.ts`

- [ ] **Step 1: Прочитать существующий механизм**

Открыть оба файла выше и зафиксировать точную сигнатуру триггера (имя сервиса/метода, что принимает: `saleInvoiceId` и опционально `messageOptions`; как ставится в очередь). Это определяет, что инжектить.

- [ ] **Step 2: Тонкая обёртка** — `SendDebtReminder` инжектит существующий reminder-сервис и делегирует. Шаблон (уточнить имена по шагу 1):

```ts
import { Injectable } from '@nestjs/common';
// import { <ReminderService> } from '@/modules/SaleInvoices/...';

@Injectable()
export class SendDebtReminderService {
  constructor(/* private readonly reminder: <ReminderService> */) {}

  /**
   * Отправляет напоминание дебитору по неоплаченному счёту,
   * переиспользуя существующий механизм SaleInvoices.
   */
  public async remind(invoiceId: number): Promise<{ queued: true }> {
    // await this.reminder.triggerMail(invoiceId);
    return { queued: true };
  }
}
```

> Реализация шага 2 завершается подстановкой реального вызова из шага 1. Никакого нового письма не пишем (anti-scope).

- [ ] **Step 3: Зарегистрировать в `Debts.module.ts`** providers + импортировать модуль/сервис SaleInvoices, если требуется его экспортируемый провайдер (проверить экспорт в `SaleInvoices.module.ts`).

- [ ] **Step 4: Проверка типов**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Debts/commands/SendDebtReminder.service.ts packages/server/src/modules/Debts/Debts.module.ts
git commit -m "feat(debts): SendDebtReminder reuses SaleInvoices reminder"
```

---

## Task B3: Эндпоинты drill-down + напоминание

**Files:**
- Modify: `packages/server/src/modules/Debts/Debts.application.ts`
- Modify: `packages/server/src/modules/Debts/Debts.controller.ts`
- Modify: `packages/server/src/modules/Debts/Debts.module.ts`

- [ ] **Step 1: Application** — добавить методы:

```ts
  public getContactDebts(contactId: number, query: GetContactDebtsQueryDto) {
    return this.contactService.getContactDebts(contactId, query.side);
  }

  public remindDebtor(invoiceId: number) {
    return this.reminderService.remind(invoiceId);
  }
```
(добавить инъекции `GetContactDebtsService` и `SendDebtReminderService` в конструктор; импорт `GetContactDebtsQueryDto`).

- [ ] **Step 2: Controller** — добавить:

```ts
  @Get('contact/:contactId')
  @ApiOperation({ summary: "Unpaid documents of a contact (drill-down)." })
  getContactDebts(
    @Param('contactId', ParseIntPipe) contactId: number,
    @Query() query: GetContactDebtsQueryDto,
  ) {
    return this.application.getContactDebts(contactId, query);
  }

  @Post('invoices/:invoiceId/remind')
  @ApiOperation({ summary: 'Send a payment reminder to the debtor.' })
  remind(@Param('invoiceId', ParseIntPipe) invoiceId: number) {
    return this.application.remindDebtor(invoiceId);
  }
```
(дополнить импорты `Param`, `ParseIntPipe`, `Post`, `GetContactDebtsQueryDto`).

- [ ] **Step 3: Module** — добавить `GetContactDebtsService`, `SendDebtReminderService` в providers.

- [ ] **Step 4: Типы**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Debts/
git commit -m "feat(debts): contact drill-down and reminder endpoints"
```

**✅ Контрольная точка Part B:** страница «Долги» уже ценна (сводка + старение + drill-down + напоминание).

---

# PART C — План погашения (рассрочка)

## Task C1: Миграция (2 таблицы)

**Files:**
- Create: `packages/server/src/database/tenant/migrations/<timestamp>_create_debt_repayment_tables.ts`

Использовать скилл `make-migration` для корректного timestamp, либо вручную по образцу `20260531120000_create_planned_operations_table.ts`.

- [ ] **Step 1: Миграция (additive, рабочий down)**

```ts
exports.up = async (knex) => {
  await knex.schema.createTable('debt_repayment_plans', (table) => {
    table.increments('id');
    table.string('side').notNullable().index(); // receivable | payable
    table
      .integer('contact_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('contacts')
      .index();
    table.string('source_type').nullable(); // invoice | bill | null
    table.integer('source_id').unsigned().nullable();
    table.decimal('total_amount', 13, 3).notNullable();
    table.string('currency_code', 3).notNullable();
    table.string('status').notNullable().defaultTo('active').index(); // active|completed|cancelled
    table.string('description').nullable();
    table.timestamps();
  });

  await knex.schema.createTable('debt_repayment_installments', (table) => {
    table.increments('id');
    table
      .integer('plan_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('debt_repayment_plans')
      .onDelete('CASCADE')
      .index();
    table.date('due_date').notNullable().index();
    table.decimal('amount', 13, 3).notNullable();
    table.string('status').notNullable().defaultTo('planned').index(); // planned|paid
    table.datetime('paid_at').nullable();
    table.string('note').nullable();
    table.integer('sort_order').unsigned().notNullable().defaultTo(0);
    table.timestamps();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('debt_repayment_installments');
  await knex.schema.dropTableIfExists('debt_repayment_plans');
};
```

- [ ] **Step 2: Типы (миграции не прогоняем локально)**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/database/tenant/migrations/
git commit -m "feat(debts): migration for repayment plans + installments (additive, down())"
```

---

## Task C2: Модели + регистрация в Tenancy

**Files:**
- Create: `packages/server/src/modules/Debts/models/DebtRepaymentPlan.model.ts`
- Create: `packages/server/src/modules/Debts/models/DebtRepaymentInstallment.model.ts`
- Modify: `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts`

- [ ] **Step 1: DebtRepaymentInstallment.model.ts**

```ts
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class DebtRepaymentInstallment extends TenantBaseModel {
  planId!: number;
  dueDate!: string;
  amount!: number;
  status!: string;
  paidAt!: string | null;
  note!: string | null;
  sortOrder!: number;

  static get tableName() {
    return 'debt_repayment_installments';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
```

- [ ] **Step 2: DebtRepaymentPlan.model.ts** (HasMany installments — как `Budget`→`BudgetLine`)

```ts
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class DebtRepaymentPlan extends TenantBaseModel {
  side!: string;
  contactId!: number;
  sourceType!: string | null;
  sourceId!: number | null;
  totalAmount!: number;
  currencyCode!: string;
  status!: string;
  description!: string | null;

  static get tableName() {
    return 'debt_repayment_plans';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const {
      DebtRepaymentInstallment,
    } = require('./DebtRepaymentInstallment.model');

    return {
      installments: {
        relation: Model.HasManyRelation,
        modelClass: DebtRepaymentInstallment,
        join: {
          from: 'debt_repayment_plans.id',
          to: 'debt_repayment_installments.planId',
        },
      },
    };
  }
}
```

- [ ] **Step 3: Зарегистрировать модели** в `Tenancy.module.ts`. Показать фрагмент (строки 45-47, 89-91). Добавить импорты после `BudgetLine`:

```ts
import { DebtRepaymentPlan } from '@/modules/Debts/models/DebtRepaymentPlan.model';
import { DebtRepaymentInstallment } from '@/modules/Debts/models/DebtRepaymentInstallment.model';
```

И в массив `models` после `BudgetLine,`:

```ts
  DebtRepaymentPlan,
  DebtRepaymentInstallment,
```

- [ ] **Step 4: Типы**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Debts/models/ packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts
git commit -m "feat(debts): repayment plan + installment models, tenancy registration"
```

---

## Task C3: Чистая функция `computePlanProgress` (TDD)

**Files:**
- Test: `packages/server/src/modules/Debts/utils/computePlanProgress.spec.ts`
- Create: `packages/server/src/modules/Debts/utils/computePlanProgress.ts`

- [ ] **Step 1: Падающий тест**

```ts
import { computePlanProgress } from './computePlanProgress';

describe('computePlanProgress', () => {
  const at = '2026-06-05';

  it('считает оплачено/осталось/процент и следующий платёж', () => {
    const res = computePlanProgress(
      [
        { amount: 100, status: 'paid', dueDate: '2026-05-01' },
        { amount: 100, status: 'planned', dueDate: '2026-07-01' },
        { amount: 100, status: 'planned', dueDate: '2026-08-01' },
      ],
      at,
    );
    expect(res.plannedTotal).toBe(300);
    expect(res.paidTotal).toBe(100);
    expect(res.remaining).toBe(200);
    expect(res.percentPaid).toBeCloseTo(33.333, 2);
    expect(res.nextDueDate).toBe('2026-07-01');
    expect(res.isOverdue).toBe(false);
  });

  it('помечает просрочку, если есть запланированный платёж в прошлом', () => {
    const res = computePlanProgress(
      [{ amount: 100, status: 'planned', dueDate: '2026-05-01' }],
      at,
    );
    expect(res.isOverdue).toBe(true);
    expect(res.nextDueDate).toBe('2026-05-01');
  });

  it('пустой график — нули, нет следующего платежа', () => {
    const res = computePlanProgress([], at);
    expect(res).toEqual({
      plannedTotal: 0,
      paidTotal: 0,
      remaining: 0,
      percentPaid: 0,
      nextDueDate: null,
      isOverdue: false,
    });
  });

  it('полностью оплачено — 100% и нет следующего', () => {
    const res = computePlanProgress(
      [{ amount: 100, status: 'paid', dueDate: '2026-05-01' }],
      at,
    );
    expect(res.percentPaid).toBe(100);
    expect(res.remaining).toBe(0);
    expect(res.nextDueDate).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `pnpm --filter @bigfin/server test -- src/modules/Debts/utils/computePlanProgress.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Реализация**

```ts
import { PlanProgress } from '../Debts.interfaces';

type Installment = { amount: number; status: string; dueDate: string };
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Прогресс плана погашения по списку платежей.
 * @param asDate дата отсчёта (YYYY-MM-DD) для «просрочки» и «следующего».
 */
export function computePlanProgress(
  installments: Installment[],
  asDate: string,
): PlanProgress {
  const plannedTotal = round3(
    installments.reduce((s, i) => s + Number(i.amount), 0),
  );
  const paidTotal = round3(
    installments
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + Number(i.amount), 0),
  );
  const remaining = round3(plannedTotal - paidTotal);
  const percentPaid =
    plannedTotal > 0 ? round3((paidTotal / plannedTotal) * 100) : 0;

  const pending = installments
    .filter((i) => i.status !== 'paid')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const nextDueDate = pending.length ? pending[0].dueDate : null;
  const isOverdue = pending.some((i) => i.dueDate < asDate);

  return { plannedTotal, paidTotal, remaining, percentPaid, nextDueDate, isOverdue };
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `pnpm --filter @bigfin/server test -- src/modules/Debts/utils/computePlanProgress.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Debts/utils/computePlanProgress.ts packages/server/src/modules/Debts/utils/computePlanProgress.spec.ts
git commit -m "feat(debts): computePlanProgress pure fn (TDD)"
```

---

## Task C4: DTO плана погашения

**Files:**
- Create: `packages/server/src/modules/Debts/dtos/RepaymentPlan.dto.ts`

- [ ] **Step 1: DTO** (вложенные строки графика — паттерн `RecurrenceDto` из `PlannedOperation.dto.ts`)

```ts
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { DEBT_SIDES, INSTALLMENT_STATUSES } from '../constants';

class InstallmentDto {
  @IsDateString()
  @ApiProperty({ example: '2026-07-01' })
  dueDate: string;

  @ToNumber()
  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 50000 })
  amount: number;

  @IsString()
  @IsIn(INSTALLMENT_STATUSES as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: INSTALLMENT_STATUSES, example: 'planned' })
  status?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Первый транш' })
  note?: string;
}

class CommandRepaymentPlanDto {
  @IsString()
  @IsIn(DEBT_SIDES as unknown as string[])
  @ApiProperty({ enum: DEBT_SIDES })
  side: string;

  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 1, description: 'Contact id' })
  contactId: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'invoice' })
  sourceType?: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 12 })
  sourceId?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'RUB' })
  currencyCode?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Рассрочка на 3 месяца' })
  description?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  @ApiProperty({ type: [InstallmentDto] })
  installments: InstallmentDto[];
}

export class CreateRepaymentPlanDto extends CommandRepaymentPlanDto {}
export class EditRepaymentPlanDto extends CommandRepaymentPlanDto {}
export { InstallmentDto };
```

- [ ] **Step 2: Типы + Commit**

Run: `pnpm typecheck` → PASS

```bash
git add packages/server/src/modules/Debts/dtos/RepaymentPlan.dto.ts
git commit -m "feat(debts): repayment plan DTOs with installments"
```

---

## Task C5: Валидатор + Create (TDD)

**Files:**
- Create: `packages/server/src/modules/Debts/commands/CommandRepaymentPlanValidator.service.ts`
- Create: `packages/server/src/modules/Debts/commands/CreateRepaymentPlan.service.ts`
- Test: `packages/server/src/modules/Debts/commands/CreateRepaymentPlan.service.spec.ts`

- [ ] **Step 1: Валидатор** (образец `CommandPlannedOperationValidator.service.ts`)

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Contact } from '@/modules/Contacts/models/Contact';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ERRORS } from '../constants';
import { CommandRepaymentPlanDto } from '../dtos/RepaymentPlan.dto';

@Injectable()
export class CommandRepaymentPlanValidatorService {
  constructor(
    @Inject(Contact.name)
    private readonly contactModel: TenantModelProxy<typeof Contact>,
  ) {}

  public async validate(dto: CommandRepaymentPlanDto) {
    const contact = await this.contactModel().query().findById(dto.contactId);
    if (!contact) throw new ServiceError(ERRORS.CONTACT_NOT_FOUND);

    if (!dto.installments?.length) {
      throw new ServiceError(ERRORS.EMPTY_INSTALLMENTS);
    }
    const sum = dto.installments.reduce((s, i) => s + Number(i.amount), 0);
    if (sum <= 0) throw new ServiceError(ERRORS.INVALID_PLAN_TOTAL);
  }
}
```

> На исполнении подтвердить путь `Contact` (`@/modules/Contacts/models/Contact` — есть в Tenancy.module.ts строка 18).

- [ ] **Step 2: Create service** (UnitOfWork + insertGraph)

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DebtRepaymentPlan } from '../models/DebtRepaymentPlan.model';
import { CommandRepaymentPlanValidatorService } from './CommandRepaymentPlanValidator.service';
import { CreateRepaymentPlanDto } from '../dtos/RepaymentPlan.dto';

@Injectable()
export class CreateRepaymentPlanService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandRepaymentPlanValidatorService,
    @Inject(DebtRepaymentPlan.name)
    private readonly planModel: TenantModelProxy<typeof DebtRepaymentPlan>,
  ) {}

  public async create(dto: CreateRepaymentPlanDto, trx?: Knex.Transaction) {
    await this.validator.validate(dto);
    const totalAmount = dto.installments.reduce((s, i) => s + Number(i.amount), 0);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      return this.planModel()
        .query(trx)
        .insertGraph({
          side: dto.side,
          contactId: dto.contactId,
          sourceType: dto.sourceType ?? null,
          sourceId: dto.sourceId ?? null,
          totalAmount,
          currencyCode: dto.currencyCode || 'RUB',
          status: 'active',
          description: dto.description ?? null,
          installments: dto.installments.map((i, idx) => ({
            dueDate: i.dueDate,
            amount: i.amount,
            status: i.status || 'planned',
            note: i.note ?? null,
            sortOrder: idx,
          })),
        } as any);
    }, trx);
  }
}
```

- [ ] **Step 3: Тест валидатора** (моки) — пустой график бросает `EMPTY_INSTALLMENTS`; несуществующий контакт — `CONTACT_NOT_FOUND`.

```ts
import { Test } from '@nestjs/testing';
import { Contact } from '@/modules/Contacts/models/Contact';
import { CommandRepaymentPlanValidatorService } from './CommandRepaymentPlanValidator.service';

const contactModel = (found: any) => () => ({
  query: () => ({ findById: async () => found }),
});

describe('CommandRepaymentPlanValidatorService', () => {
  const build = async (found: any) => {
    const ref = await Test.createTestingModule({
      providers: [
        CommandRepaymentPlanValidatorService,
        { provide: Contact.name, useValue: contactModel(found) },
      ],
    }).compile();
    return ref.get(CommandRepaymentPlanValidatorService);
  };

  it('бросает CONTACT_NOT_FOUND', async () => {
    const v = await build(null);
    await expect(
      v.validate({ contactId: 9, installments: [{ amount: 1, dueDate: 'x' }] } as any),
    ).rejects.toMatchObject({ message: 'CONTACT_NOT_FOUND' });
  });

  it('бросает EMPTY_INSTALLMENTS', async () => {
    const v = await build({ id: 1 });
    await expect(
      v.validate({ contactId: 1, installments: [] } as any),
    ).rejects.toMatchObject({ message: 'EMPTY_INSTALLMENTS' });
  });
});
```

> На исполнении сверить, что `ServiceError` хранит код в `.message` (открыть `@/modules/Items/ServiceError`); поправить ассерт при необходимости.

- [ ] **Step 4: PASS + типы**

Run: `pnpm --filter @bigfin/server test -- src/modules/Debts/commands/CreateRepaymentPlan.service.spec.ts` && `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Debts/commands/CommandRepaymentPlanValidator.service.ts packages/server/src/modules/Debts/commands/CreateRepaymentPlan.service.ts packages/server/src/modules/Debts/commands/CreateRepaymentPlan.service.spec.ts
git commit -m "feat(debts): create repayment plan + validator (TDD)"
```

---

## Task C6: Edit / Delete / MarkInstallmentPaid

**Files:**
- Create: `packages/server/src/modules/Debts/commands/EditRepaymentPlan.service.ts`
- Create: `packages/server/src/modules/Debts/commands/DeleteRepaymentPlan.service.ts`
- Create: `packages/server/src/modules/Debts/commands/MarkInstallmentPaid.service.ts`

- [ ] **Step 1: EditRepaymentPlan** — обновить поля плана; график переинсертить (удалить строки плана, вставить новые) в транзакции.

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DebtRepaymentPlan } from '../models/DebtRepaymentPlan.model';
import { DebtRepaymentInstallment } from '../models/DebtRepaymentInstallment.model';
import { CommandRepaymentPlanValidatorService } from './CommandRepaymentPlanValidator.service';
import { EditRepaymentPlanDto } from '../dtos/RepaymentPlan.dto';
import { ERRORS } from '../constants';

@Injectable()
export class EditRepaymentPlanService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandRepaymentPlanValidatorService,
    @Inject(DebtRepaymentPlan.name)
    private readonly planModel: TenantModelProxy<typeof DebtRepaymentPlan>,
    @Inject(DebtRepaymentInstallment.name)
    private readonly installmentModel: TenantModelProxy<typeof DebtRepaymentInstallment>,
  ) {}

  public async edit(id: number, dto: EditRepaymentPlanDto) {
    await this.validator.validate(dto);
    const existing = await this.planModel().query().findById(id);
    if (!existing) throw new ServiceError(ERRORS.REPAYMENT_PLAN_NOT_FOUND);
    const totalAmount = dto.installments.reduce((s, i) => s + Number(i.amount), 0);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.planModel().query(trx).findById(id).patch({
        side: dto.side,
        contactId: dto.contactId,
        sourceType: dto.sourceType ?? null,
        sourceId: dto.sourceId ?? null,
        totalAmount,
        currencyCode: dto.currencyCode || existing.currencyCode,
        description: dto.description ?? null,
      } as any);
      await this.installmentModel().query(trx).where('planId', id).delete();
      await this.installmentModel().query(trx).insert(
        dto.installments.map((i, idx) => ({
          planId: id,
          dueDate: i.dueDate,
          amount: i.amount,
          status: i.status || 'planned',
          note: i.note ?? null,
          sortOrder: idx,
        })) as any,
      );
      return this.planModel().query(trx).findById(id).withGraphFetched('installments');
    });
  }
}
```

- [ ] **Step 2: DeleteRepaymentPlan** — удалить план (строки уйдут каскадом по FK).

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DebtRepaymentPlan } from '../models/DebtRepaymentPlan.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteRepaymentPlanService {
  constructor(
    private readonly uow: UnitOfWork,
    @Inject(DebtRepaymentPlan.name)
    private readonly planModel: TenantModelProxy<typeof DebtRepaymentPlan>,
  ) {}

  public async delete(id: number) {
    const existing = await this.planModel().query().findById(id);
    if (!existing) throw new ServiceError(ERRORS.REPAYMENT_PLAN_NOT_FOUND);
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      return this.planModel().query(trx).deleteById(id);
    });
  }
}
```

- [ ] **Step 3: MarkInstallmentPaid** — отметить платёж оплаченным; если все оплачены — план `completed`.

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DebtRepaymentPlan } from '../models/DebtRepaymentPlan.model';
import { DebtRepaymentInstallment } from '../models/DebtRepaymentInstallment.model';
import { ERRORS } from '../constants';

@Injectable()
export class MarkInstallmentPaidService {
  constructor(
    private readonly uow: UnitOfWork,
    @Inject(DebtRepaymentPlan.name)
    private readonly planModel: TenantModelProxy<typeof DebtRepaymentPlan>,
    @Inject(DebtRepaymentInstallment.name)
    private readonly installmentModel: TenantModelProxy<typeof DebtRepaymentInstallment>,
  ) {}

  public async markPaid(planId: number, installmentId: number) {
    const inst = await this.installmentModel()
      .query()
      .findById(installmentId)
      .where('planId', planId);
    if (!inst) throw new ServiceError(ERRORS.INSTALLMENT_NOT_FOUND);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.installmentModel().query(trx).findById(installmentId).patch({
        status: 'paid',
        paidAt: moment().toISOString(),
      } as any);

      const remaining = await this.installmentModel()
        .query(trx)
        .where('planId', planId)
        .andWhere('status', 'planned')
        .resultSize();
      if (remaining === 0) {
        await this.planModel().query(trx).findById(planId).patch({ status: 'completed' } as any);
      }
      return this.planModel().query(trx).findById(planId).withGraphFetched('installments');
    });
  }
}
```

- [ ] **Step 4: Типы + Commit**

Run: `pnpm typecheck` → PASS

```bash
git add packages/server/src/modules/Debts/commands/EditRepaymentPlan.service.ts packages/server/src/modules/Debts/commands/DeleteRepaymentPlan.service.ts packages/server/src/modules/Debts/commands/MarkInstallmentPaid.service.ts
git commit -m "feat(debts): edit/delete plan + mark installment paid"
```

---

## Task C7: `GetRepaymentPlans.service.ts` (список + прогресс)

**Files:**
- Create: `packages/server/src/modules/Debts/queries/GetRepaymentPlans.service.ts`

- [ ] **Step 1: Реализация** — грузит планы (опц. фильтр side/contact) с графиком, считает прогресс чистой функцией.

```ts
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DebtRepaymentPlan } from '../models/DebtRepaymentPlan.model';
import { computePlanProgress } from '../utils/computePlanProgress';

@Injectable()
export class GetRepaymentPlansService {
  constructor(
    @Inject(DebtRepaymentPlan.name)
    private readonly planModel: TenantModelProxy<typeof DebtRepaymentPlan>,
  ) {}

  public async getPlans(filter: { side?: string; contactId?: number }) {
    const asDate = moment().format('YYYY-MM-DD');
    const plans = await this.planModel()
      .query()
      .withGraphFetched('installments')
      .onBuild((q) => {
        if (filter.side) q.where('side', filter.side);
        if (filter.contactId) q.where('contactId', filter.contactId);
      });

    return (plans as any[]).map((plan) => ({
      ...plan,
      progress: computePlanProgress(
        (plan.installments || []).map((i: any) => ({
          amount: Number(i.amount),
          status: i.status,
          dueDate: moment(i.dueDate).format('YYYY-MM-DD'),
        })),
        asDate,
      ),
    }));
  }
}
```

- [ ] **Step 2: Типы + Commit**

Run: `pnpm typecheck` → PASS

```bash
git add packages/server/src/modules/Debts/queries/GetRepaymentPlans.service.ts
git commit -m "feat(debts): list repayment plans with progress"
```

---

## Task C8: Эндпоинты плана погашения + регистрация провайдеров

**Files:**
- Modify: `Debts.application.ts`, `Debts.controller.ts`, `Debts.module.ts`

- [ ] **Step 1: Module** — добавить в providers: `CommandRepaymentPlanValidatorService`, `CreateRepaymentPlanService`, `EditRepaymentPlanService`, `DeleteRepaymentPlanService`, `MarkInstallmentPaidService`, `GetRepaymentPlansService`.

- [ ] **Step 2: Application** — методы-делегаты:

```ts
  public getRepaymentPlans(filter: { side?: string; contactId?: number }) {
    return this.getPlansService.getPlans(filter);
  }
  public createRepaymentPlan(dto: CreateRepaymentPlanDto) {
    return this.createPlanService.create(dto);
  }
  public editRepaymentPlan(id: number, dto: EditRepaymentPlanDto) {
    return this.editPlanService.edit(id, dto);
  }
  public deleteRepaymentPlan(id: number) {
    return this.deletePlanService.delete(id);
  }
  public markInstallmentPaid(planId: number, installmentId: number) {
    return this.markPaidService.markPaid(planId, installmentId);
  }
```
(добавить инъекции и импорты DTO).

- [ ] **Step 3: Controller** — эндпоинты:

```ts
  @Get('repayment-plans')
  getRepaymentPlans(@Query('side') side?: string, @Query('contactId') contactId?: string) {
    return this.application.getRepaymentPlans({ side, contactId: contactId ? Number(contactId) : undefined });
  }

  @Post('repayment-plans')
  createRepaymentPlan(@Body() dto: CreateRepaymentPlanDto) {
    return this.application.createRepaymentPlan(dto);
  }

  @Put('repayment-plans/:id')
  editRepaymentPlan(@Param('id', ParseIntPipe) id: number, @Body() dto: EditRepaymentPlanDto) {
    return this.application.editRepaymentPlan(id, dto);
  }

  @Delete('repayment-plans/:id')
  deleteRepaymentPlan(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteRepaymentPlan(id);
  }

  @Post('repayment-plans/:planId/installments/:installmentId/pay')
  markInstallmentPaid(
    @Param('planId', ParseIntPipe) planId: number,
    @Param('installmentId', ParseIntPipe) installmentId: number,
  ) {
    return this.application.markInstallmentPaid(planId, installmentId);
  }
```
(дополнить импорты `Body`, `Delete`, `Put`).

- [ ] **Step 4: Все тесты модуля + типы**

Run: `pnpm --filter @bigfin/server test -- src/modules/Debts` && `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Debts/
git commit -m "feat(debts): repayment plan endpoints + provider wiring"
```

**✅ Контрольная точка Part C:** полный бэкенд ⑭ готов и покрыт юнит-тестами.

---

# PART D — Фронтенд «Долги»

> На исполнении сначала открыть образцы: хук `packages/webapp/src/hooks/query/*` для payment-calendar/budgets, страницу `containers/.../PaymentCalendarPage.tsx` (для `featureCan`, маршрута, меню), `components/ui/list-view/list-view.tsx` + `use-list-controller.ts` (API списка), пример `schemas.ts` (Zod). Ниже — целевая структура и новый код; имена импортов выровнять по образцам.

## Task D1: Query-хуки

**Files:**
- Create: `packages/webapp/src/hooks/query/Debts.tsx`

- [ ] **Step 1: Хуки** (образец — хук payment-calendar через `useRequestQuery`)

```tsx
import { useRequestQuery } from '../useRequestQuery';
import { useRequestMutation } from '../useRequestMutation'; // выровнять по образцу проекта
import t from './types'; // ключи кэша — добавить DEBTS_* в types

export function useDebtsOverview(query?: any, props?: any) {
  return useRequestQuery(
    [t.DEBTS_OVERVIEW, query],
    { method: 'get', url: 'debts/overview', params: query },
    { select: (res: any) => res.data, defaultData: {}, ...props },
  );
}

export function useContactDebts(contactId: number, query?: any, props?: any) {
  return useRequestQuery(
    [t.DEBTS_CONTACT, contactId, query],
    { method: 'get', url: `debts/contact/${contactId}`, params: query },
    { select: (res: any) => res.data, defaultData: [], enabled: !!contactId, ...props },
  );
}

export function useRepaymentPlans(query?: any, props?: any) {
  return useRequestQuery(
    [t.DEBTS_PLANS, query],
    { method: 'get', url: 'debts/repayment-plans', params: query },
    { select: (res: any) => res.data, defaultData: [], ...props },
  );
}
// + мутации: useCreateRepaymentPlan / useEditRepaymentPlan / useDeleteRepaymentPlan /
//   useMarkInstallmentPaid / useRemindDebtor — по образцу мутаций payment-calendar.
```

- [ ] **Step 2: Типы кэша** — добавить ключи `DEBTS_OVERVIEW`, `DEBTS_CONTACT`, `DEBTS_PLANS` в файл типов query (тот же, что использует payment-calendar).

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/hooks/query/Debts.tsx packages/webapp/src/hooks/query/types*
git commit -m "feat(webapp/debts): react-query hooks for debts"
```

---

## Task D2: Zod-схема плана + columns + transform

**Files:**
- Create: `packages/webapp/src/containers/Debts/schemas.ts`
- Create: `packages/webapp/src/containers/Debts/columns.tsx`
- Create: `packages/webapp/src/containers/Debts/transform.ts`

- [ ] **Step 1: schemas.ts** (сообщения через `intl.get`)

```ts
import { z } from 'zod';
import intl from 'react-intl-universal';

export const getRepaymentPlanSchema = () =>
  z.object({
    side: z.enum(['receivable', 'payable']),
    contactId: z.number().int().positive(),
    description: z.string().trim().optional(),
    installments: z
      .array(
        z.object({
          dueDate: z.string().min(1, intl.get('debts.error.installment_date_required')),
          amount: z.number().positive(intl.get('debts.error.installment_amount_positive')),
          note: z.string().trim().optional(),
        }),
      )
      .min(1, intl.get('debts.error.installments_required')),
  });

export type RepaymentPlanFormValues = z.infer<ReturnType<typeof getRepaymentPlanSchema>>;
```

- [ ] **Step 2: columns.tsx** — колонки реестра (контрагент, всего, просрочено, худшая корзина) для `ListView`; заголовки через `intl.get('debts.col.*')`.

- [ ] **Step 3: transform.ts** — `transformDebtsStateToQuery(state)` для `useListController` (side, поиск, пагинация → params).

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/containers/Debts/schemas.ts packages/webapp/src/containers/Debts/columns.tsx packages/webapp/src/containers/Debts/transform.ts
git commit -m "feat(webapp/debts): plan schema, list columns, query transform"
```

---

## Task D3: Страница «Долги»

**Files:**
- Create: `packages/webapp/src/containers/Debts/DebtsPage.tsx`
- Create: `packages/webapp/src/containers/Debts/DebtsContactRow.tsx`

- [ ] **Step 1: DebtsPage** — переключатель стороны, карточки-итоги, полоса старения, `ListView`+`useListController` реестр, drill-down строкой `DebtsContactRow` (через `useContactDebts`). За флагом `featureCan('debts')` (как `PaymentCalendarPage`). Все строки — `intl.get('debts.*')`.

- [ ] **Step 2: DebtsContactRow** — раскрытие контрагента: список неоплаченных документов + кнопки «Напомнить» (мутация `useRemindDebtor`, только receivable) и «План погашения» (открывает диалог из D4).

- [ ] **Step 3: Проверка типов**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/containers/Debts/DebtsPage.tsx packages/webapp/src/containers/Debts/DebtsContactRow.tsx
git commit -m "feat(webapp/debts): debts page (summary, aging, registry, drill-down)"
```

---

## Task D4: Диалог плана погашения + прогресс

**Files:**
- Create: `packages/webapp/src/containers/Debts/RepaymentPlanDialog.tsx`
- Create: `packages/webapp/src/containers/Debts/RepaymentPlanProgress.tsx`

- [ ] **Step 1: RepaymentPlanDialog** — RHF + `getRepaymentPlanSchema`, динамический список строк графика (добавить/удалить), submit → `useCreateRepaymentPlan`/`useEditRepaymentPlan`.
- [ ] **Step 2: RepaymentPlanProgress** — полоса «оплачено N% / осталось X», следующий платёж, отметка «оплачено» (`useMarkInstallmentPaid`).
- [ ] **Step 3: Типы + Commit**

Run: `pnpm typecheck` → PASS

```bash
git add packages/webapp/src/containers/Debts/RepaymentPlanDialog.tsx packages/webapp/src/containers/Debts/RepaymentPlanProgress.tsx
git commit -m "feat(webapp/debts): repayment plan dialog + progress"
```

---

## Task D5: Маршрут + пункт меню (за флагом)

**Files:**
- Modify: маршруты webapp (тот же файл, где зарегистрирован `payment-calendar`)
- Modify: конфиг сайдбара/меню (где пункт payment-calendar за `featureCan`)

- [ ] **Step 1:** Зарегистрировать маршрут `'/debts'` → `DebtsPage` рядом с `payment-calendar` (показать фрагмент перед правкой).
- [ ] **Step 2:** Добавить пункт меню «Долги» за `featureCan('debts')` (зеркало пункта «Платёжный календарь»).
- [ ] **Step 3:** Типы.

Run: `pnpm typecheck` → PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(webapp/debts): route and sidebar entry behind DEBTS flag"
```

---

## Task D6: i18n (EN + RU, парно)

**Files:**
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1:** Добавить парные ключи (через скилл `i18n-add-string` или вручную парно). Минимальный набор: `debts.title`, `debts.side.receivable`, `debts.side.payable`, `debts.total`, `debts.overdue`, `debts.net`, `debts.aging.0_30/31_60/61_90/90_plus`, `debts.col.contact/total/overdue/worst`, `debts.action.remind/repayment_plan`, `debts.plan.title/add_installment/progress/mark_paid/next_due`, `debts.error.installment_date_required/installment_amount_positive/installments_required`. RU — натуральный бух-русский («Дебиторка», «Кредиторка», «Просрочено», «Старение», «План погашения», «Напомнить»).

- [ ] **Step 2: Проверка парности**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: 0 рассинхронов.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(webapp/debts): i18n keys (en+ru parity)"
```

---

## Task D7: Финальная проверка

- [ ] **Step 1:** `pnpm typecheck` → PASS (3 пакета).
- [ ] **Step 2:** `pnpm --filter @bigfin/server test -- src/modules/Debts` → PASS.
- [ ] **Step 3:** `node packages/webapp/scripts/lang-check.js` → 0.
- [ ] **Step 4:** Ручная проверка `?lang=ru` — чек-лист в PR-описании (открыть «Долги» с включённым флагом на тестовой орг.).

**✅ Контрольная точка Part D / ⑭:** страница «Долги» полностью функциональна за флагом `DEBTS`.

---

## Self-Review (выполнено при написании плана)

- **Покрытие спеки:** §2.1 сводка→A7/A9; §2.2 реестр→A7+D3; §2.3 drill-down→B1+D3; §2.4 ТОП→A5; §2.5 напоминание→B2/B3+D3; §2.6 план погашения→C1–C8+D4. Старение (корзины)→A3/A4. Откат (§11)→флаг A1 + миграции C1. ✅
- **Без заглушек:** «⚠️ на исполнении сверить …» — это шаги верификации имён в реальном коде (не скрытый код); сам код в шагах полный. Reuse-напоминания (B2) имеет явный read-шаг + шаблон.
- **Согласованность типов:** `DebtContact`/`DebtsSideSummary`/`PlanProgress` определены в A2 и используются одинаково в A5/A7/C3/C7; имена сервисов совпадают между Module/Application/Controller.
- **Известная зона уточнения на исполнении:** точные имена полей моделей `SaleInvoice`/`Bill`/`Contact` и форма мока в спеках сервисов — сверяются по `AgingSummary`/`APAgingSummaryRepository`/`GetPaymentCalendarForecast.service.spec.ts` (ссылки в задачах).
