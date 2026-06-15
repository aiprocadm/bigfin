# ㉑ Основные средства и амортизация — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `FixedAssets` module (register assets, auto-build a linear depreciation schedule, accrue monthly depreciation via an idempotent button, dispose/write-off assets) behind feature flag `fixed_assets` (default off), with a contra-account "Accumulated Depreciation" rendered on the Balance Sheet.

**Architecture:** Mirror the existing `Credits` module (NestJS, Objection models in tenant schema, GL via `Ledger` + `LedgerStorageService.commit()` inside `UnitOfWork.withTransaction()`). Pure functions (`linearDepreciation`, `fixedAssetGLEntries`) are TDD-tested in isolation. A new account type `accumulated-depreciation` (contra-asset, CREDIT normal) is added to the chart-of-accounts metadata and the Balance Sheet schema.

**Tech Stack:** NestJS 10, TypeScript, Objection.js + Knex (MySQL/MariaDB), Jest, React 18 + React Query + React Hook Form + Zod (webapp), react-intl-universal (i18n).

**Spec:** [docs/superpowers/specs/2026-06-14-fixed-assets-depreciation-design.md](../specs/2026-06-14-fixed-assets-depreciation-design.md)

**Branch:** `feat/fixed-assets` (already created from `develop`). Push/PR only on the founder's request.

---

## Parallelization map (for subagent dispatch)

Tasks are grouped into tracks. Within the same track, run sequentially. Across tracks, the dependency rule is:

- **Track A — Foundation** (Tasks 1–3): feature flag (server) + new account type + Balance Sheet. **No deps.** Can run first or in parallel with Track B.
- **Track B — Pure functions** (Tasks 4–5): `linearDepreciation`, `fixedAssetGLEntries`. **No deps on anything.** Fully parallel with Track A.
- **Track C — Backend module** (Tasks 6–15): migrations → models → constants/DTOs → commands → queries → wiring. Depends on A (account type slug/metadata) and B (pure functions). Run after A+B land.
- **Track D — Frontend** (Tasks 16–20): flag (web) + query hooks + i18n + page + route. Depends on C's API shape (Task 15). Run after C.
- **Track E — Verification** (Task 21): full typecheck + server tests + Balance Sheet netting check. Last.

A safe parallel dispatch: **A and B together first**, then **C**, then **D**, then **E**. Within C, the i18n/flag-web parts of D (Tasks 16, 18) have no backend dependency and may be pulled earlier if desired.

---

## File Structure

**Server — new module** `packages/server/src/modules/FixedAssets/`:
- `FixedAssets.module.ts` — wiring (imports TenancyDatabaseModule, TenancyModule, LedgerModule, TransactionsLockingModule).
- `FixedAssets.application.ts` — thin delegation layer.
- `FixedAssets.controller.ts` — `@Controller('fixed-assets')`, guards.
- `constants.ts` — error codes, account templates (by slug), management article, transaction-type re-exports.
- `dtos/FixedAsset.dto.ts` — `CreateFixedAssetDto`, `DisposeFixedAssetDto`, `AccrueMonthDto`.
- `models/FixedAsset.model.ts`, `models/FixedAssetDepreciationEntry.model.ts`.
- `commands/CreateFixedAsset.service.ts`, `AccrueMonthDepreciation.service.ts`, `DisposeFixedAsset.service.ts`, `DeleteFixedAsset.service.ts` (+ `.spec.ts`).
- `queries/GetFixedAssets.service.ts`, `GetFixedAssetDetail.service.ts`, `GetFixedAssetsSummary.service.ts`.
- `utils/linearDepreciation.ts` (+ `.spec.ts`), `utils/fixedAssetGLEntries.ts` (+ `.spec.ts`).

**Server — modified:**
- `packages/server/src/constants/accounts.ts` — add `ACCUMULATED_DEPRECIATION` type + metadata.
- `packages/server/src/common/types/Features.ts` — add `FIXED_ASSETS`.
- `packages/server/src/modules/Features/FeaturesConfigure.ts` — add default-off entry (+ new `.spec.ts`).
- `packages/server/src/modules/FinancialStatements/modules/BalanceSheet/BalanceSheetSchema.ts` — add type to fixed-asset node.
- `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts` — register 2 models.
- `packages/server/src/app.module.ts` (or `App.module.ts`) — import `FixedAssetsModule`.
- `packages/server/src/database/tenant/migrations/` — 2 migration files.

**Webapp — new/modified:**
- `packages/webapp/src/constants/features.tsx` — add `FixedAssets`.
- `packages/webapp/src/constants/accountTypes.tsx` — mirror new type.
- `packages/webapp/src/hooks/query/fixed-assets.tsx` — query hooks.
- `packages/webapp/src/containers/FixedAssets/FixedAssetsPage.tsx`, `FixedAssetCreateDialog.tsx`, `FixedAssetDetailCard.tsx`, `schemas.ts`.
- `packages/webapp/src/routes/dashboard.tsx` — add route.
- `packages/webapp/src/lang/en/index.json`, `packages/webapp/src/lang/ru/index.json` — `fixed_assets.*` keys.

---

# TRACK A — Foundation

## Task 1: Feature flag `fixed_assets` (server)

**Files:**
- Modify: `packages/server/src/common/types/Features.ts`
- Modify: `packages/server/src/modules/Features/FeaturesConfigure.ts`
- Test: `packages/server/src/modules/Features/FeaturesConfigure.fixed_assets.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/server/src/modules/Features/FeaturesConfigure.fixed_assets.spec.ts`:

```typescript
// © 2026 Bigfin
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure — fixed_assets', () => {
  it('флаг fixed_assets присутствует и по умолчанию выключен', () => {
    const configure = new FeaturesConfigure({ get: () => undefined } as any);
    const entry = configure
      .getConfigure()
      .find((f) => f.name === Features.FIXED_ASSETS);

    expect(entry).toBeDefined();
    expect(entry.defaultValue).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @bigfin/server test -- FeaturesConfigure.fixed_assets`
Expected: FAIL — `Features.FIXED_ASSETS` is undefined (TS) / entry undefined.

- [ ] **Step 3: Add the enum member**

In `packages/server/src/common/types/Features.ts`, add to the `Features` enum (after `CREDITS = 'credits',`):

```typescript
  FIXED_ASSETS = 'fixed_assets',
```

- [ ] **Step 4: Add the default-off configure entry**

In `packages/server/src/modules/Features/FeaturesConfigure.ts`, inside the array returned by `getConfigure()`, after the `Features.CREDITS` entry:

```typescript
      {
        name: Features.FIXED_ASSETS,
        defaultValue: false,
      },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @bigfin/server test -- FeaturesConfigure.fixed_assets`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/common/types/Features.ts packages/server/src/modules/Features/FeaturesConfigure.ts packages/server/src/modules/Features/FeaturesConfigure.fixed_assets.spec.ts
git commit -m "feat(fixed-assets): серверный флаг fixed_assets (default off)"
```

---

## Task 2: New account type `accumulated-depreciation`

**Files:**
- Modify: `packages/server/src/constants/accounts.ts`
- Modify: `packages/webapp/src/constants/accountTypes.tsx`
- Test: `packages/server/src/constants/accounts.accumulated-depreciation.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/server/src/constants/accounts.accumulated-depreciation.spec.ts`:

```typescript
// © 2026 Bigfin
import { ACCOUNT_TYPE, ACCOUNT_TYPES, ACCOUNT_NORMAL } from './accounts';

