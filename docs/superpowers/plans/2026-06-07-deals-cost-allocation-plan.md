# Cost Allocation (⑦b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distribute shared/overhead cost articles across deals at report time (reversible, no ledger writes), so each deal shows true profit "after allocation", per roadmap §4.10.

**Architecture:** A new tenant entity `CostAllocationRule` (cost article → deals, key `revenue` | `manual_share`, date-versioned, on/off). A pure `allocatePool` engine splits an unassigned-overhead pool by weights. `GetDealAllocationService` computes a deal's share across active rules; `GetDealProfitabilityService` overlays it behind the `COST_ALLOCATION` flag. Frontend adds a rules page + an "после распределения" block. Mirrors the proven `PaymentRequests` module structure.

**Tech Stack:** NestJS 10, objection/knex (MySQL), class-validator, Jest (server); React 18 + shadcn + React Hook Form + Zod + react-query (webapp); react-intl-universal i18n.

**Spec:** `docs/superpowers/specs/2026-06-07-deals-cost-allocation-design.md`

**Conventions (this repo):** Node 18.16.1 only. Run server tests via PATH-prepended Node 18 + `pnpm --filter @bigfin/server test`. Migrations use plain-knex `exports.up/down`. Every visible string via `intl.get`. Commit subjects start lowercase (commitlint config-conventional). Local atomic commits; **no push/PR without explicit ask.**

---

## File Structure

**Server (create unless noted):**
- `common/types/Features.ts` — *modify*: add `COST_ALLOCATION` to the `Features` enum.
- `modules/Features/FeaturesConfigure.ts` — *modify*: register flag (off).
- `modules/Features/FeaturesConfigure.costAllocation.spec.ts` — flag test.
- `database/tenant/migrations/20260607120000_create_cost_allocation_rules_table.ts` — table.
- `modules/CostAllocation/models/CostAllocationRule.model.ts` — model.
- `modules/Tenancy/TenancyModels/Tenancy.module.ts` — *modify*: register model.
- `modules/CostAllocation/utils/allocatePool.ts` + `.spec.ts` — pure engine.
- `modules/CostAllocation/constants.ts` — ERRORS + keys.
- `modules/CostAllocation/dtos/CostAllocationRule.dto.ts`, `dtos/GetRulesQuery.dto.ts`.
- `modules/CostAllocation/commands/CommandCostAllocationValidator.service.ts` + `.spec.ts`.
- `modules/CostAllocation/commands/{CreateCostAllocationRule,EditCostAllocationRule,DeleteCostAllocationRule}.service.ts`.
- `modules/CostAllocation/queries/GetCostAllocationRules.service.ts`.
- `modules/CostAllocation/queries/GetDealAllocation.service.ts` + `.spec.ts`.
- `modules/ManagementArticles/queries/ArticlesPlRollup.service.ts` — *modify*: support `unassignedProject`.
- `modules/ManagementArticles/dtos/ArticlesRollupQuery.dto.ts` — *modify*: add `unassignedProject?`.
- `modules/Deals/queries/GetDealProfitability.service.ts` — *modify*: overlay allocation behind flag.
- `modules/Deals/Deals.interfaces.ts` — *modify*: extend `DealProfitability`.
- `modules/Deals/Deals.module.ts` — *modify*: provide allocation service (import CostAllocation pieces).
- `modules/CostAllocation/{CostAllocation.application.ts,CostAllocation.controller.ts,CostAllocation.module.ts}`.
- `app.module.ts` (or wherever feature modules register) — *modify*: import `CostAllocationModule`.

**Webapp (create unless noted):**
- `hooks/query/costAllocation.tsx` — react-query hooks.
- `containers/CostAllocation/CostAllocationPage.tsx`, `CostAllocationRuleDialog.tsx`, `schemas.ts`.
- `containers/Deals/DealProfitability.tsx` — *modify*: "после распределения" block.
- `lang/en/index.json`, `lang/ru/index.json` — *modify*: new keys (parity).
- `routes/dashboard.tsx` — *modify*: flag-gated `/cost-allocation` route.
- `constants/features.tsx` — *modify*: `COST_ALLOCATION` flag mirror (if FE flag registry exists).

---

## Task 1: Feature flag `COST_ALLOCATION`

**Files:**
- Modify: `packages/server/src/common/types/Features.ts`
- Modify: `packages/server/src/modules/Features/FeaturesConfigure.ts`
- Test: `packages/server/src/modules/Features/FeaturesConfigure.costAllocation.spec.ts`

- [ ] **Step 1: Write the failing test** (mirror `FeaturesConfigure.deals.spec.ts`)

