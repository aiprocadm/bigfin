# Бюджеты и план-факт — Этапы 2+3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Построить бюджеты (БДиР/БДДС со сценариями опт/реал/пес, сетка статьи×месяцы) и отчёт план-факт по статьям для обоих видов, за feature-флагом `budgets` (по умолчанию выключен).

**Architecture:** Две новые tenant-таблицы `budgets`/`budget_lines` (UNIQUE по `budget_id,article_id,period,scenario` = ячейка сетки → сохранение через upsert). План-факт: план из `budget_lines`; факт БДиР — переиспользуем готовый `ArticlesPlRollupService` (Этап 0); факт БДДС — новый `ArticlesCashflowRollupService` = та же свёртка «счёт→статья», но по проводкам, **кассово-расчётным** (reference касался денежного счёта, не перевод). Чистые функции свёртки (`foldAccountsIntoArticles`, `rollupAmountsToAncestors`) переиспользуются из Этапа 0.

**Tech Stack:** NestJS 10 + Objection/Knex (tenant-миграции), Jest (unit). Frontend — React 18, shadcn `components/ui`, React Hook Form + Zod, React Query v3. i18n: `react-intl-universal` (web) + `nestjs-i18n` (server).

**Spec:** [2026-05-31-budgets-design.md](../specs/2026-05-31-budgets-design.md)

---

## Pre-flight (читать до старта)

**Гейтинг.** Реализация — **после Ф1 роадмапа** (① русификация, ③ режимы) и после Этапа 1 (календарь). План написан заранее. Флаг `budgets` по умолчанию `false`.

**Окружение.** Node 18.16.1, только `pnpm`. Локальный backend не поднят — сервер проверяем через `pnpm --filter @bigfin/server test` и `pnpm typecheck`; фронт — `pnpm typecheck` + `pnpm dev:webapp`. SDK-типы — в CI.

**Правила основателя.** Перед правкой существующего файла — показать фрагмент. Маленькие шаги, пауза после таска. После каждого таска — проверка + откат. Удалений нет (всё additive).

**Миграции.** Только additive, рабочий `down()`, прогон `latest → rollback → latest`. Через скилл `make-migration`. Timestamp-образцы `20260531…` — заменить фактическими.

**i18n.** Строки экрана — `intl.get`/`<T id=.../>`; Zod-сообщения — через `intl.get`; парность EN↔RU; после правок — `node packages/webapp/scripts/lang-check.js`. Скилл `i18n-add-string`.

**Зависимость от Этапа 0 (важно).** Свёртка переиспользует чистые функции `foldAccountsIntoArticles`, `rollupAmountsToAncestors` и `accountNet` — те, что импортирует `packages/server/src/modules/ManagementArticles/queries/ArticlesPlRollup.service.ts`. **При реализации сверьте точный путь импорта** в этом файле и импортируйте оттуда же. `ArticlesPlRollupService` — `@Injectable`, инжектируется напрямую.

**Бренд.** Везде только `Bigfin`.

---

## File Structure

**Backend — новый модуль `packages/server/src/modules/Budgets/`:**

| Файл | Ответственность |
|---|---|
| `models/Budget.model.ts`, `models/BudgetLine.model.ts` | Objection-модели |
| `constants.ts` | `ERRORS`, `BUDGET_TYPES`, `SCENARIOS`, `CASH_ACCOUNT_TYPES`, `TRANSFER_TYPES` |
| `Budgets.interfaces.ts` | Интерфейсы сетки и план-факта |
| `dtos/Budget.dto.ts` | Create/Edit бюджета |
| `dtos/UpsertBudgetLines.dto.ts` | Массовый upsert ячеек |
| `dtos/GetBudgetPlanFactQuery.dto.ts` | Фильтр план-факта (extends `FinancialSheetBranchesQueryDto`) |
| `utils/computeVariance.ts` | Чистая функция отклонения план/факт |
| `utils/cashSettledReferenceKeys.ts` | Чистый отбор кассово-расчётных reference (без переводов) |
| `commands/CommandBudgetValidator.service.ts` | Валидация типа/года/сценария/статей |
| `commands/CreateBudget.service.ts` / `EditBudget.service.ts` / `DeleteBudget.service.ts` | CRUD бюджета |
| `commands/UpsertBudgetLines.service.ts` | Сохранение сетки (upsert) |
| `queries/GetBudgets.service.ts` / `GetBudget.service.ts` | Список / сетка одного бюджета |
| `queries/ArticlesCashflowRollup.service.ts` | Кассовый факт по статьям (БДДС) |
| `queries/GetBudgetPlanFact.service.ts` | План-факт (план + факт + отклонение) |
| `Budgets.application.ts` / `.controller.ts` / `.module.ts` | Фасад / REST / модуль |

**Backend — точечные правки:**

| Файл | Правка |
|---|---|
| `packages/server/src/common/types/Features.ts` | + `BUDGETS = 'budgets'` |
| `packages/server/src/modules/Features/FeaturesConfigure.ts` | + запись `{ name: Features.BUDGETS, defaultValue: false }` |
| `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts` | + `Budget`, `BudgetLine` |
| `packages/server/src/modules/App/App.module.ts` | + `BudgetsModule` |

**Backend — миграции:**

| Файл | |
|---|---|
| `…_create_budgets_table.ts` | Таблица бюджетов |
| `…_create_budget_lines_table.ts` | Таблица строк бюджета |

**Frontend — `packages/webapp/src/`:**

| Файл | |
|---|---|
| `hooks/query/budgets.tsx` + `hooks/query/types.tsx` | Хуки + ключи |
| `containers/Budgets/BudgetsPage.tsx` | Список бюджетов |
| `containers/Budgets/BudgetGrid.tsx` | Сетка ввода |
| `containers/Budgets/BudgetPlanFact.tsx` | Экран план-факт |
| `containers/Budgets/BudgetFormDialog.tsx` + `schemas.ts` | Создание/правка бюджета |
| `routes/dashboard.tsx`, `lang/{en,ru}/index.json` | Маршруты + i18n |

---

# Part A — Backend: бюджеты (CRUD + сетка)

## Task A1: Feature-флаг `budgets`

**Files:**
- Modify: `packages/server/src/common/types/Features.ts`
- Modify: `packages/server/src/modules/Features/FeaturesConfigure.ts`
- Test: `packages/server/src/modules/Features/FeaturesConfigure.budgets.spec.ts` (create)

- [ ] **Step 1: Падающий тест**

Create `packages/server/src/modules/Features/FeaturesConfigure.budgets.spec.ts`:

```ts
import { ConfigService } from '@nestjs/config';
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure — budgets', () => {
  const build = () =>
    new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);

  it('registers the budgets feature, default off', () => {
    const flag = build()
      .getConfigure()
      .find((f) => f.name === Features.BUDGETS);
    expect(flag).toBeDefined();
    expect(flag?.defaultValue).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `pnpm --filter @bigfin/server test -- src/modules/Features/FeaturesConfigure.budgets.spec.ts`
Expected: FAIL — `Features.BUDGETS` не существует.

- [ ] **Step 3: Добавить enum**

In `packages/server/src/common/types/Features.ts` (после `PAYMENT_CALENDAR`):

```ts
  PAYMENT_CALENDAR = 'payment_calendar',
  BUDGETS = 'budgets',
}
```

- [ ] **Step 4: Зарегистрировать**

In `packages/server/src/modules/Features/FeaturesConfigure.ts` (после записи `PAYMENT_CALENDAR`):

```ts
      {
        name: Features.PAYMENT_CALENDAR,
        defaultValue: false,
      },
      {
        name: Features.BUDGETS,
        defaultValue: false,
      },
    ];
  }
}
```

- [ ] **Step 5: Запустить — PASS**

Run: `pnpm --filter @bigfin/server test -- src/modules/Features/FeaturesConfigure.budgets.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/common/types/Features.ts packages/server/src/modules/Features/FeaturesConfigure.ts packages/server/src/modules/Features/FeaturesConfigure.budgets.spec.ts
git commit -m "feat(server): add budgets feature flag (default off)"
```
Откат: `git checkout -- <files>`.

---

## Task A2: Миграции `budgets` и `budget_lines`

**Files:**
- Create: `packages/server/src/database/tenant/migrations/20260531130000_create_budgets_table.ts`
- Create: `packages/server/src/database/tenant/migrations/20260531130100_create_budget_lines_table.ts`

- [ ] **Step 1: Создать миграции через скилл**

Скилл `make-migration` (схема **tenant**), имена `create_budgets_table`, затем `create_budget_lines_table`.

- [ ] **Step 2: Заполнить `budgets`**

```ts
exports.up = (knex) => {
  return knex.schema.createTable('budgets', (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.string('type').notNullable().index(); // 'bdir' | 'bdds'
    table.integer('fiscal_year').notNullable().index();
    table.string('period_granularity').notNullable().defaultTo('month');
    table.string('active_scenario').notNullable().defaultTo('realistic');
    table.integer('branch_id').unsigned().nullable();
    table.timestamps();
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('budgets');
```

- [ ] **Step 3: Заполнить `budget_lines`**

```ts
exports.up = (knex) => {
  return knex.schema.createTable('budget_lines', (table) => {
    table.increments('id');
    table
      .integer('budget_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('budgets')
      .onDelete('CASCADE');
    table
      .integer('article_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('management_articles');
    table.date('period').notNullable(); // first day of month
    table.string('scenario').notNullable().defaultTo('realistic');
    table.decimal('planned_amount', 13, 3).notNullable().defaultTo(0);
    table.timestamps();

    table.unique(['budget_id', 'article_id', 'period', 'scenario']);
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('budget_lines');
```

- [ ] **Step 4: Прогнать в обе стороны**

Run:
```bash
pnpm tenants:migrate:latest
pnpm tenants:migrate:rollback
pnpm tenants:migrate:latest
```
Expected: без ошибок; обе таблицы создаются → удаляются → создаются. (rollback удаляет `budget_lines` раньше `budgets` — порядок по timestamp обратный, FK не мешает.)

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/database/tenant/migrations/*_create_budgets_table.ts packages/server/src/database/tenant/migrations/*_create_budget_lines_table.ts
git commit -m "feat(server): add budgets and budget_lines tenant migrations"
```
Откат: `pnpm tenants:migrate:rollback` (дважды), затем `git checkout -- <files>`.

---

## Task A3: Константы, модели, регистрация

**Files:**
- Create: `packages/server/src/modules/Budgets/constants.ts`
- Create: `packages/server/src/modules/Budgets/models/Budget.model.ts`
- Create: `packages/server/src/modules/Budgets/models/BudgetLine.model.ts`
- Modify: `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts`

- [ ] **Step 1: Константы**

Create `packages/server/src/modules/Budgets/constants.ts`:

```ts
// eslint-disable-next-line import/prefer-default-export
export const ERRORS = {
  BUDGET_NOT_FOUND: 'BUDGET_NOT_FOUND',
  INVALID_BUDGET_TYPE: 'INVALID_BUDGET_TYPE',
  INVALID_SCENARIO: 'INVALID_SCENARIO',
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
};

export const BUDGET_TYPES = ['bdir', 'bdds'] as const;
export const SCENARIOS = ['optimistic', 'realistic', 'pessimistic'] as const;

// Денежные счета для кассового факта.
export const CASH_ACCOUNT_TYPES = ['cash', 'bank'] as const;

// Типы переводов между своими счетами — исключаются из кассового факта.
export const TRANSFER_TYPES = ['TransferToAccount', 'TransferFromAccount'] as const;
```

- [ ] **Step 2: Модель `Budget`**

Create `packages/server/src/modules/Budgets/models/Budget.model.ts`:

```ts
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class Budget extends TenantBaseModel {
  name!: string;
  type!: string;
  fiscalYear!: number;
  periodGranularity!: string;
  activeScenario!: string;
  branchId!: number | null;

  static get tableName() {
    return 'budgets';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const { BudgetLine } = require('./BudgetLine.model');
    return {
      lines: {
        relation: Model.HasManyRelation,
        modelClass: BudgetLine,
        join: { from: 'budgets.id', to: 'budget_lines.budgetId' },
      },
    };
  }
}
```

- [ ] **Step 3: Модель `BudgetLine`**

Create `packages/server/src/modules/Budgets/models/BudgetLine.model.ts`:

```ts
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class BudgetLine extends TenantBaseModel {
  budgetId!: number;
  articleId!: number;
  period!: Date | string;
  scenario!: string;
  plannedAmount!: number;

  static get tableName() {
    return 'budget_lines';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get modifiers() {
    return {
      forBudgetScenario(query, budgetId: number, scenario: string) {
        query.where('budgetId', budgetId).where('scenario', scenario);
      },
    };
  }
}
```

- [ ] **Step 4: Зарегистрировать в Tenancy**

In `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts`:

```ts
import { Budget } from '@/modules/Budgets/models/Budget.model';
import { BudgetLine } from '@/modules/Budgets/models/BudgetLine.model';
```

В массив `models` (рядом с `PlannedOperation`, перед `TenantUser`):

```ts
  PlannedOperation,
  Budget,
  BudgetLine,
  TenantUser,
];
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: без ошибок.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/modules/Budgets/constants.ts packages/server/src/modules/Budgets/models/ packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts
git commit -m "feat(server): add Budget/BudgetLine models and register in tenancy"
```
Откат: `git checkout -- <files>`.

---

## Task A4: Интерфейсы и DTO

**Files:**
- Create: `packages/server/src/modules/Budgets/Budgets.interfaces.ts`
- Create: `packages/server/src/modules/Budgets/dtos/Budget.dto.ts`
- Create: `packages/server/src/modules/Budgets/dtos/UpsertBudgetLines.dto.ts`
- Create: `packages/server/src/modules/Budgets/dtos/GetBudgetPlanFactQuery.dto.ts`

- [ ] **Step 1: Интерфейсы**

Create `packages/server/src/modules/Budgets/Budgets.interfaces.ts`:

```ts
/** Одна ячейка сетки бюджета. */
export interface BudgetCell {
  articleId: number;
  period: string; // YYYY-MM-01
  scenario: string;
  plannedAmount: number;
}

/** Строка план-факта по статье. */
export interface PlanFactRow {
  articleId: number;
  name: string;
  kind: string;
  plan: number;
  fact: number;
  varianceAbs: number; // факт − план
  variancePct: number | null; // null если план = 0
}

export interface PlanFactResponse {
  budgetId: number;
  type: string;
  scenario: string;
  period: string;
  rows: PlanFactRow[];
}
```

- [ ] **Step 2: Budget DTO**

Create `packages/server/src/modules/Budgets/dtos/Budget.dto.ts`:

```ts
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { BUDGET_TYPES, SCENARIOS } from '../constants';

class CommandBudgetDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Бюджет 2026', description: 'Budget name' })
  name: string;

  @IsString()
  @IsIn(BUDGET_TYPES as unknown as string[])
  @ApiProperty({ enum: BUDGET_TYPES, example: 'bdir' })
  type: string;

  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 2026, description: 'Fiscal year' })
  fiscalYear: number;

  @IsString()
  @IsIn(SCENARIOS as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: SCENARIOS, example: 'realistic' })
  activeScenario?: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Branch id (optional)' })
  branchId?: number;
}

export class CreateBudgetDto extends CommandBudgetDto {}
export class EditBudgetDto extends CommandBudgetDto {}
```

- [ ] **Step 3: UpsertBudgetLines DTO**

Create `packages/server/src/modules/Budgets/dtos/UpsertBudgetLines.dto.ts`:

```ts
import { ToNumber } from '@/common/decorators/Validators';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { SCENARIOS } from '../constants';

class BudgetLineInputDto {
  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 3, description: 'Article id' })
  articleId: number;

  @IsDateString()
  @ApiProperty({ example: '2026-03-01', description: 'Period (first day of month)' })
  period: string;

  @IsIn(SCENARIOS as unknown as string[])
  @ApiProperty({ enum: SCENARIOS, example: 'realistic' })
  scenario: string;

  @ToNumber()
  @IsNumber()
  @ApiProperty({ example: 150000, description: 'Planned amount' })
  plannedAmount: number;
}

export class UpsertBudgetLinesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetLineInputDto)
  @ApiProperty({ type: [BudgetLineInputDto] })
  lines: BudgetLineInputDto[];
}

export { BudgetLineInputDto };
```

- [ ] **Step 4: PlanFact query DTO**

Create `packages/server/src/modules/Budgets/dtos/GetBudgetPlanFactQuery.dto.ts`:

```ts
import { IsOptional } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsString } from 'class-validator';
import { FinancialSheetBranchesQueryDto } from '@/modules/FinancialStatements/dtos/FinancialSheetBranchesQuery.dto';
import { SCENARIOS } from '../constants';

export class GetBudgetPlanFactQueryDto extends FinancialSheetBranchesQueryDto {
  @IsDateString()
  @ApiProperty({ example: '2026-03-01', description: 'Period start (month)' })
  fromDate: string;

  @IsDateString()
  @ApiProperty({ example: '2026-03-31', description: 'Period end (month)' })
  toDate: string;

  @IsString()
  @IsIn(SCENARIOS as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: SCENARIOS, example: 'realistic' })
  scenario?: string;
}
```

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: без ошибок.

```bash
git add packages/server/src/modules/Budgets/Budgets.interfaces.ts packages/server/src/modules/Budgets/dtos/
git commit -m "feat(server): add Budgets interfaces and DTOs"
```
Откат: `git checkout -- packages/server/src/modules/Budgets/`.

---

## Task A5: Валидатор бюджета

**Files:**
- Create: `packages/server/src/modules/Budgets/commands/CommandBudgetValidator.service.ts`
- Test: `packages/server/src/modules/Budgets/commands/CommandBudgetValidator.service.spec.ts`

- [ ] **Step 1: Падающий тест**

Create `packages/server/src/modules/Budgets/commands/CommandBudgetValidator.service.spec.ts`:

```ts
import { ServiceError } from '@/modules/Items/ServiceError';
import { CommandBudgetValidatorService } from './CommandBudgetValidator.service';
import { ERRORS } from '../constants';

const budgetModelStub = (found: any) => () => ({
  query: () => ({ findById: () => Promise.resolve(found) }),
});

describe('CommandBudgetValidatorService', () => {
  it('throws when the budget does not exist', async () => {
    const service = new CommandBudgetValidatorService(budgetModelStub(null) as any);
    await expect(service.validateBudgetExists(99)).rejects.toMatchObject({
      errorType: ERRORS.BUDGET_NOT_FOUND,
    });
  });

  it('passes when the budget exists', async () => {
    const service = new CommandBudgetValidatorService(
      budgetModelStub({ id: 1 }) as any,
    );
    await expect(service.validateBudgetExists(1)).resolves.toMatchObject({ id: 1 });
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/commands/CommandBudgetValidator.service.spec.ts`
Expected: FAIL — сервис не найден.

- [ ] **Step 3: Реализовать**

Create `packages/server/src/modules/Budgets/commands/CommandBudgetValidator.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Budget } from '../models/Budget.model';
import { ERRORS } from '../constants';

@Injectable()
export class CommandBudgetValidatorService {
  constructor(
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,
  ) {}

  /**
   * Validates the budget exists and returns it.
   * @param {number} budgetId
   * @returns {Promise<Budget>}
   */
  public async validateBudgetExists(budgetId: number): Promise<Budget> {
    const budget = await this.budgetModel().query().findById(budgetId);
    if (!budget) {
      throw new ServiceError(ERRORS.BUDGET_NOT_FOUND);
    }
    return budget;
  }
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/commands/CommandBudgetValidator.service.spec.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Budgets/commands/CommandBudgetValidator.service.ts packages/server/src/modules/Budgets/commands/CommandBudgetValidator.service.spec.ts
git commit -m "feat(server): add Budget command validator"
```
Откат: `git checkout -- packages/server/src/modules/Budgets/commands/`.

---

## Task A6: Команды CRUD бюджета

**Files:**
- Create: `packages/server/src/modules/Budgets/commands/CreateBudget.service.ts`
- Create: `packages/server/src/modules/Budgets/commands/EditBudget.service.ts`
- Create: `packages/server/src/modules/Budgets/commands/DeleteBudget.service.ts`
- Test: `packages/server/src/modules/Budgets/commands/CreateBudget.service.spec.ts`

- [ ] **Step 1: Падающий тест на создание**

Create `packages/server/src/modules/Budgets/commands/CreateBudget.service.spec.ts`:

```ts
import { CreateBudgetService } from './CreateBudget.service';

describe('CreateBudgetService', () => {
  it('inserts the budget inside a transaction', async () => {
    const inserted = { id: 1, name: 'Бюджет 2026', type: 'bdir' };
    const insert = jest.fn().mockResolvedValue(inserted);
    const budgetModel = () => ({ query: () => ({ insert }) });
    const uow = { withTransaction: (cb: any) => cb({}) };

    const service = new CreateBudgetService(uow as any, budgetModel as any);
    const result = await service.create({
      name: 'Бюджет 2026',
      type: 'bdir',
      fiscalYear: 2026,
    } as any);

    expect(insert).toHaveBeenCalled();
    expect(result).toEqual(inserted);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/commands/CreateBudget.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать CreateBudget**

Create `packages/server/src/modules/Budgets/commands/CreateBudget.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Budget } from '../models/Budget.model';
import { CreateBudgetDto } from '../dtos/Budget.dto';

@Injectable()
export class CreateBudgetService {
  constructor(
    private readonly uow: UnitOfWork,
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,
  ) {}

  /**
   * Creates a budget.
   * @param {CreateBudgetDto} dto
   * @returns {Promise<Budget>}
   */
  public async create(dto: CreateBudgetDto): Promise<Budget> {
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      return this.budgetModel()
        .query(trx)
        .insert({ ...dto, activeScenario: dto.activeScenario || 'realistic' });
    });
  }
}
```

- [ ] **Step 4: Реализовать EditBudget**

Create `packages/server/src/modules/Budgets/commands/EditBudget.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Budget } from '../models/Budget.model';
import { EditBudgetDto } from '../dtos/Budget.dto';
import { ERRORS } from '../constants';

@Injectable()
export class EditBudgetService {
  constructor(
    private readonly uow: UnitOfWork,
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,
  ) {}

  /**
   * Edits a budget.
   * @param {number} budgetId
   * @param {EditBudgetDto} dto
   * @returns {Promise<Budget>}
   */
  public async edit(budgetId: number, dto: EditBudgetDto): Promise<Budget> {
    const existing = await this.budgetModel().query().findById(budgetId);
    if (!existing) {
      throw new ServiceError(ERRORS.BUDGET_NOT_FOUND);
    }
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      return this.budgetModel().query(trx).patchAndFetchById(budgetId, { ...dto });
    });
  }
}
```

- [ ] **Step 5: Реализовать DeleteBudget**

Create `packages/server/src/modules/Budgets/commands/DeleteBudget.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Budget } from '../models/Budget.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteBudgetService {
  constructor(
    private readonly uow: UnitOfWork,
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,
  ) {}

  /**
   * Deletes a budget (its lines cascade via FK ON DELETE CASCADE).
   * @param {number} budgetId
   */
  public async delete(budgetId: number) {
    const budget = await this.budgetModel().query().findById(budgetId);
    if (!budget) {
      throw new ServiceError(ERRORS.BUDGET_NOT_FOUND);
    }
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.budgetModel().query(trx).deleteById(budgetId);
    });
  }
}
```

- [ ] **Step 6: Запустить — PASS**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/commands/CreateBudget.service.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/modules/Budgets/commands/CreateBudget.service.ts packages/server/src/modules/Budgets/commands/EditBudget.service.ts packages/server/src/modules/Budgets/commands/DeleteBudget.service.ts packages/server/src/modules/Budgets/commands/CreateBudget.service.spec.ts
git commit -m "feat(server): add Budget CRUD commands"
```
Откат: `git checkout -- packages/server/src/modules/Budgets/commands/`.