describe('ACCOUNT_TYPE.ACCUMULATED_DEPRECIATION', () => {
  it('тип существует со значением accumulated-depreciation', () => {
    expect(ACCOUNT_TYPE.ACCUMULATED_DEPRECIATION).toBe(
      'accumulated-depreciation',
    );
  });

  it('контр-актив: нормаль CREDIT, в Балансе, не в ОПиУ, root=asset', () => {
    const meta = ACCOUNT_TYPES.find(
      (t) => t.key === ACCOUNT_TYPE.ACCUMULATED_DEPRECIATION,
    );
    expect(meta).toBeDefined();
    expect(meta.normal).toBe(ACCOUNT_NORMAL.CREDIT);
    expect(meta.balanceSheet).toBe(true);
    expect(meta.incomeSheet).toBe(false);
    expect(meta.rootType).toBe('asset');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @bigfin/server test -- accumulated-depreciation`
Expected: FAIL — `ACCOUNT_TYPE.ACCUMULATED_DEPRECIATION` undefined.

- [ ] **Step 3: Add the type key**

In `packages/server/src/constants/accounts.ts`, in the `ACCOUNT_TYPE` object, add after `NON_CURRENT_ASSET: 'non-current-asset',` (line ~8):

```typescript
  ACCUMULATED_DEPRECIATION: 'accumulated-depreciation',
```

- [ ] **Step 4: Add the metadata entry**

In the same file, in the `ACCOUNT_TYPES` array, add a new object right after the `FIXED_ASSET` entry (the one with `key: ACCOUNT_TYPE.FIXED_ASSET`, ~lines 100–107):

```typescript
  {
    label: 'Accumulated Depreciation',
    key: ACCOUNT_TYPE.ACCUMULATED_DEPRECIATION,
    normal: ACCOUNT_NORMAL.CREDIT,
    rootType: ACCOUNT_ROOT_TYPE.ASSET,
    parentType: ACCOUNT_PARENT_TYPE.FIXED_ASSET,
    balanceSheet: true,
    incomeSheet: false,
  },
```

(Contra-asset: lives under the asset root with the fixed-asset parent, but with CREDIT normal so its balance subtracts from gross fixed assets.)

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @bigfin/server test -- accumulated-depreciation`
Expected: PASS.

- [ ] **Step 6: Check for an account-type allow-list and mirror on the frontend**

Run: `grep -rn "accumulated-depreciation\|ACCOUNT_TYPE.FIXED_ASSET" packages/server/src/modules/Accounts/models/Account.meta.ts`
If `Account.meta.ts` enumerates account types in a `collection`/`enum` for the `account_type` field, add `ACCOUNT_TYPE.ACCUMULATED_DEPRECIATION` there too (otherwise account creation validation may reject it). If no enumeration exists, no change needed.

Then mirror the metadata on the frontend. In `packages/webapp/src/constants/accountTypes.tsx`, add the same object after the `Fixed Asset` entry (use whatever local `ACCOUNT_TYPE`/`ACCOUNT_NORMAL`/`ACCOUNT_ROOT_TYPE`/`ACCOUNT_PARENT_TYPE` constants that file already imports/defines):

```typescript
  {
    label: 'Accumulated Depreciation',
    key: ACCOUNT_TYPE.ACCUMULATED_DEPRECIATION,
    normal: ACCOUNT_NORMAL.CREDIT,
    rootType: ACCOUNT_ROOT_TYPE.ASSET,
    parentType: ACCOUNT_PARENT_TYPE.FIXED_ASSET,
    balanceSheet: true,
    incomeSheet: false,
  },
```

If the webapp file imports `ACCOUNT_TYPE` from a shared location and has no local copy, add the `ACCUMULATED_DEPRECIATION` key there as well.

- [ ] **Step 7: Typecheck both packages**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add packages/server/src/constants/accounts.ts packages/server/src/constants/accounts.accumulated-depreciation.spec.ts packages/webapp/src/constants/accountTypes.tsx packages/server/src/modules/Accounts/models/Account.meta.ts
git commit -m "feat(fixed-assets): тип счёта accumulated-depreciation (контр-актив)"
```

---

## Task 3: Balance Sheet renders the contra-account under Fixed Assets

**Files:**
- Modify: `packages/server/src/modules/FinancialStatements/modules/BalanceSheet/BalanceSheetSchema.ts`

- [ ] **Step 1: Locate the fixed-asset node**

Run: `grep -n "FIXED_ASSET\|fixed_asset\|accountsTypes" packages/server/src/modules/FinancialStatements/modules/BalanceSheet/BalanceSheetSchema.ts`
Find the node whose `accountsTypes` is `[ACCOUNT_TYPE.FIXED_ASSET]`.

- [ ] **Step 2: Add the contra-account type to that node**

Change that node's `accountsTypes` from:

```typescript
    accountsTypes: [ACCOUNT_TYPE.FIXED_ASSET],
```

to:

```typescript
    accountsTypes: [
      ACCOUNT_TYPE.FIXED_ASSET,
      ACCOUNT_TYPE.ACCUMULATED_DEPRECIATION,
    ],
```

Because the contra-account is CREDIT-normal, its balance enters the asset section with the opposite sign and nets against gross fixed assets (gross − accumulated = net). Ensure `ACCOUNT_TYPE` is already imported at the top of the file (it is used by the existing node).

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

> Numeric netting is verified end-to-end in Task 21 (requires the local stack + posted depreciation). This task only wires the schema.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/modules/FinancialStatements/modules/BalanceSheet/BalanceSheetSchema.ts
git commit -m "feat(fixed-assets): накопленная амортизация в разделе ОС Баланса"
```

---

# TRACK B — Pure functions

## Task 4: `linearDepreciation` schedule generator

**Files:**
- Create: `packages/server/src/modules/FixedAssets/utils/linearDepreciation.ts`
- Test: `packages/server/src/modules/FixedAssets/utils/linearDepreciation.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/server/src/modules/FixedAssets/utils/linearDepreciation.spec.ts`:

```typescript
// © 2026 Bigfin
import { linearDepreciation } from './linearDepreciation';

describe('linearDepreciation', () => {
  it('равные доли, старт со следующего месяца после ввода (ПБУ 6/01)', () => {
    const rows = linearDepreciation({
      cost: 600000,
      salvageValue: 0,
      serviceLifeMonths: 60,
      commissionedAt: '2026-03-15',
    });
    expect(rows).toHaveLength(60);
    expect(rows[0]).toEqual({ seqNo: 1, period: '2026-04', amount: 10000 });
    expect(rows[1].period).toBe('2026-05');
    expect(rows[59].period).toBe('2031-03');
  });

  it('учитывает ликвидационную стоимость в базе амортизации', () => {
    const rows = linearDepreciation({
      cost: 100000,
      salvageValue: 10000,
      serviceLifeMonths: 9,
      commissionedAt: '2026-01-31',
    });
    // база 90000 / 9 = 10000
    expect(rows[0]).toEqual({ seqNo: 1, period: '2026-02', amount: 10000 });
    expect(rows).toHaveLength(9);
  });

  it('остаток округления добавляется к последнему месяцу (сумма = база)', () => {
    const rows = linearDepreciation({
      cost: 100000,
      salvageValue: 0,
      serviceLifeMonths: 3,
      commissionedAt: '2026-01-10',
    });
    // 100000/3 = 33333.33; хвост на последний месяц
    const total = rows.reduce((s, r) => s + r.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(100000);
    expect(rows[0].amount).toBe(33333.33);
    expect(rows[2].amount).toBe(33333.34);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @bigfin/server test -- linearDepreciation`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `packages/server/src/modules/FixedAssets/utils/linearDepreciation.ts`:

```typescript
// © 2026 Bigfin
import * as moment from 'moment';

export interface LinearDepreciationInput {
  cost: number;
  salvageValue: number;
  serviceLifeMonths: number;
  commissionedAt: string; // YYYY-MM-DD
}

export interface DepreciationScheduleRow {
  seqNo: number;
  period: string; // YYYY-MM
  amount: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Линейная амортизация: равными долями, начиная с месяца, СЛЕДУЮЩЕГО за
 * вводом в эксплуатацию (ПБУ 6/01). Остаток от округления копеек падает на
 * последний месяц, чтобы сумма строк точно равнялась базе (cost − salvage).
 */
export const linearDepreciation = (
  input: LinearDepreciationInput,
): DepreciationScheduleRow[] => {
  const base = round2(input.cost - input.salvageValue);
  const n = input.serviceLifeMonths;
  if (n <= 0 || base <= 0) return [];

  const perMonth = round2(base / n);
  const start = moment(input.commissionedAt).add(1, 'month').startOf('month');

  const rows: DepreciationScheduleRow[] = [];
  let accumulated = 0;
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const amount = isLast ? round2(base - accumulated) : perMonth;
    accumulated = round2(accumulated + amount);
    rows.push({
      seqNo: i + 1,
      period: moment(start).add(i, 'month').format('YYYY-MM'),
      amount,
    });
  }
  return rows;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @bigfin/server test -- linearDepreciation`
Expected: PASS (all 3).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/FixedAssets/utils/linearDepreciation.ts packages/server/src/modules/FixedAssets/utils/linearDepreciation.spec.ts
git commit -m "feat(fixed-assets): чистая функция линейного графика амортизации"
```

---

## Task 5: `fixedAssetGLEntries` (depreciation + disposal)

**Files:**
- Create: `packages/server/src/modules/FixedAssets/utils/fixedAssetGLEntries.ts`
- Test: `packages/server/src/modules/FixedAssets/utils/fixedAssetGLEntries.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/server/src/modules/FixedAssets/utils/fixedAssetGLEntries.spec.ts`:

```typescript
// © 2026 Bigfin
import { AccountNormal } from '@/modules/Accounts/Accounts.types';
import {
  getDepreciationGLEntries,
  getDisposalGLEntries,
} from './fixedAssetGLEntries';

const sum = (entries: any[], key: 'debit' | 'credit') =>
  Math.round(entries.reduce((s, e) => s + e[key], 0) * 100) / 100;

describe('getDepreciationGLEntries', () => {
  it('Dr расход амортизации / Cr накопленная амортизация, баланс сходится', () => {
    const entries = getDepreciationGLEntries({
      entryId: 7,
      date: '2026-04-30',
      amount: 10000,
      currencyCode: 'RUB',
      expenseAccountId: 40,
      accumulatedAccountId: 41,
    });
    expect(sum(entries, 'debit')).toBe(10000);
    expect(sum(entries, 'credit')).toBe(10000);
    const dr = entries.find((e) => e.debit > 0);
    const cr = entries.find((e) => e.credit > 0);
    expect(dr.accountId).toBe(40);
    expect(dr.accountNormal).toBe(AccountNormal.DEBIT);
    expect(cr.accountId).toBe(41);
    expect(cr.accountNormal).toBe(AccountNormal.CREDIT);
  });
});

describe('getDisposalGLEntries', () => {
  it('продажа с убытком: Dr накопл + Dr банк + Dr убыток / Cr актив', () => {
    const entries = getDisposalGLEntries({
      assetId: 3,
      date: '2026-12-31',
      currencyCode: 'RUB',
      cost: 600000,
      accumulated: 200000,
      proceeds: 350000,
      assetAccountId: 10,
      accumulatedAccountId: 41,
      disposalAccountId: 50,
      bankAccountId: 1,
    });
    expect(sum(entries, 'debit')).toBe(600000);
    expect(sum(entries, 'credit')).toBe(600000);
    // убыток 50000 на счёте выбытия (debit)
    const loss = entries.find((e) => e.accountId === 50);
    expect(loss.debit).toBe(50000);
  });

  it('продажа с прибылью: счёт выбытия в кредите', () => {
    const entries = getDisposalGLEntries({
      assetId: 3,
      date: '2026-12-31',
      currencyCode: 'RUB',
      cost: 600000,
      accumulated: 500000,
      proceeds: 150000,
      assetAccountId: 10,
      accumulatedAccountId: 41,
      disposalAccountId: 50,
      bankAccountId: 1,
    });
    expect(sum(entries, 'debit')).toBe(600000);
    expect(sum(entries, 'credit')).toBe(600000);
    // остаточная 100000, продали за 150000 → прибыль 50000 (credit на 50)
    const gain = entries.find((e) => e.accountId === 50);
    expect(gain.credit).toBe(50000);
  });

  it('ликвидация (без денег): вся остаточная в убыток', () => {
    const entries = getDisposalGLEntries({
      assetId: 3,
      date: '2026-12-31',
      currencyCode: 'RUB',
      cost: 600000,
      accumulated: 200000,
      proceeds: 0,
      assetAccountId: 10,
      accumulatedAccountId: 41,
      disposalAccountId: 50,
      bankAccountId: null,
    });
    expect(sum(entries, 'debit')).toBe(600000);
    expect(sum(entries, 'credit')).toBe(600000);
    const loss = entries.find((e) => e.accountId === 50);
    expect(loss.debit).toBe(400000); // вся остаточная
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @bigfin/server test -- fixedAssetGLEntries`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `packages/server/src/modules/FixedAssets/utils/fixedAssetGLEntries.ts`:

```typescript
// © 2026 Bigfin
import { ILedgerEntry } from '@/modules/Ledger/types/Ledger.types';
import { AccountNormal } from '@/modules/Accounts/Accounts.types';

export const FIXED_ASSET_DEPRECIATION_TRANSACTION_TYPE =
  'FixedAssetDepreciation';
export const FIXED_ASSET_DISPOSAL_TRANSACTION_TYPE = 'FixedAssetDisposal';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface DepreciationGLInput {
  entryId: number;
  date: string;
  amount: number;
  currencyCode: string;
  expenseAccountId: number;
  accumulatedAccountId: number;
}

/** Начисление амортизации: Dr «Амортизация» (расход) / Cr «Накопленная амортизация». */
export const getDepreciationGLEntries = (
  i: DepreciationGLInput,
): ILedgerEntry[] => {
  const common = {
    currencyCode: i.currencyCode,
    exchangeRate: 1,
    transactionType: FIXED_ASSET_DEPRECIATION_TRANSACTION_TYPE,
    transactionId: i.entryId,
    date: i.date,
    debit: 0,
    credit: 0,
  };
  return [
    {
      ...common,
      debit: i.amount,
      accountId: i.expenseAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: 1,
    },
    {
      ...common,
      credit: i.amount,
      accountId: i.accumulatedAccountId,
      accountNormal: AccountNormal.CREDIT,
      index: 2,
    },
  ];
};

export interface DisposalGLInput {
  assetId: number;
  date: string;
  currencyCode: string;
  cost: number;
  accumulated: number;
  proceeds: number;
  assetAccountId: number;
  accumulatedAccountId: number;
  disposalAccountId: number;
  bankAccountId: number | null;
}

/**
 * Выбытие ОС. Закрываем накопленную амортизацию, убираем актив по
 * первоначальной стоимости, признаём деньги (при продаже) и прибыль/убыток.
 * Прибыль/убыток = proceeds − остаточная стоимость (cost − accumulated).
 *   убыток  → Dr счёт выбытия;  прибыль → Cr счёт выбытия.
 * Сумма дебетов всегда равна сумме кредитов (= cost).
 */
export const getDisposalGLEntries = (i: DisposalGLInput): ILedgerEntry[] => {
  const common = {
    currencyCode: i.currencyCode,
    exchangeRate: 1,
    transactionType: FIXED_ASSET_DISPOSAL_TRANSACTION_TYPE,
    transactionId: i.assetId,
    date: i.date,
    debit: 0,
    credit: 0,
  };

  const residual = round2(i.cost - i.accumulated);
  const gainLoss = round2(i.proceeds - residual); // >0 прибыль, <0 убыток
  const entries: ILedgerEntry[] = [];
  let index = 1;

  // Закрываем накопленную амортизацию (Dr контр-актив).
  if (i.accumulated > 0) {
    entries.push({
      ...common,
      debit: i.accumulated,
      accountId: i.accumulatedAccountId,
      accountNormal: AccountNormal.CREDIT,
      index: index++,
    });
  }

  // Деньги от продажи (Dr банк).
  if (i.proceeds > 0 && i.bankAccountId) {
    entries.push({
      ...common,
      debit: i.proceeds,
      accountId: i.bankAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: index++,
    });
  }

  // Прибыль/убыток от выбытия.
  if (gainLoss < 0) {
    entries.push({
      ...common,
      debit: round2(-gainLoss),
      accountId: i.disposalAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: index++,
    });
  } else if (gainLoss > 0) {
    entries.push({
      ...common,
      credit: gainLoss,
      accountId: i.disposalAccountId,
      accountNormal: AccountNormal.CREDIT,
      index: index++,
    });
  }

  // Убираем актив по первоначальной стоимости (Cr актив).
  entries.push({
    ...common,
    credit: i.cost,
    accountId: i.assetAccountId,
    accountNormal: AccountNormal.DEBIT,
    index: index++,
  });

  return entries;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @bigfin/server test -- fixedAssetGLEntries`
Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/FixedAssets/utils/fixedAssetGLEntries.ts packages/server/src/modules/FixedAssets/utils/fixedAssetGLEntries.spec.ts
git commit -m "feat(fixed-assets): GL-проводки начисления и выбытия ОС"
```

---

# TRACK C — Backend module

## Task 6: Migrations (two tenant tables)

**Files:**
- Create: `packages/server/src/database/tenant/migrations/20260614120000_create_fixed_assets_table.ts`
- Create: `packages/server/src/database/tenant/migrations/20260614120100_create_fixed_asset_depreciation_entries_table.ts`

- [ ] **Step 1: Create the `fixed_assets` migration**

Create `packages/server/src/database/tenant/migrations/20260614120000_create_fixed_assets_table.ts`:

```typescript
// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema.createTable('fixed_assets', (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.string('category').nullable();
    table.decimal('cost', 15, 5).notNullable();
    table.decimal('salvage_value', 15, 5).notNullable().defaultTo(0);
    table.integer('service_life_months').unsigned().notNullable();
    table.date('commissioned_at').notNullable().index();
    table
      .integer('asset_account_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('accounts')
      .index();
    table
      .decimal('accumulated_depreciation', 15, 5)
      .notNullable()
      .defaultTo(0);
    table.string('status').notNullable().defaultTo('active').index();
    table.date('disposed_at').nullable();
    table.string('disposal_type').nullable();
    table.integer('disposal_account_id').unsigned().nullable();
    table.decimal('disposal_proceeds', 15, 5).nullable();
    table.text('note').nullable();
    table.timestamps();
  });

exports.down = (knex) => knex.schema.dropTableIfExists('fixed_assets');
```

- [ ] **Step 2: Create the `fixed_asset_depreciation_entries` migration**

Create `packages/server/src/database/tenant/migrations/20260614120100_create_fixed_asset_depreciation_entries_table.ts`:

```typescript
// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema.createTable('fixed_asset_depreciation_entries', (table) => {
    table.increments('id');
    table
      .integer('fixed_asset_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('fixed_assets')
      .onDelete('CASCADE')
      .index();
    table.string('period', 7).notNullable().index(); // YYYY-MM
    table.integer('seq_no').unsigned().notNullable();
    table.decimal('amount', 15, 5).notNullable();
    table.string('status').notNullable().defaultTo('planned').index();
    table.date('posted_at').nullable();
    table.timestamps();
  });

exports.down = (knex) =>
  knex.schema.dropTableIfExists('fixed_asset_depreciation_entries');
```

- [ ] **Step 3: Run migrate latest, then rollback, then latest (verify both directions)**

Run:
```bash
pnpm tenants:migrate:latest
pnpm tenants:migrate:rollback
pnpm tenants:migrate:latest
```
Expected: both tables created, dropped cleanly on rollback, recreated on re-run. No errors.

> If the local DB stack is not running, start it via the `run-bigfin` skill (docker compose mariadb+redis) first. If migrations cannot be run locally, mark this step blocked and note it — do not fake success.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/database/tenant/migrations/20260614120000_create_fixed_assets_table.ts packages/server/src/database/tenant/migrations/20260614120100_create_fixed_asset_depreciation_entries_table.ts
git commit -m "feat(fixed-assets): миграции fixed_assets + fixed_asset_depreciation_entries"
```

---

## Task 7: Objection models + Tenancy registration

**Files:**
- Create: `packages/server/src/modules/FixedAssets/models/FixedAsset.model.ts`
- Create: `packages/server/src/modules/FixedAssets/models/FixedAssetDepreciationEntry.model.ts`
- Modify: `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts`

- [ ] **Step 1: Create `FixedAsset.model.ts`**

```typescript
// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class FixedAsset extends TenantBaseModel {
  name!: string;
  category!: string | null;
  cost!: number;
  salvageValue!: number;
  serviceLifeMonths!: number;
  commissionedAt!: string;
  assetAccountId!: number;
  accumulatedDepreciation!: number;
  status!: string;
  disposedAt!: string | null;
  disposalType!: string | null;
  disposalAccountId!: number | null;
  disposalProceeds!: number | null;
  note!: string | null;

  static get tableName() {
    return 'fixed_assets';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const {
      FixedAssetDepreciationEntry,
    } = require('@/modules/FixedAssets/models/FixedAssetDepreciationEntry.model');
    const { Account } = require('@/modules/Accounts/models/Account.model');

    return {
      entries: {
        relation: Model.HasManyRelation,
        modelClass: FixedAssetDepreciationEntry,
        join: {
          from: 'fixed_assets.id',
          to: 'fixed_asset_depreciation_entries.fixedAssetId',
        },
      },
      assetAccount: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: { from: 'fixed_assets.assetAccountId', to: 'accounts.id' },
      },
    };
  }
}
```

- [ ] **Step 2: Create `FixedAssetDepreciationEntry.model.ts`**

```typescript
// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class FixedAssetDepreciationEntry extends TenantBaseModel {
  fixedAssetId!: number;
  period!: string;
  seqNo!: number;
  amount!: number;
  status!: string;
  postedAt!: string | null;

  static get tableName() {
    return 'fixed_asset_depreciation_entries';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const {
      FixedAsset,
    } = require('@/modules/FixedAssets/models/FixedAsset.model');
    return {
      fixedAsset: {
        relation: Model.BelongsToOneRelation,
        modelClass: FixedAsset,
        join: {
          from: 'fixed_asset_depreciation_entries.fixedAssetId',
          to: 'fixed_assets.id',
        },
      },
    };
  }
}
```

- [ ] **Step 3: Register both models in Tenancy**

In `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts`:

Add imports near the other model imports (next to the `Credit`/`CreditInstallment` imports):

```typescript
import { FixedAsset } from '@/modules/FixedAssets/models/FixedAsset.model';
import { FixedAssetDepreciationEntry } from '@/modules/FixedAssets/models/FixedAssetDepreciationEntry.model';
```

Add both to the `const models = [ ... ]` array (next to `Credit`, `CreditInstallment`):

```typescript
  FixedAsset,
  FixedAssetDepreciationEntry,
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/FixedAssets/models/ packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts
git commit -m "feat(fixed-assets): модели FixedAsset/FixedAssetDepreciationEntry + регистрация в Tenancy"
```

---

## Task 8: Constants + DTOs

**Files:**
- Create: `packages/server/src/modules/FixedAssets/constants.ts`
- Create: `packages/server/src/modules/FixedAssets/dtos/FixedAsset.dto.ts`

- [ ] **Step 1: Create `constants.ts`**

```typescript
// © 2026 Bigfin
import { ACCOUNT_TYPE } from '@/constants/accounts';
export {
  FIXED_ASSET_DEPRECIATION_TRANSACTION_TYPE,
  FIXED_ASSET_DISPOSAL_TRANSACTION_TYPE,
} from './utils/fixedAssetGLEntries';

export const ERRORS = {
  FIXED_ASSET_NOT_FOUND: 'FIXED_ASSET_NOT_FOUND',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  ASSET_ACCOUNT_NOT_FOUND: 'ASSET_ACCOUNT_NOT_FOUND',
  ASSET_ACCOUNT_NOT_FIXED: 'ASSET_ACCOUNT_NOT_FIXED',
  PAYMENT_ACCOUNT_NOT_FOUND: 'PAYMENT_ACCOUNT_NOT_FOUND',
  PAYMENT_ACCOUNT_NOT_CASH: 'PAYMENT_ACCOUNT_NOT_CASH',
  ALREADY_DISPOSED: 'ALREADY_DISPOSED',
};

/** Денежные счета — допустимый счёт зачисления при продаже. */
export const CASH_ACCOUNT_TYPES: string[] = [
  ACCOUNT_TYPE.CASH,
  ACCOUNT_TYPE.BANK,
];

/** Счёт «Амортизация» (расход) — find-or-create по slug. Уже сидится в базе. */
export const DEPRECIATION_EXPENSE_ACCOUNT = {
  name: 'Амортизация',
  slug: 'depreciation-expense',
  accountType: ACCOUNT_TYPE.EXPENSE,
  code: '40007',
  description: '',
  active: true,
  index: 1,
  predefined: true,
};

/** Контр-счёт «Накопленная амортизация» — find-or-create по slug. */
export const ACCUMULATED_DEPRECIATION_ACCOUNT = {
  name: 'Накопленная амортизация',
  slug: 'accumulated-depreciation',
  accountType: ACCOUNT_TYPE.ACCUMULATED_DEPRECIATION,
  code: '10199',
  description: '',
  active: true,
  index: 1,
  predefined: true,
};

/** Счёт «Прибыль/убыток от выбытия ОС» — find-or-create по slug. */
export const FIXED_ASSET_DISPOSAL_ACCOUNT = {
  name: 'Прибыль/убыток от выбытия ОС',
  slug: 'fixed-asset-disposal',
  accountType: ACCOUNT_TYPE.OTHER_EXPENSE,
  code: '91003',
  description: '',
  active: true,
  index: 1,
  predefined: true,
};

/** Статья ④ «Амортизация» (find-or-create по name+kind). */
export const DEPRECIATION_ARTICLE = {
  name: 'Амортизация',
  kind: 'expense',
  cashflowSection: 'operating',
  sortOrder: 110,
  active: true,
};
```

- [ ] **Step 2: Create `dtos/FixedAsset.dto.ts`**

```typescript
// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsNumber, IsString, Min } from 'class-validator';

export class CreateFixedAssetDto {
  @IsString()
  @ApiProperty({ example: 'Станок ЧПУ' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Оборудование' })
  category?: string;

  @ToNumber()
  @IsNumber()
  @Min(0.01)
  @ApiProperty({ example: 600000 })
  cost: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 0, description: 'Ликвидационная стоимость' })
  salvageValue?: number;

  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 60, description: 'Срок полезного использования, мес.' })
  serviceLifeMonths: number;

  @IsDateString()
  @ApiProperty({ example: '2026-03-15', description: 'Дата ввода в эксплуатацию' })
  commissionedAt: string;

  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 12, description: 'Счёт-актив (тип fixed-asset)' })
  assetAccountId: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Инв. №42' })
  note?: string;
}

export class AccrueMonthDto {
  @IsString()
  @ApiProperty({ example: '2026-04', description: 'Месяц начисления YYYY-MM' })
  period: string;
}

export class DisposeFixedAssetDto {
  @IsDateString()
  @ApiProperty({ example: '2026-12-31', description: 'Дата выбытия' })
  disposedAt: string;

  @IsIn(['sale', 'liquidation'])
  @ApiProperty({ example: 'sale', enum: ['sale', 'liquidation'] })
  disposalType: 'sale' | 'liquidation';

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 350000, description: 'Сумма продажи (0 при ликвидации)' })
  proceeds?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Счёт зачисления денег при продаже' })
  paymentAccountId?: number;
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/modules/FixedAssets/constants.ts packages/server/src/modules/FixedAssets/dtos/FixedAsset.dto.ts
git commit -m "feat(fixed-assets): константы (счета/статья/ошибки) и DTO"
```

---

## Task 9: `CreateFixedAsset` command

**Files:**
- Create: `packages/server/src/modules/FixedAssets/commands/CreateFixedAsset.service.ts`

- [ ] **Step 1: Write the command**

Mirror `CreateCredit.service.ts` (constructor injection of `UnitOfWork`, `LedgerStorageService`, `TenancyContext`, and `@Inject(Model.name) TenantModelProxy<typeof Model>` for each model). Create the file:

```typescript
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { ACCOUNT_TYPE } from '@/constants/accounts';
import { FixedAsset } from '../models/FixedAsset.model';
import { linearDepreciation } from '../utils/linearDepreciation';
import {
  ERRORS,
  DEPRECIATION_EXPENSE_ACCOUNT,
  DEPRECIATION_ARTICLE,
} from '../constants';
import { CreateFixedAssetDto } from '../dtos/FixedAsset.dto';

/**
 * Регистрирует ОС: проверяет счёт-актив, строит график линейной амортизации
 * (planned-строки), лениво создаёт счёт/статью «Амортизация». Проводки покупки
 * НЕ пишет (стоимость уже на счёте-активе из обычной операции покупки).
 */
@Injectable()
export class CreateFixedAssetService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly tenancyContext: TenancyContext,

    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
  ) {}

  public async create(dto: CreateFixedAssetDto) {
    if (!(Number(dto.cost) > 0)) {
      throw new ServiceError(ERRORS.INVALID_AMOUNT);
    }
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const assetAccount: any = await this.accountModel()
        .query(trx)
        .findById(dto.assetAccountId);
      if (!assetAccount) throw new ServiceError(ERRORS.ASSET_ACCOUNT_NOT_FOUND);
      if (
        ![ACCOUNT_TYPE.FIXED_ASSET, ACCOUNT_TYPE.NON_CURRENT_ASSET].includes(
          assetAccount.accountType,
        )
      ) {
        throw new ServiceError(ERRORS.ASSET_ACCOUNT_NOT_FIXED);
      }

      // Лениво создаём счёт «Амортизация» и статью ④, мэппим.
      const expenseAccount = await this.findOrCreateExpenseAccount(
        currencyCode,
        trx,
      );
      await this.findOrCreateDepreciationArticle(expenseAccount.id, trx);

      const schedule = linearDepreciation({
        cost: Number(dto.cost),
        salvageValue: Number(dto.salvageValue ?? 0),
        serviceLifeMonths: Number(dto.serviceLifeMonths),
        commissionedAt: dto.commissionedAt,
      });

      const asset: any = await this.assetModel()
        .query(trx)
        .insertGraph({
          name: dto.name,
          category: dto.category ?? null,
          cost: dto.cost,
          salvageValue: dto.salvageValue ?? 0,
          serviceLifeMonths: dto.serviceLifeMonths,
          commissionedAt: dto.commissionedAt,
          assetAccountId: dto.assetAccountId,
          accumulatedDepreciation: 0,
          status: 'active',
          note: dto.note ?? null,
          entries: schedule.map((r) => ({
            period: r.period,
            seqNo: r.seqNo,
            amount: r.amount,
            status: 'planned',
          })),
        } as any);

      return this.assetModel()
        .query(trx)
        .findById(asset.id)
        .withGraphFetched('entries');
    });
  }

  /** Счёт «Амортизация» — find-or-create по slug. */
  private async findOrCreateExpenseAccount(
    currencyCode: string,
    trx: Knex.Transaction,
  ) {
    let account: any = await this.accountModel()
      .query(trx)
      .findOne({ slug: DEPRECIATION_EXPENSE_ACCOUNT.slug });
    if (!account) {
      account = await this.accountModel()
        .query(trx)
        .insertAndFetch({ ...DEPRECIATION_EXPENSE_ACCOUNT, currencyCode } as any);
    }
    return account;
  }

  /** Статья ④ «Амортизация» — find-or-create по name+kind; привязка к счёту. */
  private async findOrCreateDepreciationArticle(
    accountId: number,
    trx: Knex.Transaction,
  ) {
    let article: any = await this.articleModel()
      .query(trx)
      .findOne({ name: DEPRECIATION_ARTICLE.name, kind: 'expense' });
    if (!article) {
      article = await this.articleModel()
        .query(trx)
        .insertAndFetch({ ...DEPRECIATION_ARTICLE, parentId: null } as any);
    }
    const mapping = await this.articleAccountModel()
      .query(trx)
      .findOne({ articleId: article.id, accountId });
    if (!mapping) {
      await this.articleAccountModel()
        .query(trx)
        .insert({ articleId: article.id, accountId } as any);
    }
    return article;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/modules/FixedAssets/commands/CreateFixedAsset.service.ts
git commit -m "feat(fixed-assets): команда создания ОС с графиком амортизации"
```

---

## Task 10: `AccrueMonthDepreciation` command (idempotent + locking)

**Files:**
- Create: `packages/server/src/modules/FixedAssets/commands/AccrueMonthDepreciation.service.ts`
- Test: `packages/server/src/modules/FixedAssets/commands/AccrueMonthDepreciation.service.spec.ts`

- [ ] **Step 1: Write the failing unit test (idempotency of the selection logic)**

The DB-bound flow is integration-tested manually (Task 21); here we unit-test the pure selection helper that decides which entries to post. Create the spec:

```typescript
// © 2026 Bigfin
import { entriesToAccrue } from './AccrueMonthDepreciation.service';

describe('entriesToAccrue', () => {
  const rows = [
    { id: 1, period: '2026-04', status: 'planned' },
    { id: 2, period: '2026-05', status: 'planned' },
    { id: 3, period: '2026-04', status: 'posted' },
  ];

  it('берёт только planned-строки с period <= целевого (catch-up)', () => {
    const sel = entriesToAccrue(rows as any, '2026-04');
    expect(sel.map((e) => e.id)).toEqual([1]);
  });

  it('повторный вызов за уже посчитанный месяц ничего не возвращает', () => {
    const posted = rows.map((r) =>
      r.period === '2026-04' ? { ...r, status: 'posted' } : r,
    );
    const sel = entriesToAccrue(posted as any, '2026-04');
    expect(sel).toHaveLength(0);
  });

  it('catch-up: целевой май захватывает и непосчитанный апрель', () => {
    const sel = entriesToAccrue(rows as any, '2026-05');
    expect(sel.map((e) => e.id)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @bigfin/server test -- AccrueMonthDepreciation`
Expected: FAIL — module/function not found.

- [ ] **Step 3: Write the command (and export the pure helper)**

```typescript
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Account } from '@/modules/Accounts/models/Account.model';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { Ledger } from '@/modules/Ledger/Ledger';
import { TransactionsLockingGuard } from '@/modules/TransactionsLocking/guards/TransactionsLockingGuard';
import { TransactionsLockingGroup } from '@/modules/TransactionsLocking/types/TransactionsLocking.types';
import { FixedAsset } from '../models/FixedAsset.model';
import { FixedAssetDepreciationEntry } from '../models/FixedAssetDepreciationEntry.model';
import { getDepreciationGLEntries } from '../utils/fixedAssetGLEntries';
import {
  DEPRECIATION_EXPENSE_ACCOUNT,
  ACCUMULATED_DEPRECIATION_ACCOUNT,
} from '../constants';

interface SelectableEntry {
  id: number;
  period: string;
  status: string;
}

/** Чистый отбор: planned-строки с period <= целевого (catch-up пропущенных). */
export const entriesToAccrue = <T extends SelectableEntry>(
  entries: T[],
  targetPeriod: string,
): T[] =>
  entries.filter((e) => e.status === 'planned' && e.period <= targetPeriod);

/**
 * Начисляет амортизацию за выбранный месяц (и любые непосчитанные раньше).
 * Идемпотентно: posted-строки пропускаются. Каждая строка постит GL на дату
 * конца своего месяца и проверяется на закрытый период.
 */
@Injectable()
export class AccrueMonthDepreciationService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ledgerStorage: LedgerStorageService,
    private readonly tenancyContext: TenancyContext,
    private readonly lockingGuard: TransactionsLockingGuard,

    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,

    @Inject(FixedAssetDepreciationEntry.name)
    private readonly entryModel: TenantModelProxy<
      typeof FixedAssetDepreciationEntry
    >,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  public async accrue(targetPeriod: string) {
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const expenseAccount = await this.findOrCreate(
        DEPRECIATION_EXPENSE_ACCOUNT,
        currencyCode,
        trx,
      );
      const accumulatedAccount = await this.findOrCreate(
        ACCUMULATED_DEPRECIATION_ACCOUNT,
        currencyCode,
        trx,
      );

      // Только активные ОС.
      const activeAssets: any[] = await this.assetModel()
        .query(trx)
        .where('status', 'active');
      const activeIds = activeAssets.map((a) => a.id);
      if (!activeIds.length) return { posted: 0 };

      const planned: any[] = await this.entryModel()
        .query(trx)
        .whereIn('fixedAssetId', activeIds)
        .andWhere('status', 'planned');

      const toPost = entriesToAccrue(planned as SelectableEntry[], targetPeriod);
      if (!toPost.length) return { posted: 0 };

      let posted = 0;
      for (const entry of toPost as any[]) {
        const date = moment(entry.period, 'YYYY-MM')
          .endOf('month')
          .format('YYYY-MM-DD');

        // Закрытый период → бросит ServiceError.
        await this.lockingGuard.transactionsLockingGuard(
          date,
          TransactionsLockingGroup.Financial,
        );

        const ledger = new Ledger(
          getDepreciationGLEntries({
            entryId: entry.id,
            date,
            amount: Number(entry.amount),
            currencyCode,
            expenseAccountId: expenseAccount.id,
            accumulatedAccountId: accumulatedAccount.id,
          }),
        );
        await this.ledgerStorage.commit(ledger, trx);

        await this.entryModel()
          .query(trx)
          .findById(entry.id)
          .patch({ status: 'posted', postedAt: date } as any);

        await this.assetModel()
          .query(trx)
          .findById(entry.fixedAssetId)
          .increment('accumulatedDepreciation', Number(entry.amount));

        posted++;
      }
      return { posted };
    });
  }

  private async findOrCreate(
    template: { slug: string },
    currencyCode: string,
    trx: Knex.Transaction,
  ) {
    let account: any = await this.accountModel()
      .query(trx)
      .findOne({ slug: template.slug });
    if (!account) {
      account = await this.accountModel()
        .query(trx)
        .insertAndFetch({ ...template, currencyCode } as any);
    }
    return account;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @bigfin/server test -- AccrueMonthDepreciation`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/FixedAssets/commands/AccrueMonthDepreciation.service.ts packages/server/src/modules/FixedAssets/commands/AccrueMonthDepreciation.service.spec.ts
git commit -m "feat(fixed-assets): идемпотентное начисление амортизации за месяц (с учётом закрытых периодов)"
```

---

## Task 11: `DisposeFixedAsset` command

**Files:**
- Create: `packages/server/src/modules/FixedAssets/commands/DisposeFixedAsset.service.ts`

- [ ] **Step 1: Write the command**

```typescript
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Account } from '@/modules/Accounts/models/Account.model';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { Ledger } from '@/modules/Ledger/Ledger';
import { TransactionsLockingGuard } from '@/modules/TransactionsLocking/guards/TransactionsLockingGuard';
import { TransactionsLockingGroup } from '@/modules/TransactionsLocking/types/TransactionsLocking.types';
import { FixedAsset } from '../models/FixedAsset.model';
import { getDisposalGLEntries } from '../utils/fixedAssetGLEntries';
import {
  ERRORS,
  CASH_ACCOUNT_TYPES,
  ACCUMULATED_DEPRECIATION_ACCOUNT,
  FIXED_ASSET_DISPOSAL_ACCOUNT,
} from '../constants';
import { DisposeFixedAssetDto } from '../dtos/FixedAsset.dto';

/** Выбытие/списание ОС: закрывает накопленную амортизацию, убирает актив, признаёт прибыль/убыток. */
@Injectable()
export class DisposeFixedAssetService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ledgerStorage: LedgerStorageService,
    private readonly tenancyContext: TenancyContext,
    private readonly lockingGuard: TransactionsLockingGuard,

    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  public async dispose(id: number, dto: DisposeFixedAssetDto) {
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const asset: any = await this.assetModel().query(trx).findById(id);
      if (!asset) throw new ServiceError(ERRORS.FIXED_ASSET_NOT_FOUND);
      if (asset.status === 'disposed') {
        throw new ServiceError(ERRORS.ALREADY_DISPOSED);
      }

      await this.lockingGuard.transactionsLockingGuard(
        dto.disposedAt,
        TransactionsLockingGroup.Financial,
      );

      const proceeds = Number(dto.proceeds ?? 0);
      let bankAccountId: number | null = null;
      if (dto.disposalType === 'sale' && proceeds > 0) {
        const bank: any = await this.accountModel()
          .query(trx)
          .findById(dto.paymentAccountId);
        if (!bank) throw new ServiceError(ERRORS.PAYMENT_ACCOUNT_NOT_FOUND);
        if (!CASH_ACCOUNT_TYPES.includes(bank.accountType)) {
          throw new ServiceError(ERRORS.PAYMENT_ACCOUNT_NOT_CASH);
        }
        bankAccountId = bank.id;
      }

      const accumulatedAccount = await this.findOrCreate(
        ACCUMULATED_DEPRECIATION_ACCOUNT,
        currencyCode,
        trx,
      );
      const disposalAccount = await this.findOrCreate(
        FIXED_ASSET_DISPOSAL_ACCOUNT,
        currencyCode,
        trx,
      );

      const ledger = new Ledger(
        getDisposalGLEntries({
          assetId: asset.id,
          date: dto.disposedAt,
          currencyCode,
          cost: Number(asset.cost),
          accumulated: Number(asset.accumulatedDepreciation),
          proceeds,
          assetAccountId: asset.assetAccountId,
          accumulatedAccountId: accumulatedAccount.id,
          disposalAccountId: disposalAccount.id,
          bankAccountId,
        }),
      );
      await this.ledgerStorage.commit(ledger, trx);

      await this.assetModel()
        .query(trx)
        .findById(id)
        .patch({
          status: 'disposed',
          disposedAt: dto.disposedAt,
          disposalType: dto.disposalType,
          disposalAccountId: bankAccountId,
          disposalProceeds: proceeds,
        } as any);

      return this.assetModel().query(trx).findById(id);
    });
  }

  private async findOrCreate(
    template: { slug: string },
    currencyCode: string,
    trx: Knex.Transaction,
  ) {
    let account: any = await this.accountModel()
      .query(trx)
      .findOne({ slug: template.slug });
    if (!account) {
      account = await this.accountModel()
        .query(trx)
        .insertAndFetch({ ...template, currencyCode } as any);
    }
    return account;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/modules/FixedAssets/commands/DisposeFixedAsset.service.ts
git commit -m "feat(fixed-assets): команда выбытия/списания ОС с проводкой прибыли/убытка"
```

---

## Task 12: `DeleteFixedAsset` command

**Files:**
- Create: `packages/server/src/modules/FixedAssets/commands/DeleteFixedAsset.service.ts`

- [ ] **Step 1: Write the command**

```typescript
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { FixedAsset } from '../models/FixedAsset.model';
import { FixedAssetDepreciationEntry } from '../models/FixedAssetDepreciationEntry.model';
import {
  ERRORS,
  FIXED_ASSET_DEPRECIATION_TRANSACTION_TYPE,
  FIXED_ASSET_DISPOSAL_TRANSACTION_TYPE,
} from '../constants';

/**
 * Удаляет ОС и откатывает его проводки: каждое posted-начисление по
 * deleteByReference, проводку выбытия (если было). Строки графика удаляются
 * каскадом (onDelete CASCADE). Счета не трогаем (аудит-след), как в Credits.
 */
@Injectable()
export class DeleteFixedAssetService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ledgerStorage: LedgerStorageService,

    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,

    @Inject(FixedAssetDepreciationEntry.name)
    private readonly entryModel: TenantModelProxy<
      typeof FixedAssetDepreciationEntry
    >,
  ) {}

  public async delete(id: number) {
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const asset: any = await this.assetModel().query(trx).findById(id);
      if (!asset) throw new ServiceError(ERRORS.FIXED_ASSET_NOT_FOUND);

      const posted: any[] = await this.entryModel()
        .query(trx)
        .where('fixedAssetId', id)
        .andWhere('status', 'posted');

      for (const entry of posted) {
        await this.ledgerStorage.deleteByReference(
          entry.id,
          FIXED_ASSET_DEPRECIATION_TRANSACTION_TYPE,
          trx,
        );
      }

      if (asset.status === 'disposed') {
        await this.ledgerStorage.deleteByReference(
          id,
          FIXED_ASSET_DISPOSAL_TRANSACTION_TYPE,
          trx,
        );
      }

      await this.entryModel().query(trx).where('fixedAssetId', id).delete();
      await this.assetModel().query(trx).deleteById(id);
      return { id };
    });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/modules/FixedAssets/commands/DeleteFixedAsset.service.ts
git commit -m "feat(fixed-assets): удаление ОС с откатом проводок"
```

---

## Task 13: Query services

**Files:**
- Create: `packages/server/src/modules/FixedAssets/queries/GetFixedAssets.service.ts`
- Create: `packages/server/src/modules/FixedAssets/queries/GetFixedAssetDetail.service.ts`
- Create: `packages/server/src/modules/FixedAssets/queries/GetFixedAssetsSummary.service.ts`

- [ ] **Step 1: `GetFixedAssets.service.ts`**

```typescript
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { FixedAsset } from '../models/FixedAsset.model';

@Injectable()
export class GetFixedAssetsService {
  constructor(
    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,
  ) {}

  public async getFixedAssets() {
    const assets: any[] = await this.assetModel()
      .query()
      .orderBy('commissionedAt', 'desc')
      .orderBy('id', 'desc');

    return assets.map((a) => {
      const cost = Number(a.cost) || 0;
      const accumulated = Number(a.accumulatedDepreciation) || 0;
      return {
        id: a.id,
        name: a.name,
        category: a.category ?? null,
        cost,
        accumulatedDepreciation: accumulated,
        netValue: Math.round((cost - accumulated) * 100) / 100,
        commissionedAt: a.commissionedAt,
        serviceLifeMonths: a.serviceLifeMonths,
        status: a.status,
      };
    });
  }
}
```

- [ ] **Step 2: `GetFixedAssetDetail.service.ts`**

```typescript
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { FixedAsset } from '../models/FixedAsset.model';
import { ERRORS } from '../constants';

@Injectable()
export class GetFixedAssetDetailService {
  constructor(
    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,
  ) {}

  public async getDetail(id: number) {
    const asset: any = await this.assetModel()
      .query()
      .findById(id)
      .withGraphFetched('entries(orderBySeq)')
      .modifiers({
        orderBySeq(builder: any) {
          builder.orderBy('seqNo', 'asc');
        },
      });
    if (!asset) throw new ServiceError(ERRORS.FIXED_ASSET_NOT_FOUND);

    const cost = Number(asset.cost) || 0;
    const accumulated = Number(asset.accumulatedDepreciation) || 0;
    return {
      ...asset,
      netValue: Math.round((cost - accumulated) * 100) / 100,
    };
  }
}
```

- [ ] **Step 3: `GetFixedAssetsSummary.service.ts`**

```typescript
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { FixedAsset } from '../models/FixedAsset.model';

@Injectable()
export class GetFixedAssetsSummaryService {
  constructor(
    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,
  ) {}

  public async getSummary() {
    const assets: any[] = await this.assetModel()
      .query()
      .where('status', 'active');
    const totalCost = assets.reduce((s, a) => s + Number(a.cost), 0);
    const totalAccumulated = assets.reduce(
      (s, a) => s + Number(a.accumulatedDepreciation),
      0,
    );
    const r2 = (n: number) => Math.round(n * 100) / 100;
    return {
      count: assets.length,
      totalCost: r2(totalCost),
      totalAccumulated: r2(totalAccumulated),
      totalNet: r2(totalCost - totalAccumulated),
    };
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/FixedAssets/queries/
git commit -m "feat(fixed-assets): запросы списка, карточки и сводки ОС"
```

---

## Task 14: Application + Controller + Module wiring + App.module

**Files:**
- Create: `packages/server/src/modules/FixedAssets/FixedAssets.application.ts`
- Create: `packages/server/src/modules/FixedAssets/FixedAssets.controller.ts`
- Create: `packages/server/src/modules/FixedAssets/FixedAssets.module.ts`
- Modify: `packages/server/src/app.module.ts` (the root module; confirm exact filename with `ls packages/server/src/*.module.ts`)

- [ ] **Step 1: `FixedAssets.application.ts`**

```typescript
// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { CreateFixedAssetService } from './commands/CreateFixedAsset.service';
import { AccrueMonthDepreciationService } from './commands/AccrueMonthDepreciation.service';
import { DisposeFixedAssetService } from './commands/DisposeFixedAsset.service';
import { DeleteFixedAssetService } from './commands/DeleteFixedAsset.service';
import { GetFixedAssetsService } from './queries/GetFixedAssets.service';
import { GetFixedAssetDetailService } from './queries/GetFixedAssetDetail.service';
import { GetFixedAssetsSummaryService } from './queries/GetFixedAssetsSummary.service';
import { CreateFixedAssetDto, DisposeFixedAssetDto } from './dtos/FixedAsset.dto';

@Injectable()
export class FixedAssetsApplication {
  constructor(
    private readonly createService: CreateFixedAssetService,
    private readonly accrueService: AccrueMonthDepreciationService,
    private readonly disposeService: DisposeFixedAssetService,
    private readonly deleteService: DeleteFixedAssetService,
    private readonly getAssetsService: GetFixedAssetsService,
    private readonly getDetailService: GetFixedAssetDetailService,
    private readonly getSummaryService: GetFixedAssetsSummaryService,
  ) {}

  getFixedAssets() {
    return this.getAssetsService.getFixedAssets();
  }
  getDetail(id: number) {
    return this.getDetailService.getDetail(id);
  }
  getSummary() {
    return this.getSummaryService.getSummary();
  }
  createFixedAsset(dto: CreateFixedAssetDto) {
    return this.createService.create(dto);
  }
  accrueMonth(period: string) {
    return this.accrueService.accrue(period);
  }
  disposeFixedAsset(id: number, dto: DisposeFixedAssetDto) {
    return this.disposeService.dispose(id, dto);
  }
  deleteFixedAsset(id: number) {
    return this.deleteService.delete(id);
  }
}
```

- [ ] **Step 2: `FixedAssets.controller.ts`**

```typescript
// © 2026 Bigfin
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Auth/guards/Authorization.guard';
import { PermissionGuard } from '@/modules/Auth/guards/Permission.guard';
import { RequirePermission } from '@/modules/Auth/decorators/RequirePermission.decorator';
import { FixedAssetsApplication } from './FixedAssets.application';
import {
  AccrueMonthDto,
  CreateFixedAssetDto,
  DisposeFixedAssetDto,
} from './dtos/FixedAsset.dto';

@Controller('fixed-assets')
@ApiTags('Fixed Assets')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class FixedAssetsController {
  constructor(private readonly application: FixedAssetsApplication) {}

  @Get('summary')
  @ApiOperation({ summary: 'Fixed assets summary: gross, accumulated, net.' })
  getSummary() {
    return this.application.getSummary();
  }

  @Get()
  @ApiOperation({ summary: 'List fixed assets with net value.' })
  getFixedAssets() {
    return this.application.getFixedAssets();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fixed asset with its depreciation schedule.' })
  getDetail(@Param('id', ParseIntPipe) id: number) {
    return this.application.getDetail(id);
  }

  @Post()
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Register a fixed asset and build schedule (admin only).' })
  create(@Body() dto: CreateFixedAssetDto) {
    return this.application.createFixedAsset(dto);
  }

  @Post('accrue')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Accrue depreciation for a month (idempotent, admin only).' })
  accrue(@Body() dto: AccrueMonthDto) {
    return this.application.accrueMonth(dto.period);
  }

  @Post(':id/dispose')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Dispose/write-off a fixed asset (admin only).' })
  dispose(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DisposeFixedAssetDto,
  ) {
    return this.application.disposeFixedAsset(id, dto);
  }

  @Delete(':id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Delete a fixed asset and revert its GL (admin only).' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteFixedAsset(id);
  }
}
```

> Confirm the exact import paths for `ApiCommonHeaders`, `AuthorizationGuard`, `PermissionGuard`, `RequirePermission` by opening `packages/server/src/modules/Credits/Credits.controller.ts` and copying its import lines verbatim — they are identical here.

- [ ] **Step 3: `FixedAssets.module.ts`**

```typescript
// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { LedgerModule } from '@/modules/Ledger/Ledger.module';
import { TransactionsLockingModule } from '@/modules/TransactionsLocking/TransactionsLocking.module';
import { FixedAssetsController } from './FixedAssets.controller';
import { FixedAssetsApplication } from './FixedAssets.application';
import { CreateFixedAssetService } from './commands/CreateFixedAsset.service';
import { AccrueMonthDepreciationService } from './commands/AccrueMonthDepreciation.service';
import { DisposeFixedAssetService } from './commands/DisposeFixedAsset.service';
import { DeleteFixedAssetService } from './commands/DeleteFixedAsset.service';
import { GetFixedAssetsService } from './queries/GetFixedAssets.service';
import { GetFixedAssetDetailService } from './queries/GetFixedAssetDetail.service';
import { GetFixedAssetsSummaryService } from './queries/GetFixedAssetsSummary.service';

@Module({
  imports: [
    TenancyDatabaseModule,
    TenancyModule,
    LedgerModule,
    TransactionsLockingModule,
  ],
  controllers: [FixedAssetsController],
  providers: [
    FixedAssetsApplication,
    CreateFixedAssetService,
    AccrueMonthDepreciationService,
    DisposeFixedAssetService,
    DeleteFixedAssetService,
    GetFixedAssetsService,
    GetFixedAssetDetailService,
    GetFixedAssetsSummaryService,
  ],
})
export class FixedAssetsModule {}
```

> Confirm `TransactionsLockingModule` exports `TransactionsLockingGuard`. Run: `grep -n "exports" packages/server/src/modules/TransactionsLocking/TransactionsLocking.module.ts`. If `TransactionsLockingGuard` is not exported, add it to that module's `exports` array (and `providers` if missing).

- [ ] **Step 4: Register the module in the root app module**

Run: `grep -rn "CreditsModule" packages/server/src/*.module.ts` to find where `CreditsModule` is imported and added to the root `imports: [ ... ]`. Add `FixedAssetsModule` right next to it:

```typescript
import { FixedAssetsModule } from '@/modules/FixedAssets/FixedAssets.module';
```
and in the root module `imports` array:
```typescript
    FixedAssetsModule,
```

- [ ] **Step 5: Typecheck + run all FixedAssets unit tests**

Run: `pnpm typecheck && pnpm --filter @bigfin/server test -- FixedAssets`
Expected: typecheck clean; pure-function + helper specs pass.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/modules/FixedAssets/FixedAssets.application.ts packages/server/src/modules/FixedAssets/FixedAssets.controller.ts packages/server/src/modules/FixedAssets/FixedAssets.module.ts packages/server/src/app.module.ts
git commit -m "feat(fixed-assets): контроллер, application, модуль и регистрация в App.module"
```

---

# TRACK D — Frontend

## Task 15: Feature flag (web) + i18n keys

**Files:**
- Modify: `packages/webapp/src/constants/features.tsx`
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Add the web flag**

In `packages/webapp/src/constants/features.tsx`, add to the `Features` object:

```typescript
  FixedAssets: 'fixed_assets',
```

- [ ] **Step 2: Add i18n keys (EN)**

In `packages/webapp/src/lang/en/index.json`, add these keys (place near the `credits.*` block; JSON is a flat key map):

```json
"fixed_assets.page.title": "Fixed assets",
"fixed_assets.summary.count": "Assets",
"fixed_assets.summary.gross": "Original cost",
"fixed_assets.summary.accumulated": "Accumulated depreciation",
"fixed_assets.summary.net": "Net book value",
"fixed_assets.col.name": "Name",
"fixed_assets.col.category": "Category",
"fixed_assets.col.cost": "Cost",
"fixed_assets.col.accumulated": "Accumulated",
"fixed_assets.col.net": "Net value",
"fixed_assets.col.commissioned_at": "In service since",
"fixed_assets.col.status": "Status",
"fixed_assets.status.active": "Active",
"fixed_assets.status.disposed": "Disposed",
"fixed_assets.action.new": "Add asset",
"fixed_assets.action.accrue": "Accrue depreciation",
"fixed_assets.action.dispose": "Dispose",
"fixed_assets.action.delete": "Delete",
"fixed_assets.form.name": "Name",
"fixed_assets.form.category": "Category",
"fixed_assets.form.cost": "Original cost",
"fixed_assets.form.salvage": "Salvage value",
"fixed_assets.form.life_months": "Service life (months)",
"fixed_assets.form.commissioned_at": "In-service date",
"fixed_assets.form.asset_account": "Asset account",
"fixed_assets.form.submit": "Add asset",
"fixed_assets.accrue.title": "Accrue depreciation",
"fixed_assets.accrue.period": "Month",
"fixed_assets.accrue.submit": "Accrue",
"fixed_assets.accrue.done": "Depreciation accrued: {count}",
"fixed_assets.dispose.title": "Dispose asset",
"fixed_assets.dispose.type": "Type",
"fixed_assets.dispose.type_sale": "Sale",
"fixed_assets.dispose.type_liquidation": "Liquidation",
"fixed_assets.dispose.proceeds": "Sale amount",
"fixed_assets.dispose.account": "Receiving account",
"fixed_assets.dispose.date": "Disposal date",
"fixed_assets.dispose.submit": "Dispose",
"fixed_assets.schedule.title": "Depreciation schedule",
"fixed_assets.schedule.period": "Month",
"fixed_assets.schedule.amount": "Amount",
"fixed_assets.schedule.status": "Status",
"fixed_assets.schedule.planned": "Planned",
"fixed_assets.schedule.posted": "Accrued"
```

- [ ] **Step 3: Add i18n keys (RU)**

In `packages/webapp/src/lang/ru/index.json`, add the **same keys** with Russian values:

```json
"fixed_assets.page.title": "Основные средства",
"fixed_assets.summary.count": "Объектов",
"fixed_assets.summary.gross": "Первоначальная стоимость",
"fixed_assets.summary.accumulated": "Накопленная амортизация",
"fixed_assets.summary.net": "Остаточная стоимость",
"fixed_assets.col.name": "Название",
"fixed_assets.col.category": "Категория",
"fixed_assets.col.cost": "Стоимость",
"fixed_assets.col.accumulated": "Накоплено",
"fixed_assets.col.net": "Остаточная",
"fixed_assets.col.commissioned_at": "В эксплуатации с",
"fixed_assets.col.status": "Статус",
"fixed_assets.status.active": "В эксплуатации",
"fixed_assets.status.disposed": "Выбыло",
"fixed_assets.action.new": "Добавить ОС",
"fixed_assets.action.accrue": "Начислить амортизацию",
"fixed_assets.action.dispose": "Списать",
"fixed_assets.action.delete": "Удалить",
"fixed_assets.form.name": "Название",
"fixed_assets.form.category": "Категория",
"fixed_assets.form.cost": "Первоначальная стоимость",
"fixed_assets.form.salvage": "Ликвидационная стоимость",
"fixed_assets.form.life_months": "Срок полезного использования (мес.)",
"fixed_assets.form.commissioned_at": "Дата ввода в эксплуатацию",
"fixed_assets.form.asset_account": "Счёт-актив",
"fixed_assets.form.submit": "Добавить ОС",
"fixed_assets.accrue.title": "Начисление амортизации",
"fixed_assets.accrue.period": "Месяц",
"fixed_assets.accrue.submit": "Начислить",
"fixed_assets.accrue.done": "Начислено амортизаций: {count}",
"fixed_assets.dispose.title": "Списание ОС",
"fixed_assets.dispose.type": "Тип",
"fixed_assets.dispose.type_sale": "Продажа",
"fixed_assets.dispose.type_liquidation": "Ликвидация",
"fixed_assets.dispose.proceeds": "Сумма продажи",
"fixed_assets.dispose.account": "Счёт зачисления",
"fixed_assets.dispose.date": "Дата выбытия",
"fixed_assets.dispose.submit": "Списать",
"fixed_assets.schedule.title": "График амортизации",
"fixed_assets.schedule.period": "Месяц",
"fixed_assets.schedule.amount": "Сумма",
"fixed_assets.schedule.status": "Статус",
"fixed_assets.schedule.planned": "Запланировано",
"fixed_assets.schedule.posted": "Начислено"
```

- [ ] **Step 4: Verify EN↔RU parity**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: exit 0, no missing keys.

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/constants/features.tsx packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(fixed-assets): фронт-флаг и переводы fixed_assets (en+ru)"
```

---

## Task 16: React Query hooks

**Files:**
- Create: `packages/webapp/src/hooks/query/fixed-assets.tsx`

- [ ] **Step 1: Inspect the template**

Open `packages/webapp/src/hooks/query/credits.tsx` and note: the query-key constant source (`t.*`), `useRequestQuery`, `useApiRequest`, `useMutation`, and the `invalidateAll` helper. Mirror them.

- [ ] **Step 2: Write the hooks**

Create `packages/webapp/src/hooks/query/fixed-assets.tsx` (adapt imports to match `credits.tsx` exactly — same relative paths):

```tsx
// © 2026 Bigfin
import { useMutation, useQueryClient, UseMutationOptions } from 'react-query';
import { useRequestQuery } from '../useRequestQuery';
import useApiRequest from '../useRequestQuery';
import t from './types';

const QK = 'FIXED_ASSETS';

const invalidate = (client: any) => {
  client.invalidateQueries(QK);
  client.invalidateQueries('FIXED_ASSETS_SUMMARY');
};

export function useFixedAssets(props?: any) {
  return useRequestQuery(
    [QK],
    { method: 'get', url: 'fixed-assets' },
    { select: (res: any) => res.data?.data ?? res.data, defaultData: [], ...props },
  );
}

export function useFixedAssetsSummary(props?: any) {
  return useRequestQuery(
    ['FIXED_ASSETS_SUMMARY'],
    { method: 'get', url: 'fixed-assets/summary' },
    { select: (res: any) => res.data?.data ?? res.data, ...props },
  );
}

export function useFixedAsset(id: number, props?: any) {
  return useRequestQuery(
    [QK, id],
    { method: 'get', url: `fixed-assets/${id}` },
    { select: (res: any) => res.data?.data ?? res.data, enabled: !!id, ...props },
  );
}

export function useCreateFixedAsset(props?: UseMutationOptions<any, any, any>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, any>(
    (values) => api.post('fixed-assets', values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useAccrueMonth(props?: UseMutationOptions<any, any, any>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, any>(
    (values) => api.post('fixed-assets/accrue', values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDisposeFixedAsset(props?: UseMutationOptions<any, any, any>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, any>(
    ({ id, values }: any) => api.post(`fixed-assets/${id}/dispose`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeleteFixedAsset(props?: UseMutationOptions<any, any, number>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (id) => api.delete(`fixed-assets/${id}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}
```

> The exact import lines for `useRequestQuery`/`useApiRequest`/`t` MUST be copied from `credits.tsx` — adjust the snippet above if that file's imports differ. Do not invent module paths.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/hooks/query/fixed-assets.tsx
git commit -m "feat(fixed-assets): query-хуки фронта"
```

---

## Task 17: Page, dialog, detail card, route

**Files:**
- Create: `packages/webapp/src/containers/FixedAssets/FixedAssetsPage.tsx`
- Create: `packages/webapp/src/containers/FixedAssets/FixedAssetCreateDialog.tsx`
- Create: `packages/webapp/src/containers/FixedAssets/FixedAssetDetailCard.tsx`
- Create: `packages/webapp/src/containers/FixedAssets/schemas.ts`
- Modify: `packages/webapp/src/routes/dashboard.tsx`

- [ ] **Step 1: Study the template**

Open `packages/webapp/src/containers/Credits/CreditsPage.tsx`, `CreditCreateDialog.tsx`, `CreditDetailCard.tsx`, `schemas.ts`. Replicate their structure (shadcn/ui primitives, React Hook Form + Zod, `intl.get(...)`, `useFeatureCan` gate, toast on success/error). The FixedAssets screens differ only in fields and the two extra actions (Accrue, Dispose).

- [ ] **Step 2: `schemas.ts` (Zod)**

```typescript
// © 2026 Bigfin
import { z } from 'zod';

export const createFixedAssetSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  cost: z.coerce.number().positive(),
  salvageValue: z.coerce.number().min(0).optional(),
  serviceLifeMonths: z.coerce.number().int().positive(),
  commissionedAt: z.string().min(1),
  assetAccountId: z.coerce.number().int().positive(),
  note: z.string().optional(),
});
export type CreateFixedAssetValues = z.infer<typeof createFixedAssetSchema>;

export const disposeSchema = z.object({
  disposedAt: z.string().min(1),
  disposalType: z.enum(['sale', 'liquidation']),
  proceeds: z.coerce.number().min(0).optional(),
  paymentAccountId: z.coerce.number().int().optional(),
});
export type DisposeValues = z.infer<typeof disposeSchema>;
```

- [ ] **Step 3: `FixedAssetsPage.tsx`**

Build the page by mirroring `CreditsPage.tsx`. Required behavior (use `intl.get` for every visible string — keys from Task 15):
- `const { featureCan } = useFeatureCan(); if (!featureCan('fixed_assets')) return null;`
- Summary cards from `useFixedAssetsSummary()`: count, gross, accumulated, net.
- Table from `useFixedAssets()`: name, category, cost, accumulated, net, commissionedAt, status (mapped via `fixed_assets.status.*`).
- "Add asset" button → opens `FixedAssetCreateDialog`.
- "Accrue depreciation" button → opens a small month-picker dialog (default current month `YYYY-MM`), calls `useAccrueMonth()`, toasts `fixed_assets.accrue.done` with `{count}`.
- Row click → opens `FixedAssetDetailCard` for that id.

The exact JSX/imports must follow `CreditsPage.tsx`. Do not introduce new UI libraries.

- [ ] **Step 4: `FixedAssetCreateDialog.tsx`**

Mirror `CreditCreateDialog.tsx`: React Hook Form + `zodResolver(createFixedAssetSchema)`, fields per Task-15 `fixed_assets.form.*`. The `assetAccountId` field is an account picker filtered to asset accounts — reuse whatever account-select component `CreditCreateDialog.tsx` uses for `paymentAccountId`, but filter to fixed-asset / non-current-asset types. On submit call `useCreateFixedAsset()`, close on success, toast error on failure.

- [ ] **Step 5: `FixedAssetDetailCard.tsx`**

Mirror `CreditDetailCard.tsx`: header with asset name + net value, the depreciation schedule table from `useFixedAsset(id)` (`entries`: period, amount, status mapped via `fixed_assets.schedule.*`), a "Dispose" button opening a dispose form (`disposeSchema`; show proceeds + receiving-account fields only when type = sale), and a "Delete" button (confirm) calling `useDeleteFixedAsset()`.

- [ ] **Step 6: Register the route**

In `packages/webapp/src/routes/dashboard.tsx`, next to the `/credits` route, add:

```tsx
    {
      path: `/fixed-assets`,
      component: lazy(
        () => import('@/containers/FixedAssets/FixedAssetsPage'),
      ),
      breadcrumb: intl.get('fixed_assets.page.title'),
      pageTitle: intl.get('fixed_assets.page.title'),
      subscriptionActive: [SUBSCRIPTION_TYPE.MAIN],
    },
```

(Also add a navigation menu entry wherever `/credits` appears in the sidebar config, gated by `featureCan('fixed_assets')`, matching how Credits is gated.)

- [ ] **Step 7: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add packages/webapp/src/containers/FixedAssets/ packages/webapp/src/routes/dashboard.tsx
git commit -m "feat(fixed-assets): страница, диалог создания, карточка с графиком, роут"
```

---

# TRACK E — Verification

## Task 18: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `pnpm typecheck`
Expected: all 3 packages clean.

- [ ] **Step 2: Lang parity**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: exit 0.

- [ ] **Step 3: Run the full server test suite for the module + features**

Run: `pnpm --filter @bigfin/server test -- FixedAssets`
Run: `pnpm --filter @bigfin/server test -- FeaturesConfigure.fixed_assets`
Expected: all green.

- [ ] **Step 4: Manual end-to-end on the local stack (Balance Sheet netting — BLOCKING per spec §6)**

Start the stack (run-bigfin skill: docker mariadb+redis, API :3000, webapp :4000). Enable the flag for the test org, then via the API or UI:
1. Create an asset: cost 600000, salvage 0, life 60, commissioned 2026-03-15, asset account = a fixed-asset account.
2. Confirm 60 planned schedule rows; first period `2026-04`, amount 10000.
3. `POST /fixed-assets/accrue { "period": "2026-04" }` → `{ posted: 1 }`. Repeat the same call → `{ posted: 0 }` (idempotent).
4. Open the Balance Sheet for a date in April 2026. **Verify** the Fixed Assets section shows gross 600000, accumulated −10000, net 590000 (i.e. the contra-account nets correctly). If it does NOT net (shows +10000 or a separate uncombined line that inflates assets), implement explicit netting in `BalanceSheetSchema`/`BalanceSheetAccounts` (group the accumulated-depreciation type as a subtraction under the fixed-asset node) and re-verify.
5. Dispose the asset (sale, proceeds 595000, a bank account) → verify GL balances and that the asset leaves the Balance Sheet, with a small gain on `fixed-asset-disposal`.
6. Confirm the page is hidden when `fixed_assets` is off.

> If the local stack cannot be started in this environment, mark Step 4 BLOCKED and report it explicitly to the founder — do not claim Balance Sheet correctness without observing it.

- [ ] **Step 5: Report status**

Summarize: which steps passed, which are blocked, and the single known follow-up (Balance Sheet netting confirmation if not yet observed). Do not push or open a PR unless the founder asks.

---

## Self-Review (completed by plan author)

- **Spec coverage:** §2 scope → Tasks 4,6,7,9 (register+schedule), 10 (accrue), 11 (dispose), 13/17 (reports/page); §4 GL → Tasks 5,9,10,11; §5 locking → Tasks 10,11; §6 account type + balance sheet → Tasks 2,3,18; §7 data → Tasks 6,7; §8 schedule → Task 4; §9 module → Tasks 8–14; §10 frontend → Tasks 15–17; §11 flag → Tasks 1,15; §12 tests → Tasks 1,2,4,5,10,18. All covered.
- **Placeholder scan:** no TBD/TODO; every code step has complete code; the three frontend screens (Task 17) intentionally reference the Credits template for JSX shape but specify exact behavior, fields, hooks, and i18n keys.
- **Type consistency:** model property names (camelCase: `accumulatedDepreciation`, `serviceLifeMonths`, `commissionedAt`, `fixedAssetId`, `seqNo`) match across migrations (snake_case columns — Objection maps via the codebase's knexSnakeCaseMappers), models, commands, queries, DTOs. Transaction-type constants (`FixedAssetDepreciation`, `FixedAssetDisposal`) defined once in `fixedAssetGLEntries.ts` and re-exported via `constants.ts`. GL helper signatures (`getDepreciationGLEntries`, `getDisposalGLEntries`) match their call sites.

**Known assumption to verify during execution:** the codebase maps camelCase model props ↔ snake_case columns globally (as Credits does — its model uses `paymentAccountId` against column `payment_account_id`). Tasks 6/7 rely on this. If a model needs explicit `columnNameMappers`, copy it from `Credit.model.ts`.