```ts
// © 2026 Bigfin
import { ConfigService } from '@nestjs/config';
import { Features } from '@/common/types/Features';
import { FeaturesConfigure } from './FeaturesConfigure';

describe('FeaturesConfigure — cost allocation', () => {
  it('registers the cost_allocation feature, off by default', () => {
    const cfg = new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);
    const flag = cfg.getConfigure().find((f) => f.name === Features.COST_ALLOCATION);
    expect(flag).toBeDefined();
    expect(flag?.defaultValue).toBe(false);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (`Features.COST_ALLOCATION` undefined)

Run: `pnpm --filter @bigfin/server test -- src/modules/Features/FeaturesConfigure.costAllocation.spec.ts`

- [ ] **Step 3: Add enum + registration.** In `Features.ts` add `COST_ALLOCATION = 'cost_allocation',` to the `Features` enum (match existing string-value style). In `FeaturesConfigure.ts` append to the returned array:

```ts
      {
        name: Features.COST_ALLOCATION,
        defaultValue: false,
      },
```

- [ ] **Step 4: Run test, expect PASS.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(server): register cost_allocation feature flag"`

> Verify the exact enum member style first by reading `common/types/Features.ts` (e.g. `DEALS = 'deals'`).

---

## Task 2: Migration `cost_allocation_rules`

**Files:**
- Create: `packages/server/src/database/tenant/migrations/20260607120000_create_cost_allocation_rules_table.ts`

- [ ] **Step 1: Write migration** (mirror `20260606130000_create_payment_requests_table.ts`)

```ts
// © 2026 Bigfin
exports.up = (knex) => {
  return knex.schema.createTable('cost_allocation_rules', (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table
      .integer('source_article_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('management_articles');
    table.string('allocation_key').notNullable().defaultTo('revenue'); // revenue|manual_share
    table.json('manual_shares').nullable();   // { "<dealId>": <weight> }
    table.json('target_deal_ids').nullable(); // null = all active deals
    table.date('valid_from').nullable();
    table.date('valid_to').nullable();
    table.boolean('is_active').notNullable().defaultTo(true).index();
    table.timestamps();
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('cost_allocation_rules');
```

- [ ] **Step 2: Typecheck** — `pnpm --filter @bigfin/server typecheck` (migrations are JS-in-TS; expect no errors).
- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat(server): add cost_allocation_rules tenant migration"`

> DB is not set up locally — `latest→rollback→latest` runs on CI/staging. `down()` provided.

---

## Task 3: Model `CostAllocationRule` + register in Tenancy

**Files:**
- Create: `packages/server/src/modules/CostAllocation/models/CostAllocationRule.model.ts`
- Modify: `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts`

- [ ] **Step 1: Write model** (mirror `PaymentRequest.model.ts`)

```ts
// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class CostAllocationRule extends TenantBaseModel {
  name!: string;
  sourceArticleId!: number;
  allocationKey!: string;
  manualShares!: Record<string, number> | null;
  targetDealIds!: number[] | null;
  validFrom!: string | null;
  validTo!: string | null;
  isActive!: boolean;

  static get tableName() {
    return 'cost_allocation_rules';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get jsonAttributes() {
    return ['manualShares', 'targetDealIds'];
  }

  static get modifiers() {
    return {
      active(query) {
        query.where('isActive', true);
      },
    };
  }
}
```

- [ ] **Step 2: Register in Tenancy.** In `Tenancy.module.ts` add the import next to the other model imports and add `CostAllocationRule` to the `models` array (this makes `@Inject(CostAllocationRule.name)` resolvable — same as `PaymentRequest`).

```ts
import { CostAllocationRule } from '@/modules/CostAllocation/models/CostAllocationRule.model';
// ... in const models = [ ... , CostAllocationRule, TenantUser ];
```

- [ ] **Step 3: Typecheck** — `pnpm --filter @bigfin/server typecheck`.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(server): add CostAllocationRule model"`

---

## Task 4: Pure allocation engine `allocatePool`

**Files:**
- Create: `packages/server/src/modules/CostAllocation/utils/allocatePool.ts`
- Test: `packages/server/src/modules/CostAllocation/utils/allocatePool.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// © 2026 Bigfin
import { allocatePool } from './allocatePool';

describe('allocatePool', () => {
  it('splits proportionally to weights', () => {
    const r = allocatePool(100, [
      { dealId: 1, weight: 3 },
      { dealId: 2, weight: 1 },
    ]);
    expect(r).toEqual([
      { dealId: 1, amount: 75 },
      { dealId: 2, amount: 25 },
    ]);
  });

  it('keeps the sum exactly equal to the pool (largest-remainder)', () => {
    const r = allocatePool(100, [
      { dealId: 1, weight: 1 },
      { dealId: 2, weight: 1 },
      { dealId: 3, weight: 1 },
    ]);
    const total = r.reduce((s, x) => s + x.amount, 0);
    expect(Number(total.toFixed(2))).toBe(100);
    // residual kopeck goes to the first/largest-weight target
    expect(r[0].amount).toBe(33.34);
  });

  it('returns empty when total weight is zero or negative', () => {
    expect(allocatePool(100, [{ dealId: 1, weight: 0 }])).toEqual([]);
    expect(allocatePool(100, [])).toEqual([]);
  });

  it('ignores negative weights (treated as zero)', () => {
    const r = allocatePool(50, [
      { dealId: 1, weight: -5 },
      { dealId: 2, weight: 5 },
    ]);
    expect(r).toEqual([{ dealId: 2, amount: 50 }]);
  });
});
```

