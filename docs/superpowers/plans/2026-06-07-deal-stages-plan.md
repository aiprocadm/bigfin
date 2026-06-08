# Deal Stages (㉘) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split a deal into stages with planned revenue/cost; closing a stage recognizes its planned amounts in the close month (report-side, no ledger writes), showing per-deal progress and plan/fact.

**Architecture:** A new tenant entity `DealStage` (belongs to a `Deal`, which lives on the `projects` table). Pure functions `recognizeStagesByPeriod` / `summarizeDealStages` compute recognition + progress + plan-vs-fact from the stage rows and the deal's existing actual margin. CRUD lives in the `Deals` module under `/deals/:dealId/stages`; the summary reuses `ArticlesPlRollupService` + `computeDealMargin` for the "fact" side. Frontend adds a "Этапы" section to the deal page behind the `deal_stages` flag. Mirrors the proven `CostAllocation` (⑦b) structure.

**Tech Stack:** NestJS 10, objection/knex (MySQL), class-validator, Jest (server); React 18 + shadcn + React Hook Form + Zod + react-query (webapp); react-intl-universal i18n.

**Spec:** `docs/superpowers/specs/2026-06-07-deal-stages-design.md`

**Conventions (this repo):** Node 18.16.1 only — prefix pnpm with `export PATH="/c/Users/karka/AppData/Roaming/fnm/node-versions/v18.16.1/installation:$PATH"`. ts-jest is slow to start (60–320s) — use long timeouts, not a hang. Migrations use plain-knex `exports.up/down`; money columns are `decimal(13, 3)`. Every visible string via `intl.get`. Commit subjects start lowercase; commit **body lines ≤100 chars** (husky commitlint). Stage `git add <paths>` explicitly — never `git add -A` (unrelated untracked `.agents/`, `.codex/`, `AGENTS.md` must stay out). Local atomic commits; **no push/PR without explicit ask.**

---

## File Structure

**Server (create unless noted):**
- `common/types/Features.ts` — *modify*: add `DEAL_STAGES = 'deal_stages'` to the `Features` enum.
- `modules/Features/FeaturesConfigure.ts` — *modify*: register flag (off).
- `modules/Features/FeaturesConfigure.dealStages.spec.ts` — flag test.
- `database/tenant/migrations/20260607130000_create_deal_stages_table.ts` — table.
- `modules/Deals/models/DealStage.model.ts` — model.
- `modules/Tenancy/TenancyModels/Tenancy.module.ts` — *modify*: register model.
- `modules/Deals/utils/recognizeStages.ts` + `.spec.ts` — pure recognition.
- `modules/Deals/constants.ts` — *modify*: add stage ERRORS (file already exists for Deals).
- `modules/Deals/dtos/DealStage.dto.ts` — Create/Edit DTOs.
- `modules/Deals/commands/CommandDealStageValidator.service.ts` + `.spec.ts`.
- `modules/Deals/commands/{CreateDealStage,EditDealStage,DeleteDealStage}.service.ts`.
- `modules/Deals/queries/GetDealStages.service.ts` (+ `.spec.ts`).
- `modules/Deals/DealStages.application.ts`, `modules/Deals/DealStages.controller.ts`.
- `modules/Deals/Deals.module.ts` — *modify*: register stage providers + controller.

**Webapp (create unless noted):**
- `hooks/query/types.tsx` — *modify*: add `DEAL_STAGES` query key.
- `hooks/query/dealStages.tsx` — react-query hooks.
- `containers/Deals/DealStagesSection.tsx`, `DealStageDialog.tsx`, `stageSchemas.ts`.
- `containers/Deals/<deal page>` — *modify*: mount `DealStagesSection` (see Task 13 verify-point).
- `lang/en/index.json`, `lang/ru/index.json` — *modify*: new `deal_stages.*` keys (parity).

---

## Task 1: Feature flag `DEAL_STAGES`

**Files:** Modify `packages/server/src/common/types/Features.ts`, `modules/Features/FeaturesConfigure.ts`; Test `modules/Features/FeaturesConfigure.dealStages.spec.ts`.

- [ ] **Step 1: Write the failing test** (mirror `FeaturesConfigure.deals.spec.ts` / `.costAllocation.spec.ts`)

