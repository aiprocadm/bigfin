# ⑧a Ядро ФОТ (Payroll) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Модуль «Зарплата»: справочник сотрудников, месячные начисления с авторасчётом НДФЛ/взносов, плановые оттоки в платёжном календаре, сводка «Налоги к уплате» — за флагом `payroll` (off).

**Architecture:** Новый NestJS-модуль `Payroll` по образцу `PaymentRequests`/`Debts`: 3 additive тенантные таблицы, чистые функции расчёта, интеграция с календарём через `planned_operations` (`sourceType='payroll_run'`), ставки в Settings group `payroll`. Без проводок в леджер. Спека: `docs/superpowers/specs/2026-06-10-payroll-core-design.md`.

**Tech Stack:** NestJS 10 + Objection/Knex (server), React 18 + shadcn + RHF/Zod + react-query (webapp), Jest, react-intl-universal.

**Ветка:** `feat/payroll-core` (создана, спека закоммичена). Коммиты: subject со строчной буквы, тело ≤100 симв/строка (husky commitlint).

**Команды проверки:**
- Тесты модуля: `pnpm --filter @bigfin/server test -- src/modules/Payroll`
- Typecheck: `pnpm typecheck` (требует собранных shared-пакетов)
- Парность лангов: `node packages/webapp/scripts/lang-check.js`
- Локальной БД нет — миграции прогоняются на CI; локально проверяем только синтаксис через typecheck.

---

## Карта файлов

**Server (создать):**
- `packages/server/src/database/tenant/migrations/20260610120000_create_payroll_tables.ts`
- `packages/server/src/modules/Payroll/constants.ts`
- `packages/server/src/modules/Payroll/models/Employee.model.ts`
- `packages/server/src/modules/Payroll/models/PayrollRun.model.ts`
- `packages/server/src/modules/Payroll/models/PayrollRunLine.model.ts`
- `packages/server/src/modules/Payroll/utils/computePayrollLine.ts` (+ `.spec.ts`)
- `packages/server/src/modules/Payroll/utils/summarizeRun.ts` (+ `.spec.ts`)
- `packages/server/src/modules/Payroll/utils/payrollTaxDate.ts` (+ `.spec.ts`)
- `packages/server/src/modules/Payroll/PayrollSettings.service.ts`
- `packages/server/src/modules/Payroll/dtos/Employee.dto.ts`
- `packages/server/src/modules/Payroll/dtos/PayrollRun.dto.ts`
- `packages/server/src/modules/Payroll/dtos/GetPayrollRunsQuery.dto.ts`
- `packages/server/src/modules/Payroll/commands/CommandEmployeeValidator.service.ts` (+ `.spec.ts`)
- `packages/server/src/modules/Payroll/commands/CommandPayrollRunValidator.service.ts` (+ `.spec.ts`)
- `packages/server/src/modules/Payroll/commands/CreateEmployee.service.ts`
- `packages/server/src/modules/Payroll/commands/EditEmployee.service.ts`
- `packages/server/src/modules/Payroll/commands/DeleteEmployee.service.ts`
- `packages/server/src/modules/Payroll/commands/CreatePayrollRun.service.ts`
- `packages/server/src/modules/Payroll/commands/EditPayrollRun.service.ts`
- `packages/server/src/modules/Payroll/commands/DeletePayrollRun.service.ts`
- `packages/server/src/modules/Payroll/commands/ApprovePayrollRun.service.ts` (+ `.spec.ts`)
- `packages/server/src/modules/Payroll/commands/UnapprovePayrollRun.service.ts`
- `packages/server/src/modules/Payroll/queries/GetEmployees.service.ts`
- `packages/server/src/modules/Payroll/queries/GetPayrollRuns.service.ts`
- `packages/server/src/modules/Payroll/queries/GetPayrollRun.service.ts`
- `packages/server/src/modules/Payroll/queries/GetPayrollTaxesSummary.service.ts` (+ `.spec.ts`)
- `packages/server/src/modules/Payroll/Payroll.application.ts`
- `packages/server/src/modules/Payroll/Payroll.controller.ts`
- `packages/server/src/modules/Payroll/Payroll.module.ts`
- `packages/server/src/modules/Features/FeaturesConfigure.payroll.spec.ts`

**Server (изменить):**
- `packages/server/src/common/types/Features.ts` — `PAYROLL = 'payroll'`
- `packages/server/src/modules/Features/FeaturesConfigure.ts` — запись с `defaultValue: false`
- `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts` — регистрация 3 моделей
- `packages/server/src/modules/App/App.module.ts` — импорт `PayrollModule`

**Webapp (создать):**
- `packages/webapp/src/hooks/query/payroll.tsx`
- `packages/webapp/src/containers/Payroll/schemas.ts`
- `packages/webapp/src/containers/Payroll/EmployeeDialog.tsx`
- `packages/webapp/src/containers/Payroll/PayrollRunDialog.tsx`
- `packages/webapp/src/containers/Payroll/PayrollRunDetail.tsx`
- `packages/webapp/src/containers/Payroll/PayrollSettingsDialog.tsx`
- `packages/webapp/src/containers/Payroll/PayrollPage.tsx`

**Webapp (изменить):**
- `packages/webapp/src/hooks/query/types.tsx` — ключи PAYROLL
- `packages/webapp/src/routes/dashboard.tsx` — роут `/payroll`
- `packages/webapp/src/lang/en/index.json` + `packages/webapp/src/lang/ru/index.json` — ключи `payroll.*`

---

### Task 1: Фич-флаг `payroll`

**Files:**
- Modify: `packages/server/src/common/types/Features.ts`
- Modify: `packages/server/src/modules/Features/FeaturesConfigure.ts`
- Test: `packages/server/src/modules/Features/FeaturesConfigure.payroll.spec.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// © 2026 Bigfin
// packages/server/src/modules/Features/FeaturesConfigure.payroll.spec.ts
import { Features } from '@/common/types/Features';
import { FeaturesConfigure } from './FeaturesConfigure';

describe('FeaturesConfigure — payroll', () => {
  it('флаг payroll присутствует и по умолчанию выключен', () => {
    const configure = new FeaturesConfigure({ get: () => undefined } as any);
    const entry = configure
      .getConfigure()
      .find((f) => f.name === Features.PAYROLL);

    expect(entry).toBeDefined();
    expect(entry.defaultValue).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/Features/FeaturesConfigure.payroll.spec.ts`
Expected: FAIL — `Property 'PAYROLL' does not exist` (ts) либо `entry` undefined.

- [ ] **Step 3: Добавить флаг**

В `packages/server/src/common/types/Features.ts` после `DEAL_STAGES = 'deal_stages',`:

```ts
  PAYROLL = 'payroll',
```

В `packages/server/src/modules/Features/FeaturesConfigure.ts` в конец массива `getConfigure()` (после блока `DEAL_STAGES`):

```ts
      {
        name: Features.PAYROLL,
        defaultValue: false,
      },
```

- [ ] **Step 4: Запустить — тест зелёный**