- [ ] **Step 2: Run, expect FAIL.** `pnpm --filter @bigfin/server test -- src/modules/CostAllocation/utils/allocatePool.spec.ts`

- [ ] **Step 3: Implement**

```ts
// © 2026 Bigfin
export interface AllocationWeight {
  dealId: number;
  weight: number;
}
export interface AllocationAmount {
  dealId: number;
  amount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Распределяет пул по весам (доход/ручная доля). Отрицательные веса = 0.
 * Метод наибольшего остатка: копеечный остаток округления добавляется цели
 * с наибольшим весом, чтобы сумма распределения точно равнялась пулу.
 */
export function allocatePool(
  pool: number,
  weights: AllocationWeight[],
): AllocationAmount[] {
  const positive = weights
    .map((w) => ({ dealId: w.dealId, weight: Math.max(0, Number(w.weight) || 0) }))
    .filter((w) => w.weight > 0);

  const totalWeight = positive.reduce((s, w) => s + w.weight, 0);
  if (totalWeight <= 0) return [];

  const rounded = positive.map((w) => ({
    dealId: w.dealId,
    amount: round2((pool * w.weight) / totalWeight),
  }));

  const residual = round2(pool - rounded.reduce((s, x) => s + x.amount, 0));
  if (residual !== 0) {
    const top = positive.reduce(
      (best, w, i) => (w.weight > positive[best].weight ? i : best),
      0,
    );
    rounded[top] = { dealId: rounded[top].dealId, amount: round2(rounded[top].amount + residual) };
  }
  return rounded;
}
```

- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(server): add allocatePool cost-allocation engine"`

---

## Task 5: constants + DTOs

**Files:**
- Create: `packages/server/src/modules/CostAllocation/constants.ts`
- Create: `packages/server/src/modules/CostAllocation/dtos/CostAllocationRule.dto.ts`
- Create: `packages/server/src/modules/CostAllocation/dtos/GetRulesQuery.dto.ts`

- [ ] **Step 1: constants.ts**

```ts
// © 2026 Bigfin
// eslint-disable-next-line import/prefer-default-export
export const ERRORS = {
  RULE_NOT_FOUND: 'RULE_NOT_FOUND',
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
  ARTICLE_NOT_EXPENSE: 'ARTICLE_NOT_EXPENSE',
  INVALID_ALLOCATION_KEY: 'INVALID_ALLOCATION_KEY',
  INVALID_MANUAL_SHARES: 'INVALID_MANUAL_SHARES',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
};

export const ALLOCATION_KEYS = ['revenue', 'manual_share'] as const;
```

- [ ] **Step 2: CostAllocationRule.dto.ts** (mirror `PaymentRequest.dto.ts`)

```ts
// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsString } from 'class-validator';
import { ALLOCATION_KEYS } from '../constants';

class CommandCostAllocationRuleDto {
  @IsString()
  @ApiProperty({ example: 'Аренда по выручке' })
  name: string;

  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 42, description: 'Source cost article id' })
  sourceArticleId: number;

  @IsIn(ALLOCATION_KEYS as unknown as string[])
  @ApiProperty({ example: 'revenue', enum: ALLOCATION_KEYS })
  allocationKey: string;

  @IsObject()
  @IsOptional()
  @ApiPropertyOptional({ example: { '1': 3, '2': 1 }, description: 'dealId→weight (manual_share)' })
  manualShares?: Record<string, number>;

  @IsOptional()
  @ApiPropertyOptional({ example: [1, 2], description: 'Restrict targets (revenue key)' })
  targetDealIds?: number[];

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-01-01' })
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-12-31' })
  validTo?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ example: true })
  isActive?: boolean;
}

export class CreateCostAllocationRuleDto extends CommandCostAllocationRuleDto {}
export class EditCostAllocationRuleDto extends CommandCostAllocationRuleDto {}
```

- [ ] **Step 3: GetRulesQuery.dto.ts** (mirror `GetPaymentRequestsQuery.dto.ts` — minimal)

```ts
// © 2026 Bigfin
import { IsBooleanString, IsOptional } from 'class-validator';

export class GetRulesQueryDto {
  @IsBooleanString()
  @IsOptional()
  activeOnly?: string;
}
```

- [ ] **Step 4: Typecheck + commit** — `git commit -m "feat(server): cost-allocation constants and DTOs"`

> Verify `@/common/decorators/Validators` exports `IsOptional` and `ToNumber` (used by PaymentRequest.dto.ts).

---

## Task 6: Validator `CommandCostAllocationValidator`

**Files:**
- Create: `packages/server/src/modules/CostAllocation/commands/CommandCostAllocationValidator.service.ts`
- Test: same dir `.spec.ts`

- [ ] **Step 1: Write failing tests** (mirror `CommandPaymentRequestValidator.service.spec.ts` — mocks the article model by name)

