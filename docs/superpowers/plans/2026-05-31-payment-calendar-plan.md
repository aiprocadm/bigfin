# Платёжный календарь — Этап 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Построить платёжный календарь — прогноз остатка денег по дням вперёд из открытых обязательств (неоплаченные счета/акты), ручных и повторяющихся плановых операций, с подсветкой кассового разрыва, за feature-флагом `payment_calendar` (по умолчанию выключен).

**Architecture:** Одна новая tenant-таблица `planned_operations` (ручные/повторяющиеся операции). Обязательства (`sales_invoices`/`bills`) и денежные счета (`accounts`) **читаются на лету** — не материализуются. Прогноз считается в сервисе `GetPaymentCalendarForecast`, который оркестрирует 4 источника, конвертирует валюты в базовую и вызывает две **чистые функции** — `expandRecurrence` (развёртка повторов) и `computeRunningBalance` (бегущий остаток + детекция разрыва). Свёртка обязательств переиспользует проверенные модификаторы моделей (`dueInvoices`/`dueBills`/`delivered`), так что цифры сходятся с aging-отчётами.

**Tech Stack:** NestJS 10 + Objection/Knex (tenant-миграции), Jest (unit), `moment` (даты). Frontend — React 18, shadcn `components/ui`, React Hook Form + Zod, React Query v3. i18n: `react-intl-universal` (web) + `nestjs-i18n` (server).

**Spec:** [2026-05-31-payment-calendar-design.md](../specs/2026-05-31-payment-calendar-design.md)

---

## Pre-flight (читать до старта)

**Гейтинг.** Реализация начинается **после Ф1 роадмапа** (① русификация, ③ режим «Бизнес/Бухгалтер»), как и весь управленческий каркас. План написан заранее. Флаг `payment_calendar` по умолчанию `false` — смерженный код невидим, пока флаг не включён для организации.

**Окружение.** Node 18.16.1 (`fnm use 18.16.1` / `nvm use 18.16.1`), только `pnpm`. Локальный backend не поднят — серверную логику проверяем через `pnpm --filter @bigfin/server test` и `pnpm typecheck`; фронт — `pnpm typecheck` + `pnpm dev:webapp`. SDK-типы регенерируются **в CI** (локально заблокировано), `shared/sdk-ts` руками не трогаем.

**Правила основателя (на каждом шаге).**
1. Перед правкой существующего файла — показать релевантный фрагмент.
2. Маленькие шаги: один таск = одно логическое изменение, пауза после каждого.
3. После каждого таска — команда проверки + способ отката (в шаге Commit).
4. Ничего не удаляем без подтверждения (в этом плане удалений нет — всё additive).

**Миграции.** Только additive. Обязательный рабочий `down()`. Новую таблицу прогнать `latest → rollback → latest`. Создавать через скилл `make-migration` (он ставит корректный timestamp). Имя ниже дано с timestamp-образцом `20260531…` — используйте фактический timestamp от скилла, сохранив суффикс.

**i18n.** Любая строка экрана — через `intl.get('...')` / `<T id="..." />`. Сообщения Zod — тоже через `intl.get`, не хардкодить RU в схемах. После правок lang-файлов — `node packages/webapp/scripts/lang-check.js` (парность EN↔RU строго). Скилл `i18n-add-string`.

**Бренд.** Везде только `Bigfin`.

---

## File Structure

**Backend — новый модуль `packages/server/src/modules/PaymentCalendar/`:**

| Файл | Ответственность |
|---|---|
| `models/PlannedOperation.model.ts` | Objection-модель плановой операции |
| `constants.ts` | Коды ошибок `ERRORS`, enum `DIRECTIONS`/`STATUSES`/`FREQUENCIES` |
| `PaymentCalendar.interfaces.ts` | Интерфейсы прогноза (DayFlow/DayBalance/ForecastResult/строки) |
| `dtos/PlannedOperation.dto.ts` | Create/Edit DTO (+ вложенный `RecurrenceDto`) |
| `dtos/GetPlannedOperationsQuery.dto.ts` | DTO фильтра списка |
| `dtos/GetPaymentCalendarQuery.dto.ts` | DTO прогноза (extends `FinancialSheetBranchesQueryDto`) |
| `utils/expandRecurrence.ts` | Чистая развёртка правила повтора в даты |
| `utils/computeRunningBalance.ts` | Чистый бегущий остаток + детекция кассового разрыва |
| `commands/CommandPlannedOperationValidator.service.ts` | Валидация суммы/даты/статьи/счёта/повтора |
| `commands/CreatePlannedOperation.service.ts` | Создание операции |
| `commands/EditPlannedOperation.service.ts` | Правка операции |
| `commands/DeletePlannedOperation.service.ts` | Удаление операции |
| `queries/GetPlannedOperations.service.ts` | Список плановых операций |
| `queries/GetPaymentCalendarForecast.service.ts` | Движок прогноза (оркестратор источников) |
| `PaymentCalendar.application.ts` | Фасад над командами/запросами |
| `PaymentCalendar.controller.ts` | REST `@Controller('payment-calendar')` + `planned-operations` |
| `PaymentCalendar.module.ts` | NestJS-модуль |

**Backend — точечные правки существующих файлов:**

| Файл | Правка |
|---|---|
| `packages/server/src/common/types/Features.ts` | + `PAYMENT_CALENDAR = 'payment_calendar'` |
| `packages/server/src/modules/Features/FeaturesConfigure.ts` | + запись `{ name: Features.PAYMENT_CALENDAR, defaultValue: false }` |
| `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts` | + регистрация `PlannedOperation` |
| `packages/server/src/modules/App/App.module.ts` | + импорт `PaymentCalendarModule` |

**Backend — миграция:**

| Файл | Ответственность |
|---|---|
| `packages/server/src/database/tenant/migrations/20260531120000_create_planned_operations_table.ts` | Таблица плановых операций |

**Frontend — `packages/webapp/src/`:**

| Файл | Ответственность |
|---|---|
| `hooks/query/paymentCalendar.tsx` | React Query хуки (forecast/list/create/edit/delete) |
| `hooks/query/types.tsx` | + ключи `PAYMENT_CALENDAR…` (правка) |
| `containers/PaymentCalendar/PaymentCalendarPage.tsx` | Страница-лента по дням |
| `containers/PaymentCalendar/DayRow.tsx` | Строка дня + раскрытие источников |
| `containers/PaymentCalendar/PlannedOperationDialog.tsx` | Модалка создания/правки (RHF + Zod) |
| `containers/PaymentCalendar/schemas.ts` | Zod-схема формы |
| `routes/dashboard.tsx` | + маршрут (правка) |
| `lang/en/index.json`, `lang/ru/index.json` | + ключи i18n (правка) |

---

# Part A — Backend: каркас плановых операций (CRUD)

## Task A1: Feature-флаг `payment_calendar`

**Files:**
- Modify: `packages/server/src/common/types/Features.ts`
- Modify: `packages/server/src/modules/Features/FeaturesConfigure.ts`
- Test: `packages/server/src/modules/Features/FeaturesConfigure.paymentCalendar.spec.ts` (create)

- [ ] **Step 1: Написать падающий тест**

Create `packages/server/src/modules/Features/FeaturesConfigure.paymentCalendar.spec.ts`:

```ts
import { ConfigService } from '@nestjs/config';
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure — payment calendar', () => {
  const build = () =>
    new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);

  it('registers the payment calendar feature, default off', () => {
    const configure = build().getConfigure();
    const flag = configure.find((f) => f.name === Features.PAYMENT_CALENDAR);

    expect(flag).toBeDefined();
    expect(flag?.defaultValue).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/Features/FeaturesConfigure.paymentCalendar.spec.ts`
Expected: FAIL — `Features.PAYMENT_CALENDAR` не существует.

- [ ] **Step 3: Добавить значение enum**

In `packages/server/src/common/types/Features.ts`, расширить enum (после `MGMT_ARTICLES`):

```ts
export enum Features {
  WAREHOUSES = 'warehouses',
  BRANCHES = 'branches',
  BankSyncing = 'BankSyncing',
  MGMT_ARTICLES = 'mgmt_articles',
  PAYMENT_CALENDAR = 'payment_calendar',
}
```

- [ ] **Step 4: Зарегистрировать флаг**

In `packages/server/src/modules/Features/FeaturesConfigure.ts`, добавить запись в массив `getConfigure()` (после записи `MGMT_ARTICLES`):

```ts
      {
        name: Features.MGMT_ARTICLES,
        defaultValue: false,
      },
      {
        name: Features.PAYMENT_CALENDAR,
        defaultValue: false,
      },
    ];
  }
}
```