Run: `pnpm --filter @bigfin/server test -- src/modules/Features/FeaturesConfigure.payroll.spec.ts`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/common/types/Features.ts packages/server/src/modules/Features/FeaturesConfigure.ts packages/server/src/modules/Features/FeaturesConfigure.payroll.spec.ts
git commit -m "feat(server): payroll feature flag (default off)"
```

---

### Task 2: Миграция трёх тенантных таблиц

**Files:**
- Create: `packages/server/src/database/tenant/migrations/20260610120000_create_payroll_tables.ts`

- [ ] **Step 1: Написать миграцию** (стиль `20260606130000_create_payment_requests_table.ts` — `exports.up/down`)

```ts
// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema
    .createTable('employees', (table) => {
      table.increments('id');
      table.string('full_name').notNullable();
      table.string('position').nullable();
      table.string('employment_type').notNullable().defaultTo('staff'); // staff|gph|npd|ip
      table.decimal('default_salary', 13, 3).notNullable().defaultTo(0);
      table.boolean('active').notNullable().defaultTo(true).index();
      table.text('note').nullable();
      table.timestamps();
    })
    .createTable('payroll_runs', (table) => {
      table.increments('id');
      table.date('period_month').notNullable().unique(); // первое число месяца
      table.date('pay_date').notNullable();
      table.string('status').notNullable().defaultTo('draft').index(); // draft|approved
      table.text('note').nullable();
      table.timestamps();
    })
    .createTable('payroll_run_lines', (table) => {
      table.increments('id');
      table
        .integer('run_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payroll_runs')
        .onDelete('CASCADE')
        .index();
      table
        .integer('employee_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('employees')
        .index();
      table.string('employment_type').notNullable(); // снапшот на момент расчёта
      table.decimal('base_amount', 13, 3).notNullable().defaultTo(0);
      table.decimal('bonus_amount', 13, 3).notNullable().defaultTo(0);
      table.decimal('deduction_amount', 13, 3).notNullable().defaultTo(0);
      table.decimal('ndfl_amount', 13, 3).notNullable().defaultTo(0);
      table.decimal('contributions_amount', 13, 3).notNullable().defaultTo(0);
      table.decimal('net_amount', 13, 3).notNullable().defaultTo(0);
      table.decimal('total_cost', 13, 3).notNullable().defaultTo(0);
      table.unique(['run_id', 'employee_id']);
      table.timestamps();
    });

exports.down = (knex) =>
  knex.schema
    .dropTableIfExists('payroll_run_lines')
    .dropTableIfExists('payroll_runs')
    .dropTableIfExists('employees');
```

- [ ] **Step 2: Проверка синтаксиса**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: без новых ошибок (файл-миграция JS-стиля в ts — как соседние). Прогон `tenants:migrate:latest → rollback → latest` — на CI/staging (локальной БД нет).

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/database/tenant/migrations/20260610120000_create_payroll_tables.ts
git commit -m "feat(server): payroll tenant tables migration (employees, runs, lines)"
```

---

### Task 3: Константы и модели + регистрация

**Files:**
- Create: `packages/server/src/modules/Payroll/constants.ts`
- Create: `packages/server/src/modules/Payroll/models/Employee.model.ts`
- Create: `packages/server/src/modules/Payroll/models/PayrollRun.model.ts`
- Create: `packages/server/src/modules/Payroll/models/PayrollRunLine.model.ts`
- Modify: `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts`

- [ ] **Step 1: constants.ts**

```ts
// © 2026 Bigfin
export const ERRORS = {
  EMPLOYEE_NOT_FOUND: 'EMPLOYEE_NOT_FOUND',
  EMPLOYEE_HAS_PAYROLL_LINES: 'EMPLOYEE_HAS_PAYROLL_LINES',
  PAYROLL_RUN_NOT_FOUND: 'PAYROLL_RUN_NOT_FOUND',
  PAYROLL_RUN_MONTH_EXISTS: 'PAYROLL_RUN_MONTH_EXISTS',
  PAYROLL_RUN_NOT_DRAFT: 'PAYROLL_RUN_NOT_DRAFT',
  PAYROLL_RUN_NOT_APPROVED: 'PAYROLL_RUN_NOT_APPROVED',
  INVALID_EMPLOYMENT_TYPE: 'INVALID_EMPLOYMENT_TYPE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  DUPLICATE_EMPLOYEE_LINES: 'DUPLICATE_EMPLOYEE_LINES',
  INVALID_FULL_NAME: 'INVALID_FULL_NAME',
};

export const EMPLOYMENT_TYPES = ['staff', 'gph', 'npd', 'ip'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const RUN_STATUSES = ['draft', 'approved'] as const;

export const PAYROLL_SOURCE = 'payroll_run';
export const PAYROLL_CURRENCY = 'RUB';

// Дефолты ставок (редактируются в Settings group 'payroll', не хардкод в расчёте).
export const PAYROLL_SETTINGS_DEFAULTS = {
  ndflRate: 13,
  contribMode: 'standard' as 'standard' | 'msp',
  contribRate: 30,
  mspRate: 15,
  mspThreshold: 40639.5, // 1,5 × МРОТ 2026 (27 093 ₽)
  payrollArticleId: null as number | null,
  taxesArticleId: null as number | null,
};
export type PayrollSettingsValues = typeof PAYROLL_SETTINGS_DEFAULTS;
```

- [ ] **Step 2: Employee.model.ts**

```ts
// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class Employee extends TenantBaseModel {
  fullName!: string;
  position!: string | null;
  employmentType!: string;
  defaultSalary!: number;
  active!: boolean;
  note!: string | null;

  static get tableName() {
    return 'employees';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get modifiers() {
    return {
      activeOnly(query) {
        query.where('active', true);
      },
    };
  }
}
```

- [ ] **Step 3: PayrollRun.model.ts**

```ts
// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class PayrollRun extends TenantBaseModel {
  periodMonth!: string;
  payDate!: string;
  status!: string;
  note!: string | null;

  static get tableName() {
    return 'payroll_runs';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get modifiers() {
    return {
      filterByYear(query, year: number) {
        query
          .where('periodMonth', '>=', `${year}-01-01`)
          .where('periodMonth', '<=', `${year}-12-31`);
      },
      approvedOnly(query) {
        query.where('status', 'approved');
      },
    };
  }

  static get relationMappings() {
    const {
      PayrollRunLine,
    } = require('@/modules/Payroll/models/PayrollRunLine.model');

    return {
      lines: {
        relation: Model.HasManyRelation,
        modelClass: PayrollRunLine,
        join: {
          from: 'payroll_runs.id',
          to: 'payroll_run_lines.runId',
        },
      },
    };
  }
}
```

- [ ] **Step 4: PayrollRunLine.model.ts**

```ts
// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class PayrollRunLine extends TenantBaseModel {
  runId!: number;
  employeeId!: number;
  employmentType!: string;
  baseAmount!: number;
  bonusAmount!: number;
  deductionAmount!: number;
  ndflAmount!: number;
  contributionsAmount!: number;
  netAmount!: number;
  totalCost!: number;

  static get tableName() {
    return 'payroll_run_lines';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const { Employee } = require('@/modules/Payroll/models/Employee.model');

    return {
      employee: {
        relation: Model.BelongsToOneRelation,
        modelClass: Employee,
        join: {
          from: 'payroll_run_lines.employeeId',
          to: 'employees.id',
        },
      },
    };
  }
}
```

- [ ] **Step 5: Регистрация в Tenancy.module.ts**

В `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts` добавить импорты после `CostAllocationRule`:

```ts
import { Employee } from '@/modules/Payroll/models/Employee.model';
import { PayrollRun } from '@/modules/Payroll/models/PayrollRun.model';
import { PayrollRunLine } from '@/modules/Payroll/models/PayrollRunLine.model';
```

И в массив `models` (после `CostAllocationRule,`):

```ts
  Employee,
  PayrollRun,
  PayrollRunLine,
```

- [ ] **Step 6: Typecheck + commit**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: 0 ошибок.

```bash
git add packages/server/src/modules/Payroll packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts
git commit -m "feat(server): payroll models and constants"
```

---

### Task 4: Чистые функции расчёта (TDD)

**Files:**
- Create: `packages/server/src/modules/Payroll/utils/computePayrollLine.ts`
- Create: `packages/server/src/modules/Payroll/utils/summarizeRun.ts`
- Create: `packages/server/src/modules/Payroll/utils/payrollTaxDate.ts`
- Test: `*.spec.ts` рядом с каждым

- [ ] **Step 1: Падающий тест computePayrollLine.spec.ts**

```ts
// © 2026 Bigfin
import { computePayrollLine } from './computePayrollLine';
import { PAYROLL_SETTINGS_DEFAULTS } from '../constants';

const S = PAYROLL_SETTINGS_DEFAULTS; // 13% НДФЛ, 30% взносы, standard

describe('computePayrollLine', () => {
  it('штатный, стандартные взносы: НДФЛ 13%, взносы 30%', () => {
    const r = computePayrollLine(
      { employmentType: 'staff', baseAmount: 100000, bonusAmount: 0, deductionAmount: 0 },
      S,
    );
    expect(r.ndflAmount).toBe(13000);
    expect(r.contributionsAmount).toBe(30000);
    expect(r.netAmount).toBe(87000);
    expect(r.totalCost).toBe(130000);
  });

  it('штатный, режим МСП: 30% до порога + 15% сверх', () => {
    const msp = { ...S, contribMode: 'msp' as const, mspThreshold: 40000 };
    const r = computePayrollLine(
      { employmentType: 'staff', baseAmount: 100000, bonusAmount: 0, deductionAmount: 0 },
      msp,
    );
    // 40000×30% + 60000×15% = 12000 + 9000
    expect(r.contributionsAmount).toBe(21000);
  });

  it('МСП ниже порога: вся сумма по 30%', () => {
    const msp = { ...S, contribMode: 'msp' as const, mspThreshold: 40000 };
    const r = computePayrollLine(
      { employmentType: 'staff', baseAmount: 30000, bonusAmount: 0, deductionAmount: 0 },
      msp,
    );
    expect(r.contributionsAmount).toBe(9000);
  });

  it('ГПХ считается как штатный (НДФЛ + взносы)', () => {
    const r = computePayrollLine(
      { employmentType: 'gph', baseAmount: 50000, bonusAmount: 0, deductionAmount: 0 },
      S,
    );
    expect(r.ndflAmount).toBe(6500);
    expect(r.contributionsAmount).toBe(15000);
  });

  it('самозанятый и ИП: без НДФЛ и взносов, на руки = gross − удержание', () => {
    for (const t of ['npd', 'ip'] as const) {
      const r = computePayrollLine(
        { employmentType: t, baseAmount: 80000, bonusAmount: 5000, deductionAmount: 1000 },
        S,
      );
      expect(r.ndflAmount).toBe(0);
      expect(r.contributionsAmount).toBe(0);
      expect(r.netAmount).toBe(84000);
      expect(r.totalCost).toBe(85000);
    }
  });

  it('премия входит в базу, удержание — после налогов', () => {
    const r = computePayrollLine(
      { employmentType: 'staff', baseAmount: 100000, bonusAmount: 20000, deductionAmount: 5000 },
      S,
    );
    expect(r.ndflAmount).toBe(15600); // 120000 × 13%
    expect(r.netAmount).toBe(99400); // 120000 − 15600 − 5000
  });

  it('NaN-safe: нечисловые входы трактуются как 0', () => {
    const r = computePayrollLine(
      {
        employmentType: 'staff',
        baseAmount: 'abc' as any,
        bonusAmount: undefined as any,
        deductionAmount: NaN,
      },
      S,
    );
    expect(r.netAmount).toBe(0);
    expect(r.totalCost).toBe(0);
  });

  it('округляет до копеек', () => {
    const r = computePayrollLine(
      { employmentType: 'staff', baseAmount: 33333.33, bonusAmount: 0, deductionAmount: 0 },
      S,
    );
    expect(r.ndflAmount).toBe(4333.33); // 4333.3329 → 4333.33
  });
});
```

- [ ] **Step 2: Запустить — FAIL (модуль не существует)**

Run: `pnpm --filter @bigfin/server test -- src/modules/Payroll/utils/computePayrollLine.spec.ts`
Expected: FAIL — Cannot find module './computePayrollLine'.

- [ ] **Step 3: Реализация computePayrollLine.ts**

```ts
// © 2026 Bigfin
import { PayrollSettingsValues } from '../constants';

export interface PayrollLineInput {
  employmentType: string;
  baseAmount: number;
  bonusAmount: number;
  deductionAmount: number;
}

export interface PayrollLineComputed {
  grossAmount: number;
  ndflAmount: number;
  contributionsAmount: number;
  netAmount: number;
  totalCost: number;
}

const TAXABLE_TYPES = ['staff', 'gph'];

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Расчёт строки начисления. Налоги — упрощённо по ставкам из настроек
 * (без годовых накопленных баз, см. спеку §5). Удержание — после налогов.
 */
export function computePayrollLine(
  input: PayrollLineInput,
  settings: PayrollSettingsValues,
): PayrollLineComputed {
  const base = toNumber(input.baseAmount);
  const bonus = toNumber(input.bonusAmount);
  const deduction = toNumber(input.deductionAmount);
  const gross = round2(base + bonus);

  let ndfl = 0;
  let contributions = 0;

  if (TAXABLE_TYPES.includes(input.employmentType)) {
    ndfl = round2((gross * toNumber(settings.ndflRate)) / 100);

    if (settings.contribMode === 'msp') {
      const threshold = toNumber(settings.mspThreshold);
      const below = Math.min(gross, threshold);
      const above = Math.max(0, gross - threshold);
      contributions = round2(
        (below * toNumber(settings.contribRate)) / 100 +
          (above * toNumber(settings.mspRate)) / 100,
      );
    } else {
      contributions = round2((gross * toNumber(settings.contribRate)) / 100);
    }
  }
  return {
    grossAmount: gross,
    ndflAmount: ndfl,
    contributionsAmount: contributions,
    netAmount: round2(gross - ndfl - deduction),
    totalCost: round2(gross + contributions),
  };
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `pnpm --filter @bigfin/server test -- src/modules/Payroll/utils/computePayrollLine.spec.ts`
Expected: PASS (8 passed).

- [ ] **Step 5: Падающие тесты summarizeRun + payrollTaxDate**

```ts
// © 2026 Bigfin
// packages/server/src/modules/Payroll/utils/summarizeRun.spec.ts
import { summarizeRun } from './summarizeRun';

describe('summarizeRun', () => {
  it('суммирует строки', () => {
    const totals = summarizeRun([
      { ndflAmount: 13000, contributionsAmount: 30000, netAmount: 87000, totalCost: 130000 },
      { ndflAmount: 6500, contributionsAmount: 15000, netAmount: 43500, totalCost: 65000 },
    ] as any);
    expect(totals).toEqual({
      totalNdfl: 19500,
      totalContributions: 45000,
      totalNet: 130500,
      totalCost: 195000,
    });
  });

  it('пустой список → нули', () => {
    expect(summarizeRun([])).toEqual({
      totalNdfl: 0,
      totalContributions: 0,
      totalNet: 0,
      totalCost: 0,
    });
  });

  it('NaN-safe', () => {
    const totals = summarizeRun([{ ndflAmount: 'x' } as any]);
    expect(totals.totalNdfl).toBe(0);
  });
});
```

```ts
// © 2026 Bigfin
// packages/server/src/modules/Payroll/utils/payrollTaxDate.spec.ts
import { payrollTaxDate } from './payrollTaxDate';

describe('payrollTaxDate', () => {
  it('28-е следующего месяца', () => {
    expect(payrollTaxDate('2026-06-01')).toBe('2026-07-28');
  });

  it('декабрь → январь следующего года', () => {
    expect(payrollTaxDate('2026-12-01')).toBe('2027-01-28');
  });
});
```

Run: `pnpm --filter @bigfin/server test -- src/modules/Payroll/utils`
Expected: FAIL — модули не найдены.

- [ ] **Step 6: Реализация**

```ts
// © 2026 Bigfin
// packages/server/src/modules/Payroll/utils/summarizeRun.ts
const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface RunTotals {
  totalNdfl: number;
  totalContributions: number;
  totalNet: number;
  totalCost: number;
}

interface SummarizableLine {
  ndflAmount: number;
  contributionsAmount: number;
  netAmount: number;
  totalCost: number;
}

export function summarizeRun(lines: SummarizableLine[]): RunTotals {
  return {
    totalNdfl: round2(lines.reduce((s, l) => s + toNumber(l.ndflAmount), 0)),
    totalContributions: round2(
      lines.reduce((s, l) => s + toNumber(l.contributionsAmount), 0),
    ),
    totalNet: round2(lines.reduce((s, l) => s + toNumber(l.netAmount), 0)),
    totalCost: round2(lines.reduce((s, l) => s + toNumber(l.totalCost), 0)),
  };
}
```

```ts
// © 2026 Bigfin
// packages/server/src/modules/Payroll/utils/payrollTaxDate.ts
import * as moment from 'moment';

/** Плановая дата уплаты НДФЛ/взносов: 28-е месяца, следующего за месяцем начисления (ЕНП). */
export function payrollTaxDate(periodMonth: string): string {
  return moment(periodMonth).add(1, 'month').date(28).format('YYYY-MM-DD');
}
```

- [ ] **Step 7: Запустить — все utils зелёные**

Run: `pnpm --filter @bigfin/server test -- src/modules/Payroll/utils`
Expected: PASS (13 passed).

- [ ] **Step 8: Commit**

```bash
git add packages/server/src/modules/Payroll/utils
git commit -m "feat(server): payroll pure calculation functions"
```

---

### Task 5: Сервис настроек PayrollSettings

**Files:**
- Create: `packages/server/src/modules/Payroll/PayrollSettings.service.ts`

- [ ] **Step 1: Реализация** (паттерн `AccountsSettings.service.ts`)

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { PAYROLL_SETTINGS_DEFAULTS, PayrollSettingsValues } from './constants';

const GROUP = 'payroll';

@Injectable()
export class PayrollSettingsService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
  ) {}

  /**
   * Ставки и параметры ФОТ из Settings group `payroll`;
   * отсутствующие ключи закрываются дефолтами (см. спеку §6).
   */
  public async getSettings(): Promise<PayrollSettingsValues> {
    const store = await this.settingsStore();
    const D = PAYROLL_SETTINGS_DEFAULTS;

    const num = (key: string, fallback: number): number => {
      const raw = store.get({ group: GROUP, key }, fallback);
      const n = Number(raw);
      return Number.isFinite(n) ? n : fallback;
    };
    const numOrNull = (key: string): number | null => {
      const raw = store.get({ group: GROUP, key }, null);
      const n = Number(raw);
      return raw != null && Number.isFinite(n) && n > 0 ? n : null;
    };

    return {
      ndflRate: num('ndfl_rate', D.ndflRate),
      contribMode:
        store.get({ group: GROUP, key: 'contrib_mode' }, D.contribMode) ===
        'msp'
          ? 'msp'
          : 'standard',
      contribRate: num('contrib_rate', D.contribRate),
      mspRate: num('msp_rate', D.mspRate),
      mspThreshold: num('msp_threshold', D.mspThreshold),
      payrollArticleId: numOrNull('payroll_article_id'),
      taxesArticleId: numOrNull('taxes_article_id'),
    };
  }
}
```

Сохранение настроек — существующий `PUT /settings` с `options: [{ group: 'payroll', key: 'ndfl_rate', value: '13' }, …]`, новых эндпоинтов записи не нужно.

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: 0 ошибок.

```bash
git add packages/server/src/modules/Payroll/PayrollSettings.service.ts
git commit -m "feat(server): payroll settings service over generic settings store"
```

---

### Task 6: DTO

**Files:**
- Create: `packages/server/src/modules/Payroll/dtos/Employee.dto.ts`
- Create: `packages/server/src/modules/Payroll/dtos/PayrollRun.dto.ts`
- Create: `packages/server/src/modules/Payroll/dtos/GetPayrollRunsQuery.dto.ts`

- [ ] **Step 1: Employee.dto.ts** (стиль `PaymentRequest.dto.ts`)

```ts
// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsString, Min } from 'class-validator';
import { EMPLOYMENT_TYPES } from '../constants';

class CommandEmployeeDto {
  @IsString()
  @ApiProperty({ example: 'Иванова Мария Петровна', description: 'ФИО' })
  fullName: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Менеджер по продажам' })
  position?: string;

  @IsIn(EMPLOYMENT_TYPES as unknown as string[])
  @ApiProperty({ example: 'staff', description: 'staff|gph|npd|ip' })
  employmentType: string;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 100000, description: 'Оклад по умолчанию' })
  defaultSalary?: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ example: true })
  active?: boolean;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Работает с 2024 года' })
  note?: string;
}

export class CreateEmployeeDto extends CommandEmployeeDto {}
export class EditEmployeeDto extends CommandEmployeeDto {}
```

- [ ] **Step 2: PayrollRun.dto.ts**

```ts
// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PayrollRunLineDto {
  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 1, description: 'Employee id' })
  employeeId: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 100000, description: 'Оклад за месяц' })
  baseAmount: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 20000, description: 'Премия' })
  bonusAmount?: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 0, description: 'Удержание' })
  deductionAmount?: number;
}

export class CreatePayrollRunDto {
  @IsDateString()
  @ApiProperty({ example: '2026-06-01', description: 'Месяц начисления' })
  periodMonth: string;

  @IsDateString()
  @ApiProperty({ example: '2026-07-05', description: 'Дата выплаты' })
  payDate: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Июнь 2026' })
  note?: string;
}

export class EditPayrollRunDto {
  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({ example: '2026-07-05', description: 'Дата выплаты' })
  payDate?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Июнь 2026' })
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollRunLineDto)
  @IsOptional()
  @ApiPropertyOptional({ type: [PayrollRunLineDto] })
  lines?: PayrollRunLineDto[];
}
```

- [ ] **Step 3: GetPayrollRunsQuery.dto.ts**

```ts
// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class GetPayrollRunsQueryDto {
  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 2026, description: 'Фильтр по году' })
  year?: number;
}
```

- [ ] **Step 4: Typecheck + commit**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: 0 ошибок.

```bash
git add packages/server/src/modules/Payroll/dtos
git commit -m "feat(server): payroll dtos"
```

---

### Task 7: Валидаторы (TDD)

**Files:**
- Create: `packages/server/src/modules/Payroll/commands/CommandEmployeeValidator.service.ts` (+ `.spec.ts`)
- Create: `packages/server/src/modules/Payroll/commands/CommandPayrollRunValidator.service.ts` (+ `.spec.ts`)

- [ ] **Step 1: Падающий тест CommandEmployeeValidator.service.spec.ts**

```ts
// © 2026 Bigfin
import { CommandEmployeeValidatorService } from './CommandEmployeeValidator.service';

describe('CommandEmployeeValidatorService', () => {
  const v = new CommandEmployeeValidatorService();

  it('пропускает корректного сотрудника', () => {
    expect(() =>
      v.validate({ fullName: 'Иванова М.', employmentType: 'staff', defaultSalary: 100000 }),
    ).not.toThrow();
  });

  it('бросает на пустом ФИО', () => {
    expect(() =>
      v.validate({ fullName: '   ', employmentType: 'staff' }),
    ).toThrow(expect.objectContaining({ errorType: 'INVALID_FULL_NAME' }));
  });

  it('бросает на неизвестном типе занятости', () => {
    expect(() =>
      v.validate({ fullName: 'Иванова М.', employmentType: 'freelancer' }),
    ).toThrow(expect.objectContaining({ errorType: 'INVALID_EMPLOYMENT_TYPE' }));
  });

  it('бросает на отрицательном окладе', () => {
    expect(() =>
      v.validate({ fullName: 'Иванова М.', employmentType: 'staff', defaultSalary: -1 }),
    ).toThrow(expect.objectContaining({ errorType: 'INVALID_AMOUNT' }));
  });
});
```

- [ ] **Step 2: Падающий тест CommandPayrollRunValidator.service.spec.ts**

```ts
// © 2026 Bigfin
import { CommandPayrollRunValidatorService } from './CommandPayrollRunValidator.service';

describe('CommandPayrollRunValidatorService', () => {
  const v = new CommandPayrollRunValidatorService();

  it('пропускает корректные строки', () => {
    expect(() =>
      v.validateLines([
        { employeeId: 1, baseAmount: 100000, bonusAmount: 0, deductionAmount: 0 },
        { employeeId: 2, baseAmount: 50000 },
      ]),
    ).not.toThrow();
  });

  it('бросает на дубле сотрудника в строках', () => {
    expect(() =>
      v.validateLines([
        { employeeId: 1, baseAmount: 1 },
        { employeeId: 1, baseAmount: 2 },
      ]),
    ).toThrow(expect.objectContaining({ errorType: 'DUPLICATE_EMPLOYEE_LINES' }));
  });

  it('бросает на отрицательной/нечисловой сумме', () => {
    expect(() => v.validateLines([{ employeeId: 1, baseAmount: -5 }])).toThrow(
      expect.objectContaining({ errorType: 'INVALID_AMOUNT' }),
    );
    expect(() =>
      v.validateLines([{ employeeId: 1, baseAmount: 'x' as any }]),
    ).toThrow(expect.objectContaining({ errorType: 'INVALID_AMOUNT' }));
  });

  it('validateDraft бросает, если статус не draft', () => {
    expect(() => v.validateDraft({ status: 'approved' } as any)).toThrow(
      expect.objectContaining({ errorType: 'PAYROLL_RUN_NOT_DRAFT' }),
    );
    expect(() => v.validateDraft({ status: 'draft' } as any)).not.toThrow();
  });
});
```

Run: `pnpm --filter @bigfin/server test -- src/modules/Payroll/commands`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализация CommandEmployeeValidator.service.ts**

```ts
// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { EMPLOYMENT_TYPES, ERRORS } from '../constants';

@Injectable()
export class CommandEmployeeValidatorService {
  public validate(dto: {
    fullName?: string;
    employmentType?: string;
    defaultSalary?: number;
  }) {
    if (!dto.fullName || !dto.fullName.trim()) {
      throw new ServiceError(ERRORS.INVALID_FULL_NAME);
    }
    if (!EMPLOYMENT_TYPES.includes(dto.employmentType as any)) {
      throw new ServiceError(ERRORS.INVALID_EMPLOYMENT_TYPE);
    }
    if (dto.defaultSalary != null) {
      const n = Number(dto.defaultSalary);
      if (!Number.isFinite(n) || n < 0) {
        throw new ServiceError(ERRORS.INVALID_AMOUNT);
      }
    }
  }
}
```

- [ ] **Step 4: Реализация CommandPayrollRunValidator.service.ts**

```ts
// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS } from '../constants';
import { PayrollRunLineDto } from '../dtos/PayrollRun.dto';

@Injectable()
export class CommandPayrollRunValidatorService {
  /** Строки: суммы конечные и неотрицательные, сотрудники без дублей. */
  public validateLines(lines: PayrollRunLineDto[]) {
    const seen = new Set<number>();

    for (const line of lines) {
      if (seen.has(line.employeeId)) {
        throw new ServiceError(ERRORS.DUPLICATE_EMPLOYEE_LINES);
      }
      seen.add(line.employeeId);

      for (const amount of [
        line.baseAmount,
        line.bonusAmount ?? 0,
        line.deductionAmount ?? 0,
      ]) {
        const n = Number(amount);
        if (!Number.isFinite(n) || n < 0) {
          throw new ServiceError(ERRORS.INVALID_AMOUNT);
        }
      }
    }
  }

  /** Мутации допустимы только в черновике. */
  public validateDraft(run: { status: string }) {
    if (run.status !== 'draft') {
      throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_DRAFT);
    }
  }
}
```

- [ ] **Step 5: Запустить — PASS**

Run: `pnpm --filter @bigfin/server test -- src/modules/Payroll/commands`
Expected: PASS (8 passed).

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/modules/Payroll/commands
git commit -m "feat(server): payroll command validators"
```

---

### Task 8: Сервисы сотрудников

**Files:**
- Create: `packages/server/src/modules/Payroll/queries/GetEmployees.service.ts`
- Create: `packages/server/src/modules/Payroll/commands/CreateEmployee.service.ts`
- Create: `packages/server/src/modules/Payroll/commands/EditEmployee.service.ts`
- Create: `packages/server/src/modules/Payroll/commands/DeleteEmployee.service.ts`

- [ ] **Step 1: GetEmployees.service.ts**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Employee } from '../models/Employee.model';

@Injectable()
export class GetEmployeesService {
  constructor(
    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,
  ) {}

  public async getEmployees(activeOnly?: boolean) {
    const query = this.employeeModel().query().orderBy('fullName');
    if (activeOnly) query.modify('activeOnly');
    return query;
  }
}
```

- [ ] **Step 2: CreateEmployee.service.ts**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Employee } from '../models/Employee.model';
import { CreateEmployeeDto } from '../dtos/Employee.dto';
import { CommandEmployeeValidatorService } from './CommandEmployeeValidator.service';