```ts
// © 2026 Bigfin
import { Test } from '@nestjs/testing';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { CommandCostAllocationValidatorService } from './CommandCostAllocationValidator.service';

const articleModel = (found: any) => () => ({ query: () => ({ findById: async () => found }) });

describe('CommandCostAllocationValidatorService', () => {
  const build = async (article: any) => {
    const ref = await Test.createTestingModule({
      providers: [
        CommandCostAllocationValidatorService,
        { provide: ManagementArticle.name, useValue: articleModel(article) },
      ],
    }).compile();
    return ref.get(CommandCostAllocationValidatorService);
  };

  it('throws ARTICLE_NOT_FOUND when source article is missing', async () => {
    const v = await build(null);
    await expect(
      v.validate({ sourceArticleId: 9, allocationKey: 'revenue' } as any),
    ).rejects.toMatchObject({ errorType: 'ARTICLE_NOT_FOUND' });
  });

  it('throws ARTICLE_NOT_EXPENSE when source article is not an expense', async () => {
    const v = await build({ id: 1, kind: 'income' });
    await expect(
      v.validate({ sourceArticleId: 1, allocationKey: 'revenue' } as any),
    ).rejects.toMatchObject({ errorType: 'ARTICLE_NOT_EXPENSE' });
  });

  it('throws INVALID_MANUAL_SHARES for manual_share without shares', async () => {
    const v = await build({ id: 1, kind: 'expense' });
    await expect(
      v.validate({ sourceArticleId: 1, allocationKey: 'manual_share', manualShares: {} } as any),
    ).rejects.toMatchObject({ errorType: 'INVALID_MANUAL_SHARES' });
  });

  it('passes a valid revenue rule', async () => {
    const v = await build({ id: 1, kind: 'expense' });
    await expect(
      v.validate({ sourceArticleId: 1, allocationKey: 'revenue' } as any),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ERRORS } from '../constants';

@Injectable()
export class CommandCostAllocationValidatorService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
  ) {}

  public async validate(dto: {
    sourceArticleId: number;
    allocationKey: string;
    manualShares?: Record<string, number>;
    validFrom?: string;
    validTo?: string;
  }) {
    const article: any = await this.articleModel().query().findById(dto.sourceArticleId);
    if (!article) throw new ServiceError(ERRORS.ARTICLE_NOT_FOUND);
    if (article.kind !== 'expense') throw new ServiceError(ERRORS.ARTICLE_NOT_EXPENSE);

    if (dto.allocationKey === 'manual_share') {
      const shares = dto.manualShares ?? {};
      const entries = Object.entries(shares);
      const ok = entries.length > 0 && entries.every(([, w]) => Number(w) >= 0);
      if (!ok) throw new ServiceError(ERRORS.INVALID_MANUAL_SHARES);
    }

    if (dto.validFrom && dto.validTo && dto.validFrom > dto.validTo) {
      throw new ServiceError(ERRORS.INVALID_DATE_RANGE);
    }
  }
}
```

- [ ] **Step 4: Run, expect PASS.** **Step 5: Commit** — `git commit -m "feat(server): cost-allocation rule validator"`

> Confirm `ServiceError` sets `.errorType` to its argument and `ManagementArticle` has `kind` (used by computeDealMargin's `r.kind === 'expense'`).

---

## Task 7: CRUD commands (Create/Edit/Delete)

**Files (create):**
- `commands/CreateCostAllocationRule.service.ts`, `EditCostAllocationRule.service.ts`, `DeleteCostAllocationRule.service.ts`

- [ ] **Step 1: CreateCostAllocationRule.service.ts** (mirror `CreatePaymentRequest.service.ts`: validate then insert)

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CostAllocationRule } from '../models/CostAllocationRule.model';
import { CommandCostAllocationValidatorService } from './CommandCostAllocationValidator.service';
import { CreateCostAllocationRuleDto } from '../dtos/CostAllocationRule.dto';

@Injectable()
export class CreateCostAllocationRuleService {
  constructor(
    private readonly validator: CommandCostAllocationValidatorService,
    @Inject(CostAllocationRule.name)
    private readonly ruleModel: TenantModelProxy<typeof CostAllocationRule>,
  ) {}

  public async create(dto: CreateCostAllocationRuleDto) {
    await this.validator.validate(dto as any);
    return this.ruleModel().query().insertAndFetch(dto as any);
  }
}
```

- [ ] **Step 2: EditCostAllocationRule.service.ts** — validate, then `patchAndFetchById(id, dto)`; throw `ERRORS.RULE_NOT_FOUND` if `findById(id)` is null first.

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CostAllocationRule } from '../models/CostAllocationRule.model';
import { CommandCostAllocationValidatorService } from './CommandCostAllocationValidator.service';
import { EditCostAllocationRuleDto } from '../dtos/CostAllocationRule.dto';
import { ERRORS } from '../constants';

@Injectable()
export class EditCostAllocationRuleService {
  constructor(
    private readonly validator: CommandCostAllocationValidatorService,
    @Inject(CostAllocationRule.name)
    private readonly ruleModel: TenantModelProxy<typeof CostAllocationRule>,
  ) {}

  public async edit(id: number, dto: EditCostAllocationRuleDto) {
    const existing = await this.ruleModel().query().findById(id);
    if (!existing) throw new ServiceError(ERRORS.RULE_NOT_FOUND);
    await this.validator.validate(dto as any);
    return this.ruleModel().query().patchAndFetchById(id, dto as any);
  }
}
```