```ts
// © 2026 Bigfin
import { ConfigService } from '@nestjs/config';
import { Features } from '@/common/types/Features';
import { FeaturesConfigure } from './FeaturesConfigure';

describe('FeaturesConfigure — deal stages', () => {
  it('registers the deal_stages feature, off by default', () => {
    const cfg = new FeaturesConfigure({ get: () => undefined } as unknown as ConfigService);
    const flag = cfg.getConfigure().find((f) => f.name === Features.DEAL_STAGES);
    expect(flag).toBeDefined();
    expect(flag?.defaultValue).toBe(false);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** — `pnpm --filter @bigfin/server test -- src/modules/Features/FeaturesConfigure.dealStages.spec.ts`
- [ ] **Step 3:** In `Features.ts` add `DEAL_STAGES = 'deal_stages',` to the enum. In `FeaturesConfigure.ts` append `{ name: Features.DEAL_STAGES, defaultValue: false },` to the returned array (match the existing `COST_ALLOCATION` entry style).
- [ ] **Step 4: Run test, expect PASS.**
- [ ] **Step 5: Commit** — `git add packages/server/src/common/types/Features.ts packages/server/src/modules/Features/FeaturesConfigure.ts packages/server/src/modules/Features/FeaturesConfigure.dealStages.spec.ts && git commit -m "feat(server): register deal_stages feature flag"`

---

## Task 2: Migration `deal_stages`

**Files:** Create `packages/server/src/database/tenant/migrations/20260607130000_create_deal_stages_table.ts`

- [ ] **Step 1: Write migration** (mirror `20260607120000_create_cost_allocation_rules_table.ts`)

```ts
// © 2026 Bigfin
exports.up = (knex) => {
  return knex.schema.createTable('deal_stages', (table) => {
    table.increments('id');
    table
      .integer('deal_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('projects')
      .index();
    table.string('name').notNullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.decimal('planned_revenue', 13, 3).notNullable().defaultTo(0);
    table.decimal('planned_cost', 13, 3).notNullable().defaultTo(0);
    table.string('status').notNullable().defaultTo('open'); // open|closed
    table.date('closed_date').nullable();
    table.timestamps();
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('deal_stages');
```

- [ ] **Step 2: Typecheck** — `pnpm --filter @bigfin/server typecheck` (expect clean).
- [ ] **Step 3: Commit** — `git add packages/server/src/database/tenant/migrations/20260607130000_create_deal_stages_table.ts && git commit -m "feat(server): add deal_stages tenant migration"`

> DB not set up locally — `latest→rollback→latest` runs on CI/staging. `down()` provided.

---

## Task 3: Model `DealStage` + register in Tenancy

**Files:** Create `packages/server/src/modules/Deals/models/DealStage.model.ts`; Modify `modules/Tenancy/TenancyModels/Tenancy.module.ts`.

- [ ] **Step 1: Write model** (mirror `CostAllocationRule.model.ts`)

```ts
// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class DealStage extends TenantBaseModel {
  dealId!: number;
  name!: string;
  sortOrder!: number;
  plannedRevenue!: number;
  plannedCost!: number;
  status!: string;
  closedDate!: string | null;

  static get tableName() {
    return 'deal_stages';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get modifiers() {
    return {
      forDeal(query, dealId: number) {
        query.where('dealId', dealId);
      },
      closed(query) {
        query.where('status', 'closed');
      },
    };
  }
}
```

- [ ] **Step 2: Register in Tenancy.** In `Tenancy.module.ts` add the import next to the other model imports and add `DealStage` to the `models` array (same as `Deal`/`CostAllocationRule`), so `@Inject(DealStage.name)` resolves.

```ts
import { DealStage } from '@/modules/Deals/models/DealStage.model';
// ... in const models = [ ..., DealStage, ... ];
```

- [ ] **Step 3: Typecheck** — `pnpm --filter @bigfin/server typecheck`.
- [ ] **Step 4: Commit** — `git add packages/server/src/modules/Deals/models/DealStage.model.ts packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts && git commit -m "feat(server): add DealStage model"`

---

## Task 4: Pure recognition functions `recognizeStages`

**Files:** Create `packages/server/src/modules/Deals/utils/recognizeStages.ts` + `.spec.ts`.

- [ ] **Step 1: Write failing tests**

```ts
// © 2026 Bigfin
import { recognizeStagesByPeriod, summarizeDealStages } from './recognizeStages';

const stage = (over: any = {}) => ({
  plannedRevenue: 0, plannedCost: 0, status: 'open', closedDate: null, ...over,
});

describe('recognizeStagesByPeriod', () => {
  it('groups closed stages by close month', () => {
    const r = recognizeStagesByPeriod([
      stage({ plannedRevenue: 100, plannedCost: 40, status: 'closed', closedDate: '2026-03-10' }),
      stage({ plannedRevenue: 50, plannedCost: 10, status: 'closed', closedDate: '2026-03-25' }),
      stage({ plannedRevenue: 400, plannedCost: 300, status: 'closed', closedDate: '2026-05-01' }),
    ]);
    expect(r['2026-03']).toEqual({ revenue: 150, costs: 50, profit: 100 });
    expect(r['2026-05']).toEqual({ revenue: 400, costs: 300, profit: 100 });
  });

  it('ignores open stages and stages without a close date', () => {
    const r = recognizeStagesByPeriod([
      stage({ plannedRevenue: 100, status: 'open' }),
      stage({ plannedRevenue: 100, status: 'closed', closedDate: null }),
    ]);
    expect(r).toEqual({});
  });
});

describe('summarizeDealStages', () => {
  const fact = { revenue: 120, costs: 30, profit: 90 };

  it('sums planned (all) and recognized (closed) and computes progress', () => {
    const s = summarizeDealStages(
      [
        stage({ plannedRevenue: 100, plannedCost: 40, status: 'closed', closedDate: '2026-03-10' }),
        stage({ plannedRevenue: 400, plannedCost: 300, status: 'open' }),
      ],
      fact,
    );
    expect(s.planned).toEqual({ revenue: 500, costs: 340, profit: 160 });
    expect(s.recognized).toEqual({ revenue: 100, costs: 40, profit: 60 });
    expect(s.progress).toBeCloseTo(100 / 500);
    expect(s.fact).toEqual(fact);
  });

  it('returns zero summary and progress 0 when there are no stages', () => {
    const s = summarizeDealStages([], fact);
    expect(s.planned).toEqual({ revenue: 0, costs: 0, profit: 0 });
    expect(s.recognized).toEqual({ revenue: 0, costs: 0, profit: 0 });
    expect(s.progress).toBe(0);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @bigfin/server test -- src/modules/Deals/utils/recognizeStages.spec.ts`
- [ ] **Step 3: Implement**

```ts
// © 2026 Bigfin
export interface StageInput {
  plannedRevenue: number;
  plannedCost: number;
  status: string;
  closedDate?: string | null;
}

export interface StageAmounts {
  revenue: number;
  costs: number;
  profit: number;
}

export interface DealStagesSummary {
  planned: StageAmounts;
  recognized: StageAmounts;
  progress: number; // 0..1, by planned revenue
  byPeriod: Record<string, StageAmounts>;
  fact: StageAmounts;
}

const amounts = (revenue: number, costs: number): StageAmounts => ({
  revenue,
  costs,
  profit: revenue - costs,
});

const isRecognized = (s: StageInput) => s.status === 'closed' && !!s.closedDate;

/** Closed stages grouped by the month ('YYYY-MM') of their close date. */
export function recognizeStagesByPeriod(
  stages: StageInput[],
): Record<string, StageAmounts> {
  const out: Record<string, StageAmounts> = {};
  for (const s of stages) {
    if (!isRecognized(s)) continue;
    const period = String(s.closedDate).slice(0, 7);
    const prev = out[period] ?? amounts(0, 0);
    out[period] = amounts(
      prev.revenue + Number(s.plannedRevenue || 0),
      prev.costs + Number(s.plannedCost || 0),
    );
  }
  return out;
}

/** Deal-level plan (all stages), recognized (closed), progress, by-period, and fact. */
export function summarizeDealStages(
  stages: StageInput[],
  fact: StageAmounts,
): DealStagesSummary {
  const sum = (list: StageInput[]) =>
    amounts(
      list.reduce((a, s) => a + Number(s.plannedRevenue || 0), 0),
      list.reduce((a, s) => a + Number(s.plannedCost || 0), 0),
    );
  const planned = sum(stages);
  const recognized = sum(stages.filter(isRecognized));
  const progress = planned.revenue > 0 ? recognized.revenue / planned.revenue : 0;
  return {
    planned,
    recognized,
    progress,
    byPeriod: recognizeStagesByPeriod(stages),
    fact,
  };
}
```

- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `git add packages/server/src/modules/Deals/utils/recognizeStages.ts packages/server/src/modules/Deals/utils/recognizeStages.spec.ts && git commit -m "feat(server): add deal-stage recognition pure functions"`

---

## Task 5: constants + DTOs

**Files:** Modify `packages/server/src/modules/Deals/constants.ts` (exists — has `ERRORS` with `DEAL_NOT_FOUND`); Create `dtos/DealStage.dto.ts`.

- [ ] **Step 1:** Read `modules/Deals/constants.ts`, then add stage error keys to the existing `ERRORS` object:

```ts
  STAGE_NOT_FOUND: 'STAGE_NOT_FOUND',
  STAGE_NAME_REQUIRED: 'STAGE_NAME_REQUIRED',
  STAGE_NEGATIVE_AMOUNT: 'STAGE_NEGATIVE_AMOUNT',
  STAGE_CLOSE_NEEDS_DATE: 'STAGE_CLOSE_NEEDS_DATE',
```

(Keep the existing `DEAL_NOT_FOUND` and any others. Match the file's existing object style.)

- [ ] **Step 2: DealStage.dto.ts** (mirror `dtos/Deal.dto.ts` and `CostAllocationRule.dto.ts`)

```ts
// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsString, Min } from 'class-validator';

class CommandDealStageDto {
  @IsString()
  @ApiProperty({ example: 'Проект' })
  name: string;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 100000 })
  plannedRevenue?: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 40000 })
  plannedCost?: number;

  @ToNumber()
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ example: 1 })
  sortOrder?: number;

  @IsIn(['open', 'closed'])
  @IsOptional()
  @ApiPropertyOptional({ example: 'open', enum: ['open', 'closed'] })
  status?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-03-10', description: 'Close date (required when status=closed)' })
  closedDate?: string;
}

export class CreateDealStageDto extends CommandDealStageDto {}
export class EditDealStageDto extends CommandDealStageDto {}
```

- [ ] **Step 3: Typecheck + commit** — `git add packages/server/src/modules/Deals/constants.ts packages/server/src/modules/Deals/dtos/DealStage.dto.ts && git commit -m "feat(server): deal-stage constants and DTOs"`

> Verify `@/common/decorators/Validators` exports `IsOptional` and `ToNumber` (used by `CostAllocationRule.dto.ts`). Confirm `modules/Deals/constants.ts` exists and its `ERRORS` shape before editing.

---

## Task 6: Validator `CommandDealStageValidator`

**Files:** Create `commands/CommandDealStageValidator.service.ts` + `.spec.ts`.

- [ ] **Step 1: Write failing tests** (mirror `CommandCostAllocationValidator.service.spec.ts` — mocks the `Deal` model by name)

```ts
// © 2026 Bigfin
import { Test } from '@nestjs/testing';
import { Deal } from '@/modules/Deals/models/Deal.model';
import { CommandDealStageValidatorService } from './CommandDealStageValidator.service';

const dealModel = (found: any) => () => ({ query: () => ({ findById: async () => found }) });

describe('CommandDealStageValidatorService', () => {
  const build = async (deal: any) => {
    const ref = await Test.createTestingModule({
      providers: [
        CommandDealStageValidatorService,
        { provide: Deal.name, useValue: dealModel(deal) },
      ],
    }).compile();
    return ref.get(CommandDealStageValidatorService);
  };

  it('throws DEAL_NOT_FOUND when the deal is missing', async () => {
    const v = await build(null);
    await expect(v.validate(9, { name: 'X' } as any)).rejects.toMatchObject({ errorType: 'DEAL_NOT_FOUND' });
  });

  it('throws STAGE_NAME_REQUIRED when name is blank', async () => {
    const v = await build({ id: 1 });
    await expect(v.validate(1, { name: '  ' } as any)).rejects.toMatchObject({ errorType: 'STAGE_NAME_REQUIRED' });
  });

  it('throws STAGE_NEGATIVE_AMOUNT for a negative planned amount', async () => {
    const v = await build({ id: 1 });
    await expect(v.validate(1, { name: 'X', plannedRevenue: -1 } as any)).rejects.toMatchObject({ errorType: 'STAGE_NEGATIVE_AMOUNT' });
  });

  it('throws STAGE_CLOSE_NEEDS_DATE when closing without a date', async () => {
    const v = await build({ id: 1 });
    await expect(v.validate(1, { name: 'X', status: 'closed' } as any)).rejects.toMatchObject({ errorType: 'STAGE_CLOSE_NEEDS_DATE' });
  });

  it('passes a valid open stage', async () => {
    const v = await build({ id: 1 });
    await expect(v.validate(1, { name: 'Проект', plannedRevenue: 100 } as any)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Deal } from '@/modules/Deals/models/Deal.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ERRORS } from '../constants';

@Injectable()
export class CommandDealStageValidatorService {
  constructor(
    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public async validate(
    dealId: number,
    dto: {
      name?: string;
      plannedRevenue?: number;
      plannedCost?: number;
      status?: string;
      closedDate?: string;
    },
  ) {
    const deal = await this.dealModel().query().findById(dealId);
    if (!deal) throw new ServiceError(ERRORS.DEAL_NOT_FOUND);

    if (!dto.name || !dto.name.trim()) {
      throw new ServiceError(ERRORS.STAGE_NAME_REQUIRED);
    }
    if (Number(dto.plannedRevenue ?? 0) < 0 || Number(dto.plannedCost ?? 0) < 0) {
      throw new ServiceError(ERRORS.STAGE_NEGATIVE_AMOUNT);
    }
    if (dto.status === 'closed' && !dto.closedDate) {
      throw new ServiceError(ERRORS.STAGE_CLOSE_NEEDS_DATE);
    }
  }
}
```

- [ ] **Step 4: Run, expect PASS. Step 5: Commit** — `git add packages/server/src/modules/Deals/commands/CommandDealStageValidator.service.ts packages/server/src/modules/Deals/commands/CommandDealStageValidator.service.spec.ts && git commit -m "feat(server): deal-stage validator"`

> Confirm `ServiceError` sets `.errorType` to its argument (verified in ⑦b).

---

## Task 7: CRUD commands (Create/Edit/Delete)

**Files (create):** `commands/CreateDealStage.service.ts`, `EditDealStage.service.ts`, `DeleteDealStage.service.ts`.

- [ ] **Step 1: CreateDealStage.service.ts** (mirror `CreateCostAllocationRule.service.ts`)

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DealStage } from '../models/DealStage.model';
import { CommandDealStageValidatorService } from './CommandDealStageValidator.service';
import { CreateDealStageDto } from '../dtos/DealStage.dto';

@Injectable()
export class CreateDealStageService {
  constructor(
    private readonly validator: CommandDealStageValidatorService,
    @Inject(DealStage.name)
    private readonly stageModel: TenantModelProxy<typeof DealStage>,
  ) {}

  public async create(dealId: number, dto: CreateDealStageDto) {
    await this.validator.validate(dealId, dto as any);
    return this.stageModel().query().insertAndFetch({ ...(dto as any), dealId });
  }
}
```

- [ ] **Step 2: EditDealStage.service.ts** — find→`STAGE_NOT_FOUND`, validate, `patchAndFetchById`.

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DealStage } from '../models/DealStage.model';
import { CommandDealStageValidatorService } from './CommandDealStageValidator.service';
import { EditDealStageDto } from '../dtos/DealStage.dto';
import { ERRORS } from '../constants';

@Injectable()
export class EditDealStageService {
  constructor(
    private readonly validator: CommandDealStageValidatorService,
    @Inject(DealStage.name)
    private readonly stageModel: TenantModelProxy<typeof DealStage>,
  ) {}

  public async edit(dealId: number, stageId: number, dto: EditDealStageDto) {
    const existing = await this.stageModel().query().findById(stageId);
    if (!existing || existing.dealId !== dealId) {
      throw new ServiceError(ERRORS.STAGE_NOT_FOUND);
    }
    await this.validator.validate(dealId, dto as any);
    return this.stageModel().query().patchAndFetchById(stageId, dto as any);
  }
}
```

- [ ] **Step 3: DeleteDealStage.service.ts**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DealStage } from '../models/DealStage.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteDealStageService {
  constructor(
    @Inject(DealStage.name)
    private readonly stageModel: TenantModelProxy<typeof DealStage>,
  ) {}

  public async delete(dealId: number, stageId: number) {
    const existing = await this.stageModel().query().findById(stageId);
    if (!existing || existing.dealId !== dealId) {
      throw new ServiceError(ERRORS.STAGE_NOT_FOUND);
    }
    await this.stageModel().query().deleteById(stageId);
  }
}
```

- [ ] **Step 4: Typecheck + commit** — `git add packages/server/src/modules/Deals/commands/CreateDealStage.service.ts packages/server/src/modules/Deals/commands/EditDealStage.service.ts packages/server/src/modules/Deals/commands/DeleteDealStage.service.ts && git commit -m "feat(server): deal-stage CRUD commands"`

---

## Task 8: Query `GetDealStages` (stages + summary)

**Files:** Create `queries/GetDealStages.service.ts` + `.spec.ts`.

The query lists a deal's stages (ordered) and computes the summary, reusing the deal's actual margin (the "fact") from `ArticlesPlRollupService` + `computeDealMargin` (same pattern as `GetDealsSummaryService`).

- [ ] **Step 1: Write failing test** (mock the stage model `query()` thenable → ordered stages; mock the rollup → rows; assert stages returned + summary uses `summarizeDealStages`)

```ts
// © 2026 Bigfin
import { GetDealStagesService } from './GetDealStages.service';

describe('GetDealStagesService', () => {
  const stages = [
    { id: 1, dealId: 7, name: 'Проект', plannedRevenue: 100, plannedCost: 40, status: 'closed', closedDate: '2026-03-10', sortOrder: 0 },
    { id: 2, dealId: 7, name: 'Стройка', plannedRevenue: 400, plannedCost: 300, status: 'open', closedDate: null, sortOrder: 1 },
  ];
  // stageModel().query().modify(...).orderBy(...) must resolve to `stages` (thenable).
  const stageModel = () => ({
    query: () => ({ modify: () => ({ orderBy: () => Promise.resolve(stages) }) }),
  });
  // rollup rows → computeDealMargin gives the fact; income 120 / expense 30.
  const rollup = {
    getRollup: async () => [
      { id: 10, name: 'Выручка', kind: 'income', amount: 120, parentId: null },
      { id: 20, name: 'Расходы', kind: 'expense', amount: 30, parentId: null },
    ],
  };

  it('returns ordered stages and a summary with plan/recognized/progress/fact', async () => {
    const svc = new GetDealStagesService(rollup as any, stageModel as any);
    const res = await svc.getForDeal(7, {});
    expect(res.stages).toHaveLength(2);
    expect(res.summary.planned).toEqual({ revenue: 500, costs: 340, profit: 160 });
    expect(res.summary.recognized).toEqual({ revenue: 100, costs: 40, profit: 60 });
    expect(res.summary.progress).toBeCloseTo(100 / 500);
    expect(res.summary.fact).toEqual({ revenue: 120, costs: 30, profit: 90 });
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DealStage } from '../models/DealStage.model';
import { computeDealMargin } from '../utils/computeDealMargin';
import { summarizeDealStages, DealStagesSummary } from '../utils/recognizeStages';

export interface DealStagesResult {
  stages: any[];
  summary: DealStagesSummary;
}

@Injectable()
export class GetDealStagesService {
  constructor(
    private readonly rollup: ArticlesPlRollupService,
    @Inject(DealStage.name)
    private readonly stageModel: TenantModelProxy<typeof DealStage>,
  ) {}

  public async getForDeal(
    dealId: number,
    period: { fromDate?: string; toDate?: string },
  ): Promise<DealStagesResult> {
    const stages: any[] = await this.stageModel()
      .query()
      .modify('forDeal', dealId)
      .orderBy('sortOrder');

    const rows = await this.rollup.getRollup({
      projectId: dealId,
      fromDate: period.fromDate,
      toDate: period.toDate,
    } as any);
    const fact = computeDealMargin(rows as any);

    const summary = summarizeDealStages(stages as any, {
      revenue: fact.revenue,
      costs: fact.costs,
      profit: fact.profit,
    });
    return { stages, summary };
  }
}
```

- [ ] **Step 4: Run, expect PASS. Step 5: Commit** — `git add packages/server/src/modules/Deals/queries/GetDealStages.service.ts packages/server/src/modules/Deals/queries/GetDealStages.service.spec.ts && git commit -m "feat(server): deal-stages query with recognition summary"`

> The test stubs `stageModel().query().modify().orderBy()` as a thenable resolving to `stages`; match that chain in the real model proxy.

---

## Task 9: Application + controller + module wiring

**Files:** Create `DealStages.application.ts`, `DealStages.controller.ts`; Modify `Deals.module.ts`.

- [ ] **Step 1: DealStages.application.ts** (thin facade)

```ts
// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetDealStagesService } from './queries/GetDealStages.service';
import { CreateDealStageService } from './commands/CreateDealStage.service';
import { EditDealStageService } from './commands/EditDealStage.service';
import { DeleteDealStageService } from './commands/DeleteDealStage.service';
import { CreateDealStageDto, EditDealStageDto } from './dtos/DealStage.dto';

@Injectable()
export class DealStagesApplication {
  constructor(
    private readonly getStages: GetDealStagesService,
    private readonly createStage: CreateDealStageService,
    private readonly editStage: EditDealStageService,
    private readonly deleteStage: DeleteDealStageService,
  ) {}

  list(dealId: number, query: { fromDate?: string; toDate?: string }) {
    return this.getStages.getForDeal(dealId, query);
  }
  create(dealId: number, dto: CreateDealStageDto) {
    return this.createStage.create(dealId, dto);
  }
  edit(dealId: number, stageId: number, dto: EditDealStageDto) {
    return this.editStage.edit(dealId, stageId, dto);
  }
  remove(dealId: number, stageId: number) {
    return this.deleteStage.delete(dealId, stageId);
  }
}
```

- [ ] **Step 2: DealStages.controller.ts** (mirror `Deals.controller.ts` guards; nested routes)

```ts
// © 2026 Bigfin
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { DealStagesApplication } from './DealStages.application';
import { CreateDealStageDto, EditDealStageDto } from './dtos/DealStage.dto';

@Controller('deals/:dealId/stages')
@ApiTags('Deals')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class DealStagesController {
  constructor(private readonly application: DealStagesApplication) {}

  @Get()
  @ApiOperation({ summary: 'List a deal\'s stages with recognition summary.' })
  list(
    @Param('dealId', ParseIntPipe) dealId: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.application.list(dealId, { fromDate, toDate });
  }

  @Post()
  @ApiOperation({ summary: 'Add a stage to a deal.' })
  create(@Param('dealId', ParseIntPipe) dealId: number, @Body() dto: CreateDealStageDto) {
    return this.application.create(dealId, dto);
  }

  @Put(':stageId')
  @ApiOperation({ summary: 'Edit a deal stage.' })
  edit(
    @Param('dealId', ParseIntPipe) dealId: number,
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: EditDealStageDto,
  ) {
    return this.application.edit(dealId, stageId, dto);
  }

  @Delete(':stageId')
  @ApiOperation({ summary: 'Delete a deal stage.' })
  remove(
    @Param('dealId', ParseIntPipe) dealId: number,
    @Param('stageId', ParseIntPipe) stageId: number,
  ) {
    return this.application.remove(dealId, stageId);
  }
}
```

- [ ] **Step 3: Wire `Deals.module.ts`** — add the new controller to `controllers` and the new providers to `providers`:

```ts
// imports
import { DealStagesController } from './DealStages.controller';
import { DealStagesApplication } from './DealStages.application';
import { GetDealStagesService } from './queries/GetDealStages.service';
import { CommandDealStageValidatorService } from './commands/CommandDealStageValidator.service';
import { CreateDealStageService } from './commands/CreateDealStage.service';
import { EditDealStageService } from './commands/EditDealStage.service';
import { DeleteDealStageService } from './commands/DeleteDealStage.service';

// @Module:
//   controllers: [DealsController, DealStagesController],
//   providers: [ ...existing,
//     DealStagesApplication, GetDealStagesService, CommandDealStageValidatorService,
//     CreateDealStageService, EditDealStageService, DeleteDealStageService ],
```

(`ArticlesPlRollupService` is already a provider in `Deals.module.ts` — reused by `GetDealStagesService`.)

- [ ] **Step 4: Typecheck + commit** — `git add packages/server/src/modules/Deals/DealStages.application.ts packages/server/src/modules/Deals/DealStages.controller.ts packages/server/src/modules/Deals/Deals.module.ts && git commit -m "feat(server): deal-stages controller, application, module wiring"`

---

## Task 10: Webapp react-query hooks

**Files:** Modify `hooks/query/types.tsx` (add `DEAL_STAGES` key); Create `hooks/query/dealStages.tsx`.

- [ ] **Step 1:** In `hooks/query/types.tsx` add a `DEAL_STAGES: 'DEAL_STAGES'` key (mirror how `COST_ALLOCATION_RULES` is added — find its block and add alongside, exported through the same default object).
- [ ] **Step 2: dealStages.tsx** (mirror `hooks/query/costAllocation.tsx`)

```tsx
// © 2026 Bigfin
import {
  useMutation, useQueryClient, QueryClient, UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

export interface DealStageValues {
  name: string;
  plannedRevenue?: number;
  plannedCost?: number;
  sortOrder?: number;
  status?: 'open' | 'closed';
  closedDate?: string;
}

const invalidate = (client: QueryClient) => {
  client.invalidateQueries(t.DEAL_STAGES);
};

/** A deal's stages + recognition summary. */
export function useDealStages(dealId: number | string, query?: any, props?: any) {
  return useRequestQuery(
    [t.DEAL_STAGES, dealId, query],
    { method: 'get', url: `deals/${dealId}/stages`, params: query },
    { select: (res: any) => res.data, enabled: !!dealId, ...props },
  );
}

export function useCreateStage(
  dealId: number | string,
  props?: UseMutationOptions<any, any, DealStageValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, DealStageValues>(
    (values) => api.post(`deals/${dealId}/stages`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useEditStage(
  dealId: number | string,
  props?: UseMutationOptions<any, any, [number | string, DealStageValues]>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, [number | string, DealStageValues]>(
    ([stageId, values]) => api.put(`deals/${dealId}/stages/${stageId}`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeleteStage(
  dealId: number | string,
  props?: UseMutationOptions<any, any, number | string>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number | string>(
    (stageId) => api.delete(`deals/${dealId}/stages/${stageId}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}
```

- [ ] **Step 3: webapp typecheck + commit** — `git add packages/webapp/src/hooks/query/types.tsx packages/webapp/src/hooks/query/dealStages.tsx && git commit -m "feat(webapp): deal-stages query hooks"`

> Read `hooks/query/costAllocation.tsx` + the `select` shape used by `useDealProfitability` (in `deals.tsx`) to match `res.data` vs `res.data.data` exactly.

---

## Task 11: Webapp stage dialog + section

**Files:** Create `containers/Deals/stageSchemas.ts`, `DealStageDialog.tsx`, `DealStagesSection.tsx`. Mirror `containers/CostAllocation/{schemas,CostAllocationRuleDialog,CostAllocationPage}.tsx`.

- [ ] **Step 1: stageSchemas.ts** — Zod:

```ts
// © 2026 Bigfin
import { z } from 'zod';

export const getDealStageSchema = () =>
  z.object({
    name: z.string().min(1),
    plannedRevenue: z.coerce.number().nonnegative().optional(),
    plannedCost: z.coerce.number().nonnegative().optional(),
    sortOrder: z.coerce.number().optional(),
    status: z.enum(['open', 'closed']).optional(),
    closedDate: z.string().optional(),
  });

export type DealStageFormValues = z.infer<ReturnType<typeof getDealStageSchema>>;
```

- [ ] **Step 2: DealStageDialog.tsx** — RHF + zodResolver; fields name, plannedRevenue, plannedCost, status (open/closed), closedDate (shown/required when status=closed). Mirror `CostAllocationRuleDialog.tsx` structure (FormField + shadcn). All labels `intl.get('deal_stages.*')`. On submit call `useCreateStage`/`useEditStage`.
- [ ] **Step 3: DealStagesSection.tsx** — given a `dealId`, `useDealStages(dealId)`; render: a progress bar (`summary.progress`), a "Признано по этапам" block (`summary.recognized` + optional `byPeriod`), a plan/fact line (`summary.planned` vs `summary.fact`), and the stages list (name, plan revenue/cost, status, closedDate) with add/edit/delete + "Закрыть этап" (opens the dialog with status=closed). Mirror `CostAllocationPage.tsx` list/dialog toggling. Gate at the top: `if (!featureCan('deal_stages')) return null;`.
- [ ] **Step 4: webapp typecheck + commit** — `git add packages/webapp/src/containers/Deals/stageSchemas.ts packages/webapp/src/containers/Deals/DealStageDialog.tsx packages/webapp/src/containers/Deals/DealStagesSection.tsx && git commit -m "feat(webapp): deal-stages section and dialog"`

> No hardcoded strings — every label via `intl.get('deal_stages.*')`. The "close stage" action sets `status:'closed'` + a `closedDate` (default today via the date field). Mirror the money/percent formatters used in `DealProfitability.tsx`.

---

## Task 12: i18n keys (EN + RU, parity)

**Files:** Modify `lang/en/index.json`, `lang/ru/index.json`.

- [ ] **Step 1:** Add pairwise (EN / RU), in matching structural positions:
  - `deal_stages.section.title` → "Stages" / "Этапы"
  - `deal_stages.action.add` → "Add stage" / "Добавить этап"
  - `deal_stages.action.edit` → "Edit" / "Изменить"
  - `deal_stages.action.delete` → "Delete" / "Удалить"
  - `deal_stages.action.close` → "Close stage" / "Закрыть этап"
  - `deal_stages.empty` → "No stages yet" / "Этапов пока нет"
  - `deal_stages.field.name` → "Name" / "Название"
  - `deal_stages.field.planned_revenue` → "Planned revenue" / "Плановая выручка"
  - `deal_stages.field.planned_cost` → "Planned costs" / "Плановые расходы"
  - `deal_stages.field.status` → "Status" / "Статус"
  - `deal_stages.field.closed_date` → "Close date" / "Дата закрытия"
  - `deal_stages.status.open` → "Open" / "Открыт"
  - `deal_stages.status.closed` → "Closed" / "Закрыт"
  - `deal_stages.progress` → "Progress" / "Прогресс"
  - `deal_stages.recognized` → "Recognized by stages" / "Признано по этапам"
  - `deal_stages.plan` → "Plan" / "План"
  - `deal_stages.fact` → "Fact" / "Факт"
  - `deal_stages.save` → "Save" / "Сохранить"
  - `deal_stages.cancel` → "Cancel" / "Отмена"
  - `deal_stages.saved` → "Stage saved" / "Этап сохранён"
  - `deal_stages.save_error` → "Couldn't save the stage" / "Не удалось сохранить этап"
  - `deal_stages.deleted_ok` → "Stage deleted" / "Этап удалён"
  - `deal_stages.error.name_required` → "Enter a stage name" / "Укажите название этапа"
  - `deal_stages.error.close_needs_date` → "Set a close date" / "Укажите дату закрытия"
  - (add any other label the dialog/section actually uses — keep EN+RU parity for every one.)
- [ ] **Step 2: lang-check** — `node packages/webapp/scripts/lang-check.js` (expect parity OK).
- [ ] **Step 3: commit** — `git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json && git commit -m "feat(webapp): deal-stages i18n keys (en/ru)"`

> Insert keys in matching positions in both files to keep en↔ru parity. RU: natural terms, imperative buttons, lowercase «вы».

---

## Task 13: Mount the section on the deal page (flag-gated)

**Files:** Modify the deal detail/profitability container in `packages/webapp/src/containers/Deals/`.

- [ ] **Step 1:** Find where a single deal's detail/profitability is rendered (the component that uses `useDealProfitability` / renders `DealProfitability`). Render `<DealStagesSection dealId={dealId} />` below the profitability block. The section self-gates on `featureCan('deal_stages')`, so no extra guard is needed at the mount site — but confirm `dealId` is in scope there.
- [ ] **Step 2: webapp typecheck + commit** — `git add <the modified container> && git commit -m "feat(webapp): mount deal-stages section on the deal page"`

> Verify-point: locate the deal-detail container (grep `useDealProfitability` / `DealProfitability` usage in `containers/Deals/`). Mount where `dealId` is available. If the deal page is a list-only view with no per-deal detail, mount the section inside the profitability card component that already receives the deal id.

---

## Task 14: Full verification

- [ ] **Step 1: Server specs (touched/new)** — `pnpm --filter @bigfin/server test -- src/modules/Deals src/modules/Features/FeaturesConfigure.dealStages.spec.ts` (all green: recognizeStages, validator, GetDealStages, flag, plus existing Deals specs).
- [ ] **Step 2: Typecheck** — `pnpm --filter @bigfin/server typecheck` and `pnpm --filter @bigfin/webapp typecheck`.
- [ ] **Step 3: lang parity** — `node packages/webapp/scripts/lang-check.js`.
- [ ] **Step 4:** Final commit if anything pending. **Do not push / open PR** without explicit ask. Full server suite + migration up/down run on CI/staging.

---

## Self-Review notes (author)

- **Spec coverage:** §4 model → Task 2/3; §5 recognition → Task 4; §6 server (validator/CRUD/query/controller) → Tasks 5–9; §7 frontend → Tasks 10–13; §8 flag → Task 1 + 11/13 gate; §9 tests → Tasks 1,4,6,8; §10 verify → Task 14. Covered.
- **Decisions honored:** planned-amount recognition (Task 4 uses plannedRevenue/plannedCost of closed stages); deal-local only (no global ОПиУ touch); progress by planned revenue (Task 4 `progress`); stage writes = deal-edit guards, not admin (Task 9 mirrors Deals.controller — no `@RequirePermission`); separate `deal_stages` flag (Task 1); no per-transaction→stage tagging (fact = deal-level via rollup, Task 8). Approach-3 headroom: `recognizeStagesByPeriod` is pure + deal-agnostic.
- **Type consistency:** `StageInput`/`StageAmounts`/`DealStagesSummary` (Task 4) reused by `GetDealStages` (Task 8) and the FE summary (Tasks 11/13). `DealStageValues` (Task 10 hook) matches the DTO fields (Task 5). Money columns `decimal(13,3)` (Task 2) match repo convention.
- **Known verify-points (resolve during implementation):** `@/common/decorators/Validators` exports; `modules/Deals/constants.ts` ERRORS shape; the `select` shape (`res.data` vs `res.data.data`) in `deals.tsx`; the `types.tsx` key-export pattern; the exact deal-detail container to mount the section (Task 13). Each names the file to read.