@Injectable()
export class CreateEmployeeService {
  constructor(
    private readonly validator: CommandEmployeeValidatorService,

    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,
  ) {}

  public async create(dto: CreateEmployeeDto) {
    this.validator.validate(dto);

    return this.employeeModel()
      .query()
      .insert({
        fullName: dto.fullName.trim(),
        position: dto.position || null,
        employmentType: dto.employmentType,
        defaultSalary: dto.defaultSalary ?? 0,
        active: dto.active ?? true,
        note: dto.note || null,
      } as any);
  }
}
```

- [ ] **Step 3: EditEmployee.service.ts**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Employee } from '../models/Employee.model';
import { EditEmployeeDto } from '../dtos/Employee.dto';
import { ERRORS } from '../constants';
import { CommandEmployeeValidatorService } from './CommandEmployeeValidator.service';

@Injectable()
export class EditEmployeeService {
  constructor(
    private readonly validator: CommandEmployeeValidatorService,

    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,
  ) {}

  public async edit(id: number, dto: EditEmployeeDto) {
    const employee = await this.employeeModel().query().findById(id);
    if (!employee) throw new ServiceError(ERRORS.EMPLOYEE_NOT_FOUND);

    this.validator.validate(dto);

    await this.employeeModel()
      .query()
      .findById(id)
      .patch({
        fullName: dto.fullName.trim(),
        position: dto.position || null,
        employmentType: dto.employmentType,
        defaultSalary: dto.defaultSalary ?? 0,
        active: dto.active ?? true,
        note: dto.note || null,
      } as any);

    return this.employeeModel().query().findById(id);
  }
}
```