- [ ] **Step 5: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/Features/FeaturesConfigure.paymentCalendar.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/common/types/Features.ts packages/server/src/modules/Features/FeaturesConfigure.ts packages/server/src/modules/Features/FeaturesConfigure.paymentCalendar.spec.ts
git commit -m "feat(server): add payment_calendar feature flag (default off)"
```
Откат: `git revert <hash>` или `git checkout -- <files>`.

---

## Task A2: Миграция таблицы `planned_operations`

**Files:**
- Create: `packages/server/src/database/tenant/migrations/20260531120000_create_planned_operations_table.ts`

- [ ] **Step 1: Создать миграцию через скилл**

Скилл `make-migration` (схема: **tenant**), имя `create_planned_operations_table`. Скилл создаст файл с актуальным timestamp.

- [ ] **Step 2: Заполнить миграцию**

Содержимое (чистый PostgreSQL/Knex, по образцу `…_create_management_articles_table.ts`):

```ts
exports.up = (knex) => {
  return knex.schema.createTable('planned_operations', (table) => {
    table.increments('id');

    table.string('direction').notNullable().index(); // 'inflow' | 'outflow'
    table.decimal('amount', 13, 3).notNullable();
    table.string('currency_code', 3).notNullable();
    table.date('planned_date').notNullable().index();

    table
      .integer('article_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('management_articles');
    table
      .integer('account_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('accounts');
    table.integer('branch_id').unsigned().nullable();
    table.integer('project_id').unsigned().nullable();
    table
      .integer('contact_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('contacts');

    table.string('status').notNullable().defaultTo('planned').index(); // planned|confirmed|done|cancelled
    table.string('source_type').nullable();
    table.integer('source_id').unsigned().nullable();
    table.jsonb('recurrence').nullable();
    table.string('description').nullable();

    table.timestamps();
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('planned_operations');
```

- [ ] **Step 3: Прогнать миграцию в обе стороны**

Run:
```bash
pnpm tenants:migrate:latest
pnpm tenants:migrate:rollback
pnpm tenants:migrate:latest
```
Expected: все три команды без ошибок; таблица создаётся → удаляется → снова создаётся.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/database/tenant/migrations/*_create_planned_operations_table.ts
git commit -m "feat(server): add planned_operations tenant migration"
```
Откат: `pnpm tenants:migrate:rollback`, затем `git checkout -- <file>`.

---

## Task A3: Константы и модель `PlannedOperation`

**Files:**
- Create: `packages/server/src/modules/PaymentCalendar/constants.ts`
- Create: `packages/server/src/modules/PaymentCalendar/models/PlannedOperation.model.ts`
- Modify: `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts`

> Модель — класс-обёртка Objection, отдельного unit-теста нет. Проверка — `pnpm typecheck` и тесты команд далее.

- [ ] **Step 1: Константы**

Create `packages/server/src/modules/PaymentCalendar/constants.ts`:

```ts
// eslint-disable-next-line import/prefer-default-export
export const ERRORS = {
  PLANNED_OPERATION_NOT_FOUND: 'PLANNED_OPERATION_NOT_FOUND',
  INVALID_DIRECTION: 'INVALID_DIRECTION',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  INVALID_RECURRENCE: 'INVALID_RECURRENCE',
};

export const DIRECTIONS = ['inflow', 'outflow'] as const;
export const STATUSES = ['planned', 'confirmed', 'done', 'cancelled'] as const;
export const FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;

// Статусы, которые попадают в прогноз.
export const FORECAST_STATUSES = ['planned', 'confirmed'] as const;

// Типы денежных счетов для стартового остатка.
export const CASH_ACCOUNT_TYPES = ['cash', 'bank'] as const;
```

- [ ] **Step 2: Модель**

Create `packages/server/src/modules/PaymentCalendar/models/PlannedOperation.model.ts`:

```ts
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class PlannedOperation extends TenantBaseModel {
  direction!: string;
  amount!: number;
  currencyCode!: string;
  plannedDate!: Date;
  articleId!: number | null;
  accountId!: number | null;
  branchId!: number | null;
  projectId!: number | null;
  contactId!: number | null;
  status!: string;
  sourceType!: string | null;
  sourceId!: number | null;
  recurrence!: Record<string, any> | null;
  description!: string | null;

  /**
   * Table name.
   */
  static get tableName() {
    return 'planned_operations';
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  /**
   * Columns stored as JSON.
   */
  static get jsonAttributes() {
    return ['recurrence'];
  }

  /**
   * Query modifiers.
   */
  static get modifiers() {
    return {
      /**
       * Operations that feed the forecast (planned + confirmed, not done/cancelled).
       */
      forecastable(query) {
        query.whereIn('status', ['planned', 'confirmed']);
      },

      /**
       * One-off (non-recurring) operations within a date range.
       */
      oneOffBetween(query, fromDate: string, toDate: string) {
        query
          .whereNull('recurrence')
          .where('plannedDate', '>=', fromDate)
          .where('plannedDate', '<=', toDate);
      },

      /**
       * Recurring operations whose anchor date is on/before the horizon end.
       */
      recurringBefore(query, toDate: string) {
        query.whereNotNull('recurrence').where('plannedDate', '<=', toDate);
      },

      /**
       * Filter by direction (inflow/outflow).
       */
      filterByDirection(query, direction: string) {
        query.where('direction', direction);
      },

      /**
       * Filter by cash account.
       */
      filterByAccount(query, accountId: number) {
        query.where('accountId', accountId);
      },
    };
  }

  /**
   * Relationship mapping.
   */
  static get relationMappings() {
    const {
      ManagementArticle,
    } = require('@/modules/ManagementArticles/models/ManagementArticle.model');

    return {
      /**
       * Planned operation belongs to a management article.
       */
      article: {
        relation: Model.BelongsToOneRelation,
        modelClass: ManagementArticle,
        join: {
          from: 'planned_operations.articleId',
          to: 'management_articles.id',
        },
      },
    };
  }
}
```

- [ ] **Step 3: Зарегистрировать модель в Tenancy**

In `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts`:

Добавить импорт (рядом с другими моделями):

```ts
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
```

Добавить в массив `models` (рядом с `ManagementArticle`, перед `TenantUser`):

```ts
  ManagementArticle,
  ManagementArticleAccount,
  PlannedOperation,
  TenantUser,
];
```

- [ ] **Step 4: Проверка типов**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: без ошибок.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/PaymentCalendar/constants.ts packages/server/src/modules/PaymentCalendar/models/ packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts
git commit -m "feat(server): add PlannedOperation model and register in tenancy"
```
Откат: `git checkout -- <files>`.

---

## Task A4: Интерфейсы и DTO

**Files:**
- Create: `packages/server/src/modules/PaymentCalendar/PaymentCalendar.interfaces.ts`
- Create: `packages/server/src/modules/PaymentCalendar/dtos/PlannedOperation.dto.ts`
- Create: `packages/server/src/modules/PaymentCalendar/dtos/GetPlannedOperationsQuery.dto.ts`
- Create: `packages/server/src/modules/PaymentCalendar/dtos/GetPaymentCalendarQuery.dto.ts`

> DTO/интерфейсы без отдельного unit-теста — проверяются typecheck-ом и тестами далее.

- [ ] **Step 1: Интерфейсы прогноза**

Create `packages/server/src/modules/PaymentCalendar/PaymentCalendar.interfaces.ts`:

```ts
/** Одна строка-источник внутри дня. */
export interface ForecastLine {
  direction: 'inflow' | 'outflow';
  amount: number; // в базовой валюте
  label: string;
  source: 'invoice' | 'bill' | 'manual' | 'recurring';
}

/** Чистые суммы за день (вход для бегущего остатка). */
export interface DayFlow {
  date: string; // YYYY-MM-DD
  inflow: number;
  outflow: number;
}

/** День с посчитанным остатком на конец. */
export interface DayBalance extends DayFlow {
  balance: number;
  lines?: ForecastLine[];
}

/** Кассовый разрыв. */
export interface CashGap {
  date: string;
  amount: number; // положительное число = размер дефицита
  daysFromStart: number;
}

/** Результат расчёта остатка по дням. */
export interface ForecastResult {
  days: DayBalance[];
  gap: CashGap | null;
}

/** Полный ответ прогноза календаря. */
export interface PaymentCalendarResponse {
  baseCurrency: string;
  openingBalance: number;
  fromDate: string;
  toDate: string;
  days: DayBalance[];
  gap: CashGap | null;
}
```

- [ ] **Step 2: Create/Edit DTO + RecurrenceDto**

Create `packages/server/src/modules/PaymentCalendar/dtos/PlannedOperation.dto.ts`:

```ts
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { DIRECTIONS, FREQUENCIES, STATUSES } from '../constants';

class RecurrenceDto {
  @IsString()
  @IsIn(FREQUENCIES as unknown as string[])
  @ApiProperty({ enum: FREQUENCIES, example: 'monthly' })
  frequency: string;

  @ToNumber()
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 1, description: 'Every N units of the frequency' })
  interval: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 5, description: 'Day of month (monthly)' })
  dayOfMonth?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Weekday 0-6 (weekly)' })
  weekday?: number;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-12-31', description: 'End date' })
  endDate?: string;
}

class CommandPlannedOperationDto {
  @IsString()
  @IsIn(DIRECTIONS as unknown as string[])
  @ApiProperty({ enum: DIRECTIONS, example: 'inflow' })
  direction: string;

  @ToNumber()
  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 200000, description: 'Amount (positive)' })
  amount: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'RUB', description: 'ISO currency code' })
  currencyCode?: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2026-06-15', description: 'Planned date' })
  plannedDate: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 3, description: 'Management article id' })
  articleId?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 12, description: 'Cash/bank account id' })
  accountId?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Branch (direction) id' })
  branchId?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Project id' })
  projectId?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Contact id' })
  contactId?: number;

  @IsString()
  @IsIn(STATUSES as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: STATUSES, example: 'planned' })
  status?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Аванс по договору' })
  description?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => RecurrenceDto)
  @IsOptional()
  @ApiPropertyOptional({ type: RecurrenceDto })
  recurrence?: RecurrenceDto;
}

export class CreatePlannedOperationDto extends CommandPlannedOperationDto {}
export class EditPlannedOperationDto extends CommandPlannedOperationDto {}
export { RecurrenceDto };
```

- [ ] **Step 3: Query DTO списка**

Create `packages/server/src/modules/PaymentCalendar/dtos/GetPlannedOperationsQuery.dto.ts`:

```ts
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsString } from 'class-validator';

export class GetPlannedOperationsQueryDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'inflow', description: 'Filter by direction' })
  direction?: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 12, description: 'Filter by account id' })
  accountId?: number;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-06-01' })
  fromDate?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-06-30' })
  toDate?: string;
}
```

- [ ] **Step 4: Query DTO прогноза**

Create `packages/server/src/modules/PaymentCalendar/dtos/GetPaymentCalendarQuery.dto.ts`:

```ts
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsString } from 'class-validator';
import { FinancialSheetBranchesQueryDto } from '@/modules/FinancialStatements/dtos/FinancialSheetBranchesQuery.dto';

export class GetPaymentCalendarQueryDto extends FinancialSheetBranchesQueryDto {
  @IsDateString()
  @ApiProperty({ example: '2026-06-01', description: 'Horizon start' })
  fromDate: string;

  @IsDateString()
  @ApiProperty({ example: '2026-06-30', description: 'Horizon end' })
  toDate: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 12, description: 'Limit to one cash account' })
  accountId?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'inflow', description: 'Filter by direction' })
  direction?: string;
}
```

- [ ] **Step 5: Проверка типов и commit**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: без ошибок.

```bash
git add packages/server/src/modules/PaymentCalendar/PaymentCalendar.interfaces.ts packages/server/src/modules/PaymentCalendar/dtos/
git commit -m "feat(server): add PaymentCalendar interfaces and DTOs"
```
Откат: `git checkout -- packages/server/src/modules/PaymentCalendar/`.

---

## Task A5: Сервис-валидатор

**Files:**
- Create: `packages/server/src/modules/PaymentCalendar/commands/CommandPlannedOperationValidator.service.ts`
- Test: `packages/server/src/modules/PaymentCalendar/commands/CommandPlannedOperationValidator.service.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Create `packages/server/src/modules/PaymentCalendar/commands/CommandPlannedOperationValidator.service.spec.ts`:

```ts
import { ServiceError } from '@/modules/Items/ServiceError';
import { CommandPlannedOperationValidatorService } from './CommandPlannedOperationValidator.service';
import { ERRORS } from '../constants';

const articleModelStub = (found: any) => () => ({
  query: () => ({ findById: (_id: number) => Promise.resolve(found) }),
});
const accountModelStub = (found: any) => () => ({
  query: () => ({ findById: (_id: number) => Promise.resolve(found) }),
});

describe('CommandPlannedOperationValidatorService', () => {
  it('throws when the referenced article does not exist', async () => {
    const service = new CommandPlannedOperationValidatorService(
      articleModelStub(null) as any,
      accountModelStub({ id: 1 }) as any,
    );

    await expect(service.validateArticleExists(99)).rejects.toMatchObject({
      errorType: ERRORS.ARTICLE_NOT_FOUND,
    });
  });

  it('passes when the article exists', async () => {
    const service = new CommandPlannedOperationValidatorService(
      articleModelStub({ id: 3 }) as any,
      accountModelStub({ id: 1 }) as any,
    );

    await expect(service.validateArticleExists(3)).resolves.toBeUndefined();
  });

  it('skips article validation when no articleId given', async () => {
    const service = new CommandPlannedOperationValidatorService(
      articleModelStub(null) as any,
      accountModelStub(null) as any,
    );

    await expect(service.validateArticleExists(undefined)).resolves.toBeUndefined();
  });
});
```

> `ServiceError` хранит код в `errorType` (`@/modules/Items/ServiceError`, `constructor(errorType, message?, payload?, httpStatus?)`, `httpStatus` по умолчанию `400`).

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar/commands/CommandPlannedOperationValidator.service.spec.ts`
Expected: FAIL — сервис не найден.

- [ ] **Step 3: Реализовать валидатор**

Create `packages/server/src/modules/PaymentCalendar/commands/CommandPlannedOperationValidator.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ERRORS } from '../constants';

@Injectable()
export class CommandPlannedOperationValidatorService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  /**
   * Validates the referenced management article exists (when given).
   */
  public async validateArticleExists(articleId?: number) {
    if (!articleId) return;

    const article = await this.articleModel().query().findById(articleId);
    if (!article) {
      throw new ServiceError(ERRORS.ARTICLE_NOT_FOUND);
    }
  }

  /**
   * Validates the referenced cash/bank account exists (when given).
   */
  public async validateAccountExists(accountId?: number) {
    if (!accountId) return;

    const account = await this.accountModel().query().findById(accountId);
    if (!account) {
      throw new ServiceError(ERRORS.ACCOUNT_NOT_FOUND);
    }
  }
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar/commands/CommandPlannedOperationValidator.service.spec.ts`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/PaymentCalendar/commands/CommandPlannedOperationValidator.service.ts packages/server/src/modules/PaymentCalendar/commands/CommandPlannedOperationValidator.service.spec.ts
git commit -m "feat(server): add PlannedOperation command validator"
```
Откат: `git checkout -- packages/server/src/modules/PaymentCalendar/commands/`.

---

## Task A6: Команда создания плановой операции

**Files:**
- Create: `packages/server/src/modules/PaymentCalendar/commands/CreatePlannedOperation.service.ts`
- Test: `packages/server/src/modules/PaymentCalendar/commands/CreatePlannedOperation.service.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Create `packages/server/src/modules/PaymentCalendar/commands/CreatePlannedOperation.service.spec.ts`:

```ts
import { CreatePlannedOperationService } from './CreatePlannedOperation.service';

describe('CreatePlannedOperationService', () => {
  it('validates references then inserts the operation', async () => {
    const inserted = { id: 7, direction: 'inflow', amount: 200000 };
    const insert = jest.fn().mockResolvedValue(inserted);
    const operationModel = () => ({ query: () => ({ insert }) });

    const validator = {
      validateArticleExists: jest.fn().mockResolvedValue(undefined),
      validateAccountExists: jest.fn().mockResolvedValue(undefined),
    };
    const uow = { withTransaction: (cb: any) => cb({}) };

    const service = new CreatePlannedOperationService(
      uow as any,
      validator as any,
      operationModel as any,
    );

    const result = await service.create({
      direction: 'inflow',
      amount: 200000,
      plannedDate: '2026-06-15',
      articleId: 3,
      accountId: 12,
    } as any);

    expect(validator.validateArticleExists).toHaveBeenCalledWith(3);
    expect(validator.validateAccountExists).toHaveBeenCalledWith(12);
    expect(insert).toHaveBeenCalled();
    expect(result).toEqual(inserted);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar/commands/CreatePlannedOperation.service.spec.ts`
Expected: FAIL — сервис не найден.

- [ ] **Step 3: Реализовать команду**

Create `packages/server/src/modules/PaymentCalendar/commands/CreatePlannedOperation.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PlannedOperation } from '../models/PlannedOperation.model';
import { CommandPlannedOperationValidatorService } from './CommandPlannedOperationValidator.service';
import { CreatePlannedOperationDto } from '../dtos/PlannedOperation.dto';

@Injectable()
export class CreatePlannedOperationService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandPlannedOperationValidatorService,

    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  /**
   * Creates a planned operation.
   * @param {CreatePlannedOperationDto} dto
   * @param {Knex.Transaction} [trx]
   * @returns {Promise<PlannedOperation>}
   */
  public async create(
    dto: CreatePlannedOperationDto,
    trx?: Knex.Transaction,
  ): Promise<PlannedOperation> {
    await this.validator.validateArticleExists(dto.articleId);
    await this.validator.validateAccountExists(dto.accountId);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      return this.operationModel()
        .query(trx)
        .insert({
          ...dto,
          currencyCode: dto.currencyCode || 'RUB',
          status: dto.status || 'planned',
        });
    }, trx);
  }
}
```

> Примечание: дефолт `RUB` на уровне команды — упрощение. Если организация работает в другой базовой валюте, фронт передаёт `currencyCode` явно. Уточнить при dogfooding (Открытый вопрос №2 спеки).

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar/commands/CreatePlannedOperation.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/PaymentCalendar/commands/CreatePlannedOperation.service.ts packages/server/src/modules/PaymentCalendar/commands/CreatePlannedOperation.service.spec.ts
git commit -m "feat(server): add CreatePlannedOperation command"
```
Откат: `git checkout -- packages/server/src/modules/PaymentCalendar/commands/`.

---

## Task A7: Команды правки и удаления

**Files:**
- Create: `packages/server/src/modules/PaymentCalendar/commands/EditPlannedOperation.service.ts`
- Create: `packages/server/src/modules/PaymentCalendar/commands/DeletePlannedOperation.service.ts`
- Test: `packages/server/src/modules/PaymentCalendar/commands/DeletePlannedOperation.service.spec.ts`

- [ ] **Step 1: Написать падающий тест на удаление**

Create `packages/server/src/modules/PaymentCalendar/commands/DeletePlannedOperation.service.spec.ts`:

```ts
import { ServiceError } from '@/modules/Items/ServiceError';
import { DeletePlannedOperationService } from './DeletePlannedOperation.service';
import { ERRORS } from '../constants';

describe('DeletePlannedOperationService', () => {
  it('throws when the operation does not exist', async () => {
    const operationModel = () => ({
      query: () => ({
        findById: () => Promise.resolve(undefined),
        deleteById: () => Promise.resolve(0),
      }),
    });
    const uow = { withTransaction: (cb: any) => cb({}) };

    const service = new DeletePlannedOperationService(
      uow as any,
      operationModel as any,
    );

    await expect(service.delete(123)).rejects.toMatchObject({
      errorType: ERRORS.PLANNED_OPERATION_NOT_FOUND,
    });
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar/commands/DeletePlannedOperation.service.spec.ts`
Expected: FAIL — сервис не найден.

- [ ] **Step 3: Реализовать удаление**

Create `packages/server/src/modules/PaymentCalendar/commands/DeletePlannedOperation.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PlannedOperation } from '../models/PlannedOperation.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeletePlannedOperationService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  /**
   * Deletes a planned operation.
   * @param {number} operationId
   */
  public async delete(operationId: number) {
    const operation = await this.operationModel()
      .query()
      .findById(operationId);
    if (!operation) {
      throw new ServiceError(ERRORS.PLANNED_OPERATION_NOT_FOUND);
    }

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.operationModel().query(trx).deleteById(operationId);
    });
  }
}
```

- [ ] **Step 4: Реализовать правку**

Create `packages/server/src/modules/PaymentCalendar/commands/EditPlannedOperation.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PlannedOperation } from '../models/PlannedOperation.model';
import { CommandPlannedOperationValidatorService } from './CommandPlannedOperationValidator.service';
import { EditPlannedOperationDto } from '../dtos/PlannedOperation.dto';
import { ERRORS } from '../constants';

@Injectable()
export class EditPlannedOperationService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandPlannedOperationValidatorService,

    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  /**
   * Edits a planned operation.
   * @param {number} operationId
   * @param {EditPlannedOperationDto} dto
   * @returns {Promise<PlannedOperation>}
   */
  public async edit(
    operationId: number,
    dto: EditPlannedOperationDto,
  ): Promise<PlannedOperation> {
    const existing = await this.operationModel().query().findById(operationId);
    if (!existing) {
      throw new ServiceError(ERRORS.PLANNED_OPERATION_NOT_FOUND);
    }

    await this.validator.validateArticleExists(dto.articleId);
    await this.validator.validateAccountExists(dto.accountId);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      return this.operationModel()
        .query(trx)
        .patchAndFetchById(operationId, { ...dto });
    });
  }
}
```

- [ ] **Step 5: Запустить тест удаления — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar/commands/DeletePlannedOperation.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/modules/PaymentCalendar/commands/EditPlannedOperation.service.ts packages/server/src/modules/PaymentCalendar/commands/DeletePlannedOperation.service.ts packages/server/src/modules/PaymentCalendar/commands/DeletePlannedOperation.service.spec.ts
git commit -m "feat(server): add Edit/Delete PlannedOperation commands"
```
Откат: `git checkout -- packages/server/src/modules/PaymentCalendar/commands/`.

---

## Task A8: Запрос списка плановых операций

**Files:**
- Create: `packages/server/src/modules/PaymentCalendar/queries/GetPlannedOperations.service.ts`
- Test: `packages/server/src/modules/PaymentCalendar/queries/GetPlannedOperations.service.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Create `packages/server/src/modules/PaymentCalendar/queries/GetPlannedOperations.service.spec.ts`:

```ts
import { GetPlannedOperationsService } from './GetPlannedOperations.service';

describe('GetPlannedOperationsService', () => {
  it('returns operations ordered by planned date', async () => {
    const rows = [
      { id: 1, plannedDate: '2026-06-01' },
      { id: 2, plannedDate: '2026-06-05' },
    ];
    const operationModel = () => ({
      query: () => ({ onBuild: () => Promise.resolve(rows) }),
    });

    const service = new GetPlannedOperationsService(operationModel as any);
    const res = await service.getPlannedOperations({});

    expect(res.data).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar/queries/GetPlannedOperations.service.spec.ts`
Expected: FAIL — сервис не найден.

- [ ] **Step 3: Реализовать запрос**

Create `packages/server/src/modules/PaymentCalendar/queries/GetPlannedOperations.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PlannedOperation } from '../models/PlannedOperation.model';
import { GetPlannedOperationsQueryDto } from '../dtos/GetPlannedOperationsQuery.dto';

@Injectable()
export class GetPlannedOperationsService {
  constructor(
    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  /**
   * Retrieves planned operations (optionally filtered).
   * @param {GetPlannedOperationsQueryDto} filterDto
   * @returns {Promise<{ data: PlannedOperation[] }>}
   */
  public async getPlannedOperations(
    filterDto: GetPlannedOperationsQueryDto,
  ): Promise<{ data: PlannedOperation[] }> {
    const data = await this.operationModel()
      .query()
      .onBuild((query) => {
        if (filterDto.direction) {
          query.modify('filterByDirection', filterDto.direction);
        }
        if (filterDto.accountId) {
          query.modify('filterByAccount', filterDto.accountId);
        }
        if (filterDto.fromDate) {
          query.where('plannedDate', '>=', filterDto.fromDate);
        }
        if (filterDto.toDate) {
          query.where('plannedDate', '<=', filterDto.toDate);
        }
        query.orderBy('plannedDate', 'asc');
      });

    return { data };
  }
}
```

> Если stub в Step 1 не совпал с цепочкой `query().onBuild(...)`, выровняйте stub так, чтобы терминальный вызов возвращал `rows`.

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar/queries/GetPlannedOperations.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/PaymentCalendar/queries/GetPlannedOperations.service.ts packages/server/src/modules/PaymentCalendar/queries/GetPlannedOperations.service.spec.ts
git commit -m "feat(server): add GetPlannedOperations query"
```
Откат: `git checkout -- packages/server/src/modules/PaymentCalendar/queries/`.

---

# Part B — Backend: движок прогноза

## Task B1: Чистая функция `expandRecurrence`

**Files:**
- Create: `packages/server/src/modules/PaymentCalendar/utils/expandRecurrence.ts`
- Test: `packages/server/src/modules/PaymentCalendar/utils/expandRecurrence.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Create `packages/server/src/modules/PaymentCalendar/utils/expandRecurrence.spec.ts`:

```ts
import { expandRecurrence } from './expandRecurrence';

describe('expandRecurrence', () => {
  it('expands a monthly rule from the anchor across the horizon', () => {
    const dates = expandRecurrence(
      { frequency: 'monthly', interval: 1 },
      '2026-06-05', // anchor
      '2026-06-01', // range start
      '2026-08-31', // range end
    );
    expect(dates).toEqual(['2026-06-05', '2026-07-05', '2026-08-05']);
  });

  it('stops at the rule end date', () => {
    const dates = expandRecurrence(
      { frequency: 'monthly', interval: 1, endDate: '2026-07-10' },
      '2026-06-05',
      '2026-06-01',
      '2026-12-31',
    );
    expect(dates).toEqual(['2026-06-05', '2026-07-05']);
  });

  it('skips occurrences before the range start', () => {
    const dates = expandRecurrence(
      { frequency: 'weekly', interval: 1 },
      '2026-06-01',
      '2026-06-15',
      '2026-06-30',
    );
    expect(dates).toEqual(['2026-06-15', '2026-06-22', '2026-06-29']);
  });

  it('respects the interval (every 2 weeks)', () => {
    const dates = expandRecurrence(
      { frequency: 'weekly', interval: 2 },
      '2026-06-01',
      '2026-06-01',
      '2026-06-30',
    );
    expect(dates).toEqual(['2026-06-01', '2026-06-15', '2026-06-29']);
  });

  it('returns empty when the anchor is after the range end', () => {
    const dates = expandRecurrence(
      { frequency: 'daily', interval: 1 },
      '2026-09-01',
      '2026-06-01',
      '2026-06-30',
    );
    expect(dates).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar/utils/expandRecurrence.spec.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать функцию**

Create `packages/server/src/modules/PaymentCalendar/utils/expandRecurrence.ts`:

```ts
import moment from 'moment';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  dayOfMonth?: number;
  weekday?: number;
  endDate?: string | null;
}

const UNIT: Record<RecurrenceRule['frequency'], moment.unitOfTime.DurationConstructor> = {
  daily: 'days',
  weekly: 'weeks',
  monthly: 'months',
};

/**
 * Expands a recurrence rule into concrete dates within [rangeStart, rangeEnd].
 * Anchored at `anchorDate` (the operation's planned_date = first occurrence).
 * The occurrence day follows the anchor day (monthly clamps short months).
 * @returns {string[]} ISO dates (YYYY-MM-DD), ascending.
 */
export function expandRecurrence(
  rule: RecurrenceRule,
  anchorDate: string,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const unit = UNIT[rule.frequency];
  const interval = Math.max(1, Number(rule.interval) || 1);

  const end = rule.endDate
    ? moment.min(moment(rangeEnd), moment(rule.endDate))
    : moment(rangeEnd);
  const start = moment(rangeStart);

  const result: string[] = [];
  let cursor = moment(anchorDate);
  let guard = 0;

  while (cursor.isSameOrBefore(end, 'day') && guard < 10000) {
    if (cursor.isSameOrAfter(start, 'day')) {
      result.push(cursor.format('YYYY-MM-DD'));
    }
    cursor = cursor.clone().add(interval, unit);
    guard += 1;
  }

  return result;
}
```

> v1: развёртка «по якорю» (день повторения = день якоря; `moment` клампит короткие месяцы, напр. 31-е → 28/30-е). `dayOfMonth`/`weekday` зарезервированы для будущего уточнения.

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar/utils/expandRecurrence.spec.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/PaymentCalendar/utils/expandRecurrence.ts packages/server/src/modules/PaymentCalendar/utils/expandRecurrence.spec.ts
git commit -m "feat(server): add expandRecurrence pure function"
```
Откат: `git checkout -- packages/server/src/modules/PaymentCalendar/utils/`.

---

## Task B2: Чистая функция `computeRunningBalance` (+ детекция разрыва)

**Files:**
- Create: `packages/server/src/modules/PaymentCalendar/utils/computeRunningBalance.ts`
- Test: `packages/server/src/modules/PaymentCalendar/utils/computeRunningBalance.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Create `packages/server/src/modules/PaymentCalendar/utils/computeRunningBalance.spec.ts`:

```ts
import { computeRunningBalance } from './computeRunningBalance';