- [ ] **Step 3: DeleteCostAllocationRule.service.ts**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CostAllocationRule } from '../models/CostAllocationRule.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteCostAllocationRuleService {
  constructor(
    @Inject(CostAllocationRule.name)
    private readonly ruleModel: TenantModelProxy<typeof CostAllocationRule>,
  ) {}

  public async delete(id: number) {
    const deleted = await this.ruleModel().query().deleteById(id);
    if (!deleted) throw new ServiceError(ERRORS.RULE_NOT_FOUND);
  }
}
```

- [ ] **Step 4: Typecheck + commit** — `git commit -m "feat(server): cost-allocation CRUD commands"`

---

## Task 8: List query `GetCostAllocationRules`

**Files:** Create `queries/GetCostAllocationRules.service.ts`

- [ ] **Step 1: Implement** (mirror `GetPaymentRequests.service.ts`)

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CostAllocationRule } from '../models/CostAllocationRule.model';

@Injectable()
export class GetCostAllocationRulesService {
  constructor(
    @Inject(CostAllocationRule.name)
    private readonly ruleModel: TenantModelProxy<typeof CostAllocationRule>,
  ) {}

  public getRules(query: { activeOnly?: string }) {
    return this.ruleModel()
      .query()
      .modify((qb) => {
        if (query.activeOnly === 'true') qb.where('isActive', true);
      })
      .orderBy('id', 'desc');
  }
}
```

- [ ] **Step 2: Typecheck + commit** — `git commit -m "feat(server): list cost-allocation rules query"`

---

## Task 9: `ArticlesPlRollup` — unassigned-project pool support

**Files:**
- Modify: `modules/ManagementArticles/dtos/ArticlesRollupQuery.dto.ts` — add `unassignedProject?: boolean`.
- Modify: `modules/ManagementArticles/queries/ArticlesPlRollup.service.ts`.

- [ ] **Step 1:** In `getRollup`'s `onBuild`, after the existing `projectId` branch, add:

```ts
        if (query.unassignedProject) {
          qb.whereNull('projectId'); // objection maps to project_id
        }
```

- [ ] **Step 2: Add a focused test** in the existing `ArticlesPlRollup.service.spec.ts` (or new `unassignedProject` describe) asserting the modifier path is taken when `unassignedProject` is set. If the existing spec mocks the query builder, assert `whereNull` is called with `projectId`.
- [ ] **Step 3: Typecheck + run rollup spec + commit** — `git commit -m "feat(server): rollup supports unassigned-project pool"`

> Read `ArticlesPlRollup.service.spec.ts` first to match its mocking style; `accountNet`/fold/rollup pure fns stay untouched.

---

## Task 10: `GetDealAllocation` query

**Files:**
- Create: `modules/CostAllocation/queries/GetDealAllocation.service.ts` + `.spec.ts`

**Interface (define here, reused in Task 11):**

```ts
export interface DealAllocationLine {
  ruleId: number;
  ruleName: string;
  articleId: number;
  amount: number;
}
```

- [ ] **Step 1: Write failing test** (inject: rules model, a `poolFor(articleId, period)` collaborator, and a `revenueByDeal(period)` collaborator — both mocked). The service: for each active rule overlapping the period, compute pool, build weights, call `allocatePool`, pick this deal's amount.