- [ ] **Step 4: DeleteEmployee.service.ts**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Employee } from '../models/Employee.model';
import { PayrollRunLine } from '../models/PayrollRunLine.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteEmployeeService {
  constructor(
    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,

    @Inject(PayrollRunLine.name)
    private readonly lineModel: TenantModelProxy<typeof PayrollRunLine>,
  ) {}

  /** Удаление запрещено при наличии строк начислений — фронт предложит архивировать. */
  public async delete(id: number) {
    const employee = await this.employeeModel().query().findById(id);
    if (!employee) throw new ServiceError(ERRORS.EMPLOYEE_NOT_FOUND);

    const usedCount = await this.lineModel()
      .query()
      .where('employeeId', id)
      .resultSize();
    if (usedCount > 0) {
      throw new ServiceError(ERRORS.EMPLOYEE_HAS_PAYROLL_LINES);
    }
    await this.employeeModel().query().deleteById(id);
  }
}
```

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: 0 ошибок.

```bash
git add packages/server/src/modules/Payroll
git commit -m "feat(server): employee crud services"
```

---

### Task 9: Сервисы начислений — create/edit/delete

**Files:**
- Create: `packages/server/src/modules/Payroll/commands/CreatePayrollRun.service.ts`
- Create: `packages/server/src/modules/Payroll/commands/EditPayrollRun.service.ts`
- Create: `packages/server/src/modules/Payroll/commands/DeletePayrollRun.service.ts`

- [ ] **Step 1: CreatePayrollRun.service.ts** — нормализация месяца, проверка уникальности, строки-заготовки по активным сотрудникам

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Employee } from '../models/Employee.model';
import { PayrollRun } from '../models/PayrollRun.model';
import { PayrollRunLine } from '../models/PayrollRunLine.model';
import { CreatePayrollRunDto } from '../dtos/PayrollRun.dto';
import { ERRORS } from '../constants';
import { computePayrollLine } from '../utils/computePayrollLine';
import { PayrollSettingsService } from '../PayrollSettings.service';

@Injectable()
export class CreatePayrollRunService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly payrollSettings: PayrollSettingsService,

    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,

    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,

    @Inject(PayrollRunLine.name)
    private readonly lineModel: TenantModelProxy<typeof PayrollRunLine>,
  ) {}

  /** Создаёт черновик начисления и заполняет строки активными сотрудниками. */
  public async create(dto: CreatePayrollRunDto) {
    const periodMonth = moment(dto.periodMonth)
      .startOf('month')
      .format('YYYY-MM-DD');

    const existing = await this.runModel()
      .query()
      .findOne({ periodMonth });
    if (existing) throw new ServiceError(ERRORS.PAYROLL_RUN_MONTH_EXISTS);

    const employees: any[] = await this.employeeModel()
      .query()
      .modify('activeOnly')
      .orderBy('fullName');
    const settings = await this.payrollSettings.getSettings();

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const run: any = await this.runModel()
        .query(trx)
        .insert({
          periodMonth,
          payDate: moment(dto.payDate).format('YYYY-MM-DD'),
          status: 'draft',
          note: dto.note || null,
        } as any);

      for (const employee of employees) {
        const computed = computePayrollLine(
          {
            employmentType: employee.employmentType,
            baseAmount: employee.defaultSalary,
            bonusAmount: 0,
            deductionAmount: 0,
          },
          settings,
        );
        await this.lineModel()
          .query(trx)
          .insert({
            runId: run.id,
            employeeId: employee.id,
            employmentType: employee.employmentType,
            baseAmount: Number(employee.defaultSalary) || 0,
            bonusAmount: 0,
            deductionAmount: 0,
            ndflAmount: computed.ndflAmount,
            contributionsAmount: computed.contributionsAmount,
            netAmount: computed.netAmount,
            totalCost: computed.totalCost,
          } as any);
      }
      return run;
    });
  }
}
```

- [ ] **Step 2: EditPayrollRun.service.ts** — только draft; строки пересчитываются на сервере по текущим настройкам и текущему типу занятости сотрудника

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Employee } from '../models/Employee.model';
import { PayrollRun } from '../models/PayrollRun.model';
import { PayrollRunLine } from '../models/PayrollRunLine.model';
import { EditPayrollRunDto } from '../dtos/PayrollRun.dto';
import { ERRORS } from '../constants';
import { computePayrollLine } from '../utils/computePayrollLine';
import { PayrollSettingsService } from '../PayrollSettings.service';
import { CommandPayrollRunValidatorService } from './CommandPayrollRunValidator.service';

@Injectable()
export class EditPayrollRunService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly payrollSettings: PayrollSettingsService,
    private readonly validator: CommandPayrollRunValidatorService,

    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,

    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,

    @Inject(PayrollRunLine.name)
    private readonly lineModel: TenantModelProxy<typeof PayrollRunLine>,
  ) {}

  public async edit(id: number, dto: EditPayrollRunDto) {
    const run: any = await this.runModel().query().findById(id);
    if (!run) throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_FOUND);
    this.validator.validateDraft(run);

    if (dto.lines) this.validator.validateLines(dto.lines);
    const settings = await this.payrollSettings.getSettings();

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.runModel()
        .query(trx)
        .findById(id)
        .patch({
          ...(dto.payDate
            ? { payDate: moment(dto.payDate).format('YYYY-MM-DD') }
            : {}),
          ...(dto.note !== undefined ? { note: dto.note || null } : {}),
        } as any);

      if (dto.lines) {
        await this.lineModel().query(trx).where('runId', id).delete();

        for (const line of dto.lines) {
          const employee: any = await this.employeeModel()
            .query(trx)
            .findById(line.employeeId);
          if (!employee) throw new ServiceError(ERRORS.EMPLOYEE_NOT_FOUND);

          const computed = computePayrollLine(
            {
              employmentType: employee.employmentType,
              baseAmount: line.baseAmount,
              bonusAmount: line.bonusAmount ?? 0,
              deductionAmount: line.deductionAmount ?? 0,
            },
            settings,
          );
          await this.lineModel()
            .query(trx)
            .insert({
              runId: id,
              employeeId: line.employeeId,
              employmentType: employee.employmentType,
              baseAmount: Number(line.baseAmount) || 0,
              bonusAmount: Number(line.bonusAmount) || 0,
              deductionAmount: Number(line.deductionAmount) || 0,
              ndflAmount: computed.ndflAmount,
              contributionsAmount: computed.contributionsAmount,
              netAmount: computed.netAmount,
              totalCost: computed.totalCost,
            } as any);
        }
      }
      return this.runModel().query(trx).findById(id);
    });
  }
}
```

- [ ] **Step 3: DeletePayrollRun.service.ts**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { PayrollRun } from '../models/PayrollRun.model';
import { PayrollRunLine } from '../models/PayrollRunLine.model';
import { ERRORS } from '../constants';
import { CommandPayrollRunValidatorService } from './CommandPayrollRunValidator.service';

@Injectable()
export class DeletePayrollRunService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandPayrollRunValidatorService,

    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,

    @Inject(PayrollRunLine.name)
    private readonly lineModel: TenantModelProxy<typeof PayrollRunLine>,
  ) {}

  /** Удаляется только черновик (FK на строки — CASCADE, но чистим явно). */
  public async delete(id: number) {
    const run: any = await this.runModel().query().findById(id);
    if (!run) throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_FOUND);
    this.validator.validateDraft(run);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.lineModel().query(trx).where('runId', id).delete();
      await this.runModel().query(trx).deleteById(id);
    });
  }
}
```