describe('computeRunningBalance', () => {
  it('accumulates the balance day by day', () => {
    const res = computeRunningBalance(100, [
      { date: '2026-06-01', inflow: 50, outflow: 0 },
      { date: '2026-06-02', inflow: 0, outflow: 30 },
    ]);
    expect(res.days.map((d) => d.balance)).toEqual([150, 120]);
    expect(res.gap).toBeNull();
  });

  it('detects the first cash gap (balance < 0)', () => {
    const res = computeRunningBalance(100, [
      { date: '2026-06-01', inflow: 0, outflow: 50 },
      { date: '2026-06-02', inflow: 0, outflow: 80 }, // 50 - 80 = -30
      { date: '2026-06-03', inflow: 0, outflow: 10 },
    ]);
    expect(res.gap).toEqual({
      date: '2026-06-02',
      amount: 30,
      daysFromStart: 1,
    });
  });

  it('reports a gap on the very first day', () => {
    const res = computeRunningBalance(0, [
      { date: '2026-06-01', inflow: 0, outflow: 5 },
    ]);
    expect(res.gap).toEqual({
      date: '2026-06-01',
      amount: 5,
      daysFromStart: 0,
    });
  });

  it('avoids float drift (rounds to 3 decimals)', () => {
    const res = computeRunningBalance(0, [
      { date: '2026-06-01', inflow: 0.1, outflow: 0 },
      { date: '2026-06-02', inflow: 0.2, outflow: 0 },
    ]);
    expect(res.days[1].balance).toBe(0.3);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar/utils/computeRunningBalance.spec.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать функцию**

Create `packages/server/src/modules/PaymentCalendar/utils/computeRunningBalance.ts`:

```ts
import {
  CashGap,
  DayBalance,
  DayFlow,
  ForecastResult,
} from '../PaymentCalendar.interfaces';

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Computes the running cash balance per day and detects the first cash gap.
 * @param {number} openingBalance starting balance (base currency)
 * @param {DayFlow[]} flows daily net flows, ascending by date
 * @returns {ForecastResult}
 */
export function computeRunningBalance(
  openingBalance: number,
  flows: DayFlow[],
): ForecastResult {
  let balance = round3(openingBalance);
  const days: DayBalance[] = [];
  let gap: CashGap | null = null;

  flows.forEach((flow, index) => {
    balance = round3(balance + flow.inflow - flow.outflow);
    days.push({ ...flow, balance });

    if (gap === null && balance < 0) {
      gap = {
        date: flow.date,
        amount: round3(Math.abs(balance)),
        daysFromStart: index,
      };
    }
  });

  return { days, gap };
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar/utils/computeRunningBalance.spec.ts`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/PaymentCalendar/utils/computeRunningBalance.ts packages/server/src/modules/PaymentCalendar/utils/computeRunningBalance.spec.ts
git commit -m "feat(server): add computeRunningBalance pure function"
```
Откат: `git checkout -- packages/server/src/modules/PaymentCalendar/utils/`.

---

## Task B3: Сервис прогноза `GetPaymentCalendarForecast`

Оркестратор: собирает 4 источника, конвертирует в базовую валюту, группирует по дням, прогоняет через `computeRunningBalance`.

**Files:**
- Create: `packages/server/src/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service.ts`
- Test: `packages/server/src/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service.spec.ts`

- [ ] **Step 1: Написать падающий тест (оркестрация в базовой валюте)**

Create `packages/server/src/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service.spec.ts`:

```ts
import { GetPaymentCalendarForecastService } from './GetPaymentCalendarForecast.service';

// Все валюты = RUB (база), exchange_rate = 1 → конвертация = тождество.
const accountModel = () => ({
  query: () => ({
    onBuild: () =>
      Promise.resolve([{ id: 12, amount: 100000, currencyCode: 'RUB' }]),
  }),
});
const invoiceModel = () => ({
  query: () => ({
    modify: () => ({
      onBuild: () =>
        Promise.resolve([
          {
            id: 1,
            dueDate: '2026-06-10',
            balance: 200000,
            paymentAmount: 0,
            writtenoffAmount: 0,
            creditedAmount: 0,
            currencyCode: 'RUB',
            exchangeRate: 1,
          },
        ]),
    }),
  }),
});
const billModel = () => ({
  query: () => ({
    modify: () => ({
      onBuild: () =>
        Promise.resolve([
          {
            id: 1,
            dueDate: '2026-06-12',
            amount: 350000,
            paymentAmount: 0,
            creditedAmount: 0,
            currencyCode: 'RUB',
            exchangeRate: 1,
          },
        ]),
    }),
  }),
});
const operationModel = () => ({
  query: () => ({ onBuild: () => Promise.resolve([]) }),
});
const tenancyContext = {
  getTenantMetadata: () => Promise.resolve({ baseCurrency: 'RUB' }),
};
const exchangeRates = {
  latest: () => Promise.resolve({ exchangeRate: 1 }),
};

describe('GetPaymentCalendarForecastService', () => {
  it('combines obligations into a daily forecast and finds the gap', async () => {
    const service = new GetPaymentCalendarForecastService(
      invoiceModel as any,
      billModel as any,
      accountModel as any,
      operationModel as any,
      tenancyContext as any,
      exchangeRates as any,
    );

    const res = await service.getForecast(1, {
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    } as any);

    expect(res.openingBalance).toBe(100000);
    // 10 июня: +200000 → 300000; 12 июня: −350000 → −50000 (разрыв).
    const gapDay = res.days.find((d) => d.date === '2026-06-12');
    expect(gapDay?.balance).toBe(-50000);
    expect(res.gap).toMatchObject({ date: '2026-06-12', amount: 50000 });
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service.spec.ts`
Expected: FAIL — сервис не найден.

- [ ] **Step 3: Реализовать сервис**

Create `packages/server/src/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { isEmpty } from 'lodash';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';
import { Account } from '@/modules/Accounts/models/Account.model';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { ExchangeRatesService } from '@/modules/ExchangeRates/ExchangeRates.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PlannedOperation } from '../models/PlannedOperation.model';
import { GetPaymentCalendarQueryDto } from '../dtos/GetPaymentCalendarQuery.dto';
import {
  DayFlow,
  ForecastLine,
  PaymentCalendarResponse,
} from '../PaymentCalendar.interfaces';
import { computeRunningBalance } from '../utils/computeRunningBalance';
import { expandRecurrence } from '../utils/expandRecurrence';
import { CASH_ACCOUNT_TYPES } from '../constants';

@Injectable()
export class GetPaymentCalendarForecastService {
  constructor(
    @Inject(SaleInvoice.name)
    private readonly saleInvoiceModel: TenantModelProxy<typeof SaleInvoice>,

    @Inject(Bill.name)
    private readonly billModel: TenantModelProxy<typeof Bill>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,

    private readonly tenancyContext: TenancyContext,
    private readonly exchangeRates: ExchangeRatesService,
  ) {}

  /**
   * Builds the payment calendar forecast for the given horizon.
   * @param {number} tenantId
   * @param {GetPaymentCalendarQueryDto} query
   * @returns {Promise<PaymentCalendarResponse>}
   */
  public async getForecast(
    tenantId: number,
    query: GetPaymentCalendarQueryDto,
  ): Promise<PaymentCalendarResponse> {
    const { fromDate, toDate } = query;
    const metadata = await this.tenancyContext.getTenantMetadata();
    const baseCurrency = metadata.baseCurrency;

    const openingBalance = await this.getOpeningBalance(
      tenantId,
      baseCurrency,
      query.accountId,
    );

    const lines: Array<{ date: string } & ForecastLine> = [];

    if (query.direction !== 'outflow') {
      lines.push(...(await this.collectInvoiceInflows(query)));
    }
    if (query.direction !== 'inflow') {
      lines.push(...(await this.collectBillOutflows(query)));
    }
    lines.push(...(await this.collectPlannedLines(tenantId, baseCurrency, query)));

    const flows = this.groupByDay(lines, fromDate, toDate);
    const linesByDay = this.indexLinesByDay(lines);

    const { days, gap } = computeRunningBalance(openingBalance, flows);
    days.forEach((day) => {
      day.lines = linesByDay[day.date] || [];
    });

    return {
      baseCurrency,
      openingBalance,
      fromDate,
      toDate,
      days,
      gap,
    };
  }

  /**
   * Current balance of cash+bank accounts, converted to base currency.
   */
  private async getOpeningBalance(
    tenantId: number,
    baseCurrency: string,
    accountId?: number,
  ): Promise<number> {
    const accounts = await this.accountModel()
      .query()
      .onBuild((q) => {
        q.whereIn('accountType', CASH_ACCOUNT_TYPES as unknown as string[]);
        if (accountId) {
          q.where('id', accountId);
        }
      });

    let total = 0;
    for (const account of accounts) {
      total += await this.toBase(
        tenantId,
        Number(account.amount) || 0,
        account.currencyCode,
        baseCurrency,
      );
    }
    return Math.round(total * 1000) / 1000;
  }

  /**
   * Unpaid sale invoices due within the horizon → inflow lines.
   */
  private async collectInvoiceInflows(
    query: GetPaymentCalendarQueryDto,
  ): Promise<Array<{ date: string } & ForecastLine>> {
    const invoices = await this.saleInvoiceModel()
      .query()
      .modify('dueInvoices')
      .modify('delivered')
      .onBuild((q) => {
        q.where('dueDate', '>=', query.fromDate);
        q.where('dueDate', '<=', query.toDate);
        if (!isEmpty(query.branchesIds)) {
          q.modify('filterByBranches', query.branchesIds);
        }
      });

    return invoices.map((inv: any) => {
      const outstanding =
        Number(inv.balance) -
        Number(inv.paymentAmount || 0) -
        Number(inv.writtenoffAmount || 0) -
        Number(inv.creditedAmount || 0);
      return {
        date: moment(inv.dueDate).format('YYYY-MM-DD'),
        direction: 'inflow' as const,
        amount: Math.round(outstanding * Number(inv.exchangeRate || 1) * 1000) / 1000,
        label: `Счёт №${inv.invoiceNo ?? inv.id}`,
        source: 'invoice' as const,
      };
    });
  }

  /**
   * Unpaid bills due within the horizon → outflow lines.
   */
  private async collectBillOutflows(
    query: GetPaymentCalendarQueryDto,
  ): Promise<Array<{ date: string } & ForecastLine>> {
    const bills = await this.billModel()
      .query()
      .modify('dueBills')
      .onBuild((q) => {
        q.where('dueDate', '>=', query.fromDate);
        q.where('dueDate', '<=', query.toDate);
        if (!isEmpty(query.branchesIds)) {
          q.modify('filterByBranches', query.branchesIds);
        }
      });

    return bills.map((bill: any) => {
      const outstanding =
        Number(bill.amount) -
        Number(bill.paymentAmount || 0) -
        Number(bill.creditedAmount || 0);
      return {
        date: moment(bill.dueDate).format('YYYY-MM-DD'),
        direction: 'outflow' as const,
        amount: Math.round(outstanding * Number(bill.exchangeRate || 1) * 1000) / 1000,
        label: `Счёт поставщика №${bill.billNumber ?? bill.id}`,
        source: 'bill' as const,
      };
    });
  }

  /**
   * Manual + recurring planned operations → lines (recurring expanded).
   */
  private async collectPlannedLines(
    tenantId: number,
    baseCurrency: string,
    query: GetPaymentCalendarQueryDto,
  ): Promise<Array<{ date: string } & ForecastLine>> {
    const operations = await this.operationModel()
      .query()
      .onBuild((q) => {
        q.modify('forecastable');
        q.where('plannedDate', '<=', query.toDate);
        if (query.accountId) q.modify('filterByAccount', query.accountId);
        if (query.direction) q.modify('filterByDirection', query.direction);
        if (!isEmpty(query.branchesIds)) {
          q.whereIn('branchId', query.branchesIds);
        }
      });

    const out: Array<{ date: string } & ForecastLine> = [];
    for (const op of operations) {
      const amountBase = await this.toBase(
        tenantId,
        Number(op.amount),
        op.currencyCode,
        baseCurrency,
      );
      const dates: string[] = op.recurrence
        ? expandRecurrence(
            op.recurrence as any,
            moment(op.plannedDate).format('YYYY-MM-DD'),
            query.fromDate,
            query.toDate,
          )
        : this.withinRange(
            moment(op.plannedDate).format('YYYY-MM-DD'),
            query.fromDate,
            query.toDate,
          );

      dates.forEach((date) => {
        out.push({
          date,
          direction: op.direction as 'inflow' | 'outflow',
          amount: amountBase,
          label: op.description || (op.recurrence ? 'Повтор' : 'Плановая операция'),
          source: op.recurrence ? 'recurring' : 'manual',
        });
      });
    }
    return out;
  }

  /**
   * Converts an amount to base currency via the latest rate (identity if same).
   */
  private async toBase(
    tenantId: number,
    amount: number,
    fromCurrency: string,
    baseCurrency: string,
  ): Promise<number> {
    if (!fromCurrency || fromCurrency === baseCurrency) return amount;
    const { exchangeRate } = await this.exchangeRates.latest(tenantId, {
      fromCurrency,
      toCurrency: baseCurrency,
    } as any);
    return Math.round(amount * Number(exchangeRate || 1) * 1000) / 1000;
  }

  private withinRange(date: string, from: string, to: string): string[] {
    return moment(date).isBetween(from, to, 'day', '[]') ? [date] : [];
  }

  /**
   * Groups lines into one DayFlow per day across the whole horizon.
   */
  private groupByDay(
    lines: Array<{ date: string } & ForecastLine>,
    fromDate: string,
    toDate: string,
  ): DayFlow[] {
    const map = new Map<string, DayFlow>();
    const cursor = moment(fromDate);
    const end = moment(toDate);
    while (cursor.isSameOrBefore(end, 'day')) {
      const key = cursor.format('YYYY-MM-DD');
      map.set(key, { date: key, inflow: 0, outflow: 0 });
      cursor.add(1, 'day');
    }
    lines.forEach((line) => {
      const day = map.get(line.date);
      if (!day) return;
      if (line.direction === 'inflow') day.inflow += line.amount;
      else day.outflow += line.amount;
    });
    return Array.from(map.values());
  }

  private indexLinesByDay(
    lines: Array<{ date: string } & ForecastLine>,
  ): Record<string, ForecastLine[]> {
    return lines.reduce((acc, line) => {
      (acc[line.date] = acc[line.date] || []).push(line);
      return acc;
    }, {} as Record<string, ForecastLine[]>);
  }
}
```

> **Проверьте при реализации фактические имена** свойств модели invoice/bill (`invoiceNo`, `billNumber`, `dueDate`, `writtenoffAmount`) — они приходят из camelCase-маппинга Objection. Подгоните метки/поля под фактические геттеры моделей (разведка подтвердила колонки БД; имена свойств модели сверьте в `SaleInvoice.ts`/`Bill.ts`).
> **Импорт `TenancyContext`** — проверьте точный путь (`@/modules/Tenancy/TenancyContext.service`); если отличается, поправьте по образцу из `ARAgingSummaryRepository.ts`.

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service.spec.ts`
Expected: PASS. Если stub-цепочки не совпали с фактическими вызовами (`.modify().onBuild()`), выровняйте stubs так, чтобы терминальные вызовы возвращали фикстуры.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service.ts packages/server/src/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service.spec.ts
git commit -m "feat(server): add payment calendar forecast engine"
```
Откат: `git checkout -- packages/server/src/modules/PaymentCalendar/queries/`.

---

## Task B4: Application, Controller, Module + регистрация

**Files:**
- Create: `packages/server/src/modules/PaymentCalendar/PaymentCalendar.application.ts`
- Create: `packages/server/src/modules/PaymentCalendar/PaymentCalendar.controller.ts`
- Create: `packages/server/src/modules/PaymentCalendar/PaymentCalendar.module.ts`
- Modify: `packages/server/src/modules/App/App.module.ts`

> Без отдельного unit-теста — проверка через `typecheck` и существующие e2e. Образец проводки модуля — `ManagementArticles.module.ts`/`.controller.ts`/`.application.ts`.

- [ ] **Step 1: Application (фасад)**

Create `packages/server/src/modules/PaymentCalendar/PaymentCalendar.application.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { CreatePlannedOperationService } from './commands/CreatePlannedOperation.service';
import { EditPlannedOperationService } from './commands/EditPlannedOperation.service';
import { DeletePlannedOperationService } from './commands/DeletePlannedOperation.service';
import { GetPlannedOperationsService } from './queries/GetPlannedOperations.service';
import { GetPaymentCalendarForecastService } from './queries/GetPaymentCalendarForecast.service';
import { CreatePlannedOperationDto, EditPlannedOperationDto } from './dtos/PlannedOperation.dto';
import { GetPlannedOperationsQueryDto } from './dtos/GetPlannedOperationsQuery.dto';
import { GetPaymentCalendarQueryDto } from './dtos/GetPaymentCalendarQuery.dto';

@Injectable()
export class PaymentCalendarApplication {
  constructor(
    private readonly createOperationService: CreatePlannedOperationService,
    private readonly editOperationService: EditPlannedOperationService,
    private readonly deleteOperationService: DeletePlannedOperationService,
    private readonly getOperationsService: GetPlannedOperationsService,
    private readonly forecastService: GetPaymentCalendarForecastService,
  ) {}

  public createPlannedOperation(dto: CreatePlannedOperationDto) {
    return this.createOperationService.create(dto);
  }

  public editPlannedOperation(id: number, dto: EditPlannedOperationDto) {
    return this.editOperationService.edit(id, dto);
  }

  public deletePlannedOperation(id: number) {
    return this.deleteOperationService.delete(id);
  }

  public getPlannedOperations(filter: GetPlannedOperationsQueryDto) {
    return this.getOperationsService.getPlannedOperations(filter);
  }

  public getForecast(tenantId: number, query: GetPaymentCalendarQueryDto) {
    return this.forecastService.getForecast(tenantId, query);
  }
}
```

- [ ] **Step 2: Controller**

Create `packages/server/src/modules/PaymentCalendar/PaymentCalendar.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { PaymentCalendarApplication } from './PaymentCalendar.application';
import { CreatePlannedOperationDto, EditPlannedOperationDto } from './dtos/PlannedOperation.dto';
import { GetPlannedOperationsQueryDto } from './dtos/GetPlannedOperationsQuery.dto';
import { GetPaymentCalendarQueryDto } from './dtos/GetPaymentCalendarQuery.dto';

@Controller('payment-calendar')
@ApiTags('payment-calendar')
export class PaymentCalendarController {
  constructor(
    private readonly application: PaymentCalendarApplication,
    private readonly tenancyContext: TenancyContext,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Payment calendar forecast for a horizon.' })
  async getForecast(@Query() query: GetPaymentCalendarQueryDto) {
    const tenantId = this.tenancyContext.getTenantId();
    return this.application.getForecast(tenantId, query);
  }

  @Get('planned-operations')
  @ApiOperation({ summary: 'List planned operations.' })
  getPlannedOperations(@Query() query: GetPlannedOperationsQueryDto) {
    return this.application.getPlannedOperations(query);
  }

  @Post('planned-operations')
  @ApiOperation({ summary: 'Create a planned operation.' })
  createPlannedOperation(@Body() dto: CreatePlannedOperationDto) {
    return this.application.createPlannedOperation(dto);
  }

  @Put('planned-operations/:id')
  @ApiOperation({ summary: 'Edit a planned operation.' })
  editPlannedOperation(
    @Param('id') id: number,
    @Body() dto: EditPlannedOperationDto,
  ) {
    return this.application.editPlannedOperation(id, dto);
  }

  @Delete('planned-operations/:id')
  @ApiOperation({ summary: 'Delete a planned operation.' })
  deletePlannedOperation(@Param('id') id: number) {
    return this.application.deletePlannedOperation(id);
  }
}
```

> Сверьте способ получения tenantId с `ManagementArticles.controller.ts` (метод `tenancyContext.getTenantId()` или декоратор). Используйте тот же паттерн, что в соседних контроллерах.

- [ ] **Step 3: Module**

Create `packages/server/src/modules/PaymentCalendar/PaymentCalendar.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { ExchangeRatesModule } from '@/modules/ExchangeRates/ExchangeRates.module';
import { PaymentCalendarController } from './PaymentCalendar.controller';
import { PaymentCalendarApplication } from './PaymentCalendar.application';
import { CommandPlannedOperationValidatorService } from './commands/CommandPlannedOperationValidator.service';
import { CreatePlannedOperationService } from './commands/CreatePlannedOperation.service';
import { EditPlannedOperationService } from './commands/EditPlannedOperation.service';
import { DeletePlannedOperationService } from './commands/DeletePlannedOperation.service';
import { GetPlannedOperationsService } from './queries/GetPlannedOperations.service';
import { GetPaymentCalendarForecastService } from './queries/GetPaymentCalendarForecast.service';

@Module({
  imports: [TenancyDatabaseModule, ExchangeRatesModule],
  controllers: [PaymentCalendarController],
  providers: [
    PaymentCalendarApplication,
    CommandPlannedOperationValidatorService,
    CreatePlannedOperationService,
    EditPlannedOperationService,
    DeletePlannedOperationService,
    GetPlannedOperationsService,
    GetPaymentCalendarForecastService,
    TenancyContext,
  ],
})
export class PaymentCalendarModule {}
```

> Сверьте imports/providers с `ManagementArticles.module.ts` (как там подключены `TenancyDatabaseModule`/`TenancyContext`/UnitOfWork). Приведите в соответствие. `ExchangeRatesModule` нужен для конвертации валют — проверьте экспорт `ExchangeRatesService`.

- [ ] **Step 4: Зарегистрировать модуль в App**

In `packages/server/src/modules/App/App.module.ts`, добавить импорт и в массив `imports` (рядом с `ManagementArticlesModule`):

```ts
import { PaymentCalendarModule } from '@/modules/PaymentCalendar/PaymentCalendar.module';
```
```ts
    ManagementArticlesModule,
    PaymentCalendarModule,
```

- [ ] **Step 5: Проверка типов**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: без ошибок.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/modules/PaymentCalendar/PaymentCalendar.application.ts packages/server/src/modules/PaymentCalendar/PaymentCalendar.controller.ts packages/server/src/modules/PaymentCalendar/PaymentCalendar.module.ts packages/server/src/modules/App/App.module.ts
git commit -m "feat(server): wire PaymentCalendar application, controller and module"
```
Откат: `git checkout -- <files>`.

---

# Part C — Frontend

## Task C1: i18n-ключи (EN + RU)

**Files:**
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

> Используйте скилл `i18n-add-string` для парного добавления, либо вручную обе пары. Соглашение об именах: `payment_calendar.context.field`.

- [ ] **Step 1: Добавить ключи EN**

In `packages/webapp/src/lang/en/index.json` добавить (в алфавитном месте раздела):

```json
"payment_calendar.page_title": "Payment calendar",
"payment_calendar.add": "Add planned operation",
"payment_calendar.edit": "Edit planned operation",
"payment_calendar.delete": "Delete",
"payment_calendar.delete_confirm": "Delete this planned operation?",
"payment_calendar.horizon.week": "Week",
"payment_calendar.horizon.month": "Month",
"payment_calendar.horizon.quarter": "Quarter",
"payment_calendar.balance": "Balance",
"payment_calendar.gap_warning": "Cash gap in {days} days: {amount}",
"payment_calendar.field.direction": "Type",
"payment_calendar.direction.inflow": "Inflow",
"payment_calendar.direction.outflow": "Outflow",
"payment_calendar.field.amount": "Amount",
"payment_calendar.field.date": "Date",
"payment_calendar.field.article": "Article",
"payment_calendar.field.account": "Account",
"payment_calendar.field.contact": "Contact",
"payment_calendar.field.description": "Note",
"payment_calendar.field.repeat": "Repeat",
"payment_calendar.field.frequency": "Frequency",
"payment_calendar.frequency.daily": "Daily",
"payment_calendar.frequency.weekly": "Weekly",
"payment_calendar.frequency.monthly": "Monthly",
"payment_calendar.field.interval": "Every N",
"payment_calendar.field.end_date": "End date",
"payment_calendar.source.invoice": "Customer invoice",
"payment_calendar.source.bill": "Vendor bill",
"payment_calendar.source.manual": "Manual",
"payment_calendar.source.recurring": "Recurring",
"payment_calendar.save": "Save",
"payment_calendar.cancel": "Cancel",
"payment_calendar.saved": "Planned operation saved",
"payment_calendar.save_error": "Couldn't save the planned operation",
"payment_calendar.error.amount_required": "Enter a positive amount",
"payment_calendar.error.date_required": "Choose a date",
"payment_calendar.error.direction_required": "Choose inflow or outflow"
```

- [ ] **Step 2: Добавить те же ключи RU**

In `packages/webapp/src/lang/ru/index.json`:

```json
"payment_calendar.page_title": "Платёжный календарь",
"payment_calendar.add": "Добавить плановую операцию",
"payment_calendar.edit": "Изменить плановую операцию",
"payment_calendar.delete": "Удалить",
"payment_calendar.delete_confirm": "Удалить эту плановую операцию?",
"payment_calendar.horizon.week": "Неделя",
"payment_calendar.horizon.month": "Месяц",
"payment_calendar.horizon.quarter": "Квартал",
"payment_calendar.balance": "Остаток",
"payment_calendar.gap_warning": "Кассовый разрыв через {days} дн.: {amount}",
"payment_calendar.field.direction": "Тип",
"payment_calendar.direction.inflow": "Поступление",
"payment_calendar.direction.outflow": "Выплата",
"payment_calendar.field.amount": "Сумма",
"payment_calendar.field.date": "Дата",
"payment_calendar.field.article": "Статья",
"payment_calendar.field.account": "Счёт",
"payment_calendar.field.contact": "Контрагент",
"payment_calendar.field.description": "Заметка",
"payment_calendar.field.repeat": "Повторять",
"payment_calendar.field.frequency": "Частота",
"payment_calendar.frequency.daily": "Ежедневно",
"payment_calendar.frequency.weekly": "Еженедельно",
"payment_calendar.frequency.monthly": "Ежемесячно",
"payment_calendar.field.interval": "Каждые N",
"payment_calendar.field.end_date": "Дата окончания",
"payment_calendar.source.invoice": "Счёт покупателю",
"payment_calendar.source.bill": "Счёт поставщику",
"payment_calendar.source.manual": "Вручную",
"payment_calendar.source.recurring": "Повтор",
"payment_calendar.save": "Сохранить",
"payment_calendar.cancel": "Отмена",
"payment_calendar.saved": "Плановая операция сохранена",
"payment_calendar.save_error": "Не удалось сохранить плановую операцию",
"payment_calendar.error.amount_required": "Введите положительную сумму",
"payment_calendar.error.date_required": "Выберите дату",
"payment_calendar.error.direction_required": "Выберите поступление или выплату"
```

- [ ] **Step 3: Проверить парность**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: exit 0, 0 missing, 0 extra.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(webapp): add payment calendar i18n keys (en/ru)"
```
Откат: `git checkout -- packages/webapp/src/lang/`.

---

## Task C2: Query-ключи и React Query хуки

**Files:**
- Modify: `packages/webapp/src/hooks/query/types.tsx`
- Create: `packages/webapp/src/hooks/query/paymentCalendar.tsx`

- [ ] **Step 1: Добавить query-ключи**

In `packages/webapp/src/hooks/query/types.tsx`, рядом с `MANAGEMENT_ARTICLES`:

```ts
const PAYMENT_CALENDAR = {
  PAYMENT_CALENDAR_FORECAST: 'PAYMENT_CALENDAR_FORECAST',
  PLANNED_OPERATIONS: 'PLANNED_OPERATIONS',
  PLANNED_OPERATION: 'PLANNED_OPERATION',
};
```

И в `export default { ... }` добавить `...PAYMENT_CALENDAR,`.

- [ ] **Step 2: Создать хуки**

Create `packages/webapp/src/hooks/query/paymentCalendar.tsx` (по образцу `managementArticles.tsx`):

```tsx
import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

export interface PlannedOperationValues {
  direction: 'inflow' | 'outflow';
  amount: number;
  currencyCode?: string;
  plannedDate: string;
  articleId?: number | null;
  accountId?: number | null;
  branchId?: number | null;
  contactId?: number | null;
  description?: string;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  } | null;
}

export type EditPlannedOperationArgs = [number | string, PlannedOperationValues];

const commonInvalidate = (client: QueryClient) => {
  client.invalidateQueries(t.PAYMENT_CALENDAR_FORECAST);
  client.invalidateQueries(t.PLANNED_OPERATIONS);
  client.invalidateQueries(t.PLANNED_OPERATION);
};

/** Payment calendar forecast for a horizon. */
export function usePaymentCalendar(query?: any, props?: any) {
  return useRequestQuery(
    [t.PAYMENT_CALENDAR_FORECAST, query],
    { method: 'get', url: 'payment-calendar', params: query },
    { select: (res: any) => res.data, defaultData: { days: [], gap: null }, ...props },
  );
}

/** Planned operations list. */
export function usePlannedOperations(query?: any, props?: any) {
  return useRequestQuery(
    [t.PLANNED_OPERATIONS, query],
    { method: 'get', url: 'payment-calendar/planned-operations', params: query },
    { select: (res: any) => res.data.data, defaultData: [], ...props },
  );
}

/** Create a planned operation. */
export function useCreatePlannedOperation(
  props?: UseMutationOptions<any, any, PlannedOperationValues>,
) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();
  return useMutation<any, any, PlannedOperationValues>(
    (values) => apiRequest.post('payment-calendar/planned-operations', values),
    { onSuccess: () => commonInvalidate(client), ...props },
  );
}

/** Edit a planned operation. */
export function useEditPlannedOperation(
  props?: UseMutationOptions<any, any, EditPlannedOperationArgs>,
) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();
  return useMutation<any, any, EditPlannedOperationArgs>(
    ([id, values]) =>
      apiRequest.put(`payment-calendar/planned-operations/${id}`, values),
    { onSuccess: () => commonInvalidate(client), ...props },
  );
}

/** Delete a planned operation. */
export function useDeletePlannedOperation(
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const apiRequest: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (id) => apiRequest.delete(`payment-calendar/planned-operations/${id}`),
    { onSuccess: () => commonInvalidate(client), ...props },
  );
}
```

- [ ] **Step 3: Проверка типов**

Run: `pnpm --filter @bigfin/webapp typecheck` (или `pnpm typecheck` после сборки `shared/`).
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/hooks/query/types.tsx packages/webapp/src/hooks/query/paymentCalendar.tsx
git commit -m "feat(webapp): add payment calendar query hooks"
```
Откат: `git checkout -- packages/webapp/src/hooks/query/`.

---

## Task C3: Zod-схема и модалка плановой операции

**Files:**
- Create: `packages/webapp/src/containers/PaymentCalendar/schemas.ts`
- Create: `packages/webapp/src/containers/PaymentCalendar/PlannedOperationDialog.tsx`

- [ ] **Step 1: Схема**

Create `packages/webapp/src/containers/PaymentCalendar/schemas.ts`:

```ts
import { z } from 'zod';
import intl from 'react-intl-universal';

export const getPlannedOperationSchema = () =>
  z.object({
    direction: z.enum(['inflow', 'outflow'], {
      errorMap: () => ({
        message: intl.get('payment_calendar.error.direction_required'),
      }),
    }),
    amount: z
      .number({ invalid_type_error: intl.get('payment_calendar.error.amount_required') })
      .positive(intl.get('payment_calendar.error.amount_required')),
    plannedDate: z
      .string()
      .min(1, intl.get('payment_calendar.error.date_required')),
    articleId: z.union([z.number(), z.null()]).optional(),
    accountId: z.union([z.number(), z.null()]).optional(),
    contactId: z.union([z.number(), z.null()]).optional(),
    description: z.string().optional(),
    repeat: z.boolean().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    interval: z.number().positive().optional(),
    endDate: z.string().optional(),
  });

export type PlannedOperationFormValues = z.infer<
  ReturnType<typeof getPlannedOperationSchema>
>;

export interface PlannedOperation {
  id: number;
  direction: 'inflow' | 'outflow';
  amount: number;
  plannedDate: string;
  articleId: number | null;
  accountId: number | null;
  contactId: number | null;
  description: string | null;
  recurrence: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  } | null;
}
```

- [ ] **Step 2: Модалка формы**

Create `packages/webapp/src/containers/PaymentCalendar/PlannedOperationDialog.tsx` (паттерн `ArticleForm.tsx`):

```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  getPlannedOperationSchema,
  PlannedOperationFormValues,
  PlannedOperation,
} from './schemas';
import {
  useCreatePlannedOperation,
  useEditPlannedOperation,
} from '@/hooks/query/paymentCalendar';

interface Props {
  operation?: PlannedOperation;
  onDone: () => void;
  onCancel: () => void;
}

export function PlannedOperationDialog({ operation, onDone, onCancel }: Props) {
  const isEdit = !!operation?.id;
  const createMutation = useCreatePlannedOperation({});
  const editMutation = useEditPlannedOperation({});

  const form = useForm<PlannedOperationFormValues>({
    resolver: zodResolver(getPlannedOperationSchema()),
    defaultValues: {
      direction: operation?.direction ?? 'inflow',
      amount: operation?.amount ?? 0,
      plannedDate: operation?.plannedDate ?? '',
      articleId: operation?.articleId ?? null,
      accountId: operation?.accountId ?? null,
      contactId: operation?.contactId ?? null,
      description: operation?.description ?? '',
      repeat: !!operation?.recurrence,
      frequency: operation?.recurrence?.frequency ?? 'monthly',
      interval: operation?.recurrence?.interval ?? 1,
      endDate: operation?.recurrence?.endDate ?? '',
    },
  });

  const repeat = form.watch('repeat');

  const onSubmit = async (values: PlannedOperationFormValues) => {
    const payload = {
      direction: values.direction,
      amount: values.amount,
      plannedDate: values.plannedDate,
      articleId: values.articleId ?? undefined,
      accountId: values.accountId ?? undefined,
      contactId: values.contactId ?? undefined,
      description: values.description || undefined,
      recurrence: values.repeat
        ? {
            frequency: values.frequency ?? 'monthly',
            interval: values.interval ?? 1,
            endDate: values.endDate || undefined,
          }
        : null,
    };
    try {
      if (isEdit && operation) {
        await editMutation.mutateAsync([operation.id, payload]);
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(intl.get('payment_calendar.saved'));
      onDone();
    } catch (e) {
      toast.error(intl.get('payment_calendar.save_error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {intl.get(isEdit ? 'payment_calendar.edit' : 'payment_calendar.add')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('payment_calendar.field.amount')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="plannedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('payment_calendar.field.date')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* direction, articleId, accountId, contactId, description, repeat block
                follow the same FormField pattern; repeat===true reveals
                frequency/interval/endDate fields. */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onCancel}>
                {intl.get('payment_calendar.cancel')}
              </Button>
              <Button type="submit">{intl.get('payment_calendar.save')}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

> **Остальные поля** добавляются теми же `FormField`, что `amount`/`plannedDate` выше. Точный паттерн `Select` внутри `FormField` — взять вербатим из `containers/ManagementArticles/ArticleForm.tsx` (поля `kind`/`parentId`). Конкретно добавить:
> - `direction` — `Select` с двумя опциями `inflow`/`outflow` (метки `payment_calendar.direction.*`).
> - `articleId` — `Select`, опции из `useManagementArticles({}, {})` (как `ArticleForm`).
> - `accountId` — `Select`, опции из `useAccounts({}, {})`, отфильтровать по `account_type ∈ ('cash','bank')`.
> - `contactId` — `Select`, опции из `useContacts({}, {})` (опционально).
> - `description` — `Input`.
> - `repeat` — `Checkbox` из `@/components/ui/checkbox`; при `repeat===true` показать `frequency` (`Select`: daily/weekly/monthly), `interval` (`Input type=number`), `endDate` (`Input type=date`). Метки — `payment_calendar.field.*` / `payment_calendar.frequency.*`.

- [ ] **Step 3: Проверка типов**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/containers/PaymentCalendar/schemas.ts packages/webapp/src/containers/PaymentCalendar/PlannedOperationDialog.tsx
git commit -m "feat(webapp): add planned operation form dialog (RHF + Zod)"
```
Откат: `git checkout -- packages/webapp/src/containers/PaymentCalendar/`.

---

## Task C4: Лента дней и страница календаря

**Files:**
- Create: `packages/webapp/src/containers/PaymentCalendar/DayRow.tsx`
- Create: `packages/webapp/src/containers/PaymentCalendar/PaymentCalendarPage.tsx`

- [ ] **Step 1: Строка дня**

Create `packages/webapp/src/containers/PaymentCalendar/DayRow.tsx`:

```tsx
import React from 'react';
import intl from 'react-intl-universal';

interface ForecastLine {
  direction: 'inflow' | 'outflow';
  amount: number;
  label: string;
  source: string;
}
interface Day {
  date: string;
  balance: number;
  lines?: ForecastLine[];
}

export function DayRow({ day }: { day: Day }) {
  const negative = day.balance < 0;
  return (
    <div className="border-b py-2">
      <div
        className={`flex items-center justify-between px-2 ${
          negative ? 'text-red-600 font-semibold' : ''
        }`}
      >
        <span>{day.date}</span>
        <span>
          {negative ? '🔴 ' : ''}
          {intl.get('payment_calendar.balance')}: {day.balance.toLocaleString('ru-RU')} ₽
        </span>
      </div>
      {(day.lines ?? []).map((line, i) => (
        <div
          key={i}
          className={`flex items-center justify-between px-4 text-sm ${
            line.direction === 'inflow' ? 'text-green-600' : 'text-red-500'
          }`}
        >
          <span>{line.label}</span>
          <span>
            {line.direction === 'inflow' ? '+' : '−'}
            {line.amount.toLocaleString('ru-RU')}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Страница календаря**

Create `packages/webapp/src/containers/PaymentCalendar/PaymentCalendarPage.tsx` (паттерн `ManagementArticlesPage.tsx`):

```tsx
import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useFeatureCan } from '@/hooks/state/feature';
import { usePaymentCalendar } from '@/hooks/query/paymentCalendar';
import { DayRow } from './DayRow';
import { PlannedOperationDialog } from './PlannedOperationDialog';
import { PlannedOperation } from './schemas';

export default function PaymentCalendarPage() {
  const { featureCan } = useFeatureCan();
  const [horizon, setHorizon] = React.useState<'week' | 'month' | 'quarter'>('month');
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<PlannedOperation | undefined>();

  const fromDate = moment().format('YYYY-MM-DD');
  const toDate = moment()
    .add(1, horizon === 'week' ? 'week' : horizon === 'quarter' ? 'quarter' : 'month')
    .format('YYYY-MM-DD');

  const { data } = usePaymentCalendar({ fromDate, toDate }, {});

  if (!featureCan('payment_calendar')) return null;

  const days = data?.days ?? [];
  const gap = data?.gap ?? null;

  return (
    <div className="flex flex-col gap-4 p-6">
      {gap && (
        <div className="sticky top-0 z-10 rounded-md bg-red-50 px-4 py-2 text-red-700">
          ⚠ {intl.get('payment_calendar.gap_warning', {
            days: gap.daysFromStart,
            amount: `${gap.amount.toLocaleString('ru-RU')} ₽`,
          })}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('payment_calendar.page_title')}
        </h1>
        <div className="flex items-center gap-2">
          {(['week', 'month', 'quarter'] as const).map((h) => (
            <Button
              key={h}
              variant={horizon === h ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setHorizon(h)}
            >
              {intl.get(`payment_calendar.horizon.${h}`)}
            </Button>
          ))}
          <Button onClick={() => { setEditing(undefined); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            {intl.get('payment_calendar.add')}
          </Button>
        </div>
      </div>
      {showForm && (
        <PlannedOperationDialog
          key={editing?.id ?? 'new'}
          operation={editing}
          onDone={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}
      <div className="flex flex-col">
        {days.map((day: any) => (
          <DayRow key={day.date} day={day} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Проверка типов**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/containers/PaymentCalendar/DayRow.tsx packages/webapp/src/containers/PaymentCalendar/PaymentCalendarPage.tsx
git commit -m "feat(webapp): add payment calendar feed page and day row"
```
Откат: `git checkout -- packages/webapp/src/containers/PaymentCalendar/`.

---

## Task C5: Маршрут

**Files:**
- Modify: `packages/webapp/src/routes/dashboard.tsx`

- [ ] **Step 1: Показать существующий блок**

Найдите блок маршрута `/management-articles` в `packages/webapp/src/routes/dashboard.tsx` (≈ строки 1253–1262) — используем как образец.

- [ ] **Step 2: Добавить маршрут**

Добавить рядом (после блока `/management-articles`):

```tsx
  // Payment Calendar
  {
    path: `/payment-calendar`,
    component: lazy(
      () => import('@/containers/PaymentCalendar/PaymentCalendarPage'),
    ),
    breadcrumb: intl.get('payment_calendar.page_title'),
    pageTitle: intl.get('payment_calendar.page_title'),
    subscriptionActive: [SUBSCRIPTION_TYPE.MAIN],
  },
```

- [ ] **Step 3: Проверка типов**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/routes/dashboard.tsx
git commit -m "feat(webapp): register payment calendar route"
```
Откат: `git checkout -- packages/webapp/src/routes/dashboard.tsx`.

---

# Финальная проверка (после всех тасков)

- [ ] **Серверные тесты:** `pnpm --filter @bigfin/server test -- src/modules/PaymentCalendar` — все зелёные.
- [ ] **Типы:** `pnpm typecheck` (сначала собрать `shared/`) — 0 ошибок.
- [ ] **Парность langs:** `node packages/webapp/scripts/lang-check.js` — exit 0.
- [ ] **Миграция:** `pnpm tenants:migrate:latest && pnpm tenants:migrate:rollback && pnpm tenants:migrate:latest` — без ошибок.
- [ ] **e2e на `en` (Playwright)** — зелёные (обязательное условие мерджа).
- [ ] **Регрессия согласованности (ручная):** сумма ожидаемых поступлений календаря на дату == дебиторка из AR-aging на ту же дату.
- [ ] **Ручная проверка на `ru` + dogfooding** — чек-лист в PR-описании.
- [ ] Флаг `payment_calendar` остаётся `false` по умолчанию — включается только для тестовых организаций.

---

## Открытые вопросы, перенесённые из спеки (решить при исполнении)

1. **Просроченные обязательства** (`due_date < fromDate`) в v1 НЕ попадают в горизонт календаря (показаны в AR/AP-aging). Если по dogfooding нужно — добавить «корзину просроченных» на день `fromDate`.
2. **Стартовый остаток при фильтре по направлению** берётся по счёту целиком (деньги на счёте общие), фильтр по `branchesIds` применяется только к строкам обязательств/операций.
3. **Имена свойств модели** invoice/bill (`invoiceNo`/`billNumber`/`dueDate`/`writtenoffAmount`) — сверить с фактическими геттерами `SaleInvoice.ts`/`Bill.ts` при реализации Task B3.
4. **Точные пути/паттерны** `TenancyContext`, `UnitOfWork`, проводки модуля — сверить с `ManagementArticles.module.ts` (свежий образец того же стиля).
5. **UI-фильтры по счёту и направлению** (спека §3). Бэкенд их уже принимает (`accountId`/`branchesIds`/`direction` в `GetPaymentCalendarQueryDto`), но страница (Task C4) в v1 рендерит только переключатель горизонта. Дропдауны «счёт»/«направление»/«приход-расход» — небольшой follow-up внутри этого этапа (добавить контролы и прокинуть в `usePaymentCalendar({ fromDate, toDate, accountId, direction, branchesIds })`). Не блокирует критерии приёмки §10.
