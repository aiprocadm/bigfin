# Deals (⑦a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать предпринимателю «Сделки»: завести сделку, привязать к ней операции, увидеть рентабельность (доходы − прямые расходы) и дашборд по сделкам.

**Architecture:** Переиспользуем спящее «измерение проектов» из базы BigCapital — таблица `projects` (как сущность «Сделка») и метку `projectId` на проводках. Прибыль считаем готовым движком `ArticlesPlRollupService`, добавив фильтр по сделке (зеркалит существующий `filterByBranches`). Новый модуль `Deals` (CQRS-паттерн, как `PaymentRequests`/`Debts`); новые shadcn-страницы; легаси-селектор «проект» в формах оживляем сменой значения флага. **Без новой миграции** (сущность ложится на готовую `projects`); кассовые продажи (`SaleReceipt`) — следующим заходом.

**Tech Stack:** NestJS 10 + Objection/Knex (MySQL), Jest (бэкенд-юниты, мокированы — работают без БД); React 18 + shadcn/ui + React Query + React Hook Form + Zod; `react-intl-universal` (i18n, парность EN↔RU).

---

## Предусловия и заметки для исполнителя

- **Ветка:** `feat/deals` (уже создана; на ней лежит спека). Работаем на ней.
- **Node:** `nvm use 18.16.1` (или `fnm`). Менеджер — только `pnpm`. `pnpm install` **не запускать** без явного запроса.
- **Проверки:** бэкенд — `pnpm --filter @bigfin/server test -- src/modules/Deals` (+ затронутые); типы — `pnpm typecheck`; парность лангов — `node packages/webapp/scripts/lang-check.js`.
- **Миграции локально не гоняем** (нет БД). В ⑦a миграции и нет — сущность «Сделка» уже легла на готовую таблицу `projects` (проверено: миграция `20220429121920_create_projects_table.ts`).
- **Бренд:** только «Bigfin». Все видимые строки — через `intl.get('deals.*')`. Копирайт `// © 2026 Bigfin` в новых файлах.
- **Маппинг имён:** доменная модель — `Deal`, таблица — `projects`, API — `/deals`, UI/термин — «Сделка». Это намеренно (бренд/термин «Проект» не показываем).

---

## File Structure

**Backend — новый модуль `packages/server/src/modules/Deals/`:**

```
Deals.module.ts                     # NestJS-модуль (+ предоставляет ArticlesPlRollupService)
Deals.application.ts                # фасад
Deals.controller.ts                 # @Controller('deals')
constants.ts                        # ERRORS, DEAL_STATUSES, DEFAULT_DEAL_STATUS
Deals.interfaces.ts                 # DealProfitability
models/Deal.model.ts                # tableName 'projects'
dtos/Deal.dto.ts                    # CreateDealDto / EditDealDto
dtos/GetDealsQuery.dto.ts           # фильтр по статусу
commands/CommandDealValidator.service.ts
commands/CreateDeal.service.ts
commands/EditDeal.service.ts
commands/DeleteDeal.service.ts
queries/GetDeals.service.ts         # список
queries/GetDeal.service.ts          # одна сделка
queries/GetDealsSummary.service.ts  # дашборд (маржа по каждой + итоги)
queries/GetDealProfitability.service.ts  # рентабельность одной сделки
utils/computeDealMargin.ts          # чистая (TDD)
utils/computeDealMargin.spec.ts
```

**Backend — правки существующих:**

```
common/types/Features.ts                                   # + DEALS = 'deals'
modules/Features/FeaturesConfigure.ts                      # + { DEALS, false }
modules/Features/FeaturesConfigure.deals.spec.ts           # NEW (тест флага)
modules/ManagementArticles/dtos/ArticlesRollupQuery.dto.ts # + projectId?
modules/ManagementArticles/queries/ArticlesPlRollup.service.ts      # + filterByProjects
modules/ManagementArticles/queries/ArticlesPlRollup.service.spec.ts # + project filter test
modules/SaleInvoices/ledger/InvoiceGL.ts                   # + projectId в проводки (выручка)
modules/SaleInvoices/ledger/InvoiceGL.spec.ts              # NEW (метка в проводках)
modules/Tenancy/TenancyModels/Tenancy.module.ts           # + регистрация Deal
modules/App/App.module.ts                                  # + DealsModule
```

**Frontend — новое + правки:**

```
containers/Deals/DealsPage.tsx           # список + дашборд + табы
containers/Deals/DealDialog.tsx          # RHF+Zod create/edit
containers/Deals/DealProfitability.tsx   # карточка рентабельности
containers/Deals/schemas.ts              # Zod
hooks/query/deals.tsx                     # хуки + мутации
hooks/query/types.tsx                     # + ключи DEALS
routes/dashboard.tsx                      # + маршрут /deals
constants/features.tsx                    # Projects: 'deals' (оживляет селектор)
containers/Projects/hooks/projects.ts     # useProjects → '/deals'
lang/en/index.json + lang/ru/index.json   # ключи deals.* (парно) + лейбл «Сделка»
```

---

# PART A — Фундамент (флаг, модель)

## Task A1: Feature-флаг `deals`

**Files:**
- Modify: `packages/server/src/common/types/Features.ts`
- Modify: `packages/server/src/modules/Features/FeaturesConfigure.ts`
- Create: `packages/server/src/modules/Features/FeaturesConfigure.deals.spec.ts`

- [ ] **Step 1: Добавить значение в enum.** В `Features.ts`, в `enum Features`, после строки `PAYMENT_REQUESTS = 'payment_requests',` добавить:

```ts
  DEALS = 'deals',
```

- [ ] **Step 2: Зарегистрировать флаг.** В `FeaturesConfigure.ts`, в массиве `getConfigure()`, после блока `Features.PAYMENT_REQUESTS` добавить:

```ts
      {
        name: Features.DEALS,
        defaultValue: false,
      },
```

- [ ] **Step 3: Написать тест флага.** Создать `FeaturesConfigure.deals.spec.ts`:

```ts
// © 2026 Bigfin
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure — deals', () => {
  it('registers the deals feature, off by default', () => {
    const configure = new FeaturesConfigure({ get: () => undefined } as any);
    const entry = configure
      .getConfigure()
      .find((f) => f.name === Features.DEALS);

    expect(entry).toBeDefined();
    expect(entry!.defaultValue).toBe(false);
  });
});
```

- [ ] **Step 4: Прогнать тест.** Run: `pnpm --filter @bigfin/server test -- src/modules/Features/FeaturesConfigure.deals.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add packages/server/src/common/types/Features.ts packages/server/src/modules/Features/FeaturesConfigure.ts packages/server/src/modules/Features/FeaturesConfigure.deals.spec.ts
git commit -m "feat(deals): add DEALS feature flag (default off)"
```

## Task A2: Константы и интерфейсы модуля

**Files:**
- Create: `packages/server/src/modules/Deals/constants.ts`
- Create: `packages/server/src/modules/Deals/Deals.interfaces.ts`

- [ ] **Step 1: constants.ts.**