- [ ] **Step 4: Typecheck + commit**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: 0 ошибок.

```bash
git add packages/server/src/modules/Payroll/commands
git commit -m "feat(server): payroll run create/edit/delete services"
```

---

### Task 10: Approve/Unapprove → платёжный календарь (TDD)

**Files:**
- Create: `packages/server/src/modules/Payroll/commands/ApprovePayrollRun.service.ts`
- Create: `packages/server/src/modules/Payroll/commands/UnapprovePayrollRun.service.ts`
- Test: `packages/server/src/modules/Payroll/commands/ApprovePayrollRun.service.spec.ts`

- [ ] **Step 1: Падающий тест** (мок-стиль `ApprovePaymentRequest.service.spec.ts` — thenable + jest.fn)

```ts
// © 2026 Bigfin
import { ApprovePayrollRunService } from './ApprovePayrollRun.service';

const runRow = {
  id: 5,
  status: 'draft',
  periodMonth: '2026-06-01',
  payDate: '2026-07-05',
};
const lines = [
  { ndflAmount: 13000, contributionsAmount: 30000, netAmount: 87000, totalCost: 130000 },
  { ndflAmount: 0, contributionsAmount: 0, netAmount: 50000, totalCost: 50000 },
];

function makeService(row = runRow, lineRows = lines) {
  const patch = jest.fn().mockResolvedValue(undefined);
  const findByIdResult: any = {
    patch,
    withGraphFetched: () =>
      Promise.resolve({ ...row, lines: lineRows }),
    then: (resolve: any, reject: any) =>
      Promise.resolve(row).then(resolve, reject),
  };
  const runModel = () => ({ query: () => ({ findById: () => findByIdResult }) });

  const insert = jest.fn().mockResolvedValue({ id: 1 });
  const del = jest.fn().mockResolvedValue(1);
  const operationModel = () => ({
    query: () => ({
      insert,
      where: () => ({ where: () => ({ delete: del }) }),
    }),
  });

  const lineModel = () => ({
    query: () => ({ where: () => Promise.resolve(lineRows) }),
  });

  const uow = { withTransaction: async (work: any) => work({}) };
  const settings = {
    getSettings: async () => ({ payrollArticleId: 7, taxesArticleId: 8 }),
  };

  const service = new ApprovePayrollRunService(
    uow as any,
    settings as any,
    runModel as any,
    lineModel as any,
    operationModel as any,
  );
  return { service, insert, patch };
}

describe('ApprovePayrollRunService', () => {
  it('создаёт 3 плановых оттока (выплата, НДФЛ, взносы) и помечает approved', async () => {
    const { service, insert, patch } = makeService();

    await service.approve(5);

    expect(insert).toHaveBeenCalledTimes(3);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'outflow',
        amount: 137000, // totalNet
        plannedDate: '2026-07-05',
        sourceType: 'payroll_run',
        sourceId: 5,
        articleId: 7,
      }),
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 13000, plannedDate: '2026-07-28', articleId: 8 }),
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 30000, plannedDate: '2026-07-28', articleId: 8 }),
    );
    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' }),
    );
  });

  it('пропускает нулевые операции (нет налогов — нет оттоков налогов)', async () => {
    const { service, insert } = makeService(runRow, [
      { ndflAmount: 0, contributionsAmount: 0, netAmount: 50000, totalCost: 50000 },
    ]);
    await service.approve(5);
    expect(insert).toHaveBeenCalledTimes(1); // только выплата
  });

  it('бросает, если начисление не в черновике', async () => {
    const { service } = makeService({ ...runRow, status: 'approved' });
    await expect(service.approve(5)).rejects.toMatchObject({
      errorType: 'PAYROLL_RUN_NOT_DRAFT',
    });
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `pnpm --filter @bigfin/server test -- src/modules/Payroll/commands/ApprovePayrollRun.service.spec.ts`
Expected: FAIL — Cannot find module './ApprovePayrollRun.service'.

- [ ] **Step 3: ApprovePayrollRun.service.ts**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { PayrollRun } from '../models/PayrollRun.model';
import { PayrollRunLine } from '../models/PayrollRunLine.model';
import { ERRORS, PAYROLL_CURRENCY, PAYROLL_SOURCE } from '../constants';
import { summarizeRun } from '../utils/summarizeRun';
import { payrollTaxDate } from '../utils/payrollTaxDate';
import { PayrollSettingsService } from '../PayrollSettings.service';

@Injectable()
export class ApprovePayrollRunService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly payrollSettings: PayrollSettingsService,

    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,

    @Inject(PayrollRunLine.name)
    private readonly lineModel: TenantModelProxy<typeof PayrollRunLine>,

    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  /**
   * Проводит начисление: статус approved + до 3 плановых оттоков в календаре
   * (выплата на дату выплаты; НДФЛ и взносы — на 28-е следующего месяца).
   */
  public async approve(id: number) {
    const run: any = await this.runModel().query().findById(id);
    if (!run) throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_FOUND);
    if (run.status !== 'draft') {
      throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_DRAFT);
    }
    const lines: any[] = await this.lineModel()
      .query()
      .where('runId', id);
    const totals = summarizeRun(lines);
    const settings = await this.payrollSettings.getSettings();

    const period = moment(run.periodMonth).format('MM.YYYY');
    const taxDate = payrollTaxDate(run.periodMonth);

    const operations = [
      {
        amount: totals.totalNet,
        plannedDate: moment(run.payDate).format('YYYY-MM-DD'),
        articleId: settings.payrollArticleId,
        description: `Зарплата за ${period}`,
      },
      {
        amount: totals.totalNdfl,
        plannedDate: taxDate,
        articleId: settings.taxesArticleId,
        description: `НДФЛ за ${period}`,
      },
      {
        amount: totals.totalContributions,
        plannedDate: taxDate,
        articleId: settings.taxesArticleId,
        description: `Страховые взносы за ${period}`,
      },
    ].filter((op) => op.amount > 0);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      for (const op of operations) {
        await this.operationModel()
          .query(trx)
          .insert({
            direction: 'outflow',
            amount: op.amount,
            currencyCode: PAYROLL_CURRENCY,
            plannedDate: op.plannedDate,
            articleId: op.articleId,
            status: 'confirmed',
            sourceType: PAYROLL_SOURCE,
            sourceId: run.id,
            description: op.description,
          } as any);
      }
      await this.runModel()
        .query(trx)
        .findById(id)
        .patch({ status: 'approved' } as any);

      return this.runModel().query(trx).findById(id);
    });
  }
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `pnpm --filter @bigfin/server test -- src/modules/Payroll/commands/ApprovePayrollRun.service.spec.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: UnapprovePayrollRun.service.ts**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { PayrollRun } from '../models/PayrollRun.model';
import { ERRORS, PAYROLL_SOURCE } from '../constants';

@Injectable()
export class UnapprovePayrollRunService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,

    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  /** Возврат в черновик: удаляет связанные плановые операции календаря. */
  public async unapprove(id: number) {
    const run: any = await this.runModel().query().findById(id);
    if (!run) throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_FOUND);
    if (run.status !== 'approved') {
      throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_APPROVED);
    }
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.operationModel()
        .query(trx)
        .where('sourceType', PAYROLL_SOURCE)
        .where('sourceId', id)
        .delete();

      await this.runModel()
        .query(trx)
        .findById(id)
        .patch({ status: 'draft' } as any);

      return this.runModel().query(trx).findById(id);
    });
  }
}
```

- [ ] **Step 6: Все тесты модуля + commit**

Run: `pnpm --filter @bigfin/server test -- src/modules/Payroll`
Expected: PASS (все).

```bash
git add packages/server/src/modules/Payroll/commands
git commit -m "feat(server): payroll approve/unapprove with planned operations"
```

---

### Task 11: Запросы — runs, run, налоги к уплате (TDD для сводки)

**Files:**
- Create: `packages/server/src/modules/Payroll/queries/GetPayrollRuns.service.ts`
- Create: `packages/server/src/modules/Payroll/queries/GetPayrollRun.service.ts`
- Create: `packages/server/src/modules/Payroll/queries/GetPayrollTaxesSummary.service.ts` (+ `.spec.ts`)

- [ ] **Step 1: GetPayrollRuns.service.ts** — список с итогами

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PayrollRun } from '../models/PayrollRun.model';
import { summarizeRun } from '../utils/summarizeRun';

@Injectable()
export class GetPayrollRunsService {
  constructor(
    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,
  ) {}

  public async getRuns(year?: number) {
    const query = this.runModel()
      .query()
      .withGraphFetched('lines')
      .orderBy('periodMonth', 'desc');
    if (year) query.modify('filterByYear', year);

    const runs: any[] = await query;
    return runs.map((run) => ({
      ...run,
      totals: summarizeRun(run.lines || []),
    }));
  }
}
```

- [ ] **Step 2: GetPayrollRun.service.ts** — карточка с строками и сотрудниками

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { PayrollRun } from '../models/PayrollRun.model';
import { ERRORS } from '../constants';
import { summarizeRun } from '../utils/summarizeRun';
import { payrollTaxDate } from '../utils/payrollTaxDate';

@Injectable()
export class GetPayrollRunService {
  constructor(
    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,
  ) {}

  public async getRun(id: number) {
    const run: any = await this.runModel()
      .query()
      .findById(id)
      .withGraphFetched('lines.employee');
    if (!run) throw new ServiceError(ERRORS.PAYROLL_RUN_NOT_FOUND);

    return {
      ...run,
      totals: summarizeRun(run.lines || []),
      taxDate: payrollTaxDate(run.periodMonth),
    };
  }
}
```

- [ ] **Step 3: Падающий тест GetPayrollTaxesSummary.service.spec.ts**

```ts
// © 2026 Bigfin
import { GetPayrollTaxesSummaryService } from './GetPayrollTaxesSummary.service';

describe('GetPayrollTaxesSummaryService', () => {
  it('группирует проведённые начисления по месяцам', async () => {
    const runs = [
      {
        periodMonth: '2026-05-01',
        lines: [{ ndflAmount: 13000, contributionsAmount: 30000, netAmount: 0, totalCost: 0 }],
      },
      {
        periodMonth: '2026-06-01',
        lines: [{ ndflAmount: 6500, contributionsAmount: 15000, netAmount: 0, totalCost: 0 }],
      },
    ];
    const chain: any = {
      withGraphFetched: () => chain,
      modify: () => chain,
      orderBy: () => Promise.resolve(runs),
    };
    const runModel = () => ({ query: () => chain });

    const service = new GetPayrollTaxesSummaryService(runModel as any);
    const summary = await service.getSummary(2026);

    expect(summary).toEqual([
      { month: '2026-05', ndfl: 13000, contributions: 30000, total: 43000 },
      { month: '2026-06', ndfl: 6500, contributions: 15000, total: 21500 },
    ]);
  });
});
```

Run: `pnpm --filter @bigfin/server test -- src/modules/Payroll/queries`
Expected: FAIL — модуль не найден.

- [ ] **Step 4: GetPayrollTaxesSummary.service.ts**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PayrollRun } from '../models/PayrollRun.model';
import { summarizeRun } from '../utils/summarizeRun';

const round2 = (n: number): number => Math.round(n * 100) / 100;

@Injectable()
export class GetPayrollTaxesSummaryService {
  constructor(
    @Inject(PayrollRun.name)
    private readonly runModel: TenantModelProxy<typeof PayrollRun>,
  ) {}

  /** «Налоги к уплате»: по месяцам года из проведённых начислений. */
  public async getSummary(year: number) {
    const runs: any[] = await this.runModel()
      .query()
      .withGraphFetched('lines')
      .modify('approvedOnly')
      .modify('filterByYear', year)
      .orderBy('periodMonth');

    return runs.map((run) => {
      const totals = summarizeRun(run.lines || []);
      return {
        month: moment(run.periodMonth).format('YYYY-MM'),
        ndfl: totals.totalNdfl,
        contributions: totals.totalContributions,
        total: round2(totals.totalNdfl + totals.totalContributions),
      };
    });
  }
}
```