---

## Task A7: Сохранение сетки (`UpsertBudgetLines`)

**Files:**
- Create: `packages/server/src/modules/Budgets/commands/UpsertBudgetLines.service.ts`
- Test: `packages/server/src/modules/Budgets/commands/UpsertBudgetLines.service.spec.ts`

- [ ] **Step 1: Падающий тест**

Create `packages/server/src/modules/Budgets/commands/UpsertBudgetLines.service.spec.ts`:

```ts
import { UpsertBudgetLinesService } from './UpsertBudgetLines.service';

describe('UpsertBudgetLinesService', () => {
  it('upserts each line by the unique cell key', async () => {
    const insert = jest.fn().mockResolvedValue([]);
    const onConflict = jest.fn().mockReturnValue({ merge: jest.fn().mockResolvedValue([]) });
    const lineModel = () => ({ query: () => ({ insert, onConflict }) });
    const validator = { validateBudgetExists: jest.fn().mockResolvedValue({ id: 1 }) };
    const uow = { withTransaction: (cb: any) => cb({}) };

    const service = new UpsertBudgetLinesService(
      uow as any,
      validator as any,
      lineModel as any,
    );

    await service.upsert(1, {
      lines: [
        { articleId: 3, period: '2026-03-01', scenario: 'realistic', plannedAmount: 150000 },
      ],
    } as any);

    expect(validator.validateBudgetExists).toHaveBeenCalledWith(1);
    expect(insert).toHaveBeenCalled();
    expect(onConflict).toHaveBeenCalledWith(['budgetId', 'articleId', 'period', 'scenario']);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/commands/UpsertBudgetLines.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

Create `packages/server/src/modules/Budgets/commands/UpsertBudgetLines.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { BudgetLine } from '../models/BudgetLine.model';
import { CommandBudgetValidatorService } from './CommandBudgetValidator.service';
import { UpsertBudgetLinesDto } from '../dtos/UpsertBudgetLines.dto';

@Injectable()
export class UpsertBudgetLinesService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandBudgetValidatorService,
    @Inject(BudgetLine.name)
    private readonly lineModel: TenantModelProxy<typeof BudgetLine>,
  ) {}

  /**
   * Upserts budget cells by the unique key (budgetId, articleId, period, scenario).
   * @param {number} budgetId
   * @param {UpsertBudgetLinesDto} dto
   */
  public async upsert(budgetId: number, dto: UpsertBudgetLinesDto) {
    await this.validator.validateBudgetExists(budgetId);

    const rows = dto.lines.map((l) => ({
      budgetId,
      articleId: l.articleId,
      period: l.period,
      scenario: l.scenario,
      plannedAmount: l.plannedAmount,
    }));

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      if (rows.length === 0) return [];
      return this.lineModel()
        .query(trx)
        .insert(rows)
        .onConflict(['budgetId', 'articleId', 'period', 'scenario'])
        .merge(['plannedAmount', 'updatedAt']);
    });
  }
}
```

> `onConflict(...).merge(...)` — PostgreSQL upsert через Objection/Knex. **Два момента сверить в коде перед реализацией:** (1) поддерживает ли используемая версия Objection `.merge()` после `.insert()` (поищите существующий `onConflict` в server); если нет — ручной select-then-insert/patch в цикле внутри транзакции. (2) **Регистр имён колонок в `onConflict`:** Knex обычно ждёт имена столбцов БД (`snake_case`: `['budget_id','article_id','period','scenario']`), а не свойства модели (`camelCase`). Сверьте с существующими `onConflict` в кодовой базе и приведите И тест (Step 1), И реализацию к фактически работающему варианту — суть теста (upsert по уникальному ключу ячейки) сохраняется.

- [ ] **Step 4: Запустить — PASS**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/commands/UpsertBudgetLines.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Budgets/commands/UpsertBudgetLines.service.ts packages/server/src/modules/Budgets/commands/UpsertBudgetLines.service.spec.ts
git commit -m "feat(server): add UpsertBudgetLines (grid save) command"
```
Откат: `git checkout -- packages/server/src/modules/Budgets/commands/`.

---

## Task A8: Запросы списка и сетки

**Files:**
- Create: `packages/server/src/modules/Budgets/queries/GetBudgets.service.ts`
- Create: `packages/server/src/modules/Budgets/queries/GetBudget.service.ts`
- Test: `packages/server/src/modules/Budgets/queries/GetBudget.service.spec.ts`

- [ ] **Step 1: Падающий тест (сетка одного бюджета)**

Create `packages/server/src/modules/Budgets/queries/GetBudget.service.spec.ts`:

```ts
import { GetBudgetService } from './GetBudget.service';

describe('GetBudgetService', () => {
  it('returns the budget with its lines', async () => {
    const budget = { id: 1, name: 'Бюджет 2026', type: 'bdir' };
    const budgetModel = () => ({
      query: () => ({
        findById: () => ({
          withGraphFetched: () => Promise.resolve({ ...budget, lines: [{ id: 9 }] }),
        }),
      }),
    });
    const service = new GetBudgetService(budgetModel as any);
    const res = await service.getBudget(1);
    expect(res.id).toBe(1);
    expect(res.lines).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/queries/GetBudget.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать GetBudget**

Create `packages/server/src/modules/Budgets/queries/GetBudget.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Budget } from '../models/Budget.model';
import { ERRORS } from '../constants';