```ts
// © 2026 Bigfin
export const ERRORS = {
  DEAL_NOT_FOUND: 'DEAL_NOT_FOUND',
  CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
  DEAL_HAS_OPERATIONS: 'DEAL_HAS_OPERATIONS',
};

export const DEAL_STATUSES = ['in_progress', 'completed', 'cancelled'] as const;
export const DEFAULT_DEAL_STATUS = 'in_progress';
```

- [ ] **Step 2: Deals.interfaces.ts.**

```ts
// © 2026 Bigfin
export interface DealProfitability {
  dealId: number;
  revenue: number;
  costs: number;
  profit: number;
  margin: number; // доля 0..1
  articles: Array<{
    id: number;
    name: string;
    kind: string;
    amount: number;
    parentId?: number | null;
  }>;
}
```

- [ ] **Step 3: Commit.**

```bash
git add packages/server/src/modules/Deals/constants.ts packages/server/src/modules/Deals/Deals.interfaces.ts
git commit -m "feat(deals): module constants and interfaces"
```

## Task A3: Модель `Deal` (на таблице `projects`) + регистрация

**Files:**
- Create: `packages/server/src/modules/Deals/models/Deal.model.ts`
- Modify: `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts`

- [ ] **Step 1: Модель.** Создать `Deal.model.ts`:

```ts
// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class Deal extends TenantBaseModel {
  name!: string;
  contactId!: number | null;
  deadline!: string | null;
  costEstimate!: number | null;
  status!: string;

  /** Reuses the dormant base "projects" table as the Deal entity. */
  static get tableName() {
    return 'projects';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get modifiers() {
    return {
      filterByStatus(query, status: string) {
        query.where('status', status);
      },
    };
  }
}
```

- [ ] **Step 2: Зарегистрировать модель.** В `Tenancy.module.ts`: рядом с импортом `PaymentRequest` (около строки 50) добавить:

```ts
import { Deal } from '@/modules/Deals/models/Deal.model';
```

и в массив моделей (рядом с `PaymentRequest,`, около строки 97) добавить `Deal,`.

- [ ] **Step 3: Проверка типов.** Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add packages/server/src/modules/Deals/models/Deal.model.ts packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts
git commit -m "feat(deals): Deal model over projects table + tenancy registration"
```

---

# PART B — Рентабельность (фильтр свёртки, чистая математика, починка выручки)

## Task B1: Фильтр свёртки по сделке (`filterByProjects`)

**Files:**
- Modify: `packages/server/src/modules/ManagementArticles/dtos/ArticlesRollupQuery.dto.ts`
- Modify: `packages/server/src/modules/ManagementArticles/queries/ArticlesPlRollup.service.ts`
- Modify (test): `packages/server/src/modules/ManagementArticles/queries/ArticlesPlRollup.service.spec.ts`

- [ ] **Step 1: Написать падающий тест.** В `ArticlesPlRollup.service.spec.ts`, в блоке `describe('ArticlesPlRollupService.getRollup (date filter)' ...)`, добавить кейс:

```ts
  it('applies the project filter when projectId is provided', async () => {
    const { service, modify } = makeService();

    await service.getRollup({ projectId: 5 } as any);

    expect(modify).toHaveBeenCalledWith('filterByProjects', [5]);
  });
```

- [ ] **Step 2: Прогнать — упадёт.** Run: `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles/queries/ArticlesPlRollup.service.spec.ts`
Expected: FAIL (`filterByProjects` не вызывается).

- [ ] **Step 3: Расширить DTO.** В `ArticlesRollupQuery.dto.ts` заменить импорты и добавить поле:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { ToNumber } from '@/common/decorators/Validators';
import { FinancialSheetBranchesQueryDto } from '@/modules/FinancialStatements/dtos/FinancialSheetBranchesQuery.dto';

export class ArticlesRollupQueryDto extends FinancialSheetBranchesQueryDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-01-01', description: 'From date' })
  fromDate?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-12-31', description: 'To date' })
  toDate?: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 5, description: 'Deal (project) id' })
  projectId?: number;
}
```

- [ ] **Step 4: Применить фильтр в свёртке.** В `ArticlesPlRollup.service.ts`, в `getRollup()` внутри `onBuild`, сразу после блока `if (!isEmpty(query.branchesIds)) { qb.modify('filterByBranches', query.branchesIds); }` добавить:

```ts
        if (query.projectId) {
          qb.modify('filterByProjects', [query.projectId]);
        }
```

- [ ] **Step 5: Прогнать — пройдёт.** Run: `pnpm --filter @bigfin/server test -- src/modules/ManagementArticles/queries/ArticlesPlRollup.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add packages/server/src/modules/ManagementArticles/dtos/ArticlesRollupQuery.dto.ts packages/server/src/modules/ManagementArticles/queries/ArticlesPlRollup.service.ts packages/server/src/modules/ManagementArticles/queries/ArticlesPlRollup.service.spec.ts
git commit -m "feat(deals): add project filter to articles P&L rollup (TDD)"
```

## Task B2: Чистая функция `computeDealMargin` (TDD)

**Files:**
- Create: `packages/server/src/modules/Deals/utils/computeDealMargin.ts`
- Create: `packages/server/src/modules/Deals/utils/computeDealMargin.spec.ts`

- [ ] **Step 1: Падающий тест.** Создать `computeDealMargin.spec.ts`:

```ts
import { computeDealMargin } from './computeDealMargin';

describe('computeDealMargin', () => {
  it('revenue − costs = profit; margin = profit/revenue (top-level rows only)', () => {
    const rows = [
      { id: 1, name: 'Доходы', kind: 'income', parentId: null, amount: 600 },
      { id: 2, name: 'Расходы', kind: 'expense', parentId: null, amount: 390 },
      { id: 3, name: 'Выручка', kind: 'income', parentId: 1, amount: 600 }, // потомок — игнор
    ];

    expect(computeDealMargin(rows)).toEqual({
      revenue: 600,
      costs: 390,
      profit: 210,
      margin: 210 / 600,
    });
  });

  it('margin is 0 when revenue is 0 (no division by zero)', () => {
    const rows = [
      { id: 2, name: 'Расходы', kind: 'expense', parentId: null, amount: 100 },
    ];

    expect(computeDealMargin(rows)).toEqual({
      revenue: 0,
      costs: 100,
      profit: -100,
      margin: 0,
    });
  });
});
```

- [ ] **Step 2: Прогнать — упадёт.** Run: `pnpm --filter @bigfin/server test -- src/modules/Deals/utils/computeDealMargin.spec.ts`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализация.** Создать `computeDealMargin.ts`:

```ts
// © 2026 Bigfin
export interface ArticleRow {
  id: number;
  name: string;
  kind: string;
  amount: number;
  parentId?: number | null;
}

export interface DealMargin {
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
}

/**
 * Считает выручку/расходы/прибыль/маржу по строкам свёртки статей
 * (доход и расход — оба положительные магнитуды). Берём только корневые
 * строки (`parentId == null`): их amount уже содержит сумму поддерева
 * (см. rollupAmountsToAncestors), поэтому суммирование потомков задвоило бы.
 */
export function computeDealMargin(rows: ArticleRow[]): DealMargin {
  const tops = rows.filter((r) => r.parentId == null);
  const sumKind = (kind: string) =>
    tops
      .filter((r) => r.kind === kind)
      .reduce((s, r) => s + (r.amount ?? 0), 0);

  const revenue = sumKind('income');
  const costs = sumKind('expense');
  const profit = revenue - costs;
  const margin = revenue > 0 ? profit / revenue : 0;

  return { revenue, costs, profit, margin };
}
```

- [ ] **Step 4: Прогнать — пройдёт.** Run: `pnpm --filter @bigfin/server test -- src/modules/Deals/utils/computeDealMargin.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add packages/server/src/modules/Deals/utils/computeDealMargin.ts packages/server/src/modules/Deals/utils/computeDealMargin.spec.ts
git commit -m "feat(deals): add computeDealMargin pure function (TDD)"
```

## Task B3: Запрос рентабельности сделки

**Files:**
- Create: `packages/server/src/modules/Deals/queries/GetDealProfitability.service.ts`
- Create (test): `packages/server/src/modules/Deals/queries/GetDealProfitability.service.spec.ts`

- [ ] **Step 1: Падающий тест.** Создать `GetDealProfitability.service.spec.ts`:

```ts
import { GetDealProfitabilityService } from './GetDealProfitability.service';

describe('GetDealProfitabilityService', () => {
  const makeService = (deal: any) => {
    const rollup = {
      getRollup: jest.fn().mockResolvedValue([
        { id: 1, name: 'Доходы', kind: 'income', parentId: null, amount: 600 },
        { id: 2, name: 'Расходы', kind: 'expense', parentId: null, amount: 390 },
      ]),
    };
    const dealModel = () => ({
      query: () => ({ findById: () => Promise.resolve(deal) }),
    });
    const service = new GetDealProfitabilityService(
      rollup as any,
      dealModel as any,
    );
    return { service, rollup };
  };

  it('filters rollup by dealId and returns margin', async () => {
    const { service, rollup } = makeService({ id: 5, name: 'X' });

    const res = await service.getProfitability(5, {});

    expect(rollup.getRollup).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 5 }),
    );
    expect(res).toMatchObject({
      dealId: 5,
      revenue: 600,
      costs: 390,
      profit: 210,
    });
  });

  it('throws when the deal is missing', async () => {
    const { service } = makeService(undefined);
    await expect(service.getProfitability(99, {})).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Прогнать — упадёт.** Run: `pnpm --filter @bigfin/server test -- src/modules/Deals/queries/GetDealProfitability.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Реализация.** Создать `GetDealProfitability.service.ts`:

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { computeDealMargin } from '../utils/computeDealMargin';
import { ERRORS } from '../constants';
import { DealProfitability } from '../Deals.interfaces';

@Injectable()
export class GetDealProfitabilityService {
  constructor(
    private readonly rollup: ArticlesPlRollupService,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public async getProfitability(
    dealId: number,
    query: { fromDate?: string; toDate?: string },
  ): Promise<DealProfitability> {
    const deal = await this.dealModel().query().findById(dealId);
    if (!deal) throw new ServiceError(ERRORS.DEAL_NOT_FOUND);

    const rows = await this.rollup.getRollup({
      projectId: dealId,
      fromDate: query.fromDate,
      toDate: query.toDate,
    } as any);

    const margin = computeDealMargin(rows as any);
    return { dealId, ...margin, articles: rows as any };
  }
}
```

- [ ] **Step 4: Прогнать — пройдёт.** Run: `pnpm --filter @bigfin/server test -- src/modules/Deals/queries/GetDealProfitability.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add packages/server/src/modules/Deals/queries/GetDealProfitability.service.ts packages/server/src/modules/Deals/queries/GetDealProfitability.service.spec.ts
git commit -m "feat(deals): add deal profitability query (reuses rollup)"
```

## Task B4: Починка выручки — метка сделки в проводки счёта

**Files:**
- Modify: `packages/server/src/modules/SaleInvoices/ledger/InvoiceGL.ts:79`
- Create (test): `packages/server/src/modules/SaleInvoices/ledger/InvoiceGL.spec.ts`

- [ ] **Step 1: Падающий тест.** Создать `InvoiceGL.spec.ts`:

```ts
import { InvoiceGL } from './InvoiceGL';

describe('InvoiceGL — deal (project) dimension', () => {
  it('stamps projectId onto every invoice GL entry', () => {
    const invoice: any = {
      id: 1,
      projectId: 7,
      branchId: 2,
      currencyCode: 'RUB',
      exchangeRate: 1,
      totalLocal: 100,
      customerId: 3,
      entries: [],
      invoiceDate: '2026-06-01',
      invoiceNo: '1',
      referenceNo: null,
      createdAt: '2026-06-01',
      discountAmountLocal: 0,
      adjustmentLocal: 0,
    };
    const gl = new InvoiceGL(invoice);
    gl.setARAccountId(10);
    gl.setTaxPayableAccountId(11);
    gl.setDiscountAccountId(12);
    gl.setOtherChargesAccountId(13);

    const entries = gl.getInvoiceGLEntries();

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e: any) => e.projectId === 7)).toBe(true);
  });
});
```

- [ ] **Step 2: Прогнать — упадёт.** Run: `pnpm --filter @bigfin/server test -- src/modules/SaleInvoices/ledger/InvoiceGL.spec.ts`
Expected: FAIL (`projectId` отсутствует / `undefined`).

- [ ] **Step 3: Реализация.** В `InvoiceGL.ts`, в геттере `invoiceGLCommonEntry`, после строки `branchId: this.saleInvoice.branchId,` (строка 79) добавить:

```ts
      projectId: this.saleInvoice.projectId,
```

- [ ] **Step 4: Прогнать — пройдёт.** Run: `pnpm --filter @bigfin/server test -- src/modules/SaleInvoices/ledger/InvoiceGL.spec.ts`
Expected: PASS.

- [ ] **Step 5: Проверка типов.** Run: `pnpm typecheck`
Expected: PASS. (Если `SaleInvoice` модель не объявляет `projectId` — добавить `public readonly projectId!: number;` в модель `SaleInvoices/models/SaleInvoice.ts`; колонка `sales_invoices.projectId` уже существует.)

- [ ] **Step 6: Commit.**

```bash
git add packages/server/src/modules/SaleInvoices/ledger/InvoiceGL.ts packages/server/src/modules/SaleInvoices/ledger/InvoiceGL.spec.ts
git commit -m "fix(deals): propagate projectId from invoices to the ledger (revenue)"
```

> **Заметка по объёму:** кассовые продажи (`SaleReceiptGL` тоже не пишет `projectId`, и у `sale_receipts` нет колонки) — **отдельный заход** (нужны миграция + GL + селектор в форме чека). В ⑦a выручка тегается через счета (основной путь). Зафиксировано в §12 спеки.

---

# PART C — CRUD, дашборд, wiring

## Task C1: DTO сделки

**Files:**
- Create: `packages/server/src/modules/Deals/dtos/Deal.dto.ts`
- Create: `packages/server/src/modules/Deals/dtos/GetDealsQuery.dto.ts`

- [ ] **Step 1: Deal.dto.ts.**

```ts
// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  MinLength,
} from 'class-validator';
import { DEAL_STATUSES } from '../constants';