Примечание: в тесте `modify()` и `orderBy()` мокаются цепочкой — реализация должна вызывать их в порядке `withGraphFetched → modify → modify → orderBy` (как в коде выше), иначе мок-цепочка не сойдётся.

- [ ] **Step 5: Запустить — PASS + commit**

Run: `pnpm --filter @bigfin/server test -- src/modules/Payroll/queries`
Expected: PASS.

```bash
git add packages/server/src/modules/Payroll/queries
git commit -m "feat(server): payroll queries with taxes summary"
```

---

### Task 12: Application, Controller, Module, wiring

**Files:**
- Create: `packages/server/src/modules/Payroll/Payroll.application.ts`
- Create: `packages/server/src/modules/Payroll/Payroll.controller.ts`
- Create: `packages/server/src/modules/Payroll/Payroll.module.ts`
- Modify: `packages/server/src/modules/App/App.module.ts`

- [ ] **Step 1: Payroll.application.ts** — фасад

```ts
// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetEmployeesService } from './queries/GetEmployees.service';
import { GetPayrollRunsService } from './queries/GetPayrollRuns.service';
import { GetPayrollRunService } from './queries/GetPayrollRun.service';
import { GetPayrollTaxesSummaryService } from './queries/GetPayrollTaxesSummary.service';
import { CreateEmployeeService } from './commands/CreateEmployee.service';
import { EditEmployeeService } from './commands/EditEmployee.service';
import { DeleteEmployeeService } from './commands/DeleteEmployee.service';
import { CreatePayrollRunService } from './commands/CreatePayrollRun.service';
import { EditPayrollRunService } from './commands/EditPayrollRun.service';
import { DeletePayrollRunService } from './commands/DeletePayrollRun.service';
import { ApprovePayrollRunService } from './commands/ApprovePayrollRun.service';
import { UnapprovePayrollRunService } from './commands/UnapprovePayrollRun.service';
import { PayrollSettingsService } from './PayrollSettings.service';
import { CreateEmployeeDto, EditEmployeeDto } from './dtos/Employee.dto';
import { CreatePayrollRunDto, EditPayrollRunDto } from './dtos/PayrollRun.dto';

@Injectable()
export class PayrollApplication {
  constructor(
    private readonly getEmployeesService: GetEmployeesService,
    private readonly getRunsService: GetPayrollRunsService,
    private readonly getRunService: GetPayrollRunService,
    private readonly getTaxesSummaryService: GetPayrollTaxesSummaryService,
    private readonly createEmployeeService: CreateEmployeeService,
    private readonly editEmployeeService: EditEmployeeService,
    private readonly deleteEmployeeService: DeleteEmployeeService,
    private readonly createRunService: CreatePayrollRunService,
    private readonly editRunService: EditPayrollRunService,
    private readonly deleteRunService: DeletePayrollRunService,
    private readonly approveRunService: ApprovePayrollRunService,
    private readonly unapproveRunService: UnapprovePayrollRunService,
    private readonly settingsService: PayrollSettingsService,
  ) {}

  getEmployees = (activeOnly?: boolean) =>
    this.getEmployeesService.getEmployees(activeOnly);
  createEmployee = (dto: CreateEmployeeDto) =>
    this.createEmployeeService.create(dto);
  editEmployee = (id: number, dto: EditEmployeeDto) =>
    this.editEmployeeService.edit(id, dto);
  deleteEmployee = (id: number) => this.deleteEmployeeService.delete(id);

  getRuns = (year?: number) => this.getRunsService.getRuns(year);
  getRun = (id: number) => this.getRunService.getRun(id);
  createRun = (dto: CreatePayrollRunDto) => this.createRunService.create(dto);
  editRun = (id: number, dto: EditPayrollRunDto) =>
    this.editRunService.edit(id, dto);
  deleteRun = (id: number) => this.deleteRunService.delete(id);
  approveRun = (id: number) => this.approveRunService.approve(id);
  unapproveRun = (id: number) => this.unapproveRunService.unapprove(id);

  getTaxesSummary = (year: number) =>
    this.getTaxesSummaryService.getSummary(year);
  getSettings = () => this.settingsService.getSettings();
}
```

- [ ] **Step 2: Payroll.controller.ts** — чтение всем авторизованным, запись — админ

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
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PayrollApplication } from './Payroll.application';
import { CreateEmployeeDto, EditEmployeeDto } from './dtos/Employee.dto';
import { CreatePayrollRunDto, EditPayrollRunDto } from './dtos/PayrollRun.dto';
import { GetPayrollRunsQueryDto } from './dtos/GetPayrollRunsQuery.dto';

@Controller('payroll')
@ApiTags('Payroll')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class PayrollController {
  constructor(private readonly application: PayrollApplication) {}

  // ---- Settings ----
  @Get('settings')
  @ApiOperation({ summary: 'Payroll rates settings (with defaults applied).' })
  getSettings() {
    return this.application.getSettings();
  }

  // ---- Employees ----
  @Get('employees')
  @ApiOperation({ summary: 'List employees.' })
  getEmployees(@Query('activeOnly') activeOnly?: string) {
    return this.application.getEmployees(activeOnly === 'true');
  }

  @Post('employees')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Create an employee (admin only).' })
  createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.application.createEmployee(dto);
  }

  @Put('employees/:id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Edit an employee (admin only).' })
  editEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditEmployeeDto,
  ) {
    return this.application.editEmployee(id, dto);
  }

  @Delete('employees/:id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Delete an employee without payroll lines (admin only).' })
  deleteEmployee(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteEmployee(id);
  }

  // ---- Taxes summary ----
  @Get('taxes-summary')
  @ApiOperation({ summary: 'Monthly payroll taxes summary (approved runs).' })
  getTaxesSummary(@Query('year', ParseIntPipe) year: number) {
    return this.application.getTaxesSummary(year);
  }

  // ---- Runs ----
  @Get('runs')
  @ApiOperation({ summary: 'List payroll runs (with totals).' })
  getRuns(@Query() query: GetPayrollRunsQueryDto) {
    return this.application.getRuns(query.year);
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Get a payroll run with lines and totals.' })
  getRun(@Param('id', ParseIntPipe) id: number) {
    return this.application.getRun(id);
  }

  @Post('runs')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Create a draft run prefilled with active employees (admin only).' })
  createRun(@Body() dto: CreatePayrollRunDto) {
    return this.application.createRun(dto);
  }

  @Put('runs/:id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Edit a draft run; lines are recomputed server-side (admin only).' })
  editRun(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditPayrollRunDto,
  ) {
    return this.application.editRun(id, dto);
  }

  @Delete('runs/:id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Delete a draft run (admin only).' })
  deleteRun(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteRun(id);
  }

  @Post('runs/:id/approve')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Approve a run → planned outflows in the calendar (admin only).' })
  approveRun(@Param('id', ParseIntPipe) id: number) {
    return this.application.approveRun(id);
  }

  @Post('runs/:id/unapprove')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Back to draft; removes linked planned operations (admin only).' })
  unapproveRun(@Param('id', ParseIntPipe) id: number) {
    return this.application.unapproveRun(id);
  }
}
```

Важно: маршрут `GET payroll/settings` объявлен ДО `GET payroll/runs/:id` и не конфликтует, т.к. префиксы разные; а вот `employees`/`runs`/`taxes-summary` — статические сегменты, динамических конфликтов нет.

- [ ] **Step 3: Payroll.module.ts**

```ts
// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { SettingsModule } from '@/modules/Settings/Settings.module';
import { PayrollController } from './Payroll.controller';
import { PayrollApplication } from './Payroll.application';
import { PayrollSettingsService } from './PayrollSettings.service';
import { GetEmployeesService } from './queries/GetEmployees.service';
import { GetPayrollRunsService } from './queries/GetPayrollRuns.service';
import { GetPayrollRunService } from './queries/GetPayrollRun.service';
import { GetPayrollTaxesSummaryService } from './queries/GetPayrollTaxesSummary.service';
import { CommandEmployeeValidatorService } from './commands/CommandEmployeeValidator.service';
import { CommandPayrollRunValidatorService } from './commands/CommandPayrollRunValidator.service';
import { CreateEmployeeService } from './commands/CreateEmployee.service';
import { EditEmployeeService } from './commands/EditEmployee.service';
import { DeleteEmployeeService } from './commands/DeleteEmployee.service';
import { CreatePayrollRunService } from './commands/CreatePayrollRun.service';
import { EditPayrollRunService } from './commands/EditPayrollRun.service';
import { DeletePayrollRunService } from './commands/DeletePayrollRun.service';
import { ApprovePayrollRunService } from './commands/ApprovePayrollRun.service';
import { UnapprovePayrollRunService } from './commands/UnapprovePayrollRun.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule, SettingsModule],
  controllers: [PayrollController],
  providers: [
    PayrollApplication,
    PayrollSettingsService,
    GetEmployeesService,
    GetPayrollRunsService,
    GetPayrollRunService,
    GetPayrollTaxesSummaryService,
    CommandEmployeeValidatorService,
    CommandPayrollRunValidatorService,
    CreateEmployeeService,
    EditEmployeeService,
    DeleteEmployeeService,
    CreatePayrollRunService,
    EditPayrollRunService,
    DeletePayrollRunService,
    ApprovePayrollRunService,
    UnapprovePayrollRunService,
  ],
})
export class PayrollModule {}
```

Если `SettingsModule` не экспортирует `SETTINGS_PROVIDER` — проверить, как его получает `AccountsSettingsService` (модуль `Accounts` импортирует `SettingsModule`); сделать так же.

- [ ] **Step 4: Подключить в App.module.ts**

В `packages/server/src/modules/App/App.module.ts`: добавить `import { PayrollModule } from '../Payroll/Payroll.module';` и `PayrollModule,` в массив `imports` (рядом с `PaymentRequestsModule`/`DealsModule`).

- [ ] **Step 5: Полная серверная проверка + commit**

Run: `pnpm --filter @bigfin/server typecheck && pnpm --filter @bigfin/server test -- src/modules/Payroll src/modules/Features`
Expected: 0 ошибок типов; все Payroll/Features тесты зелёные.

```bash
git add packages/server/src/modules/Payroll packages/server/src/modules/App/App.module.ts
git commit -m "feat(server): payroll module wiring (controller, application, app module)"
```

---

### Task 13: Webapp — query-хуки

**Files:**
- Modify: `packages/webapp/src/hooks/query/types.tsx`
- Create: `packages/webapp/src/hooks/query/payroll.tsx`

- [ ] **Step 1: types.tsx** — после блока `COST_ALLOCATION` добавить:

```ts
const PAYROLL = {
  PAYROLL_EMPLOYEES: 'PAYROLL_EMPLOYEES',
  PAYROLL_RUNS: 'PAYROLL_RUNS',
  PAYROLL_RUN: 'PAYROLL_RUN',
  PAYROLL_TAXES_SUMMARY: 'PAYROLL_TAXES_SUMMARY',
  PAYROLL_SETTINGS: 'PAYROLL_SETTINGS',
};
```

И в `export default { … }` добавить `...PAYROLL,` после `...COST_ALLOCATION,`.

- [ ] **Step 2: payroll.tsx** (паттерн `paymentRequests.tsx`)

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

export interface EmployeeValues {
  fullName: string;
  position?: string;
  employmentType: 'staff' | 'gph' | 'npd' | 'ip';
  defaultSalary?: number;
  active?: boolean;
  note?: string;
}

export interface PayrollRunLineValues {
  employeeId: number;
  baseAmount: number;
  bonusAmount?: number;
  deductionAmount?: number;
}

const invalidate = (client: QueryClient) => {
  client.invalidateQueries(t.PAYROLL_EMPLOYEES);
  client.invalidateQueries(t.PAYROLL_RUNS);
  client.invalidateQueries(t.PAYROLL_RUN);
  client.invalidateQueries(t.PAYROLL_TAXES_SUMMARY);
  client.invalidateQueries(t.PLANNED_OPERATIONS);
  client.invalidateQueries(t.PAYMENT_CALENDAR_FORECAST);
};

// ---- Settings ----
export function usePayrollSettings(props?: any) {
  return useRequestQuery(
    [t.PAYROLL_SETTINGS],
    { method: 'get', url: 'payroll/settings' },
    { select: (res: any) => res.data, defaultData: {}, ...props },
  );
}

// ---- Employees ----
export function useEmployees(query?: any, props?: any) {
  return useRequestQuery(
    [t.PAYROLL_EMPLOYEES, query],
    { method: 'get', url: 'payroll/employees', params: query },
    { select: (res: any) => res.data.data ?? res.data, defaultData: [], ...props },
  );
}

export function useCreateEmployee(
  props?: UseMutationOptions<any, any, EmployeeValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, EmployeeValues>(
    (values) => api.post('payroll/employees', values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useEditEmployee(
  props?: UseMutationOptions<any, any, { id: number; values: EmployeeValues }>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { id: number; values: EmployeeValues }>(
    ({ id, values }) => api.put(`payroll/employees/${id}`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeleteEmployee(
  props?: UseMutationOptions<any, any, number>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (id) => api.delete(`payroll/employees/${id}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}