@Injectable()
export class GetBudgetService {
  constructor(
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,
  ) {}

  /**
   * Retrieves a budget with all its lines (the grid).
   * @param {number} budgetId
   * @returns {Promise<Budget>}
   */
  public async getBudget(budgetId: number): Promise<Budget> {
    const budget = await this.budgetModel()
      .query()
      .findById(budgetId)
      .withGraphFetched('lines');
    if (!budget) {
      throw new ServiceError(ERRORS.BUDGET_NOT_FOUND);
    }
    return budget;
  }
}
```

- [ ] **Step 4: Реализовать GetBudgets**

Create `packages/server/src/modules/Budgets/queries/GetBudgets.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Budget } from '../models/Budget.model';

@Injectable()
export class GetBudgetsService {
  constructor(
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,
  ) {}

  /**
   * Lists budgets ordered by fiscal year desc.
   * @returns {Promise<{ data: Budget[] }>}
   */
  public async getBudgets(): Promise<{ data: Budget[] }> {
    const data = await this.budgetModel().query().orderBy('fiscalYear', 'desc');
    return { data };
  }
}
```

- [ ] **Step 5: Запустить — PASS**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/queries/GetBudget.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/modules/Budgets/queries/GetBudget.service.ts packages/server/src/modules/Budgets/queries/GetBudgets.service.ts packages/server/src/modules/Budgets/queries/GetBudget.service.spec.ts
git commit -m "feat(server): add GetBudgets and GetBudget queries"
```
Откат: `git checkout -- packages/server/src/modules/Budgets/queries/`.

---

# Part B — Backend: план-факт

## Task B1: Чистая функция `computeVariance`

**Files:**
- Create: `packages/server/src/modules/Budgets/utils/computeVariance.ts`
- Test: `packages/server/src/modules/Budgets/utils/computeVariance.spec.ts`

- [ ] **Step 1: Падающий тест**

Create `packages/server/src/modules/Budgets/utils/computeVariance.spec.ts`:

```ts
import { computeVariance } from './computeVariance';

describe('computeVariance', () => {
  it('computes absolute and percent variance (fact − plan)', () => {
    expect(computeVariance(540000, 512000)).toEqual({
      varianceAbs: -28000,
      variancePct: -5.19,
    });
  });

  it('returns null percent when plan is zero', () => {
    expect(computeVariance(0, 5000)).toEqual({
      varianceAbs: 5000,
      variancePct: null,
    });
  });

  it('returns zero variance when plan equals fact', () => {
    expect(computeVariance(150000, 150000)).toEqual({
      varianceAbs: 0,
      variancePct: 0,
    });
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/utils/computeVariance.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

Create `packages/server/src/modules/Budgets/utils/computeVariance.ts`:

```ts
const round = (n: number, d = 2): number => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

/**
 * Computes plan/fact variance.
 * @param {number} plan
 * @param {number} fact
 * @returns {{ varianceAbs: number; variancePct: number | null }}
 */