class CommandDealDto {
  @IsString()
  @MinLength(1)
  @ApiProperty({ example: 'Сайт «Ромашка»', description: 'Deal name' })
  name: string;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 3, description: 'Client contact id' })
  contactId?: number;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-06-30', description: 'Deadline' })
  deadline?: string;

  @ToNumber()
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ example: 350000, description: 'Budget / cost estimate' })
  costEstimate?: number;

  @IsString()
  @IsIn(DEAL_STATUSES as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: DEAL_STATUSES })
  status?: string;
}

export class CreateDealDto extends CommandDealDto {}
export class EditDealDto extends CommandDealDto {}
```

- [ ] **Step 2: GetDealsQuery.dto.ts.**

```ts
// © 2026 Bigfin
import { IsOptional } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { DEAL_STATUSES } from '../constants';

export class GetDealsQueryDto {
  @IsString()
  @IsIn(DEAL_STATUSES as unknown as string[])
  @IsOptional()
  @ApiPropertyOptional({ enum: DEAL_STATUSES })
  status?: string;
}
```

- [ ] **Step 3: Проверка типов + commit.** Run: `pnpm typecheck` → PASS.

```bash
git add packages/server/src/modules/Deals/dtos/Deal.dto.ts packages/server/src/modules/Deals/dtos/GetDealsQuery.dto.ts
git commit -m "feat(deals): add deal DTOs"
```

## Task C2: Валидатор и команды (create/edit/delete)

**Files:**
- Create: `commands/CommandDealValidator.service.ts` (+ `.spec.ts`)
- Create: `commands/CreateDeal.service.ts`, `commands/EditDeal.service.ts`, `commands/DeleteDeal.service.ts`

- [ ] **Step 1: Падающий тест валидатора.** Создать `commands/CommandDealValidator.service.spec.ts`:

```ts
import { CommandDealValidatorService } from './CommandDealValidator.service';