// ---- Runs ----
export function usePayrollRuns(query?: any, props?: any) {
  return useRequestQuery(
    [t.PAYROLL_RUNS, query],
    { method: 'get', url: 'payroll/runs', params: query },
    { select: (res: any) => res.data.data ?? res.data, defaultData: [], ...props },
  );
}

export function usePayrollRun(id: number | null, props?: any) {
  return useRequestQuery(
    [t.PAYROLL_RUN, id],
    { method: 'get', url: `payroll/runs/${id}` },
    { select: (res: any) => res.data, defaultData: null, enabled: !!id, ...props },
  );
}

export function useCreatePayrollRun(
  props?: UseMutationOptions<
    any,
    any,
    { periodMonth: string; payDate: string; note?: string }
  >,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<
    any,
    any,
    { periodMonth: string; payDate: string; note?: string }
  >((values) => api.post('payroll/runs', values), {
    onSuccess: () => invalidate(client),
    ...props,
  });
}

export function useEditPayrollRun(
  props?: UseMutationOptions<
    any,
    any,
    { id: number; values: { payDate?: string; note?: string; lines?: PayrollRunLineValues[] } }
  >,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { id: number; values: any }>(
    ({ id, values }) => api.put(`payroll/runs/${id}`, values),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useDeletePayrollRun(
  props?: UseMutationOptions<any, any, number>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (id) => api.delete(`payroll/runs/${id}`),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useApprovePayrollRun(
  props?: UseMutationOptions<any, any, number>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (id) => api.post(`payroll/runs/${id}/approve`, {}),
    { onSuccess: () => invalidate(client), ...props },
  );
}

export function useUnapprovePayrollRun(
  props?: UseMutationOptions<any, any, number>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (id) => api.post(`payroll/runs/${id}/unapprove`, {}),
    { onSuccess: () => invalidate(client), ...props },
  );
}

// ---- Taxes summary ----
export function usePayrollTaxesSummary(year: number, props?: any) {
  return useRequestQuery(
    [t.PAYROLL_TAXES_SUMMARY, year],
    { method: 'get', url: 'payroll/taxes-summary', params: { year } },
    { select: (res: any) => res.data.data ?? res.data, defaultData: [], ...props },
  );
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: 0 новых ошибок.

```bash
git add packages/webapp/src/hooks/query/types.tsx packages/webapp/src/hooks/query/payroll.tsx
git commit -m "feat(webapp): payroll query hooks"
```

---

### Task 14: Webapp — схемы и диалоги

**Files:**
- Create: `packages/webapp/src/containers/Payroll/schemas.ts`
- Create: `packages/webapp/src/containers/Payroll/EmployeeDialog.tsx`
- Create: `packages/webapp/src/containers/Payroll/PayrollRunDialog.tsx`
- Create: `packages/webapp/src/containers/Payroll/PayrollSettingsDialog.tsx`

Перед написанием диалогов открыть `packages/webapp/src/containers/Debts/RepaymentPlanDialog.tsx` и `packages/webapp/src/containers/PaymentRequests/PaymentRequestDialog.tsx` и использовать ИХ импорты ui-примитивов (Dialog, Input, Button, Select и т.д.) — точные имена компонентов брать оттуда, не выдумывать.

- [ ] **Step 1: schemas.ts**

```ts
// © 2026 Bigfin
import { z } from 'zod';

export const employeeSchema = z.object({
  fullName: z.string().trim().min(1),
  position: z.string().optional(),
  employmentType: z.enum(['staff', 'gph', 'npd', 'ip']),
  defaultSalary: z.coerce.number().min(0).default(0),
  active: z.boolean().default(true),
  note: z.string().optional(),
});
export type EmployeeFormValues = z.infer<typeof employeeSchema>;

export const payrollRunSchema = z.object({
  periodMonth: z.string().min(1), // 'YYYY-MM' из <input type="month">
  payDate: z.string().min(1),
  note: z.string().optional(),
});
export type PayrollRunFormValues = z.infer<typeof payrollRunSchema>;

export const payrollSettingsSchema = z.object({
  ndflRate: z.coerce.number().min(0).max(100),
  contribMode: z.enum(['standard', 'msp']),
  contribRate: z.coerce.number().min(0).max(100),
  mspRate: z.coerce.number().min(0).max(100),
  mspThreshold: z.coerce.number().min(0),
});
export type PayrollSettingsFormValues = z.infer<typeof payrollSettingsSchema>;
```

- [ ] **Step 2: EmployeeDialog.tsx** — RHF + zodResolver; создание и редактирование

Содержимое: форма с полями ФИО (`Input`), должность (`Input`), тип занятости (select из 4 опций с ключами `payroll.employment_type.staff|gph|npd|ip`), оклад (`Input type="number"`), активен (checkbox/switch), заметка. Submit: `useCreateEmployee` либо `useEditEmployee` (если передан `employee`), `toast.success(intl.get('payroll.employee.saved'))`, ошибки — `toast.error(intl.get('payroll.employee.save_error'))`; отдельный случай: если сервер вернул `EMPLOYEE_HAS_PAYROLL_LINES` при удалении — `toast.error(intl.get('payroll.employee.has_lines_error'))` (используется из страницы). Структура компонента — копия `PaymentRequestDialog` (контейнер диалога, footer с кнопками «Сохранить»/«Отмена» = `payroll.save`/`payroll.cancel`).

- [ ] **Step 3: PayrollRunDialog.tsx** — создание начисления

Поля: месяц (`<input type="month">` → на submit `periodMonth = value + '-01'`), дата выплаты (`Input type="date"`), заметка. Submit: `useCreatePayrollRun`; ошибка `PAYROLL_RUN_MONTH_EXISTS` → `toast.error(intl.get('payroll.run.month_exists'))`, иначе generic `payroll.run.create_error`.

- [ ] **Step 4: PayrollSettingsDialog.tsx** — ставки

Загружает `usePayrollSettings()`; форма по `payrollSettingsSchema`; при `contribMode === 'msp'` показываются поля `mspRate`/`mspThreshold`. Submit — `useSaveSettings` из `@/hooks/query/settings`:

```ts
const saveSettings = useSaveSettings({});
// в onSubmit:
await saveSettings.mutateAsync({
  options: [
    { group: 'payroll', key: 'ndfl_rate', value: String(values.ndflRate) },
    { group: 'payroll', key: 'contrib_mode', value: values.contribMode },
    { group: 'payroll', key: 'contrib_rate', value: String(values.contribRate) },
    { group: 'payroll', key: 'msp_rate', value: String(values.mspRate) },
    { group: 'payroll', key: 'msp_threshold', value: String(values.mspThreshold) },
  ],
});
queryClient.invalidateQueries(t.PAYROLL_SETTINGS);
```

Подпись под формой: `payroll.settings.hint` («Оценка для управленческого учёта…»).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: 0 новых ошибок (intl-ключи добавятся в Task 16 — это не ломает typecheck).

```bash
git add packages/webapp/src/containers/Payroll
git commit -m "feat(webapp): payroll dialogs and schemas"
```

---

### Task 15: Webapp — страница, детали начисления, роут

**Files:**
- Create: `packages/webapp/src/containers/Payroll/PayrollRunDetail.tsx`
- Create: `packages/webapp/src/containers/Payroll/PayrollPage.tsx`
- Modify: `packages/webapp/src/routes/dashboard.tsx`

- [ ] **Step 1: PayrollRunDetail.tsx** — раскрытая карточка начисления

Пропсы: `{ runId: number; onClose: () => void }`. Данные: `usePayrollRun(runId)`. Отображение:
- шапка: месяц (`periodMonth` → формат «июнь 2026» через `Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })`), статус (`payroll.status.draft|approved`), дата выплаты, дата налогов (`taxDate`);
- таблица строк: сотрудник (`line.employee.fullName`), тип (`payroll.employment_type.*`), оклад/премия/удержание — редактируемые `Input type="number"` (локальный state, только в draft), НДФЛ/взносы/на руки/стоимость — вычисленные значения с сервера, серым;
- итоги из `run.totals`;
- кнопки: в draft — «Сохранить строки» (`useEditPayrollRun` с массивом `lines` из локального state; после ответа значения налогов обновляются с сервера), «Провести» (`useApprovePayrollRun`), «Удалить» (`useDeletePayrollRun` + подтверждение `window.confirm(intl.get('payroll.run.delete_confirm'))`); в approved — «Вернуть в черновик» (`useUnapprovePayrollRun`).
- тосты: `payroll.run.saved` / `payroll.run.approved_ok` / `payroll.run.unapproved_ok` / `payroll.run.action_error`.

- [ ] **Step 2: PayrollPage.tsx** — страница с вкладками

Структура — копия паттерна `PaymentRequestsPage`:

```tsx
// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import {
  useEmployees,
  usePayrollRuns,
  usePayrollTaxesSummary,
  useDeleteEmployee,
} from '@/hooks/query/payroll';
import { EmployeeDialog } from './EmployeeDialog';
import { PayrollRunDialog } from './PayrollRunDialog';
import { PayrollRunDetail } from './PayrollRunDetail';
import { PayrollSettingsDialog } from './PayrollSettingsDialog';

const fmt = (n: number) => `${(n ?? 0).toLocaleString('ru-RU')} ₽`;
const monthLabel = (iso: string) =>
  new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(
    new Date(iso),
  );

type Tab = 'runs' | 'employees';

export default function PayrollPage() {
  const { featureCan } = useFeatureCan();
  const [tab, setTab] = React.useState<Tab>('runs');
  const [showEmployeeForm, setShowEmployeeForm] = React.useState(false);
  const [editEmployee, setEditEmployee] = React.useState<any>(null);
  const [showRunForm, setShowRunForm] = React.useState(false);
  const [openRunId, setOpenRunId] = React.useState<number | null>(null);
  const [showSettings, setShowSettings] = React.useState(false);

  const year = new Date().getFullYear();
  const { data: employees } = useEmployees({}, {});
  const { data: runs } = usePayrollRuns({ year }, {});
  const { data: taxes } = usePayrollTaxesSummary(year, {});
  const deleteEmployee = useDeleteEmployee({});

  if (!featureCan('payroll')) return null;
  // …разметка по образцу PaymentRequestsPage:
  // заголовок payroll.page_title + кнопки «Ставки и взносы» (variant ghost) и
  // «Начислить зарплату» / «Добавить сотрудника» (по активной вкладке);
  // вкладки runs/employees как STATUS_TABS-кнопки;
  // вкладка runs: список начислений (месяц, статус, totals.totalNet/totalNdfl/
  // totalContributions/totalCost), клик — setOpenRunId(r.id);
  // под списком — блок «Налоги к уплате» из taxes (месяц, НДФЛ, взносы, итого);
  // вкладка employees: список (ФИО, должность, тип, оклад, активен), клик —
  // setEditEmployee(emp); кнопка удаления — deleteEmployee с обработкой
  // EMPLOYEE_HAS_PAYROLL_LINES → toast payroll.employee.has_lines_error;
  // в конце — условный рендер всех 4 диалогов/деталей.
}
```

Полная разметка пишется по месту, повторяя классы/компоненты `PaymentRequestsPage` (div-список с `divide-y rounded-md border`, пустые состояния `payroll.runs.empty` / `payroll.employees.empty`).

- [ ] **Step 3: Роут в dashboard.tsx** — после блока Cost Allocation:

```ts
  // Payroll (Зарплата)
  {
    path: `/payroll`,
    component: lazy(() => import('@/containers/Payroll/PayrollPage')),
    breadcrumb: intl.get('payroll.page_title'),
    pageTitle: intl.get('payroll.page_title'),
    subscriptionActive: [SUBSCRIPTION_TYPE.MAIN],
  },
```

- [ ] **Step 4: Typecheck + commit**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: 0 новых ошибок.

```bash
git add packages/webapp/src/containers/Payroll packages/webapp/src/routes/dashboard.tsx
git commit -m "feat(webapp): payroll page with runs, employees and taxes summary"
```

---

### Task 16: i18n — ключи `payroll.*` (en + ru парно)

**Files:**
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Добавить ключи в ОБА файла** (в конец объекта, перед закрывающей скобкой; en слева, ru справа):

| Ключ | EN | RU |
|---|---|---|
| `payroll.page_title` | Payroll | Зарплата |
| `payroll.tab.runs` | Pay runs | Начисления |
| `payroll.tab.employees` | Employees | Сотрудники |
| `payroll.settings.open` | Rates & contributions | Ставки и взносы |
| `payroll.settings.title` | Payroll rates | Ставки и взносы |
| `payroll.settings.ndfl_rate` | Income tax rate, % | Ставка НДФЛ, % |
| `payroll.settings.contrib_mode` | Contributions mode | Режим взносов |
| `payroll.settings.contrib_mode.standard` | Standard (30%) | Стандартный (30%) |
| `payroll.settings.contrib_mode.msp` | SME relief | Льгота МСП |
| `payroll.settings.contrib_rate` | Contributions rate, % | Ставка взносов, % |
| `payroll.settings.msp_rate` | SME rate above threshold, % | Ставка МСП сверх порога, % |
| `payroll.settings.msp_threshold` | SME threshold, ₽/month | Порог МСП, ₽/мес |
| `payroll.settings.hint` | Simplified estimate for management accounting. Edit rates to match your case. | Оценка для управленческого учёта. Ставки можно изменить под ваш случай. |
| `payroll.settings.saved` | Rates saved | Ставки сохранены |
| `payroll.settings.save_error` | Failed to save rates | Не удалось сохранить ставки |
| `payroll.employee.add` | Add employee | Добавить сотрудника |
| `payroll.employee.edit` | Edit employee | Изменить сотрудника |
| `payroll.employee.full_name` | Full name | ФИО |
| `payroll.employee.position` | Position | Должность |
| `payroll.employee.employment_type` | Employment type | Тип занятости |
| `payroll.employment_type.staff` | Staff (employment contract) | Штатный (трудовой договор) |
| `payroll.employment_type.gph` | Civil contract | ГПХ-договор |
| `payroll.employment_type.npd` | Self-employed | Самозанятый |
| `payroll.employment_type.ip` | Sole proprietor | ИП |
| `payroll.employee.default_salary` | Monthly salary | Оклад в месяц |
| `payroll.employee.active` | Active | Активен |
| `payroll.employee.archived` | Archived | В архиве |
| `payroll.employee.note` | Note | Заметка |
| `payroll.employee.saved` | Employee saved | Сотрудник сохранён |
| `payroll.employee.save_error` | Failed to save employee | Не удалось сохранить сотрудника |
| `payroll.employee.delete` | Delete | Удалить |
| `payroll.employee.delete_confirm` | Delete this employee? | Удалить сотрудника? |
| `payroll.employee.deleted` | Employee deleted | Сотрудник удалён |
| `payroll.employee.has_lines_error` | The employee has pay runs. Archive them instead of deleting. | У сотрудника есть начисления. Вместо удаления переведите в архив. |
| `payroll.employees.empty` | No employees yet. Add the first one. | Сотрудников пока нет. Добавьте первого. |
| `payroll.run.create` | New pay run | Начислить зарплату |
| `payroll.run.month` | Pay run month | Месяц начисления |
| `payroll.run.pay_date` | Pay date | Дата выплаты |
| `payroll.run.tax_date` | Taxes due | Налоги к уплате до |
| `payroll.run.note` | Note | Заметка |
| `payroll.run.month_exists` | A pay run for this month already exists | Начисление за этот месяц уже существует |
| `payroll.run.create_error` | Failed to create the pay run | Не удалось создать начисление |
| `payroll.status.draft` | Draft | Черновик |
| `payroll.status.approved` | Approved | Проведено |
| `payroll.run.col.base` | Salary | Оклад |
| `payroll.run.col.bonus` | Bonus | Премия |
| `payroll.run.col.deduction` | Deduction | Удержание |
| `payroll.run.col.ndfl` | Income tax | НДФЛ |
| `payroll.run.col.contributions` | Contributions | Взносы |
| `payroll.run.col.net` | Take-home | На руки |
| `payroll.run.col.total_cost` | Employer cost | Стоимость для компании |
| `payroll.run.save_lines` | Save lines | Сохранить строки |
| `payroll.run.saved` | Pay run saved | Начисление сохранено |
| `payroll.run.approve` | Approve | Провести |
| `payroll.run.approved_ok` | Pay run approved: payment and taxes are in the calendar | Начисление проведено: выплата и налоги в календаре |
| `payroll.run.unapprove` | Back to draft | Вернуть в черновик |
| `payroll.run.unapproved_ok` | Pay run is back to draft | Начисление возвращено в черновик |
| `payroll.run.delete` | Delete | Удалить |
| `payroll.run.delete_confirm` | Delete this draft pay run? | Удалить черновик начисления? |
| `payroll.run.deleted` | Pay run deleted | Начисление удалено |
| `payroll.run.action_error` | Action failed. Try again. | Не удалось выполнить действие. Попробуйте ещё раз. |
| `payroll.runs.empty` | No pay runs yet. Create the first one. | Начислений пока нет. Создайте первое. |
| `payroll.taxes.title` | Payroll taxes by month | Налоги с ФОТ по месяцам |
| `payroll.taxes.month` | Month | Месяц |
| `payroll.taxes.ndfl` | Income tax | НДФЛ |
| `payroll.taxes.contributions` | Contributions | Взносы |
| `payroll.taxes.total` | Total | Итого |
| `payroll.taxes.empty` | Approve a pay run to see taxes here | Проведите начисление, чтобы увидеть налоги |
| `payroll.save` | Save | Сохранить |
| `payroll.cancel` | Cancel | Отмена |
| `payroll.totals` | Totals | Итого |

- [ ] **Step 2: Проверка парности**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: `OK` — количества en↔ru равны, расхождений нет.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(webapp): payroll i18n keys (en/ru)"
```

---

### Task 17: Финальная проверка

- [ ] **Step 1: Полный typecheck**

Run: `pnpm typecheck`
Expected: 0 ошибок во всех трёх пакетах (если падает на shared — сначала собрать shared-пакеты, известная особенность окружения).

- [ ] **Step 2: Все серверные тесты Payroll + Features**

Run: `pnpm --filter @bigfin/server test -- src/modules/Payroll src/modules/Features`
Expected: все зелёные (≈30 тестов).

- [ ] **Step 3: lang-check ещё раз**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: OK.

- [ ] **Step 4: Сверка с критерием завершения спеки (§13)**

Пройтись по чек-листу спеки: сотрудник 4 типов ✓ (Task 8/14), начисление с автозаполнением ✓ (Task 9), расчёт ✓ (Task 4), проведение → календарь ✓ (Task 10), сводка налогов ✓ (Task 11/15), флаг off ✓ (Task 1). UI-проверка живьём — после включения флага на staging (локального бэкенда нет).

- [ ] **Step 5: Итоговый коммит (если остались правки) — готово к ревью**

Ветка `feat/payroll-core` остаётся локальной; push/PR — по запросу основателя.

---

## Self-review (выполнен при написании плана)

- **Покрытие спеки:** §3 объём → Tasks 1–16; §4 таблицы → Task 2; §5 расчёт → Task 4; §6 настройки → Tasks 5, 14; §7 календарь → Task 10; §8 API → Task 12; §9 фронт → Tasks 13–15; §10 ошибки → Tasks 7–10; §11 тесты → Tasks 1, 4, 7, 10, 11.
- **Консистентность типов:** `PayrollSettingsValues` (constants) используется в `computePayrollLine`/`PayrollSettings.service`; ключи итогов `totalNdfl/totalContributions/totalNet/totalCost` едины в `summarizeRun`, Approve, queries и фронте.
- **Известные допущения:** точные имена ui-примитивов в диалогах берутся из существующих диалогов (Task 14 Step 0); `SettingsModule` экспорт `SETTINGS_PROVIDER` — проверить по образцу модуля `Accounts` (отмечено в Task 12).