```ts
// © 2026 Bigfin
import { GetDealAllocationService } from './GetDealAllocation.service';

describe('GetDealAllocationService', () => {
  const rule = {
    id: 5, name: 'Аренда', sourceArticleId: 42, allocationKey: 'revenue',
    manualShares: null, targetDealIds: null, validFrom: null, validTo: null, isActive: true,
  };
  const ruleModel = (rules: any[]) => () => ({ query: () => ({ modify: () => ({ where: () => rules, then: undefined }) }) });

  const build = (rules: any[], pool: number, revenueByDeal: Record<number, number>) => {
    const poolService = { poolFor: async () => pool };
    const revenueService = { revenueByDeal: async () => revenueByDeal };
    // ruleModel().query() must resolve to `rules` (thenable). Use a simple stub:
    const model = () => ({ query: () => Promise.resolve(rules) });
    return new GetDealAllocationService(model as any, poolService as any, revenueService as any);
  };

  it("returns this deal's revenue-proportional share of the pool", async () => {
    const svc = build([rule], 100, { 1: 300, 2: 100 });
    const lines = await svc.getForDeal(1, {});
    expect(lines).toEqual([{ ruleId: 5, ruleName: 'Аренда', articleId: 42, amount: 75 }]);
  });

  it('excludes inactive rules', async () => {
    const svc = build([{ ...rule, isActive: false }], 100, { 1: 300, 2: 100 });
    expect(await svc.getForDeal(1, {})).toEqual([]);
  });

  it('uses manual shares when key is manual_share', async () => {
    const svc = build(
      [{ ...rule, allocationKey: 'manual_share', manualShares: { '1': 1, '2': 1 } }],
      100, { 1: 999, 2: 0 },
    );
    const lines = await svc.getForDeal(1, {});
    expect(lines[0].amount).toBe(50);
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** (collaborators `poolFor` and `revenueByDeal` are thin services created in this task; keep them injectable so they are mockable):

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CostAllocationRule } from '../models/CostAllocationRule.model';
import { allocatePool, AllocationWeight } from '../utils/allocatePool';
import { AllocationPoolService } from './AllocationPool.service';
import { DealsRevenueService } from './DealsRevenue.service';

export interface DealAllocationLine {
  ruleId: number; ruleName: string; articleId: number; amount: number;
}

@Injectable()
export class GetDealAllocationService {
  constructor(
    @Inject(CostAllocationRule.name)
    private readonly ruleModel: TenantModelProxy<typeof CostAllocationRule>,
    private readonly pool: AllocationPoolService,
    private readonly revenue: DealsRevenueService,
  ) {}

  public async getForDeal(
    dealId: number,
    period: { fromDate?: string; toDate?: string },
  ): Promise<DealAllocationLine[]> {
    const rules: any[] = await this.ruleModel().query();
    const active = rules.filter(
      (r) => r.isActive && this.inWindow(r, period),
    );

    const lines: DealAllocationLine[] = [];
    for (const r of active) {
      const pool = await this.pool.poolFor(r.sourceArticleId, period);
      if (!pool) continue;
      const weights = await this.weightsFor(r, period);
      const split = allocatePool(pool, weights);
      const mine = split.find((s) => s.dealId === dealId);
      if (mine && mine.amount !== 0) {
        lines.push({ ruleId: r.id, ruleName: r.name, articleId: r.sourceArticleId, amount: mine.amount });
      }
    }
    return lines;
  }

  private inWindow(r: any, p: { fromDate?: string; toDate?: string }): boolean {
    if (p.toDate && r.validFrom && r.validFrom > p.toDate) return false;
    if (p.fromDate && r.validTo && r.validTo < p.fromDate) return false;
    return true;
  }

  private async weightsFor(r: any, p: { fromDate?: string; toDate?: string }): Promise<AllocationWeight[]> {
    if (r.allocationKey === 'manual_share') {
      return Object.entries(r.manualShares ?? {}).map(([dealId, weight]) => ({
        dealId: Number(dealId), weight: Number(weight),
      }));
    }
    const revenueByDeal = await this.revenue.revenueByDeal(p);
    const ids = r.targetDealIds ?? Object.keys(revenueByDeal).map(Number);
    return ids.map((dealId: number) => ({ dealId, weight: revenueByDeal[dealId] ?? 0 }));
  }
}
```