describe('CommandDealValidatorService', () => {
  const make = (contact: any) => {
    const contactModel = () => ({
      query: () => ({ findById: () => Promise.resolve(contact) }),
    });
    return new CommandDealValidatorService(contactModel as any);
  };

  it('throws when the contact is missing', async () => {
    await expect(make(undefined).validateRefs({ contactId: 9 })).rejects.toThrow();
  });

  it('passes when no contactId is provided', async () => {
    await expect(make(undefined).validateRefs({})).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Прогнать — упадёт.** Run: `pnpm --filter @bigfin/server test -- src/modules/Deals/commands/CommandDealValidator.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Валидатор.** Создать `CommandDealValidator.service.ts`:

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Contact } from '@/modules/Contacts/models/Contact';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ERRORS } from '../constants';

@Injectable()
export class CommandDealValidatorService {
  constructor(
    @Inject(Contact.name)
    private readonly contactModel: TenantModelProxy<typeof Contact>,
  ) {}

  public async validateRefs(dto: { contactId?: number }) {
    if (
      dto.contactId &&
      !(await this.contactModel().query().findById(dto.contactId))
    ) {
      throw new ServiceError(ERRORS.CONTACT_NOT_FOUND);
    }
  }
}
```

- [ ] **Step 4: Прогнать — пройдёт.** Run: `pnpm --filter @bigfin/server test -- src/modules/Deals/commands/CommandDealValidator.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: CreateDeal.service.ts.**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { CommandDealValidatorService } from './CommandDealValidator.service';
import { CreateDealDto } from '../dtos/Deal.dto';
import { DEFAULT_DEAL_STATUS } from '../constants';

@Injectable()
export class CreateDealService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandDealValidatorService,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public async create(dto: CreateDealDto) {
    await this.validator.validateRefs(dto);

    return this.uow.withTransaction((trx: Knex.Transaction) =>
      this.dealModel()
        .query(trx)
        .insert({ ...dto, status: dto.status || DEFAULT_DEAL_STATUS } as any),
    );
  }
}
```

- [ ] **Step 6: EditDeal.service.ts.**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { CommandDealValidatorService } from './CommandDealValidator.service';
import { EditDealDto } from '../dtos/Deal.dto';
import { ERRORS } from '../constants';

@Injectable()
export class EditDealService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandDealValidatorService,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public async edit(id: number, dto: EditDealDto) {
    const deal = await this.dealModel().query().findById(id);
    if (!deal) throw new ServiceError(ERRORS.DEAL_NOT_FOUND);
    await this.validator.validateRefs(dto);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.dealModel().query(trx).findById(id).patch({ ...dto } as any);
      return this.dealModel().query(trx).findById(id);
    });
  }
}
```

- [ ] **Step 7: DeleteDeal.service.ts** (с защитой от удаления сделки с операциями):

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { Deal } from '../models/Deal.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteDealService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,

    @Inject(AccountTransaction.name)
    private readonly txnModel: TenantModelProxy<typeof AccountTransaction>,
  ) {}

  public async delete(id: number) {
    const deal = await this.dealModel().query().findById(id);
    if (!deal) throw new ServiceError(ERRORS.DEAL_NOT_FOUND);

    // Не удаляем сделку, на которую уже навешаны проводки (FK + смысл).
    const used = await this.txnModel()
      .query()
      .where('projectId', id)
      .first();
    if (used) throw new ServiceError(ERRORS.DEAL_HAS_OPERATIONS);

    return this.uow.withTransaction((trx: Knex.Transaction) =>
      this.dealModel().query(trx).findById(id).delete(),
    );
  }
}
```

- [ ] **Step 8: Проверка + commit.** Run: `pnpm --filter @bigfin/server test -- src/modules/Deals` и `pnpm typecheck` → PASS.

```bash
git add packages/server/src/modules/Deals/commands
git commit -m "feat(deals): create/edit/delete commands + validator (TDD)"
```

## Task C3: Запросы списка, одной сделки и сводки-дашборда

**Files:**
- Create: `queries/GetDeals.service.ts`, `queries/GetDeal.service.ts`, `queries/GetDealsSummary.service.ts`

- [ ] **Step 1: GetDeals.service.ts.**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { GetDealsQueryDto } from '../dtos/GetDealsQuery.dto';

@Injectable()
export class GetDealsService {
  constructor(
    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public getDeals(filter: GetDealsQueryDto) {
    return this.dealModel()
      .query()
      .onBuild((q) => {
        if (filter.status) q.modify('filterByStatus', filter.status);
        q.orderBy('createdAt', 'desc');
      });
  }
}
```

- [ ] **Step 2: GetDeal.service.ts.**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { ERRORS } from '../constants';

@Injectable()
export class GetDealService {
  constructor(
    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public async getDeal(id: number) {
    const deal = await this.dealModel().query().findById(id);
    if (!deal) throw new ServiceError(ERRORS.DEAL_NOT_FOUND);
    return deal;
  }
}
```

- [ ] **Step 3: GetDealsSummary.service.ts** (маржа по каждой сделке + итоги, сортировка по прибыли):

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { computeDealMargin } from '../utils/computeDealMargin';

@Injectable()
export class GetDealsSummaryService {
  constructor(
    private readonly rollup: ArticlesPlRollupService,

    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public async getSummary(query: { fromDate?: string; toDate?: string }) {
    const deals: any[] = await this.dealModel().query();

    const rows = await Promise.all(
      deals.map(async (d) => {
        const r = await this.rollup.getRollup({
          projectId: d.id,
          fromDate: query.fromDate,
          toDate: query.toDate,
        } as any);
        const m = computeDealMargin(r as any);
        return { id: d.id, name: d.name, status: d.status, ...m };
      }),
    );

    rows.sort((a, b) => b.profit - a.profit);

    const totals = rows.reduce(
      (t, r) => ({
        revenue: t.revenue + r.revenue,
        costs: t.costs + r.costs,
        profit: t.profit + r.profit,
      }),
      { revenue: 0, costs: 0, profit: 0 },
    );

    return { deals: rows, totals };
  }
}
```

> **Производительность:** сводка делает по одной свёртке на сделку (N запросов). Для типичного числа сделок (десятки) приемлемо; оптимизация одним сгруппированным запросом — бэклог (зафиксировать).

- [ ] **Step 4: Проверка + commit.** Run: `pnpm typecheck` → PASS.

```bash
git add packages/server/src/modules/Deals/queries/GetDeals.service.ts packages/server/src/modules/Deals/queries/GetDeal.service.ts packages/server/src/modules/Deals/queries/GetDealsSummary.service.ts
git commit -m "feat(deals): list, get and dashboard-summary queries"
```

## Task C4: Application, Controller, Module + wiring

**Files:**
- Create: `Deals.application.ts`, `Deals.controller.ts`, `Deals.module.ts`
- Modify: `packages/server/src/modules/App/App.module.ts`

- [ ] **Step 1: Application.**

```ts
// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetDealsService } from './queries/GetDeals.service';
import { GetDealService } from './queries/GetDeal.service';
import { GetDealsSummaryService } from './queries/GetDealsSummary.service';
import { GetDealProfitabilityService } from './queries/GetDealProfitability.service';
import { CreateDealService } from './commands/CreateDeal.service';
import { EditDealService } from './commands/EditDeal.service';
import { DeleteDealService } from './commands/DeleteDeal.service';
import { CreateDealDto, EditDealDto } from './dtos/Deal.dto';
import { GetDealsQueryDto } from './dtos/GetDealsQuery.dto';

@Injectable()
export class DealsApplication {
  constructor(
    private readonly listService: GetDealsService,
    private readonly getService: GetDealService,
    private readonly summaryService: GetDealsSummaryService,
    private readonly profitabilityService: GetDealProfitabilityService,
    private readonly createService: CreateDealService,
    private readonly editService: EditDealService,
    private readonly deleteService: DeleteDealService,
  ) {}

  getDeals(query: GetDealsQueryDto) {
    return this.listService.getDeals(query);
  }
  getDeal(id: number) {
    return this.getService.getDeal(id);
  }
  getSummary(query: { fromDate?: string; toDate?: string }) {
    return this.summaryService.getSummary(query);
  }
  getProfitability(id: number, query: { fromDate?: string; toDate?: string }) {
    return this.profitabilityService.getProfitability(id, query);
  }
  createDeal(dto: CreateDealDto) {
    return this.createService.create(dto);
  }
  editDeal(id: number, dto: EditDealDto) {
    return this.editService.edit(id, dto);
  }
  deleteDeal(id: number) {
    return this.deleteService.delete(id);
  }
}
```

- [ ] **Step 2: Controller** (важно: `summary` объявлен ДО `:id`, иначе перехватит):

```ts
// © 2026 Bigfin
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { DealsApplication } from './Deals.application';
import { CreateDealDto, EditDealDto } from './dtos/Deal.dto';
import { GetDealsQueryDto } from './dtos/GetDealsQuery.dto';

@Controller('deals')
@ApiTags('Deals')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class DealsController {
  constructor(private readonly application: DealsApplication) {}

  @Get()
  @ApiOperation({ summary: 'List deals (filter by status).' })
  getList(@Query() query: GetDealsQueryDto) {
    return this.application.getDeals(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Deals dashboard summary (per-deal margins + totals).' })
  getSummary(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.application.getSummary({ fromDate, toDate });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a deal.' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.application.getDeal(id);
  }

  @Get(':id/profitability')
  @ApiOperation({ summary: 'Deal profitability (revenue − direct costs).' })
  profitability(
    @Param('id', ParseIntPipe) id: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.application.getProfitability(id, { fromDate, toDate });
  }

  @Post()
  @ApiOperation({ summary: 'Create a deal.' })
  create(@Body() dto: CreateDealDto) {
    return this.application.createDeal(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edit a deal.' })
  edit(@Param('id', ParseIntPipe) id: number, @Body() dto: EditDealDto) {
    return this.application.editDeal(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a deal.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteDeal(id);
  }
}
```

- [ ] **Step 3: Module** (предоставляет `ArticlesPlRollupService` — его deps это глобальные тенант-модели):

```ts
// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { DealsController } from './Deals.controller';
import { DealsApplication } from './Deals.application';
import { GetDealsService } from './queries/GetDeals.service';
import { GetDealService } from './queries/GetDeal.service';
import { GetDealsSummaryService } from './queries/GetDealsSummary.service';
import { GetDealProfitabilityService } from './queries/GetDealProfitability.service';
import { CommandDealValidatorService } from './commands/CommandDealValidator.service';
import { CreateDealService } from './commands/CreateDeal.service';
import { EditDealService } from './commands/EditDeal.service';
import { DeleteDealService } from './commands/DeleteDeal.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule],
  controllers: [DealsController],
  providers: [
    DealsApplication,
    GetDealsService,
    GetDealService,
    GetDealsSummaryService,
    GetDealProfitabilityService,
    CommandDealValidatorService,
    CreateDealService,
    EditDealService,
    DeleteDealService,
    ArticlesPlRollupService,
  ],
})
export class DealsModule {}
```

- [ ] **Step 4: Wire в App.module.ts.** Рядом с `import { PaymentRequestsModule } ...` (строка ~41) добавить:

```ts
import { DealsModule } from '../Deals/Deals.module';
```

и в массив `imports` рядом с `PaymentRequestsModule,` (строка ~211) добавить `DealsModule,`.

- [ ] **Step 5: Проверка + commit.** Run: `pnpm --filter @bigfin/server test -- src/modules/Deals` и `pnpm typecheck` → PASS.

```bash
git add packages/server/src/modules/Deals/Deals.application.ts packages/server/src/modules/Deals/Deals.controller.ts packages/server/src/modules/Deals/Deals.module.ts packages/server/src/modules/App/App.module.ts
git commit -m "feat(deals): wire application, controller, module + endpoints"
```

**Точка паузы:** после Part C бэкенд сделок и рентабельность работают (эндпоинты `/deals*`).

---

# PART D — Фронтенд (shadcn) + оживление селектора

> Образцы: `hooks/query/paymentRequests.tsx`, `containers/PaymentRequests/{PaymentRequestsPage,PaymentRequestDialog,schemas}.tsx`, `routes/dashboard.tsx`.

## Task D1: Ключи кэша + React Query хуки

**Files:**
- Modify: `packages/webapp/src/hooks/query/types.tsx`
- Create: `packages/webapp/src/hooks/query/deals.tsx`

- [ ] **Step 1: Ключи кэша.** В `types.tsx` рядом с блоком `const PAYMENT_REQUESTS = {...}` (около строки 280) добавить:

```ts
const DEALS = {
  DEALS: 'DEALS',
  DEAL: 'DEAL',
  DEAL_SUMMARY: 'DEAL_SUMMARY',
  DEAL_PROFITABILITY: 'DEAL_PROFITABILITY',
};
```

и в дефолтный экспорт (рядом с `...PAYMENT_REQUESTS,`) добавить `...DEALS,`.

- [ ] **Step 2: Хуки.** Создать `deals.tsx`:

```tsx
// © 2026 Bigfin
import {
  useMutation,
  useQueryClient,
  QueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

export interface DealValues {
  name: string;
  contactId?: number | null;
  deadline?: string | null;
  costEstimate?: number | null;
  status?: string;
}

const invalidate = (client: QueryClient) => {
  client.invalidateQueries(t.DEALS);
  client.invalidateQueries(t.DEAL);
  client.invalidateQueries(t.DEAL_SUMMARY);
  client.invalidateQueries(t.DEAL_PROFITABILITY);
};

export function useDeals(query?: any, props?: any) {
  return useRequestQuery(
    [t.DEALS, query],
    { method: 'get', url: 'deals', params: query },
    { select: (res: any) => res.data.data, defaultData: [], ...props },
  );
}

export function useDeal(id: number | string, props?: any) {
  return useRequestQuery(
    [t.DEAL, id],
    { method: 'get', url: `deals/${id}` },
    { select: (res: any) => res.data, defaultData: {}, enabled: !!id, ...props },
  );
}

export function useDealsSummary(query?: any, props?: any) {
  return useRequestQuery(
    [t.DEAL_SUMMARY, query],
    { method: 'get', url: 'deals/summary', params: query },
    {
      select: (res: any) => res.data,
      defaultData: { deals: [], totals: { revenue: 0, costs: 0, profit: 0 } },
      ...props,
    },
  );
}

export function useDealProfitability(id: number | string, query?: any, props?: any) {
  return useRequestQuery(
    [t.DEAL_PROFITABILITY, id, query],
    { method: 'get', url: `deals/${id}/profitability`, params: query },
    { select: (res: any) => res.data, defaultData: {}, enabled: !!id, ...props },
  );
}

export function useCreateDeal(props?: UseMutationOptions<any, any, DealValues>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, DealValues>(
    (values) => api.post('deals', values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useEditDeal(
  props?: UseMutationOptions<any, any, [number | string, DealValues]>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, [number | string, DealValues]>(
    ([id, values]) => api.put(`deals/${id}`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeleteDeal(
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (id) => api.delete(`deals/${id}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}
```

- [ ] **Step 3: Проверка типов + commit.** Run: `pnpm typecheck` → PASS.

```bash
git add packages/webapp/src/hooks/query/types.tsx packages/webapp/src/hooks/query/deals.tsx
git commit -m "feat(webapp/deals): react-query hooks and cache keys"
```

## Task D2: Zod-схема, диалог, страница (список + дашборд), карточка рентабельности

**Files:**
- Create: `containers/Deals/schemas.ts`, `containers/Deals/DealDialog.tsx`, `containers/Deals/DealsPage.tsx`, `containers/Deals/DealProfitability.tsx`

- [ ] **Step 1: schemas.ts.**

```ts
// © 2026 Bigfin
import { z } from 'zod';
import intl from 'react-intl-universal';

export const getDealSchema = () =>
  z.object({
    name: z.string().min(1, intl.get('deals.error.name_required')),
    contactId: z.number().nullable().optional(),
    deadline: z.string().optional(),
    costEstimate: z
      .number()
      .nonnegative(intl.get('deals.error.budget_nonnegative'))
      .nullable()
      .optional(),
    status: z.string().optional(),
  });

export type DealFormValues = z.infer<ReturnType<typeof getDealSchema>>;
```

- [ ] **Step 2: DealDialog.tsx** (RHF+Zod; клиент из `useCustomers`; поддерживает создание и правку):

```tsx
// © 2026 Bigfin
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
import { useCustomers } from '@/hooks/query/customers';
import { useCreateDeal, useEditDeal } from '@/hooks/query/deals';
import { getDealSchema, DealFormValues } from './schemas';

interface Props {
  deal?: any; // when present → edit mode
  onDone: () => void;
  onCancel: () => void;
}

interface CustomerRow {
  id: number;
  display_name?: string;
  displayName?: string;
}

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

const STATUS_OPTIONS = ['in_progress', 'completed', 'cancelled'];

export function DealDialog({ deal, onDone, onCancel }: Props) {
  const isEdit = !!deal?.id;
  const createMutation = useCreateDeal({});
  const editMutation = useEditDeal({});
  const { data: customersData } = useCustomers({}, {});
  const customers: CustomerRow[] =
    (customersData as any)?.customers ?? (customersData as any) ?? [];

  const form = useForm<DealFormValues>({
    resolver: zodResolver(getDealSchema()),
    defaultValues: {
      name: deal?.name ?? '',
      contactId: deal?.contactId ?? null,
      deadline: deal?.deadline ?? '',
      costEstimate: deal?.costEstimate ?? null,
      status: deal?.status ?? 'in_progress',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: DealFormValues) => {
    const payload = {
      name: values.name,
      contactId: values.contactId ?? undefined,
      deadline: values.deadline || undefined,
      costEstimate: values.costEstimate ?? undefined,
      status: values.status || undefined,
    };
    try {
      if (isEdit) {
        await editMutation.mutateAsync([deal.id, payload]);
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(intl.get('deals.saved'));
      onDone();
    } catch {
      toast.error(intl.get('deals.save_error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {intl.get(isEdit ? 'deals.edit_title' : 'deals.create')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('deals.field.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('deals.field.client')}</FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value == null ? '' : String(field.value)}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? null : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option value="">—</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.display_name ?? c.displayName ?? `#${c.id}`}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('deals.field.deadline')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="costEstimate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('deals.field.budget')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? null : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('deals.field.status')}</FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value ?? 'in_progress'}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {intl.get(`deals.status.${s}`)}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {intl.get('deals.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {intl.get('deals.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

> **Заметка:** поле имени клиента у `customers` — `display_name` или `displayName` (зависит от трансформера). Диалог читает оба варианта; при исполнении подтвердить и оставить нужный.

- [ ] **Step 3: DealProfitability.tsx** (карточка рентабельности одной сделки):

```tsx
// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDealProfitability } from '@/hooks/query/deals';

const fmt = (n: number) => `${(n ?? 0).toLocaleString('ru-RU')} ₽`;
const pct = (n: number) => `${Math.round((n ?? 0) * 100)}%`;

export function DealProfitability({ deal }: { deal: any }) {
  const { data } = useDealProfitability(deal?.id, {}, {});
  const p: any = data ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>{deal?.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span>{intl.get('deals.profitability.revenue')}</span>
          <span>{fmt(p.revenue)}</span>
        </div>
        <div className="flex justify-between">
          <span>{intl.get('deals.profitability.costs')}</span>
          <span>{fmt(p.costs)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>{intl.get('deals.profitability.profit')}</span>
          <span>
            {fmt(p.profit)} · {pct(p.margin)}
          </span>
        </div>
        {deal?.costEstimate != null && (
          <div className="text-muted-foreground flex justify-between">
            <span>{intl.get('deals.profitability.budget_vs_actual')}</span>
            <span>
              {fmt(deal.costEstimate)} → {fmt(p.costs)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: DealsPage.tsx** (список + табы + дашборд + создание/правка + рентабельность):

```tsx
// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeals, useDealsSummary, useDeleteDeal } from '@/hooks/query/deals';
import { DealDialog } from './DealDialog';
import { DealProfitability } from './DealProfitability';

type StatusFilter = '' | 'in_progress' | 'completed' | 'cancelled';

const fmt = (n: number) => `${(n ?? 0).toLocaleString('ru-RU')} ₽`;
const pct = (n: number) => `${Math.round((n ?? 0) * 100)}%`;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'deals.filter.all' },
  { key: 'in_progress', label: 'deals.status.in_progress' },
  { key: 'completed', label: 'deals.status.completed' },
  { key: 'cancelled', label: 'deals.status.cancelled' },
];

export default function DealsPage() {
  const { featureCan } = useFeatureCan();
  const [status, setStatus] = React.useState<StatusFilter>('');
  const [editing, setEditing] = React.useState<any | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [openDeal, setOpenDeal] = React.useState<any | null>(null);

  const { data: deals } = useDeals(status ? { status } : {}, {});
  const { data: summary } = useDealsSummary({}, {});
  const del = useDeleteDeal({});

  if (!featureCan('deals')) return null;

  const rows: any[] = deals ?? [];
  const marginById = new Map<number, any>(
    ((summary as any)?.deals ?? []).map((d: any) => [d.id, d]),
  );
  const totals = (summary as any)?.totals ?? { revenue: 0, costs: 0, profit: 0 };
  const top = ((summary as any)?.deals ?? []).slice(0, 3);

  const onDelete = async (id: number) => {
    try {
      await del.mutateAsync(id);
      toast.success(intl.get('deals.deleted_ok'));
    } catch {
      toast.error(intl.get('deals.delete_error'));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{intl.get('deals.page_title')}</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          {intl.get('deals.create')}
        </Button>
      </div>

      {/* Дашборд */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {intl.get('deals.dashboard.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div>
            {intl.get('deals.dashboard.profit')}:{' '}
            <span className="font-medium">{fmt(totals.profit)}</span>
          </div>
          <div>
            {intl.get('deals.dashboard.revenue')}:{' '}
            <span className="font-medium">{fmt(totals.revenue)}</span>
          </div>
          <div className="text-muted-foreground">
            {intl.get('deals.dashboard.top_by_profit')}:{' '}
            {top.map((d: any) => d.name).join(' · ') || '—'}
          </div>
        </CardContent>
      </Card>

      {/* Табы статуса */}
      <div className="flex flex-wrap items-center gap-1">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.key || 'all'}
            variant={status === tab.key ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setStatus(tab.key)}
          >
            {intl.get(tab.label)}
          </Button>
        ))}
      </div>

      {/* Список */}
      <div className="flex flex-col divide-y rounded-md border">
        {rows.length === 0 && (
          <div className="text-muted-foreground p-4 text-sm">
            {intl.get('deals.empty')}
          </div>
        )}
        {rows.map((d) => {
          const m = marginById.get(d.id);
          return (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <button
                className="flex flex-col text-left"
                onClick={() => setOpenDeal(d)}
              >
                <span className="font-medium">{d.name}</span>
                <span className="text-muted-foreground">
                  {intl.get(`deals.status.${d.status}`)}
                  {d.deadline ? ` · ${d.deadline}` : ''}
                </span>
              </button>
              <div className="flex items-center gap-4">
                {m && (
                  <span className="text-muted-foreground">
                    {fmt(m.profit)} · {pct(m.margin)}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(d);
                    setShowForm(true);
                  }}
                >
                  {intl.get('deals.action.edit')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(d.id)}
                >
                  {intl.get('deals.action.delete')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {openDeal && (
        <div className="mt-2">
          <DealProfitability deal={openDeal} />
          <div className="mt-2">
            <Button variant="ghost" size="sm" onClick={() => setOpenDeal(null)}>
              {intl.get('deals.close')}
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <DealDialog
          deal={editing}
          onDone={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Проверка типов + commit.** Run: `pnpm typecheck` → PASS.

```bash
git add packages/webapp/src/containers/Deals
git commit -m "feat(webapp/deals): page, dashboard, dialog, profitability and schema"
```

## Task D3: Маршрут + i18n (парность EN↔RU)

**Files:**
- Modify: `packages/webapp/src/routes/dashboard.tsx`
- Modify: `packages/webapp/src/lang/en/index.json`, `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Маршрут.** В `dashboard.tsx` рядом с блоком `// Payment Requests` (около строки 1292) добавить:

```tsx
  // Deals (Сделки)
  {
    path: `/deals`,
    component: lazy(() => import('@/containers/Deals/DealsPage')),
    breadcrumb: intl.get('deals.page_title'),
    pageTitle: intl.get('deals.page_title'),
    subscriptionActive: [SUBSCRIPTION_TYPE.MAIN],
  },
```

- [ ] **Step 2: Ключи i18n (парно EN+RU).** Через скилл `i18n-add-string` или вручную добавить в `lang/en/index.json` и `lang/ru/index.json` следующие пары (EN | RU):

```
deals.page_title                     "Deals" | "Сделки"
deals.create                         "New deal" | "Создать сделку"
deals.edit_title                     "Edit deal" | "Изменить сделку"
deals.save                           "Save" | "Сохранить"
deals.cancel                         "Cancel" | "Отмена"
deals.close                          "Close" | "Закрыть"
deals.saved                          "Deal saved" | "Сделка сохранена"
deals.save_error                     "Couldn't save the deal" | "Не удалось сохранить сделку"
deals.deleted_ok                     "Deal deleted" | "Сделка удалена"
deals.delete_error                   "Couldn't delete the deal" | "Не удалось удалить сделку"
deals.empty                          "No deals yet" | "Сделок пока нет"
deals.filter.all                     "All" | "Все"
deals.status.in_progress             "In progress" | "В работе"
deals.status.completed               "Completed" | "Завершена"
deals.status.cancelled               "Cancelled" | "Отменена"
deals.field.name                     "Name" | "Название"
deals.field.client                   "Client" | "Клиент"
deals.field.deadline                 "Deadline" | "Срок"
deals.field.budget                   "Budget" | "Бюджет"
deals.field.status                   "Status" | "Статус"
deals.action.edit                    "Edit" | "Изменить"
deals.action.delete                  "Delete" | "Удалить"
deals.dashboard.title                "Overview" | "Сводка"
deals.dashboard.profit               "Profit" | "Прибыль"
deals.dashboard.revenue              "Revenue" | "Доход"
deals.dashboard.top_by_profit        "Top by profit" | "Топ по прибыли"
deals.profitability.revenue          "Revenue" | "Доходы"
deals.profitability.costs            "Direct costs" | "Прямые расходы"
deals.profitability.profit           "Profit" | "Прибыль"
deals.profitability.budget_vs_actual "Budget → actual costs" | "Бюджет → факт расходов"
deals.error.name_required            "Enter a deal name" | "Укажите название сделки"
deals.error.budget_nonnegative       "Budget can't be negative" | "Бюджет не может быть отрицательным"
```

- [ ] **Step 3: Парность.** Run: `node packages/webapp/scripts/lang-check.js`
Expected: 0 (нет missing keys).

- [ ] **Step 4: Проверка типов + commit.** Run: `pnpm typecheck` → PASS.

```bash
git add packages/webapp/src/routes/dashboard.tsx packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(webapp/deals): route and i18n keys (en+ru parity)"
```

## Task D4: Оживить выбор сделки в формах операций

> Легаси-формы счёта/расхода/счёта-поставщика уже содержат селектор `ProjectsSelect`, скрытый за `Features.Projects` (значение `'Projects'`, которого нет в бэкенд-флагах → всегда скрыт). Меняем значение на `'deals'` — селектор появляется во всех формах при включённом флаге `deals`. Хук списка перенаправляем на `/deals`.

**Files:**
- Modify: `packages/webapp/src/constants/features.tsx`
- Modify: `packages/webapp/src/containers/Projects/hooks/projects.ts`
- Modify (i18n): `lang/en/index.json`, `lang/ru/index.json` (лейбл «Сделка»)

- [ ] **Step 1: Переключить флаг селектора.** В `constants/features.tsx` заменить строку `Projects:'Projects',` на:

```ts
  Projects: 'deals', // оживляет селектор сделки в легаси-формах под флагом deals
```

- [ ] **Step 2: Перенаправить список на /deals.** В `containers/Projects/hooks/projects.ts`, в `useProjects`, заменить `url: 'projects'` на `url: 'deals'` и заменить `transformProjects` на чтение массива из ответа `/deals`:

```ts
const transformProjects = (res) => ({
  projects: res.data.data,
});
```

(остальные хуки этого файла — `useCreateProject` и пр. — не используются, легаси-страницы «Проекты» не подключаем.)

- [ ] **Step 3: Русифицировать лейбл.** Лейбл селектора в форме счёта — ключ `invoice.project_name.label`. Обновить его значения (и аналогичные у форм bill/expense, если присутствуют) на EN "Deal" | RU "Сделка". Если ключ один (`invoice.project_name.label`) — обновить его пару:

```
invoice.project_name.label   "Deal" | "Сделка"
```

- [ ] **Step 4: Парность + типы.** Run: `node packages/webapp/scripts/lang-check.js` → 0; `pnpm typecheck` → PASS.

- [ ] **Step 5: Commit.**

```bash
git add packages/webapp/src/constants/features.tsx packages/webapp/src/containers/Projects/hooks/projects.ts packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(webapp/deals): enable deal selector on operation forms under deals flag"
```

---

## Финальная проверка (после Part D)

- [ ] `pnpm --filter @bigfin/server test -- src/modules/Deals src/modules/ManagementArticles src/modules/SaleInvoices/ledger src/modules/Features` → PASS.
- [ ] `pnpm typecheck` (3 пакета) → PASS.
- [ ] `node packages/webapp/scripts/lang-check.js` → 0.
- [ ] Отметить в спеке `2026-06-06-deals-design.md` статус выполнения ⑦a.

## Откат

- Мгновенный: выключить флаг `deals` (страница и селектор скрываются; `Projects: 'deals'` снова не совпадёт ни с чем активным).
- Код: `git revert` затронутых коммитов (всё additive; правка `InvoiceGL` добавляет только метку измерения, суммы проводок не меняет).
- БД: миграций нет.

---

## Self-Review (проверка плана против спеки)

**Покрытие спеки:**
- §2.1 CRUD сделки → C1–C4, D2. ✅
- §2.2 привязка операций (селектор) → D4. ✅
- §2.3 починка выручки → B4 (счета). ⚠️ Кассовые продажи (`SaleReceipt`) явно вынесены в отдельный заход (заметка в B4 + §12 спеки) — осознанное сужение объёма ⑦a.
- §2.4 рентабельность → B1–B3, D2/D3 (карточка). ✅
- §2.5 дашборд → C3 (summary) + D2 (DashboardCard). ✅
- §4 модель (reuse `projects`, без миграции) → A3. ✅
- §5.1 свёртка с фильтром по сделке → B1; §5.2 GL → B4; §5.3 дашборд → C3. ✅
- §6 структура модуля → совпадает (Deals/...). ✅
- §7 API → C4 controller (`GET /deals`, `/summary`, `/:id`, `/:id/profitability`, POST/PUT/DELETE). ✅
- §8 фронт → D1–D3. ✅
- §9 тесты → A1, B1, B2, B3, B4, C2 (TDD/юниты). ✅
- §10 порядок → Parts A→D. ✅
- §11 откат → раздел «Откат». ✅

**Скан плейсхолдеров:** «при исполнении подтвердить» встречается дважды (форма имени клиента в `useCustomers`; SaleInvoice.projectId типизация) — это шаги верификации с конкретным фолбэком в коде, не пропуски. Остальной код — полный.

**Согласованность типов/имён:** модель `Deal` (tableName `projects`) едина; `computeDealMargin`/`DealMargin`/`DealProfitability` совпадают между B2/B3/interfaces; ключи кэша `DEALS/DEAL/DEAL_SUMMARY/DEAL_PROFITABILITY` едины (D1↔D2); статусы `in_progress/completed/cancelled` едины (constants↔DTO↔фронт-табы↔i18n); эндпоинты `/deals*` едины (controller↔hooks). Маршрут `summary` объявлен до `:id`. ✅

**Зона подтверждения на исполнении:** (1) поле имени `customers` (`display_name`/`displayName`); (2) объявлен ли `projectId` в модели `SaleInvoice` (колонка есть; при необходимости добавить поле модели); (3) точные ключи лейбла «Сделка» у форм bill/expense (паттерн идентичен счёту).