export function computeVariance(
  plan: number,
  fact: number,
): { varianceAbs: number; variancePct: number | null } {
  const varianceAbs = round(fact - plan, 3);
  const variancePct = plan === 0 ? null : round(((fact - plan) / plan) * 100, 2);
  return { varianceAbs, variancePct };
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/utils/computeVariance.spec.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Budgets/utils/computeVariance.ts packages/server/src/modules/Budgets/utils/computeVariance.spec.ts
git commit -m "feat(server): add computeVariance pure function"
```
Откат: `git checkout -- packages/server/src/modules/Budgets/utils/`.

---

## Task B2: Чистая функция `cashSettledReferenceKeys`

Отбирает ключи `reference` (тип+id), которые касались денежного счёта и НЕ являются переводом между своими счетами. Это сердце кассового факта.

**Files:**
- Create: `packages/server/src/modules/Budgets/utils/cashSettledReferenceKeys.ts`
- Test: `packages/server/src/modules/Budgets/utils/cashSettledReferenceKeys.spec.ts`

- [ ] **Step 1: Падающий тест**

Create `packages/server/src/modules/Budgets/utils/cashSettledReferenceKeys.spec.ts`:

```ts
import { cashSettledReferenceKeys } from './cashSettledReferenceKeys';

const isCash = (id: number) => id === 100; // 100 = денежный счёт

describe('cashSettledReferenceKeys', () => {
  it('keeps references that touched a cash account', () => {
    const legs = [
      { referenceType: 'CashflowTransaction', referenceId: 1, accountId: 100, transactionType: 'OtherExpense' },
      { referenceType: 'CashflowTransaction', referenceId: 1, accountId: 500, transactionType: 'OtherExpense' },
    ];
    expect(cashSettledReferenceKeys(legs, isCash)).toEqual(
      new Set(['CashflowTransaction:1']),
    );
  });

  it('excludes internal transfers between own accounts', () => {
    const legs = [
      { referenceType: 'CashflowTransaction', referenceId: 2, accountId: 100, transactionType: 'TransferToAccount' },
      { referenceType: 'CashflowTransaction', referenceId: 2, accountId: 101, transactionType: 'TransferFromAccount' },
    ];
    expect(cashSettledReferenceKeys(legs, isCash)).toEqual(new Set());
  });

  it('ignores references that never touched cash (accrual-only)', () => {
    const legs = [
      { referenceType: 'Bill', referenceId: 3, accountId: 500, transactionType: null },
      { referenceType: 'Bill', referenceId: 3, accountId: 600, transactionType: null },
    ];
    expect(cashSettledReferenceKeys(legs, isCash)).toEqual(new Set());
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/utils/cashSettledReferenceKeys.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

Create `packages/server/src/modules/Budgets/utils/cashSettledReferenceKeys.ts`:

```ts
import { TRANSFER_TYPES } from '../constants';

interface MinimalLeg {
  referenceType: string;
  referenceId: number;
  accountId: number;
  transactionType?: string | null;
}

/**
 * Returns the set of reference keys ("type:id") that represent a real cash
 * settlement: at least one leg on a cash account, and not an internal transfer.
 * @param {MinimalLeg[]} legs all transaction legs in the period
 * @param {(accountId: number) => boolean} isCashAccount
 * @returns {Set<string>}
 */
export function cashSettledReferenceKeys(
  legs: MinimalLeg[],
  isCashAccount: (accountId: number) => boolean,
): Set<string> {
  const transferTypes = new Set<string>(TRANSFER_TYPES as unknown as string[]);
  const touchedCash = new Set<string>();
  const isTransfer = new Set<string>();

  for (const leg of legs) {
    const key = `${leg.referenceType}:${leg.referenceId}`;
    if (isCashAccount(leg.accountId)) {
      touchedCash.add(key);
    }
    if (leg.transactionType && transferTypes.has(leg.transactionType)) {
      isTransfer.add(key);
    }
  }

  const result = new Set<string>();
  touchedCash.forEach((key) => {
    if (!isTransfer.has(key)) result.add(key);
  });
  return result;
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/utils/cashSettledReferenceKeys.spec.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Budgets/utils/cashSettledReferenceKeys.ts packages/server/src/modules/Budgets/utils/cashSettledReferenceKeys.spec.ts
git commit -m "feat(server): add cashSettledReferenceKeys pure function"
```
Откат: `git checkout -- packages/server/src/modules/Budgets/utils/`.

---

## Task B3: Сервис `ArticlesCashflowRollup` (кассовый факт по статьям)

Та же свёртка, что `ArticlesPlRollup`, но по проводкам кассово-расчётных reference. Переиспользует чистые функции свёртки Этапа 0.

**Files:**
- Create: `packages/server/src/modules/Budgets/queries/ArticlesCashflowRollup.service.ts`
- Test: `packages/server/src/modules/Budgets/queries/ArticlesCashflowRollup.service.spec.ts`

> **Перед реализацией:** открыть `packages/server/src/modules/ManagementArticles/queries/ArticlesPlRollup.service.ts` и взять оттуда: (1) точные пути импорта `foldAccountsIntoArticles`, `rollupAmountsToAncestors`, `accountNet`; (2) имя инжектируемой модели проводок (`AccountTransaction.name`) и её модификаторы (`filterDateRange`, `filterByBranches`). Импортировать те же утилиты.

- [ ] **Step 1: Падающий тест**

Create `packages/server/src/modules/Budgets/queries/ArticlesCashflowRollup.service.spec.ts`:

```ts
import { ArticlesCashflowRollupService } from './ArticlesCashflowRollup.service';

describe('ArticlesCashflowRollupService', () => {
  it('rolls up only cash-settled turnover into articles', async () => {
    // Статьи: 1 «Аренда» (expense). Карта: счёт 500 → статья 1.
    const articleModel = () => ({
      query: () => ({ orderBy: () => Promise.resolve([{ id: 1, name: 'Аренда', kind: 'expense', parentId: null }]) }),
    });
    const articleAccountModel = () => ({
      query: () => Promise.resolve([{ accountId: 500, articleId: 1 }]),
    });
    // Денежные счета: 100. Счёт 500 — расходный (normal debit).
    const accountModel = () => ({
      query: () => ({
        whereIn: () => Promise.resolve([{ id: 500, accountNormal: 'debit' }]),
        onBuild: () => Promise.resolve([{ id: 100 }]),
      }),
    });
    // Проводки периода: cashflow-расход (касса 100 / расход 500 на 150000).
    const accountTransactionModel = () => ({
      query: () => ({
        onBuild: () =>
          Promise.resolve([
            { referenceType: 'CashflowTransaction', referenceId: 1, accountId: 100, debit: 0, credit: 150000, transactionType: 'OtherExpense' },
            { referenceType: 'CashflowTransaction', referenceId: 1, accountId: 500, debit: 150000, credit: 0, transactionType: 'OtherExpense' },
          ]),
      }),
    });

    const service = new ArticlesCashflowRollupService(
      articleModel as any,
      articleAccountModel as any,
      accountModel as any,
      accountTransactionModel as any,
    );

    const rows = await service.getRollup({ fromDate: '2026-03-01', toDate: '2026-03-31' } as any);
    const arenda = rows.find((r: any) => r.id === 1);
    expect(arenda.amount).toBe(150000);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/queries/ArticlesCashflowRollup.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

Create `packages/server/src/modules/Budgets/queries/ArticlesCashflowRollup.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
// СВЕРИТЬ путь импорта с ArticlesPlRollup.service.ts:
import {
  foldAccountsIntoArticles,
  rollupAmountsToAncestors,
  accountNet,
} from '@/modules/ManagementArticles/utils/articlesPlRollup';
import { ArticlesRollupQueryDto } from '@/modules/ManagementArticles/dtos/ArticlesRollupQuery.dto';
import { cashSettledReferenceKeys } from '../utils/cashSettledReferenceKeys';
import { CASH_ACCOUNT_TYPES } from '../constants';

@Injectable()
export class ArticlesCashflowRollupService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<typeof ManagementArticleAccount>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<typeof AccountTransaction>,
  ) {}

  /**
   * Cash-basis fact rolled up by management article: same fold as the P&L
   * rollup, but only over transactions that were actually cash-settled
   * (reference touched a cash account and is not an internal transfer).
   * @param {ArticlesRollupQueryDto} query
   */
  public async getRollup(query: ArticlesRollupQueryDto) {
    const articles = await this.articleModel().query().orderBy('sortOrder');
    const map = await this.articleAccountModel().query();

    // Денежные счета.
    const cashAccounts = await this.accountModel()
      .query()
      .onBuild((qb) => {
        qb.whereIn('accountType', CASH_ACCOUNT_TYPES as unknown as string[]);
      });
    const cashAccountIds = new Set<number>(cashAccounts.map((a: any) => a.id));
    const isCashAccount = (id: number) => cashAccountIds.has(id);

    // Все проводки периода (для отбора кассово-расчётных reference).
    const periodLegs = await this.accountTransactionModel()
      .query()
      .onBuild((qb) => {
        if (query.fromDate || query.toDate) {
          qb.modify('filterDateRange', query.fromDate, query.toDate);
        }
        if (!isEmpty(query.branchesIds)) {
          qb.modify('filterByBranches', query.branchesIds);
        }
      });

    const settledKeys = cashSettledReferenceKeys(periodLegs as any, isCashAccount);

    // Обороты по сопоставленным (доходно-расходным) счетам только в этих reference.
    const mappedAccountIds = map.map((m: any) => m.accountId);
    const accountTotalsMap = new Map<number, { credit: number; debit: number }>();
    (periodLegs as any[]).forEach((leg) => {
      const key = `${leg.referenceType}:${leg.referenceId}`;
      if (!settledKeys.has(key)) return;
      if (!mappedAccountIds.includes(leg.accountId)) return;
      const cur = accountTotalsMap.get(leg.accountId) || { credit: 0, debit: 0 };
      cur.credit += Number(leg.credit || 0);
      cur.debit += Number(leg.debit || 0);
      accountTotalsMap.set(leg.accountId, cur);
    });

    const accounts = mappedAccountIds.length
      ? await this.accountModel().query().whereIn('id', mappedAccountIds)
      : [];
    const normalByAccountId = new Map<number, string>();
    accounts.forEach((a: any) => normalByAccountId.set(a.id, a.accountNormal));

    const accountNets = Array.from(accountTotalsMap.entries()).map(
      ([accountId, t]) => ({
        accountId,
        net: accountNet(t.credit, t.debit, normalByAccountId.get(accountId)),
      }),
    );

    const folded = foldAccountsIntoArticles(articles, map, accountNets);
    return rollupAmountsToAncestors(folded);
  }
}
```

> Кассово-расчётные reference отбираются на стороне Node (после выборки проводок периода). Для первых 100–1000 пользователей это приемлемо (роадмап §5 «Что НЕ боимся — производительность»). Если профиль покажет узкое место — вынести отбор reference в SQL-подзапрос. Сверьте имя/путь модели `AccountTransaction` и её модификаторы с `ArticlesPlRollup.service.ts`.

- [ ] **Step 4: Запустить — PASS**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/queries/ArticlesCashflowRollup.service.spec.ts`
Expected: PASS. Если stub-цепочки не совпали — выровняйте stubs под фактические вызовы (`.onBuild`, `.whereIn`).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Budgets/queries/ArticlesCashflowRollup.service.ts packages/server/src/modules/Budgets/queries/ArticlesCashflowRollup.service.spec.ts
git commit -m "feat(server): add ArticlesCashflowRollup (cash fact by article)"
```
Откат: `git checkout -- packages/server/src/modules/Budgets/queries/`.

---

## Task B4: Сервис `GetBudgetPlanFact`

План из `budget_lines` + факт (БДиР → `ArticlesPlRollupService`, БДДС → `ArticlesCashflowRollupService`) + отклонение.

**Files:**
- Create: `packages/server/src/modules/Budgets/queries/GetBudgetPlanFact.service.ts`
- Test: `packages/server/src/modules/Budgets/queries/GetBudgetPlanFact.service.spec.ts`

- [ ] **Step 1: Падающий тест**

Create `packages/server/src/modules/Budgets/queries/GetBudgetPlanFact.service.spec.ts`:

```ts
import { GetBudgetPlanFactService } from './GetBudgetPlanFact.service';

describe('GetBudgetPlanFactService', () => {
  it('joins plan and fact (БДиР via P&L rollup) with variance', async () => {
    const budget = { id: 1, type: 'bdir', activeScenario: 'realistic' };
    const budgetModel = () => ({ query: () => ({ findById: () => Promise.resolve(budget) }) });
    // План: статья 1 = 540000.
    const lineModel = () => ({
      query: () => ({ onBuild: () => Promise.resolve([{ articleId: 1, plannedAmount: 540000 }]) }),
    });
    // Факт P&L: статья 1 = 512000.
    const plRollup = { getRollup: jest.fn().mockResolvedValue([{ id: 1, name: 'Выручка', kind: 'income', amount: 512000 }]) };
    const cashRollup = { getRollup: jest.fn() };

    const service = new GetBudgetPlanFactService(
      budgetModel as any,
      lineModel as any,
      plRollup as any,
      cashRollup as any,
    );

    const res = await service.getPlanFact(1, { fromDate: '2026-03-01', toDate: '2026-03-31' } as any);

    expect(plRollup.getRollup).toHaveBeenCalled();
    expect(cashRollup.getRollup).not.toHaveBeenCalled();
    const row = res.rows.find((r: any) => r.articleId === 1);
    expect(row).toMatchObject({ plan: 540000, fact: 512000, varianceAbs: -28000 });
  });

  it('uses the cash rollup for БДДС budgets', async () => {
    const budgetModel = () => ({ query: () => ({ findById: () => Promise.resolve({ id: 2, type: 'bdds', activeScenario: 'realistic' }) }) });
    const lineModel = () => ({ query: () => ({ onBuild: () => Promise.resolve([]) }) });
    const plRollup = { getRollup: jest.fn() };
    const cashRollup = { getRollup: jest.fn().mockResolvedValue([]) };

    const service = new GetBudgetPlanFactService(budgetModel as any, lineModel as any, plRollup as any, cashRollup as any);
    await service.getPlanFact(2, { fromDate: '2026-03-01', toDate: '2026-03-31' } as any);

    expect(cashRollup.getRollup).toHaveBeenCalled();
    expect(plRollup.getRollup).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/queries/GetBudgetPlanFact.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

Create `packages/server/src/modules/Budgets/queries/GetBudgetPlanFact.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { Budget } from '../models/Budget.model';
import { BudgetLine } from '../models/BudgetLine.model';
import { ArticlesCashflowRollupService } from './ArticlesCashflowRollup.service';
import { GetBudgetPlanFactQueryDto } from '../dtos/GetBudgetPlanFactQuery.dto';
import { PlanFactResponse, PlanFactRow } from '../Budgets.interfaces';
import { computeVariance } from '../utils/computeVariance';
import { ERRORS } from '../constants';

@Injectable()
export class GetBudgetPlanFactService {
  constructor(
    @Inject(Budget.name)
    private readonly budgetModel: TenantModelProxy<typeof Budget>,

    @Inject(BudgetLine.name)
    private readonly lineModel: TenantModelProxy<typeof BudgetLine>,

    private readonly plRollup: ArticlesPlRollupService,
    private readonly cashRollup: ArticlesCashflowRollupService,
  ) {}

  /**
   * Builds the plan-fact report for a budget over a period.
   * @param {number} budgetId
   * @param {GetBudgetPlanFactQueryDto} query
   * @returns {Promise<PlanFactResponse>}
   */
  public async getPlanFact(
    budgetId: number,
    query: GetBudgetPlanFactQueryDto,
  ): Promise<PlanFactResponse> {
    const budget = await this.budgetModel().query().findById(budgetId);
    if (!budget) {
      throw new ServiceError(ERRORS.BUDGET_NOT_FOUND);
    }
    const scenario = query.scenario || budget.activeScenario;

    // План: сумма budget_lines по статье за период и сценарий.
    const lines = await this.lineModel()
      .query()
      .onBuild((qb) => {
        qb.where('budgetId', budgetId);
        qb.where('scenario', scenario);
        qb.where('period', '>=', query.fromDate);
        qb.where('period', '<=', query.toDate);
      });
    const planByArticle = new Map<number, number>();
    (lines as any[]).forEach((l) => {
      planByArticle.set(
        l.articleId,
        (planByArticle.get(l.articleId) || 0) + Number(l.plannedAmount),
      );
    });

    // Факт: БДиР → P&L rollup; БДДС → cash rollup. Оба возвращают [{id,name,kind,amount}].
    const rollupQuery = {
      fromDate: query.fromDate,
      toDate: query.toDate,
      branchesIds: query.branchesIds,
    } as any;
    const factRows =
      budget.type === 'bdds'
        ? await this.cashRollup.getRollup(rollupQuery)
        : await this.plRollup.getRollup(rollupQuery);

    const rows: PlanFactRow[] = (factRows as any[]).map((fr) => {
      const plan = planByArticle.get(fr.id) || 0;
      const fact = Number(fr.amount) || 0;
      const { varianceAbs, variancePct } = computeVariance(plan, fact);
      return {
        articleId: fr.id,
        name: fr.name,
        kind: fr.kind,
        plan,
        fact,
        varianceAbs,
        variancePct,
      };
    });

    return {
      budgetId,
      type: budget.type,
      scenario,
      period: `${query.fromDate}..${query.toDate}`,
      rows,
    };
  }
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `pnpm --filter @bigfin/server test -- src/modules/Budgets/queries/GetBudgetPlanFact.service.spec.ts`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Budgets/queries/GetBudgetPlanFact.service.ts packages/server/src/modules/Budgets/queries/GetBudgetPlanFact.service.spec.ts
git commit -m "feat(server): add GetBudgetPlanFact (plan vs fact) service"
```
Откат: `git checkout -- packages/server/src/modules/Budgets/queries/`.

---

## Task B5: Application, Controller, Module + регистрация

**Files:**
- Create: `packages/server/src/modules/Budgets/Budgets.application.ts`
- Create: `packages/server/src/modules/Budgets/Budgets.controller.ts`
- Create: `packages/server/src/modules/Budgets/Budgets.module.ts`
- Modify: `packages/server/src/modules/App/App.module.ts`

> Образец проводки модуля и доступа к `ArticlesPlRollupService` извне — `ManagementArticles.module.ts`. **Важно:** чтобы инжектировать `ArticlesPlRollupService` в `Budgets`, импортируйте `ManagementArticlesModule` в `BudgetsModule` и убедитесь, что `ArticlesPlRollupService` экспортируется из `ManagementArticlesModule` (если нет — добавьте в его `exports`; это единственная правка модуля Этапа 0, additive).

- [ ] **Step 1: Application**

Create `packages/server/src/modules/Budgets/Budgets.application.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { CreateBudgetService } from './commands/CreateBudget.service';
import { EditBudgetService } from './commands/EditBudget.service';
import { DeleteBudgetService } from './commands/DeleteBudget.service';
import { UpsertBudgetLinesService } from './commands/UpsertBudgetLines.service';
import { GetBudgetsService } from './queries/GetBudgets.service';
import { GetBudgetService } from './queries/GetBudget.service';
import { GetBudgetPlanFactService } from './queries/GetBudgetPlanFact.service';
import { CreateBudgetDto, EditBudgetDto } from './dtos/Budget.dto';
import { UpsertBudgetLinesDto } from './dtos/UpsertBudgetLines.dto';
import { GetBudgetPlanFactQueryDto } from './dtos/GetBudgetPlanFactQuery.dto';

@Injectable()
export class BudgetsApplication {
  constructor(
    private readonly createService: CreateBudgetService,
    private readonly editService: EditBudgetService,
    private readonly deleteService: DeleteBudgetService,
    private readonly upsertLinesService: UpsertBudgetLinesService,
    private readonly getBudgetsService: GetBudgetsService,
    private readonly getBudgetService: GetBudgetService,
    private readonly planFactService: GetBudgetPlanFactService,
  ) {}

  createBudget(dto: CreateBudgetDto) {
    return this.createService.create(dto);
  }
  editBudget(id: number, dto: EditBudgetDto) {
    return this.editService.edit(id, dto);
  }
  deleteBudget(id: number) {
    return this.deleteService.delete(id);
  }
  upsertLines(id: number, dto: UpsertBudgetLinesDto) {
    return this.upsertLinesService.upsert(id, dto);
  }
  getBudgets() {
    return this.getBudgetsService.getBudgets();
  }
  getBudget(id: number) {
    return this.getBudgetService.getBudget(id);
  }
  getPlanFact(id: number, query: GetBudgetPlanFactQueryDto) {
    return this.planFactService.getPlanFact(id, query);
  }
}
```

- [ ] **Step 2: Controller**

Create `packages/server/src/modules/Budgets/Budgets.controller.ts`:

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
import { BudgetsApplication } from './Budgets.application';
import { CreateBudgetDto, EditBudgetDto } from './dtos/Budget.dto';
import { UpsertBudgetLinesDto } from './dtos/UpsertBudgetLines.dto';
import { GetBudgetPlanFactQueryDto } from './dtos/GetBudgetPlanFactQuery.dto';

@Controller('budgets')
@ApiTags('budgets')
export class BudgetsController {
  constructor(private readonly application: BudgetsApplication) {}

  @Get()
  @ApiOperation({ summary: 'List budgets.' })
  getBudgets() {
    return this.application.getBudgets();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget with its grid lines.' })
  getBudget(@Param('id') id: number) {
    return this.application.getBudget(id);
  }

  @Get(':id/plan-fact')
  @ApiOperation({ summary: 'Plan vs fact report for a budget.' })
  getPlanFact(@Param('id') id: number, @Query() query: GetBudgetPlanFactQueryDto) {
    return this.application.getPlanFact(id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a budget.' })
  create(@Body() dto: CreateBudgetDto) {
    return this.application.createBudget(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edit a budget.' })
  edit(@Param('id') id: number, @Body() dto: EditBudgetDto) {
    return this.application.editBudget(id, dto);
  }

  @Put(':id/lines')
  @ApiOperation({ summary: 'Upsert budget grid cells.' })
  upsertLines(@Param('id') id: number, @Body() dto: UpsertBudgetLinesDto) {
    return this.application.upsertLines(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget.' })
  delete(@Param('id') id: number) {
    return this.application.deleteBudget(id);
  }
}
```

- [ ] **Step 3: Module**

Create `packages/server/src/modules/Budgets/Budgets.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { ManagementArticlesModule } from '@/modules/ManagementArticles/ManagementArticles.module';
import { BudgetsController } from './Budgets.controller';
import { BudgetsApplication } from './Budgets.application';
import { CommandBudgetValidatorService } from './commands/CommandBudgetValidator.service';
import { CreateBudgetService } from './commands/CreateBudget.service';
import { EditBudgetService } from './commands/EditBudget.service';
import { DeleteBudgetService } from './commands/DeleteBudget.service';
import { UpsertBudgetLinesService } from './commands/UpsertBudgetLines.service';
import { GetBudgetsService } from './queries/GetBudgets.service';
import { GetBudgetService } from './queries/GetBudget.service';
import { ArticlesCashflowRollupService } from './queries/ArticlesCashflowRollup.service';
import { GetBudgetPlanFactService } from './queries/GetBudgetPlanFact.service';

@Module({
  imports: [TenancyDatabaseModule, ManagementArticlesModule],
  controllers: [BudgetsController],
  providers: [
    BudgetsApplication,
    CommandBudgetValidatorService,
    CreateBudgetService,
    EditBudgetService,
    DeleteBudgetService,
    UpsertBudgetLinesService,
    GetBudgetsService,
    GetBudgetService,
    ArticlesCashflowRollupService,
    GetBudgetPlanFactService,
  ],
})
export class BudgetsModule {}
```

> Сверьте imports с `ManagementArticles.module.ts`. `GetBudgetPlanFactService` инжектит `ArticlesPlRollupService` → он должен быть в `exports` `ManagementArticlesModule`. Если `ManagementArticlesModule` его не экспортирует — добавьте `exports: [ArticlesPlRollupService]` (additive правка Этапа 0).

- [ ] **Step 4: Зарегистрировать в App**

In `packages/server/src/modules/App/App.module.ts` (рядом с `PaymentCalendarModule`):

```ts
import { BudgetsModule } from '@/modules/Budgets/Budgets.module';
```
```ts
    PaymentCalendarModule,
    BudgetsModule,
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: без ошибок.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/modules/Budgets/Budgets.application.ts packages/server/src/modules/Budgets/Budgets.controller.ts packages/server/src/modules/Budgets/Budgets.module.ts packages/server/src/modules/App/App.module.ts
git commit -m "feat(server): wire Budgets application, controller and module"
```
Откат: `git checkout -- <files>`. (Если правили exports ManagementArticlesModule — тоже добавить в коммит.)

---

# Part C — Frontend

## Task C1: i18n-ключи (EN + RU)

**Files:**
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Ключи EN**

In `packages/webapp/src/lang/en/index.json`:

```json
"budgets.page_title": "Budgets",
"budgets.add": "Add budget",
"budgets.edit": "Edit budget",
"budgets.delete": "Delete",
"budgets.delete_confirm": "Delete this budget?",
"budgets.field.name": "Name",
"budgets.field.type": "Type",
"budgets.type.bdir": "Income & expense (P&L)",
"budgets.type.bdds": "Cash flow",
"budgets.field.year": "Year",
"budgets.field.scenario": "Scenario",
"budgets.scenario.optimistic": "Optimistic",
"budgets.scenario.realistic": "Realistic",
"budgets.scenario.pessimistic": "Pessimistic",
"budgets.compare_scenarios": "Compare scenarios",
"budgets.profit_plan": "Profit (plan)",
"budgets.total": "Total",
"budgets.save": "Save",
"budgets.cancel": "Cancel",
"budgets.saved": "Budget saved",
"budgets.save_error": "Couldn't save the budget",
"budgets.error.name_required": "Enter the budget name",
"budgets.error.type_required": "Choose the budget type",
"budgets.planfact.title": "Plan vs fact",
"budgets.planfact.col_plan": "Plan",
"budgets.planfact.col_fact": "Fact",
"budgets.planfact.col_variance_abs": "Variance",
"budgets.planfact.col_variance_pct": "Variance %"
```

- [ ] **Step 2: Те же ключи RU**

In `packages/webapp/src/lang/ru/index.json`:

```json
"budgets.page_title": "Бюджеты",
"budgets.add": "Добавить бюджет",
"budgets.edit": "Изменить бюджет",
"budgets.delete": "Удалить",
"budgets.delete_confirm": "Удалить этот бюджет?",
"budgets.field.name": "Название",
"budgets.field.type": "Тип",
"budgets.type.bdir": "Доходы и расходы (БДиР)",
"budgets.type.bdds": "Движение денег (БДДС)",
"budgets.field.year": "Год",
"budgets.field.scenario": "Сценарий",
"budgets.scenario.optimistic": "Оптимистичный",
"budgets.scenario.realistic": "Реалистичный",
"budgets.scenario.pessimistic": "Пессимистичный",
"budgets.compare_scenarios": "Сравнить сценарии",
"budgets.profit_plan": "Прибыль (план)",
"budgets.total": "Итого",
"budgets.save": "Сохранить",
"budgets.cancel": "Отмена",
"budgets.saved": "Бюджет сохранён",
"budgets.save_error": "Не удалось сохранить бюджет",
"budgets.error.name_required": "Введите название бюджета",
"budgets.error.type_required": "Выберите тип бюджета",
"budgets.planfact.title": "План-факт",
"budgets.planfact.col_plan": "План",
"budgets.planfact.col_fact": "Факт",
"budgets.planfact.col_variance_abs": "Отклонение",
"budgets.planfact.col_variance_pct": "Отклонение %"
```

- [ ] **Step 3: Парность**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: exit 0, 0 missing, 0 extra.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(webapp): add budgets i18n keys (en/ru)"
```
Откат: `git checkout -- packages/webapp/src/lang/`.

---

## Task C2: Query-ключи и хуки

**Files:**
- Modify: `packages/webapp/src/hooks/query/types.tsx`
- Create: `packages/webapp/src/hooks/query/budgets.tsx`

- [ ] **Step 1: Ключи**

In `packages/webapp/src/hooks/query/types.tsx` (рядом с `PAYMENT_CALENDAR`):

```ts
const BUDGETS = {
  BUDGETS: 'BUDGETS',
  BUDGET: 'BUDGET',
  BUDGET_PLAN_FACT: 'BUDGET_PLAN_FACT',
};
```

И в `export default { ... }` добавить `...BUDGETS,`.

- [ ] **Step 2: Хуки**

Create `packages/webapp/src/hooks/query/budgets.tsx`:

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

export interface BudgetValues {
  name: string;
  type: 'bdir' | 'bdds';
  fiscalYear: number;
  activeScenario?: string;
  branchId?: number | null;
}
export interface BudgetLineInput {
  articleId: number;
  period: string;
  scenario: string;
  plannedAmount: number;
}
export type EditBudgetArgs = [number | string, BudgetValues];
export type UpsertLinesArgs = [number | string, { lines: BudgetLineInput[] }];

const invalidate = (client: QueryClient) => {
  client.invalidateQueries(t.BUDGETS);
  client.invalidateQueries(t.BUDGET);
  client.invalidateQueries(t.BUDGET_PLAN_FACT);
};

export function useBudgets(props?: any) {
  return useRequestQuery(
    [t.BUDGETS],
    { method: 'get', url: 'budgets' },
    { select: (res: any) => res.data.data, defaultData: [], ...props },
  );
}

export function useBudget(id: number | string, props?: any) {
  return useRequestQuery(
    [t.BUDGET, id],
    { method: 'get', url: `budgets/${id}` },
    { select: (res: any) => res.data, defaultData: {}, ...props },
  );
}

export function useBudgetPlanFact(id: number | string, query?: any, props?: any) {
  return useRequestQuery(
    [t.BUDGET_PLAN_FACT, id, query],
    { method: 'get', url: `budgets/${id}/plan-fact`, params: query },
    { select: (res: any) => res.data, defaultData: { rows: [] }, ...props },
  );
}

export function useCreateBudget(props?: UseMutationOptions<any, any, BudgetValues>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, BudgetValues>(
    (values) => api.post('budgets', values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useEditBudget(props?: UseMutationOptions<any, any, EditBudgetArgs>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, EditBudgetArgs>(
    ([id, values]) => api.put(`budgets/${id}`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useUpsertBudgetLines(props?: UseMutationOptions<any, any, UpsertLinesArgs>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, UpsertLinesArgs>(
    ([id, payload]) => api.put(`budgets/${id}/lines`, payload),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeleteBudget(props?: UseMutationOptions<any, any, number | string>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (id) => api.delete(`budgets/${id}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

```bash
git add packages/webapp/src/hooks/query/types.tsx packages/webapp/src/hooks/query/budgets.tsx
git commit -m "feat(webapp): add budgets query hooks"
```
Откат: `git checkout -- packages/webapp/src/hooks/query/`.

---

## Task C3: Схема и модалка бюджета

**Files:**
- Create: `packages/webapp/src/containers/Budgets/schemas.ts`
- Create: `packages/webapp/src/containers/Budgets/BudgetFormDialog.tsx`

- [ ] **Step 1: Схема**

Create `packages/webapp/src/containers/Budgets/schemas.ts`:

```ts
import { z } from 'zod';
import intl from 'react-intl-universal';

export const getBudgetSchema = () =>
  z.object({
    name: z.string().trim().min(1, intl.get('budgets.error.name_required')),
    type: z.enum(['bdir', 'bdds'], {
      errorMap: () => ({ message: intl.get('budgets.error.type_required') }),
    }),
    fiscalYear: z.number().int(),
    activeScenario: z
      .enum(['optimistic', 'realistic', 'pessimistic'])
      .optional(),
    branchId: z.union([z.number(), z.null()]).optional(),
  });

export type BudgetFormValues = z.infer<ReturnType<typeof getBudgetSchema>>;

export interface Budget {
  id: number;
  name: string;
  type: 'bdir' | 'bdds';
  fiscalYear: number;
  activeScenario: string;
  branchId: number | null;
  lines?: Array<{
    articleId: number;
    period: string;
    scenario: string;
    plannedAmount: number;
  }>;
}
```

- [ ] **Step 2: Модалка**

Create `packages/webapp/src/containers/Budgets/BudgetFormDialog.tsx` (паттерн `PlannedOperationDialog.tsx` / `ArticleForm.tsx`):

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
import { getBudgetSchema, BudgetFormValues, Budget } from './schemas';
import { useCreateBudget, useEditBudget } from '@/hooks/query/budgets';

interface Props {
  budget?: Budget;
  onDone: () => void;
  onCancel: () => void;
}

export function BudgetFormDialog({ budget, onDone, onCancel }: Props) {
  const isEdit = !!budget?.id;
  const createMutation = useCreateBudget({});
  const editMutation = useEditBudget({});

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(getBudgetSchema()),
    defaultValues: {
      name: budget?.name ?? '',
      type: budget?.type ?? 'bdir',
      fiscalYear: budget?.fiscalYear ?? new Date().getFullYear(),
      activeScenario: budget?.activeScenario ?? 'realistic',
      branchId: budget?.branchId ?? null,
    },
  });

  const onSubmit = async (values: BudgetFormValues) => {
    const payload = {
      name: values.name,
      type: values.type,
      fiscalYear: values.fiscalYear,
      activeScenario: values.activeScenario,
      branchId: values.branchId ?? undefined,
    };
    try {
      if (isEdit && budget) await editMutation.mutateAsync([budget.id, payload]);
      else await createMutation.mutateAsync(payload);
      toast.success(intl.get('budgets.saved'));
      onDone();
    } catch (e) {
      toast.error(intl.get('budgets.save_error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{intl.get(isEdit ? 'budgets.edit' : 'budgets.add')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('budgets.field.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fiscalYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('budgets.field.year')}</FormLabel>
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
            {/* type — Select (bdir/bdds), activeScenario — Select (3 сценария):
                добавить теми же FormField, паттерн Select взять вербатим из
                containers/ManagementArticles/ArticleForm.tsx (поле kind).
                Метки: budgets.type.* / budgets.scenario.*. */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onCancel}>
                {intl.get('budgets.cancel')}
              </Button>
              <Button type="submit">{intl.get('budgets.save')}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

> Поля `type` (Select: `budgets.type.bdir`/`budgets.type.bdds`) и `activeScenario` (Select: три `budgets.scenario.*`) добавить теми же `FormField`; точный паттерн `Select` внутри `FormField` — вербатим из `containers/ManagementArticles/ArticleForm.tsx` (поле `kind`).

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

```bash
git add packages/webapp/src/containers/Budgets/schemas.ts packages/webapp/src/containers/Budgets/BudgetFormDialog.tsx
git commit -m "feat(webapp): add budget form dialog (RHF + Zod)"
```
Откат: `git checkout -- packages/webapp/src/containers/Budgets/`.

---

## Task C4: Сетка бюджета

**Files:**
- Create: `packages/webapp/src/containers/Budgets/BudgetGrid.tsx`

> Сетка показывает дерево статей (из `useManagementArticles({ tree: 'true' })`) × 12 месяцев года бюджета, активный сценарий. Правка ячейки копит изменения в локальном state; «Сохранить» шлёт `useUpsertBudgetLines`. На мобильном — один месяц за раз (селектор месяца).

- [ ] **Step 1: Реализовать сетку**

Create `packages/webapp/src/containers/Budgets/BudgetGrid.tsx`:

```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useManagementArticles } from '@/hooks/query/managementArticles';
import { useBudget, useUpsertBudgetLines } from '@/hooks/query/budgets';

const MONTHS = Array.from({ length: 12 }, (_, i) => i); // 0..11

interface CellKey {
  articleId: number;
  period: string;
}
const periodOf = (year: number, monthIdx: number) =>
  `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`;

export function BudgetGrid({ budgetId }: { budgetId: number }) {
  const { data: budget } = useBudget(budgetId, {});
  const { data: tree } = useManagementArticles({ tree: 'true' }, {});
  const upsert = useUpsertBudgetLines({});

  const scenario = budget?.activeScenario ?? 'realistic';
  const year = budget?.fiscalYear ?? new Date().getFullYear();

  // Карта существующих сумм: `${articleId}:${period}` → amount.
  const initial = React.useMemo(() => {
    const m: Record<string, number> = {};
    (budget?.lines ?? [])
      .filter((l: any) => l.scenario === scenario)
      .forEach((l: any) => {
        m[`${l.articleId}:${String(l.period).slice(0, 10)}`] = Number(l.plannedAmount);
      });
    return m;
  }, [budget, scenario]);

  const [edits, setEdits] = React.useState<Record<string, number>>({});
  const valueAt = (articleId: number, period: string) => {
    const key = `${articleId}:${period}`;
    return edits[key] ?? initial[key] ?? 0;
  };
  const setCell = (articleId: number, period: string, v: number) =>
    setEdits((p) => ({ ...p, [`${articleId}:${period}`]: v }));

  const flatten = (nodes: any[], acc: any[] = []): any[] => {
    (nodes ?? []).forEach((n) => {
      acc.push(n);
      if (n.children?.length) flatten(n.children, acc);
    });
    return acc;
  };
  const rows = flatten(tree);

  const onSave = () => {
    const lines = Object.entries(edits).map(([key, plannedAmount]) => {
      const [articleId, period] = key.split(':');
      return { articleId: Number(articleId), period, scenario, plannedAmount };
    });
    if (lines.length) upsert.mutate([budgetId, { lines }]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button onClick={onSave}>{intl.get('budgets.save')}</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">{intl.get('management_articles.field.name')}</th>
              {MONTHS.map((m) => (
                <th key={m} className="px-2 py-1 text-right">{m + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((article: any) => (
              <tr key={article.id} className="border-t">
                <td className="px-2 py-1">{article.name}</td>
                {MONTHS.map((m) => {
                  const period = periodOf(year, m);
                  return (
                    <td key={m} className="px-1 py-1">
                      <Input
                        type="number"
                        className="w-24 text-right"
                        value={valueAt(article.id, period)}
                        onChange={(e) => setCell(article.id, period, Number(e.target.value))}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

```bash
git add packages/webapp/src/containers/Budgets/BudgetGrid.tsx
git commit -m "feat(webapp): add budget entry grid"
```
Откат: `git checkout -- packages/webapp/src/containers/Budgets/BudgetGrid.tsx`.

---

## Task C5: Экран план-факт и страница бюджетов

**Files:**
- Create: `packages/webapp/src/containers/Budgets/BudgetPlanFact.tsx`
- Create: `packages/webapp/src/containers/Budgets/BudgetsPage.tsx`

- [ ] **Step 1: Экран план-факт**

Create `packages/webapp/src/containers/Budgets/BudgetPlanFact.tsx`:

```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { useBudgetPlanFact } from '@/hooks/query/budgets';

export function BudgetPlanFact({
  budgetId,
  fromDate,
  toDate,
}: {
  budgetId: number;
  fromDate: string;
  toDate: string;
}) {
  const { data } = useBudgetPlanFact(budgetId, { fromDate, toDate }, {});
  const rows = data?.rows ?? [];

  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr>
          <th className="px-2 py-1 text-left">{intl.get('management_articles.field.name')}</th>
          <th className="px-2 py-1 text-right">{intl.get('budgets.planfact.col_plan')}</th>
          <th className="px-2 py-1 text-right">{intl.get('budgets.planfact.col_fact')}</th>
          <th className="px-2 py-1 text-right">{intl.get('budgets.planfact.col_variance_abs')}</th>
          <th className="px-2 py-1 text-right">{intl.get('budgets.planfact.col_variance_pct')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r: any) => (
          <tr key={r.articleId} className="border-t">
            <td className="px-2 py-1">{r.name}</td>
            <td className="px-2 py-1 text-right">{r.plan.toLocaleString('ru-RU')}</td>
            <td className="px-2 py-1 text-right">{r.fact.toLocaleString('ru-RU')}</td>
            <td className={`px-2 py-1 text-right ${r.varianceAbs < 0 ? 'text-red-600' : ''}`}>
              {r.varianceAbs.toLocaleString('ru-RU')}
            </td>
            <td className="px-2 py-1 text-right">
              {r.variancePct == null ? '—' : `${r.variancePct}%`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Страница бюджетов**

Create `packages/webapp/src/containers/Budgets/BudgetsPage.tsx`:

```tsx
import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useFeatureCan } from '@/hooks/state/feature';
import { useBudgets } from '@/hooks/query/budgets';
import { BudgetFormDialog } from './BudgetFormDialog';
import { BudgetGrid } from './BudgetGrid';
import { BudgetPlanFact } from './BudgetPlanFact';
import { Budget } from './schemas';

export default function BudgetsPage() {
  const { featureCan } = useFeatureCan();
  const { data: budgets } = useBudgets({});
  const [showForm, setShowForm] = React.useState(false);
  const [selected, setSelected] = React.useState<Budget | undefined>();
  const [tab, setTab] = React.useState<'grid' | 'planfact'>('grid');

  if (!featureCan('budgets')) return null;

  const year = selected?.fiscalYear ?? moment().year();
  const fromDate = `${year}-01-01`;
  const toDate = `${year}-12-31`;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{intl.get('budgets.page_title')}</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {intl.get('budgets.add')}
        </Button>
      </div>

      {showForm && (
        <BudgetFormDialog
          onDone={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      <ul className="flex flex-col gap-1">
        {(budgets ?? []).map((b: Budget) => (
          <li key={b.id}>
            <button
              className="text-left underline"
              onClick={() => setSelected(b)}
            >
              {b.name} ({intl.get(`budgets.type.${b.type}`)}, {b.fiscalYear})
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button variant={tab === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('grid')}>
              {intl.get('budgets.page_title')}
            </Button>
            <Button variant={tab === 'planfact' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('planfact')}>
              {intl.get('budgets.planfact.title')}
            </Button>
          </div>
          {tab === 'grid' ? (
            <BudgetGrid budgetId={selected.id} />
          ) : (
            <BudgetPlanFact budgetId={selected.id} fromDate={fromDate} toDate={toDate} />
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

```bash
git add packages/webapp/src/containers/Budgets/BudgetPlanFact.tsx packages/webapp/src/containers/Budgets/BudgetsPage.tsx
git commit -m "feat(webapp): add budgets page and plan-fact screen"
```
Откат: `git checkout -- packages/webapp/src/containers/Budgets/`.

---

## Task C6: Маршрут

**Files:**
- Modify: `packages/webapp/src/routes/dashboard.tsx`

- [ ] **Step 1: Добавить маршрут**

Рядом с маршрутом `/payment-calendar` (или `/management-articles`):

```tsx
  // Budgets
  {
    path: `/budgets`,
    component: lazy(() => import('@/containers/Budgets/BudgetsPage')),
    breadcrumb: intl.get('budgets.page_title'),
    pageTitle: intl.get('budgets.page_title'),
    subscriptionActive: [SUBSCRIPTION_TYPE.MAIN],
  },
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

```bash
git add packages/webapp/src/routes/dashboard.tsx
git commit -m "feat(webapp): register budgets route"
```
Откат: `git checkout -- packages/webapp/src/routes/dashboard.tsx`.

---

# Финальная проверка (после всех тасков)

- [ ] **Серверные тесты:** `pnpm --filter @bigfin/server test -- src/modules/Budgets` — зелёные.
- [ ] **Типы:** `pnpm typecheck` (сначала собрать `shared/`) — 0 ошибок.
- [ ] **Langs:** `node packages/webapp/scripts/lang-check.js` — exit 0.
- [ ] **Миграции:** `pnpm tenants:migrate:latest` → `rollback` → `latest` — без ошибок.
- [ ] **e2e на `en`** — зелёные.
- [ ] **Регрессия согласованности (ручная):** факт БДиР план-факта за месяц == ОПиУ по статьям за тот же месяц.
- [ ] **Ручная проверка `ru` + dogfooding** — чек-лист в PR.
- [ ] Флаг `budgets` остаётся `false` по умолчанию.

---

## Открытые вопросы, перенесённые из спеки

1. **Кассовый факт БДДС** реализован через отбор «кассово-расчётных reference» (Task B2/B3): учитываются проводки, чей reference касался денежного счёта и не является переводом. **Ограничение v1:** расход, проведённый через кредиторку (счёт-бил → оплата через AP), не попадает в кассовый факт по статье (встречная нога оплаты — пассив, не в карте статей). Для аудитории на кассовом методе (прямые доходы/расходы) это корректно; задокументировать в UI-подсказке. Пересмотр — после dogfooding.
2. **Экспорт план-факта PDF/Excel** — v1 JSON; экспорт через `FinancialStatements` — follow-up.
3. **Производительность кассового факта** — отбор reference на стороне Node. При росте — вынести в SQL-подзапрос.
4. **`onConflict().merge()`** в upsert (Task A7) — сверить поддержку в используемой версии Objection; иначе ручной upsert в цикле.
5. **Экспорт `ArticlesPlRollupService`** из `ManagementArticlesModule` (Task B5) — если не экспортирован, добавить в `exports` (additive правка Этапа 0).
6. **Режим «Сравнить сценарии»** (3 рядом) — в v1 сетка показывает активный сценарий; сравнение трёх — follow-up в рамках этапа.