- [ ] **Step 4:** Create `queries/AllocationPool.service.ts` (`poolFor(articleId, period)` → calls `ArticlesPlRollupService.getRollup({ unassignedProject: true, fromDate, toDate })`, returns the matching article's `amount`) and `queries/DealsRevenue.service.ts` (`revenueByDeal(period)`). **Avoid a DI cycle:** `DealsRevenue` must NOT inject the Deals module. Instead inject the `Deal` model token (`@Inject(Deal.name)`, global via Tenancy) + `ArticlesPlRollupService`, list active deals, and for each call `getRollup({ projectId: deal.id, ...period })` then `computeDealMargin(rows).revenue` (import the pure `computeDealMargin` from `modules/Deals/utils/computeDealMargin` — a function import, not a module dependency). Keep both services tiny and injectable.
- [ ] **Step 5: Run spec, expect PASS. Commit** — `git commit -m "feat(server): per-deal cost allocation query"`

> The test stubs the model `query()` as a thenable resolving to `rules`; match that shape in the real model proxy. Confirm `GetDealsSummaryService` exposes per-deal revenue; otherwise compute via `getRollup` grouped by project.

---

## Task 11: Overlay allocation into `GetDealProfitability` (flag-gated)

**Files:**
- Modify: `modules/Deals/Deals.interfaces.ts` — extend `DealProfitability`.
- Modify: `modules/Deals/queries/GetDealProfitability.service.ts`.
- Modify: `modules/Deals/Deals.module.ts` — provide `GetDealAllocationService` (+ its collaborators) or import `CostAllocationModule`.
- Test: `modules/Deals/queries/GetDealProfitability.service.spec.ts` — extend.

- [ ] **Step 1: Extend interface**

```ts
export interface DealProfitability {
  dealId: number;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  articles: Array<{ id: number; name: string; kind: string; amount: number; parentId?: number | null }>;
  allocations?: Array<{ ruleId: number; ruleName: string; articleId: number; amount: number }>;
  allocatedTotal?: number;
  costsAfterAllocation?: number;
  profitAfterAllocation?: number;
  marginAfterAllocation?: number;
}
```

- [ ] **Step 2: Failing test** — when the `COST_ALLOCATION` flag is on and allocation returns lines, the response includes `profitAfterAllocation = profit − allocatedTotal`. Inject a mocked `FeatureService` (on) and mocked `GetDealAllocationService` returning `[{ amount: 20, ... }]`; assert `allocatedTotal === 20`, `profitAfterAllocation === profit - 20`. Add a second test: flag off → no allocation fields.

- [ ] **Step 3: Implement** — after computing `margin`:

```ts
    const result: DealProfitability = { dealId, ...margin, articles: rows as any };

    // Always overlay (report-side). Empty when no rules → response unchanged.
    // No server flag check — the codebase gates features on the frontend, not the API.
    const allocations = await this.allocation.getForDeal(dealId, query);
    if (allocations.length) {
      const allocatedTotal = allocations.reduce((s, a) => s + a.amount, 0);
      const costsAfterAllocation = margin.costs + allocatedTotal;
      const profitAfterAllocation = margin.revenue - costsAfterAllocation;
      result.allocations = allocations;
      result.allocatedTotal = allocatedTotal;
      result.costsAfterAllocation = costsAfterAllocation;
      result.profitAfterAllocation = profitAfterAllocation;
      result.marginAfterAllocation = margin.revenue > 0 ? profitAfterAllocation / margin.revenue : 0;
    }
    return result;
```

Inject only `GetDealAllocationService` (no feature checker — see note).

- [ ] **Step 4: Run specs, expect PASS. Commit** — `git commit -m "feat(server): overlay cost allocation on deal profitability"`

> **No server flag check** (verified: Deals/PaymentRequests controllers don't flag-gate — features are gated on the frontend). Always overlay; empty when no rules → unchanged response. DI is one-way: `Deals.module` imports `CostAllocationModule` (exports `GetDealAllocationService`). To avoid a cycle, `CostAllocation` must NOT depend on the Deals module (see Task 10, Step 4).

---

## Task 12: Controller + application + module; register module

**Files (create):** `CostAllocation.controller.ts`, `CostAllocation.application.ts`, `CostAllocation.module.ts`. **Modify:** app module registry.

- [ ] **Step 1: application** (thin facade — mirror `PaymentRequests.application.ts`) exposing `getRules/createRule/editRule/deleteRule/getDealAllocation`.
- [ ] **Step 2: controller** `@Controller('cost-allocation-rules')` with `@UseGuards(AuthorizationGuard, PermissionGuard)` (mirror `PaymentRequests.controller.ts`): `GET /` list, `POST /` create, `PUT /:id` edit, `DELETE /:id` delete. Gate writes behind admin (confirm decorator used by PaymentRequests approve).
- [ ] **Step 3: module** (mirror `PaymentRequests.module.ts`): imports `[TenancyDatabaseModule, TenancyModule]`, controller, providers = application + all commands/queries/validator + `AllocationPool`, `DealsRevenue`, `GetDealAllocationService`. Export `GetDealAllocationService` so Deals can inject it.
- [ ] **Step 4:** Register `CostAllocationModule` where other feature modules are imported (grep for `PaymentRequestsModule` in the app/root module and add alongside).
- [ ] **Step 5: Typecheck + commit** — `git commit -m "feat(server): cost-allocation controller, application, module"`

---

## Task 13: Webapp react-query hooks

**Files:** Create `packages/webapp/src/hooks/query/costAllocation.tsx` (mirror `hooks/query/paymentRequests.tsx`): `useCostAllocationRules`, `useCreateRule`, `useEditRule`, `useDeleteRule`, and `useDealProfitability` already exists in `deals.tsx` (allocation fields ride along on its response — no new hook needed).

- [ ] **Step 1: Implement** the hooks against `/cost-allocation-rules`. **Step 2: webapp typecheck. Step 3: commit** — `git commit -m "feat(webapp): cost-allocation query hooks"`

> Read `hooks/query/paymentRequests.tsx` to mirror query keys, axios client, invalidation.

---

## Task 14: Webapp rules page + dialog

**Files:** Create `containers/CostAllocation/CostAllocationPage.tsx`, `CostAllocationRuleDialog.tsx`, `schemas.ts` (Zod). Mirror `containers/PaymentRequests/*`.

- [ ] **Step 1:** `schemas.ts` — Zod schema: `name` (min 1), `sourceArticleId` (number), `allocationKey` enum, optional `manualShares`/`targetDealIds`/dates/`isActive`.
- [ ] **Step 2:** Dialog — RHF + zodResolver; fields: name, source article (select from management articles, expense kind), key (radio revenue/manual), manual-shares editor when manual, validity dates, active toggle. All labels via `intl.get`.
- [ ] **Step 3:** Page — shadcn list of rules + create/edit/delete actions.
- [ ] **Step 4: webapp typecheck + commit** — `git commit -m "feat(webapp): cost-allocation rules page and dialog"`

> No hardcoded strings — every label `intl.get('cost_allocation.*')`. Mirror the dialog/page structure of `PaymentRequestDialog.tsx`/`PaymentRequestsPage.tsx`.

---

## Task 15: "После распределения" block in DealProfitability

**Files:** Modify `containers/Deals/DealProfitability.tsx`.

- [ ] **Step 1:** After the existing profit row, render — only when `p.allocations?.length`:

```tsx
        {Array.isArray(p.allocations) && p.allocations.length > 0 && (
          <div className="mt-2 flex flex-col gap-1 border-t pt-2 text-muted-foreground">
            <div className="text-xs uppercase">{intl.get('deals.profitability.after_allocation')}</div>
            {p.allocations.map((a: any) => (
              <div key={a.ruleId} className="flex justify-between">
                <span>{a.ruleName}</span>
                <span>−{fmt(a.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-medium text-foreground">
              <span>{intl.get('deals.profitability.profit_after')}</span>
              <span>{fmt(p.profitAfterAllocation)} · {pct(p.marginAfterAllocation)}</span>
            </div>
          </div>
        )}
```

- [ ] **Step 2: webapp typecheck + commit** — `git commit -m "feat(webapp): show after-allocation profit on deal card"`

---

## Task 16: i18n keys (EN + RU, parity)

**Files:** Modify `lang/en/index.json`, `lang/ru/index.json`.

- [ ] **Step 1:** Add (EN then RU, identical key sets):
  - `cost_allocation.page.title` → "Cost allocation" / "Распределение расходов"
  - `cost_allocation.action.create` → "New rule" / "Новое правило"
  - `cost_allocation.field.name` → "Name" / "Название"
  - `cost_allocation.field.source_article` → "Cost article" / "Статья расхода"
  - `cost_allocation.field.key` → "Allocation key" / "Ключ распределения"
  - `cost_allocation.key.revenue` → "By revenue" / "По выручке"
  - `cost_allocation.key.manual_share` → "Manual shares" / "Ручные доли"
  - `cost_allocation.field.valid_from` / `valid_to` / `active`
  - `deals.profitability.after_allocation` → "After allocation" / "После распределения"
  - `deals.profitability.profit_after` → "Profit after allocation" / "Прибыль после распределения"
- [ ] **Step 2: lang-check** — `node packages/webapp/scripts/lang-check.js` (expect parity OK).
- [ ] **Step 3: commit** — `git commit -m "feat(webapp): cost-allocation i18n keys (en/ru)"`

> Insert keys in the correct alphabetical/structural position to keep en↔ru parity. Use the `i18n-add-string` skill if preferred.

---

## Task 17: Route wiring (flag-gated)

**Files:** Modify `routes/dashboard.tsx` (+ `constants/features.tsx` if a FE flag list exists).

- [ ] **Step 1:** Add a `/cost-allocation` route rendering `CostAllocationPage`, gated by the `COST_ALLOCATION` feature (mirror how `/payment-requests` / `/deals` are gated in `dashboard.tsx`).
- [ ] **Step 2: webapp typecheck + commit** — `git commit -m "feat(webapp): cost-allocation route behind flag"`

> Read `routes/dashboard.tsx` to mirror the exact flag-gating pattern used by deals/payment-requests.

---

## Task 18: Full verification

- [ ] **Step 1: Server tests** — `pnpm --filter @bigfin/server test` (all green, incl. new specs).
- [ ] **Step 2: Typecheck** — `pnpm --filter @bigfin/server typecheck` and `pnpm --filter @bigfin/webapp typecheck` (build `shared/*` first if `@bigfin/*` not found).
- [ ] **Step 3: lang parity** — `node packages/webapp/scripts/lang-check.js`.
- [ ] **Step 4:** Final commit if anything pending. **Do not push / open PR** without explicit ask.

---

## Self-Review notes (author)

- **Spec coverage:** §4 table → Task 2/3; §5 engine → Task 4; §6 pool/weights → Task 9/10 + collaborators; §7 integration → Task 11; §8 module → Task 5–8,12; §9 frontend → Task 13–15,17; §10 tests → Tasks 1,4,6,9,10,11; §3 flag → Task 1. Covered.
- **Known verify-points (resolve during implementation, not placeholders):** exact `Features` enum literal style; `ServiceError.errorType`; `@/common/decorators/Validators` exports; the canonical server feature-flag read API; `GetDealsSummaryService` per-deal revenue shape; `ArticlesPlRollup` spec mocking style; `routes/dashboard.tsx` gating pattern. Each names the exact file to read.
- **Type consistency:** `AllocationWeight`/`AllocationAmount` (Task 4) reused in Task 10; `DealAllocationLine` defined Task 10, reused Task 11 interface; allocation response fields consistent between Task 11 (server) and Task 15 (frontend).
