# Кредиты и займы (⑳) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Модуль учёта кредитов и займов: карточка кредита с авто-графиком (аннуитет/дифференцированный), GL-проводки при выдаче и при платеже, фид в платёжный календарь, статья «Проценты по кредитам» — под флагом `credits` (off).

**Architecture:** Шаблон — модуль `Dividends` (GL через `LedgerStorageService` в `UnitOfWork`) + структура installments из `Debts` (`insertGraph` план+строки). Вся бизнес-логика расчёта графика и проводок — чистые тестируемые функции в `utils/`. Счёт-обязательство создаётся свой на каждый кредит; счёт «Проценты по кредитам» + одноимённая статья ④ — find-or-create (общие). Фича-флаг мягкий (гейтит только UI).

**Tech Stack:** NestJS 10, Objection/Knex (TENANT-схема), Jest; React 18 + Radix/shadcn + react-query (фронт).

**Спека:** `docs/superpowers/specs/2026-06-13-credits-loans-design.md`.

**Эталоны для чтения перед стартом:**
- GL/команда: `modules/Dividends/commands/CreateDividendPayout.service.ts`, `utils/payoutGLEntries.ts`, `commands/DeleteDividendPayout.service.ts`.
- Installments/insertGraph: `modules/Debts/commands/CreateRepaymentPlan.service.ts`, `models/DebtRepaymentInstallment.model.ts`.
- Планы календаря: `modules/PaymentCalendar/models/PlannedOperation.model.ts` (поле `plannedDate`, `articleId` опционален).
- Регистрация модели: `modules/Tenancy/TenancyModels/Tenancy.module.ts` (массив `models[]`).
- Флаг: `common/types/Features.ts`, `modules/Features/FeaturesConfigure.ts`, `FeaturesConfigure.dividends.spec.ts`.

**Конвенции коммитов (husky/commitlint):** subject — со строчной буквы, без PascalCase; тело — строки ≤100 символов. Частые атомарные коммиты.

---

## Файловая структура

**Создаём (сервер):**
```
database/tenant/migrations/<ts>_create_credits_tables.ts
modules/Credits/Credits.module.ts
modules/Credits/Credits.controller.ts
modules/Credits/Credits.application.ts
modules/Credits/constants.ts
modules/Credits/dtos/Credit.dto.ts
modules/Credits/models/Credit.model.ts
modules/Credits/models/CreditInstallment.model.ts
modules/Credits/utils/generateSchedule.ts (+ .spec.ts)
modules/Credits/utils/creditGLEntries.ts (+ .spec.ts)
modules/Credits/commands/CreateCredit.service.ts (+ .spec.ts)
modules/Credits/commands/MarkInstallmentPaid.service.ts (+ .spec.ts)
modules/Credits/commands/DeleteCredit.service.ts
modules/Credits/commands/EditCredit.service.ts
modules/Credits/queries/GetCredits.service.ts
modules/Credits/queries/GetCreditDetail.service.ts
modules/Credits/queries/GetCreditsSummary.service.ts
modules/Features/FeaturesConfigure.credits.spec.ts
```

**Модифицируем (сервер):**
```
common/types/Features.ts                          (+ CREDITS)
modules/Features/FeaturesConfigure.ts             (+ запись)
modules/Tenancy/TenancyModels/Tenancy.module.ts   (+ Credit, CreditInstallment в models[])
app.module.ts (или App.module.ts)                 (+ CreditsModule в imports)
```

**Фронт:**
```
webapp/src/constants/features.tsx                 (+ credits)
webapp/src/hooks/query/credits.tsx                (новый)
webapp/src/containers/Credits/                     (новый: страница, карточка, диалог)
webapp/src/lang/en/index.json, lang/ru/index.json  (+ credits.* парно)
+ роут и пункт меню (по образцу Dividends/Debts)
```

---

## Task 1: Фича-флаг `credits` (сервер)

**Files:**
- Modify: `packages/server/src/common/types/Features.ts`
- Modify: `packages/server/src/modules/Features/FeaturesConfigure.ts`
- Test: `packages/server/src/modules/Features/FeaturesConfigure.credits.spec.ts`

- [ ] **Step 1: Write the failing test**

`FeaturesConfigure.credits.spec.ts`:
```ts
// © 2026 Bigfin
import { Features } from '@/common/types/Features';
import { FeaturesConfigure } from './FeaturesConfigure';

describe('FeaturesConfigure — credits', () => {
  it('флаг credits присутствует и по умолчанию выключен', () => {
    const configure = new FeaturesConfigure({ get: () => undefined } as any);
    const entry = configure
      .getConfigure()
      .find((f) => f.name === Features.CREDITS);

    expect(entry).toBeDefined();
    expect(entry.defaultValue).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @bigfin/server test -- FeaturesConfigure.credits`
Expected: FAIL — `Features.CREDITS` is undefined.

- [ ] **Step 3: Add enum + config entry**

In `common/types/Features.ts`, after the `ACCRUAL_PNL = 'accrual_pnl',` line add:
```ts
  CREDITS = 'credits',
```
In `FeaturesConfigure.ts` `getConfigure()` array, after the `Features.ACCRUAL_PNL` entry add:
```ts
      {
        name: Features.CREDITS,
        defaultValue: false,
      },
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm --filter @bigfin/server test -- FeaturesConfigure.credits`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/common/types/Features.ts \
  packages/server/src/modules/Features/FeaturesConfigure.ts \
  packages/server/src/modules/Features/FeaturesConfigure.credits.spec.ts
git commit -m "feat(credits): фича-флаг credits (off)"
```

---

## Task 2: Чистая функция `generateSchedule` + тесты

**Files:**
- Create: `packages/server/src/modules/Credits/utils/generateSchedule.ts`
- Test: `packages/server/src/modules/Credits/utils/generateSchedule.spec.ts`

- [ ] **Step 1: Write the failing test**

`generateSchedule.spec.ts`:
```ts
// © 2026 Bigfin
import { generateSchedule } from './generateSchedule';

const sumPrincipal = (rows: any[]) =>
  Math.round(rows.reduce((s, r) => s + r.principalAmount, 0) * 100) / 100;

describe('generateSchedule', () => {
  it('аннуитет без процентов: равные доли тела, остаток гасится в ноль', () => {
    const rows = generateSchedule({
      principal: 120000,
      annualRate: 0,
      termMonths: 12,
      startDate: '2026-01-15',
      scheduleType: 'annuity',
    });
    expect(rows).toHaveLength(12);
    expect(rows[0].interestAmount).toBe(0);
    expect(rows[0].paymentAmount).toBe(10000);
    expect(sumPrincipal(rows)).toBe(120000);
    expect(rows[11].remainingBalance).toBe(0);
  });

  it('аннуитет с процентами: сумма тел равна телу кредита, остаток ноль', () => {
    const rows = generateSchedule({
      principal: 100000,
      annualRate: 18,
      termMonths: 6,
      startDate: '2026-01-31',
      scheduleType: 'annuity',
    });
    expect(rows).toHaveLength(6);
    expect(sumPrincipal(rows)).toBe(100000);
    expect(rows[5].remainingBalance).toBe(0);
    // первый платёж = аннуитетный, проценты = 100000 * 0.015 = 1500
    expect(rows[0].interestAmount).toBe(1500);
  });

  it('дифференцированный: тело равными долями, платёж убывает', () => {
    const rows = generateSchedule({
      principal: 120000,
      annualRate: 12,
      termMonths: 12,
      startDate: '2026-01-10',
      scheduleType: 'differentiated',
    });
    expect(rows[0].principalAmount).toBe(10000);
    expect(rows[0].interestAmount).toBe(1200); // 120000 * 0.01
    expect(rows[0].paymentAmount).toBeGreaterThan(rows[11].paymentAmount);
    expect(sumPrincipal(rows)).toBe(120000);
    expect(rows[11].remainingBalance).toBe(0);
  });

  it('срок 1 месяц: одна строка, тело = весь кредит', () => {
    const rows = generateSchedule({
      principal: 50000,
      annualRate: 12,
      termMonths: 1,
      startDate: '2026-03-01',
      scheduleType: 'annuity',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].principalAmount).toBe(50000);
    expect(rows[0].remainingBalance).toBe(0);
    expect(rows[0].dueDate).toBe('2026-04-01');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @bigfin/server test -- generateSchedule`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `generateSchedule.ts`**

```ts
// © 2026 Bigfin
import * as moment from 'moment';

export type ScheduleType = 'annuity' | 'differentiated';

export interface GenerateScheduleInput {
  principal: number;
  annualRate: number; // годовая ставка в процентах, напр. 18.5
  termMonths: number;
  startDate: string; // YYYY-MM-DD (дата выдачи; первый платёж через месяц)
  scheduleType: ScheduleType;
}

export interface ScheduleRow {
  seqNo: number;
  dueDate: string;
  paymentAmount: number;
  principalAmount: number;
  interestAmount: number;
  remainingBalance: number;
}

const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Строит график платежей по кредиту. Округление до 2 знаков; накопленная
 * ошибка округления добивается в последний платёж, поэтому сумма всех тел
 * точно равна телу кредита, а остаток последней строки = 0.
 */
export function generateSchedule(input: GenerateScheduleInput): ScheduleRow[] {
  const { principal, annualRate, termMonths, startDate, scheduleType } = input;
  const r = annualRate / 100 / 12; // месячная ставка
  const rows: ScheduleRow[] = [];
  let remaining = principal;

  const annuityPayment =
    r === 0
      ? round2(principal / termMonths)
      : round2((principal * r) / (1 - Math.pow(1 + r, -termMonths)));
  const diffPrincipal = round2(principal / termMonths);

  for (let seq = 1; seq <= termMonths; seq += 1) {
    const dueDate = moment(startDate).add(seq, 'months').format('YYYY-MM-DD');
    const isLast = seq === termMonths;
    const interest = round2(remaining * r);

    let principalPart: number;
    if (isLast) {
      principalPart = round2(remaining); // добиваем остаток в ноль
    } else if (scheduleType === 'annuity') {
      principalPart = round2(annuityPayment - interest);
    } else {
      principalPart = diffPrincipal;
    }

    const paymentAmount = round2(principalPart + interest);
    remaining = round2(remaining - principalPart);

    rows.push({
      seqNo: seq,
      dueDate,
      paymentAmount,
      principalAmount: principalPart,
      interestAmount: interest,
      remainingBalance: remaining < 0 ? 0 : remaining,
    });
  }

  return rows;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm --filter @bigfin/server test -- generateSchedule`
Expected: PASS (4 кейса).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Credits/utils/generateSchedule.ts \
  packages/server/src/modules/Credits/utils/generateSchedule.spec.ts
git commit -m "feat(credits): расчёт графика (аннуитет/дифференцированный)"
```

---

## Task 3: Чистая функция `creditGLEntries` + тесты

**Files:**
- Create: `packages/server/src/modules/Credits/utils/creditGLEntries.ts`
- Test: `packages/server/src/modules/Credits/utils/creditGLEntries.spec.ts`
- Depends on constants from Task 6 — но типы транзакций определим прямо здесь как локальные строковые литералы, чтобы Task 3 был независим. (В Task 6 те же значения экспортируются из `constants.ts`; функция принимает их параметрами, поэтому дубля нет.)

- [ ] **Step 1: Write the failing test**

`creditGLEntries.spec.ts`:
```ts
// © 2026 Bigfin
import { AccountNormal } from '@/modules/Accounts/Accounts.types';
import {
  getCreditDisbursementGLEntries,
  getCreditInstallmentPaymentGLEntries,
} from './creditGLEntries';

describe('creditGLEntries', () => {
  it('выдача: Dr банк / Cr обязательство на тело', () => {
    const entries = getCreditDisbursementGLEntries({
      creditId: 7,
      date: '2026-01-15',
      principal: 100000,
      currencyCode: 'RUB',
      bankAccountId: 1,
      liabilityAccountId: 2,
    });
    expect(entries).toHaveLength(2);
    const bank = entries.find((e) => e.accountId === 1);
    const liab = entries.find((e) => e.accountId === 2);
    expect(bank.debit).toBe(100000);
    expect(bank.accountNormal).toBe(AccountNormal.DEBIT);
    expect(liab.credit).toBe(100000);
    expect(liab.accountNormal).toBe(AccountNormal.CREDIT);
  });

  it('платёж: Dr обязательство + Dr проценты / Cr банк; дебет = кредит', () => {
    const entries = getCreditInstallmentPaymentGLEntries({
      installmentId: 42,
      date: '2026-02-15',
      principalAmount: 8000,
      interestAmount: 1500,
      paymentAmount: 9500,
      currencyCode: 'RUB',
      bankAccountId: 1,
      liabilityAccountId: 2,
      interestExpenseAccountId: 3,
    });
    expect(entries).toHaveLength(3);
    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
    expect(totalDebit).toBe(9500);
    expect(totalCredit).toBe(9500);
    const interest = entries.find((e) => e.accountId === 3);
    expect(interest.debit).toBe(1500);
    expect(interest.accountNormal).toBe(AccountNormal.DEBIT);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm --filter @bigfin/server test -- creditGLEntries`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `creditGLEntries.ts`**

```ts
// © 2026 Bigfin
import { ILedgerEntry } from '@/modules/Ledger/types/Ledger.types';
import { AccountNormal } from '@/modules/Accounts/Accounts.types';

export const CREDIT_DISBURSEMENT_TRANSACTION_TYPE = 'CreditDisbursement';
export const CREDIT_INSTALLMENT_PAYMENT_TRANSACTION_TYPE =
  'CreditInstallmentPayment';

export interface CreditDisbursementGLInput {
  creditId: number;
  date: string;
  principal: number;
  currencyCode: string;
  bankAccountId: number;
  liabilityAccountId: number;
}

export interface CreditInstallmentPaymentGLInput {
  installmentId: number;
  date: string;
  principalAmount: number;
  interestAmount: number;
  paymentAmount: number;
  currencyCode: string;
  bankAccountId: number;
  liabilityAccountId: number;
  interestExpenseAccountId: number;
}

/** Выдача кредита: Dr банк (деньги пришли) / Cr обязательство (появился долг). */
export const getCreditDisbursementGLEntries = (
  i: CreditDisbursementGLInput,
): ILedgerEntry[] => {
  const common = {
    currencyCode: i.currencyCode,
    exchangeRate: 1,
    transactionType: CREDIT_DISBURSEMENT_TRANSACTION_TYPE,
    transactionId: i.creditId,
    date: i.date,
    debit: 0,
    credit: 0,
  };
  return [
    {
      ...common,
      debit: i.principal,
      accountId: i.bankAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: 1,
    },
    {
      ...common,
      credit: i.principal,
      accountId: i.liabilityAccountId,
      accountNormal: AccountNormal.CREDIT,
      index: 2,
    },
  ];
};

/** Платёж по графику: Dr обязательство (тело) + Dr проценты / Cr банк (весь платёж). */
export const getCreditInstallmentPaymentGLEntries = (
  i: CreditInstallmentPaymentGLInput,
): ILedgerEntry[] => {
  const common = {
    currencyCode: i.currencyCode,
    exchangeRate: 1,
    transactionType: CREDIT_INSTALLMENT_PAYMENT_TRANSACTION_TYPE,
    transactionId: i.installmentId,
    date: i.date,
    debit: 0,
    credit: 0,
  };
  return [
    {
      ...common,
      debit: i.principalAmount,
      accountId: i.liabilityAccountId,
      accountNormal: AccountNormal.CREDIT,
      index: 1,
    },
    {
      ...common,
      debit: i.interestAmount,
      accountId: i.interestExpenseAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: 2,
    },
    {
      ...common,
      credit: i.paymentAmount,
      accountId: i.bankAccountId,
      accountNormal: AccountNormal.DEBIT,
      index: 3,
    },
  ];
};
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm --filter @bigfin/server test -- creditGLEntries`
Expected: PASS.

> Примечание: `ILedgerEntry`/`AccountNormal` точные имена полей сверить по `utils/payoutGLEntries.ts` (эталон). Если поле называется иначе — выровнять обе функции и тест.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Credits/utils/creditGLEntries.ts \
  packages/server/src/modules/Credits/utils/creditGLEntries.spec.ts
git commit -m "feat(credits): GL-проводки выдачи и платежа"
```

---

## Task 4: Миграция (таблицы `credits` + `credit_installments`)

**Files:**
- Create: `packages/server/src/database/tenant/migrations/<timestamp>_create_credits_tables.ts`

Имя файла — `pnpm tenants:migrate:make -- --name=create_credits_tables` (сгенерит timestamp). Затем заменить содержимое.

- [ ] **Step 1: Создать миграцию и записать содержимое**

```js
// © 2026 Bigfin
exports.up = async (knex) => {
  await knex.schema.createTable('credits', (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.string('lender').nullable();
    table.decimal('principal_amount', 13, 3).notNullable();
    table.decimal('annual_interest_rate', 9, 4).notNullable().defaultTo(0);
    table.integer('term_months').unsigned().notNullable();
    table.date('start_date').notNullable().index();
    table.string('schedule_type').notNullable().defaultTo('annuity');
    table
      .integer('payment_account_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('accounts')
      .index();
    table
      .integer('liability_account_id')
      .unsigned()
      .nullable() // проставляется внутри транзакции создания после создания счёта
      .references('id')
      .inTable('accounts')
      .index();
    table
      .integer('interest_expense_account_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('accounts')
      .index();
    table.string('status').notNullable().defaultTo('active');
    table.text('note').nullable();
    table.timestamps();
  });

  await knex.schema.createTable('credit_installments', (table) => {
    table.increments('id');
    table
      .integer('credit_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('credits')
      .index();
    table.integer('seq_no').unsigned().notNullable();
    table.date('due_date').notNullable().index();
    table.decimal('payment_amount', 13, 3).notNullable();
    table.decimal('principal_amount', 13, 3).notNullable();
    table.decimal('interest_amount', 13, 3).notNullable();
    table.decimal('remaining_balance', 13, 3).notNullable();
    table.string('status').notNullable().defaultTo('planned');
    table.date('paid_date').nullable();
    table.timestamps();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('credit_installments');
  await knex.schema.dropTableIfExists('credits');
};
```

- [ ] **Step 2: Проверить миграцию вверх-вниз (на CI или при рабочем стеке)**

Run: `pnpm tenants:migrate:latest` → `pnpm tenants:migrate:rollback` → `pnpm tenants:migrate:latest`
Expected: без ошибок в обе стороны. (Локально может требовать docker-стек; допустимо отложить прогон на CI.)

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/database/tenant/migrations/*_create_credits_tables.ts
git commit -m "feat(credits): миграция таблиц credits и credit_installments"
```

---

## Task 5: Модели + регистрация в Tenancy

**Files:**
- Create: `packages/server/src/modules/Credits/models/Credit.model.ts`
- Create: `packages/server/src/modules/Credits/models/CreditInstallment.model.ts`
- Modify: `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts`

- [ ] **Step 1: `Credit.model.ts`**

```ts
// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class Credit extends TenantBaseModel {
  name!: string;
  lender!: string | null;
  principalAmount!: number;
  annualInterestRate!: number;
  termMonths!: number;
  startDate!: string;
  scheduleType!: string;
  paymentAccountId!: number;
  liabilityAccountId!: number | null;
  interestExpenseAccountId!: number | null;
  status!: string;
  note!: string | null;

  static get tableName() {
    return 'credits';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const {
      CreditInstallment,
    } = require('@/modules/Credits/models/CreditInstallment.model');
    const { Account } = require('@/modules/Accounts/models/Account.model');

    return {
      installments: {
        relation: Model.HasManyRelation,
        modelClass: CreditInstallment,
        join: {
          from: 'credits.id',
          to: 'credit_installments.creditId',
        },
      },
      paymentAccount: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: { from: 'credits.paymentAccountId', to: 'accounts.id' },
      },
    };
  }
}
```

- [ ] **Step 2: `CreditInstallment.model.ts`**

```ts
// © 2026 Bigfin
import { Model } from 'objection';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class CreditInstallment extends TenantBaseModel {
  creditId!: number;
  seqNo!: number;
  dueDate!: string;
  paymentAmount!: number;
  principalAmount!: number;
  interestAmount!: number;
  remainingBalance!: number;
  status!: string;
  paidDate!: string | null;

  static get tableName() {
    return 'credit_installments';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get relationMappings() {
    const { Credit } = require('@/modules/Credits/models/Credit.model');
    return {
      credit: {
        relation: Model.BelongsToOneRelation,
        modelClass: Credit,
        join: { from: 'credit_installments.creditId', to: 'credits.id' },
      },
    };
  }
}
```

- [ ] **Step 3: Зарегистрировать в `Tenancy.module.ts`**

Добавить импорты рядом с импортом `DividendPayout`:
```ts
import { Credit } from '@/modules/Credits/models/Credit.model';
import { CreditInstallment } from '@/modules/Credits/models/CreditInstallment.model';
```
И добавить `Credit,` и `CreditInstallment,` в массив `const models = [ ... ]` (рядом с `DividendPayout`).

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @bigfin/server exec tsc --noEmit` (или `pnpm typecheck`)
Expected: чисто.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Credits/models/ \
  packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts
git commit -m "feat(credits): модели Credit и CreditInstallment + регистрация в Tenancy"
```

---

## Task 6: Константы + DTO

**Files:**
- Create: `packages/server/src/modules/Credits/constants.ts`
- Create: `packages/server/src/modules/Credits/dtos/Credit.dto.ts`

- [ ] **Step 1: `constants.ts`**

```ts
// © 2026 Bigfin
import { ACCOUNT_TYPE } from '@/constants/accounts';
export {
  CREDIT_DISBURSEMENT_TRANSACTION_TYPE,
  CREDIT_INSTALLMENT_PAYMENT_TRANSACTION_TYPE,
} from './utils/creditGLEntries';

export const ERRORS = {
  CREDIT_NOT_FOUND: 'CREDIT_NOT_FOUND',
  INSTALLMENT_NOT_FOUND: 'INSTALLMENT_NOT_FOUND',
  INSTALLMENT_ALREADY_PAID: 'INSTALLMENT_ALREADY_PAID',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  PAYMENT_ACCOUNT_NOT_FOUND: 'PAYMENT_ACCOUNT_NOT_FOUND',
  PAYMENT_ACCOUNT_NOT_CASH: 'PAYMENT_ACCOUNT_NOT_CASH',
  CANNOT_EDIT_WITH_PAID_INSTALLMENTS: 'CANNOT_EDIT_WITH_PAID_INSTALLMENTS',
};

/** Денежные счета — допустимый счёт выдачи/платежа. */
export const CASH_ACCOUNT_TYPES: string[] = [
  ACCOUNT_TYPE.CASH,
  ACCOUNT_TYPE.BANK,
];

/** Счёт «Проценты по кредитам» — find-or-create по slug (паттерн OWNER_PAYOUTS_ACCOUNT). */
export const LOAN_INTEREST_EXPENSE_ACCOUNT = {
  name: 'Проценты по кредитам',
  slug: 'loan-interest-expense',
  accountType: ACCOUNT_TYPE.EXPENSE,
  code: '60110',
  description: '',
  active: true,
  index: 1,
  predefined: true,
};

/** Статья ④ «Проценты по кредитам» (find-or-create по name+kind). */
export const LOAN_INTEREST_ARTICLE = {
  name: 'Проценты по кредитам',
  kind: 'expense',
  cashflowSection: 'financing',
  sortOrder: 100,
  active: true,
};

/** Тип счёта-обязательства по сроку кредита. */
export const liabilityAccountTypeForTerm = (termMonths: number): string =>
  termMonths <= 12
    ? ACCOUNT_TYPE.OTHER_CURRENT_LIABILITY
    : ACCOUNT_TYPE.LOGN_TERM_LIABILITY; // upstream-typo LOGN — не переименовываем
```

- [ ] **Step 2: `Credit.dto.ts`**

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
  Min,
} from 'class-validator';

export class CreateCreditDto {
  @IsString()
  @ApiProperty({ example: 'Кредит Сбербанк' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'ПАО Сбербанк' })
  lender?: string;

  @ToNumber()
  @IsNumber()
  @Min(0.01)
  @ApiProperty({ example: 1000000 })
  principalAmount: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 18.5, description: 'Годовая ставка, %' })
  annualInterestRate: number;

  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 24, description: 'Срок, месяцев' })
  termMonths: number;

  @IsDateString()
  @ApiProperty({ example: '2026-06-15', description: 'Дата выдачи' })
  startDate: string;

  @IsIn(['annuity', 'differentiated'])
  @ApiProperty({ example: 'annuity', enum: ['annuity', 'differentiated'] })
  scheduleType: 'annuity' | 'differentiated';

  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 1, description: 'Счёт зачисления/списания (банк/касса)' })
  paymentAccountId: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Договор №123 от 15.06.2026' })
  note?: string;
}

export class EditCreditDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  lender?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
```

- [ ] **Step 3: Typecheck + Commit**

Run: `pnpm typecheck` (server) — чисто.
```bash
git add packages/server/src/modules/Credits/constants.ts \
  packages/server/src/modules/Credits/dtos/Credit.dto.ts
git commit -m "feat(credits): константы и DTO модуля"
```

---

## Task 7: Команда `CreateCredit` (+ spec) — ЭТАЛОН

Создаёт кредит: статья/счёт процентов (find-or-create) → счёт-обязательство (свой) → строка кредита + график (insertGraph) → GL выдачи → планы календаря по строкам.

**Files:**
- Create: `packages/server/src/modules/Credits/commands/CreateCredit.service.ts`
- Test: `packages/server/src/modules/Credits/commands/CreateCredit.service.spec.ts`

- [ ] **Step 1: Реализация `CreateCredit.service.ts`**

```ts
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
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { Ledger } from '@/modules/Ledger/Ledger';
import { Credit } from '../models/Credit.model';
import { generateSchedule } from '../utils/generateSchedule';
import { getCreditDisbursementGLEntries } from '../utils/creditGLEntries';
import {
  CASH_ACCOUNT_TYPES,
  ERRORS,
  LOAN_INTEREST_ARTICLE,
  LOAN_INTEREST_EXPENSE_ACCOUNT,
  liabilityAccountTypeForTerm,
} from '../constants';
import { CreateCreditDto } from '../dtos/Credit.dto';

@Injectable()
export class CreateCreditService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ledgerStorage: LedgerStorageService,
    private readonly tenancyContext: TenancyContext,

    @Inject(Credit.name)
    private readonly creditModel: TenantModelProxy<typeof Credit>,
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
    @Inject(PlannedOperation.name)
    private readonly plannedOperationModel: TenantModelProxy<
      typeof PlannedOperation
    >,
  ) {}

  public async create(dto: CreateCreditDto) {
    if (!(Number(dto.principalAmount) > 0)) {
      throw new ServiceError(ERRORS.INVALID_AMOUNT);
    }
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // 1. банк (валидация)
      const bank: any = await this.accountModel()
        .query(trx)
        .findById(dto.paymentAccountId);
      if (!bank) throw new ServiceError(ERRORS.PAYMENT_ACCOUNT_NOT_FOUND);
      if (!CASH_ACCOUNT_TYPES.includes(bank.accountType)) {
        throw new ServiceError(ERRORS.PAYMENT_ACCOUNT_NOT_CASH);
      }

      // 2. счёт процентов + статья (find-or-create, общие)
      const interestAccount = await this.findOrCreateInterestAccount(
        currencyCode,
        trx,
      );
      await this.findOrCreateInterestArticle(interestAccount.id, trx);

      // 3. счёт-обязательство (свой на кредит, без slug)
      const liabilityAccount: any = await this.accountModel()
        .query(trx)
        .insertAndFetch({
          name: dto.name,
          accountType: liabilityAccountTypeForTerm(Number(dto.termMonths)),
          currencyCode,
          active: true,
          predefined: false,
        } as any);

      // 4. график
      const schedule = generateSchedule({
        principal: Number(dto.principalAmount),
        annualRate: Number(dto.annualInterestRate),
        termMonths: Number(dto.termMonths),
        startDate: dto.startDate,
        scheduleType: dto.scheduleType,
      });

      // 5. кредит + строки (insertGraph)
      const credit: any = await this.creditModel()
        .query(trx)
        .insertGraph({
          name: dto.name,
          lender: dto.lender ?? null,
          principalAmount: dto.principalAmount,
          annualInterestRate: dto.annualInterestRate,
          termMonths: dto.termMonths,
          startDate: dto.startDate,
          scheduleType: dto.scheduleType,
          paymentAccountId: dto.paymentAccountId,
          liabilityAccountId: liabilityAccount.id,
          interestExpenseAccountId: interestAccount.id,
          status: 'active',
          note: dto.note ?? null,
          installments: schedule.map((r) => ({
            seqNo: r.seqNo,
            dueDate: r.dueDate,
            paymentAmount: r.paymentAmount,
            principalAmount: r.principalAmount,
            interestAmount: r.interestAmount,
            remainingBalance: r.remainingBalance,
            status: 'planned',
          })),
        } as any);

      // 6. GL выдачи: Dr банк / Cr обязательство
      const ledger = new Ledger(
        getCreditDisbursementGLEntries({
          creditId: credit.id,
          date: dto.startDate,
          principal: Number(dto.principalAmount),
          currencyCode,
          bankAccountId: dto.paymentAccountId,
          liabilityAccountId: liabilityAccount.id,
        }),
      );
      await this.ledgerStorage.commit(ledger, trx);

      // 7. планы календаря: по строке на платёж (весь платёж)
      const fresh: any = await this.creditModel()
        .query(trx)
        .findById(credit.id)
        .withGraphFetched('installments');
      await this.plannedOperationModel()
        .query(trx)
        .insert(
          fresh.installments.map((inst: any) => ({
            direction: 'outflow',
            amount: inst.paymentAmount,
            currencyCode,
            plannedDate: inst.dueDate,
            articleId: null,
            accountId: dto.paymentAccountId,
            status: 'planned',
            sourceType: 'CreditInstallment',
            sourceId: inst.id,
            description: dto.name,
          })) as any,
        );

      return fresh;
    });
  }

  private async findOrCreateInterestAccount(
    currencyCode: string,
    trx: Knex.Transaction,
  ) {
    let account: any = await this.accountModel()
      .query(trx)
      .findOne({ slug: LOAN_INTEREST_EXPENSE_ACCOUNT.slug });
    if (!account) {
      account = await this.accountModel()
        .query(trx)
        .insertAndFetch({ ...LOAN_INTEREST_EXPENSE_ACCOUNT, currencyCode } as any);
    }
    return account;
  }

  private async findOrCreateInterestArticle(
    accountId: number,
    trx: Knex.Transaction,
  ) {
    let article: any = await this.articleModel()
      .query(trx)
      .findOne({ name: LOAN_INTEREST_ARTICLE.name, kind: 'expense' });
    if (!article) {
      article = await this.articleModel()
        .query(trx)
        .insertAndFetch({ ...LOAN_INTEREST_ARTICLE, parentId: null } as any);
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

- [ ] **Step 2: Spec `CreateCredit.service.spec.ts`**

Юнит-тест с замоканными моделями/uow — проверяем оркестрацию (вызовы по порядку), не БД. Эталон мока — `CreateDividendPayout.service.spec.ts` (прочитать и повторить стиль моков `uow.withTransaction`, `ledgerStorage.commit`, model-proxy).

```ts
// © 2026 Bigfin
import { CreateCreditService } from './CreateCredit.service';

describe('CreateCreditService', () => {
  const makeModelProxy = (impl: any) => () => impl;

  it('создаёт счёт-обязательство, кредит с графиком, постит GL и планы', async () => {
    const trx = {} as any;
    const uow = {
      withTransaction: jest.fn((cb: any) => cb(trx)),
    } as any;
    const ledgerStorage = { commit: jest.fn() } as any;
    const tenancyContext = {
      getTenantMetadata: jest.fn().mockResolvedValue({ baseCurrency: 'RUB' }),
    } as any;

    const bank = { id: 1, accountType: 'bank' };
    const liability = { id: 2 };
    const interest = { id: 3 };
    const createdCredit = { id: 7 };
    const freshCredit = {
      id: 7,
      installments: [
        { id: 71, dueDate: '2026-02-15', paymentAmount: 9500 },
        { id: 72, dueDate: '2026-03-15', paymentAmount: 9500 },
      ],
    };

    const accountQuery = {
      findById: jest.fn().mockResolvedValue(bank),
      findOne: jest.fn().mockResolvedValue(null),
      insertAndFetch: jest
        .fn()
        .mockResolvedValueOnce(interest) // счёт процентов
        .mockResolvedValueOnce(liability), // счёт-обязательство
    };
    const accountModel = makeModelProxy({ query: () => accountQuery });

    const creditQuery: any = {
      insertGraph: jest.fn().mockResolvedValue(createdCredit),
      findById: jest.fn(() => ({
        withGraphFetched: jest.fn().mockResolvedValue(freshCredit),
      })),
    };
    const creditModel = makeModelProxy({ query: () => creditQuery });

    const articleQuery = {
      findOne: jest.fn().mockResolvedValue(null),
      insertAndFetch: jest.fn().mockResolvedValue({ id: 9 }),
    };
    const articleModel = makeModelProxy({ query: () => articleQuery });
    const articleAccountQuery = {
      findOne: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue({}),
    };
    const articleAccountModel = makeModelProxy({
      query: () => articleAccountQuery,
    });

    const plannedQuery = { insert: jest.fn().mockResolvedValue([]) };
    const plannedModel = makeModelProxy({ query: () => plannedQuery });

    const service = new CreateCreditService(
      uow,
      ledgerStorage,
      tenancyContext,
      creditModel as any,
      accountModel as any,
      articleModel as any,
      articleAccountModel as any,
      plannedModel as any,
    );

    const result = await service.create({
      name: 'Кредит Сбербанк',
      principalAmount: 100000,
      annualInterestRate: 18,
      termMonths: 6,
      startDate: '2026-01-15',
      scheduleType: 'annuity',
      paymentAccountId: 1,
    } as any);

    expect(creditQuery.insertGraph).toHaveBeenCalled();
    expect(ledgerStorage.commit).toHaveBeenCalledTimes(1);
    expect(plannedQuery.insert).toHaveBeenCalledTimes(1);
    expect(plannedQuery.insert.mock.calls[0][0]).toHaveLength(2);
    expect(result).toBe(freshCredit);
  });

  it('бросает ошибку, если счёт списания не денежный', async () => {
    const trx = {} as any;
    const uow = { withTransaction: jest.fn((cb: any) => cb(trx)) } as any;
    const accountModel = (() => ({
      query: () => ({
        findById: jest.fn().mockResolvedValue({ id: 1, accountType: 'income' }),
      }),
    })) as any;
    const service = new CreateCreditService(
      uow,
      { commit: jest.fn() } as any,
      { getTenantMetadata: jest.fn().mockResolvedValue({ baseCurrency: 'RUB' }) } as any,
      (() => ({})) as any,
      accountModel,
      (() => ({})) as any,
      (() => ({})) as any,
      (() => ({})) as any,
    );

    await expect(
      service.create({
        name: 'x',
        principalAmount: 1000,
        annualInterestRate: 10,
        termMonths: 6,
        startDate: '2026-01-15',
        scheduleType: 'annuity',
        paymentAccountId: 1,
      } as any),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2b: Run, fix until green**

Run: `pnpm --filter @bigfin/server test -- CreateCredit`
Expected: PASS (2 кейса). Если мок-сигнатуры разъезжаются с реальным `CreateDividendPayout.service.spec.ts` — выровнять.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/modules/Credits/commands/CreateCredit.service.ts \
  packages/server/src/modules/Credits/commands/CreateCredit.service.spec.ts
git commit -m "feat(credits): команда создания кредита (график, GL выдачи, календарь)"
```

---

## Task 8: Команда `MarkInstallmentPaid` (+ spec)

GL платежа + статус строки `paid` + снять план календаря; если все строки оплачены — кредит `closed`.

**Files:**
- Create: `packages/server/src/modules/Credits/commands/MarkInstallmentPaid.service.ts`
- Test: `packages/server/src/modules/Credits/commands/MarkInstallmentPaid.service.spec.ts`

- [ ] **Step 1: Реализация**

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { Ledger } from '@/modules/Ledger/Ledger';
import { Credit } from '../models/Credit.model';
import { CreditInstallment } from '../models/CreditInstallment.model';
import { getCreditInstallmentPaymentGLEntries } from '../utils/creditGLEntries';
import { ERRORS } from '../constants';

@Injectable()
export class MarkInstallmentPaidService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ledgerStorage: LedgerStorageService,
    private readonly tenancyContext: TenancyContext,

    @Inject(Credit.name)
    private readonly creditModel: TenantModelProxy<typeof Credit>,
    @Inject(CreditInstallment.name)
    private readonly installmentModel: TenantModelProxy<typeof CreditInstallment>,
    @Inject(PlannedOperation.name)
    private readonly plannedOperationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  public async markPaid(creditId: number, installmentId: number) {
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const credit: any = await this.creditModel().query(trx).findById(creditId);
      if (!credit) throw new ServiceError(ERRORS.CREDIT_NOT_FOUND);

      const inst: any = await this.installmentModel()
        .query(trx)
        .findById(installmentId)
        .where('creditId', creditId);
      if (!inst) throw new ServiceError(ERRORS.INSTALLMENT_NOT_FOUND);
      if (inst.status === 'paid') {
        throw new ServiceError(ERRORS.INSTALLMENT_ALREADY_PAID);
      }

      // GL платежа
      const ledger = new Ledger(
        getCreditInstallmentPaymentGLEntries({
          installmentId: inst.id,
          date: inst.dueDate,
          principalAmount: Number(inst.principalAmount),
          interestAmount: Number(inst.interestAmount),
          paymentAmount: Number(inst.paymentAmount),
          currencyCode,
          bankAccountId: credit.paymentAccountId,
          liabilityAccountId: credit.liabilityAccountId,
          interestExpenseAccountId: credit.interestExpenseAccountId,
        }),
      );
      await this.ledgerStorage.commit(ledger, trx);

      // статус строки
      await this.installmentModel()
        .query(trx)
        .findById(installmentId)
        .patch({ status: 'paid', paidDate: moment().format('YYYY-MM-DD') } as any);

      // снять план календаря этой строки
      await this.plannedOperationModel()
        .query(trx)
        .where('sourceType', 'CreditInstallment')
        .andWhere('sourceId', installmentId)
        .delete();

      // если все строки оплачены — кредит закрыт
      const remaining = await this.installmentModel()
        .query(trx)
        .where('creditId', creditId)
        .andWhere('status', 'planned')
        .resultSize();
      if (remaining === 0) {
        await this.creditModel()
          .query(trx)
          .findById(creditId)
          .patch({ status: 'closed' } as any);
      }

      return this.creditModel()
        .query(trx)
        .findById(creditId)
        .withGraphFetched('installments');
    });
  }
}
```

- [ ] **Step 2: Spec — happy path + «уже оплачено»**

```ts
// © 2026 Bigfin
import { MarkInstallmentPaidService } from './MarkInstallmentPaid.service';

describe('MarkInstallmentPaidService', () => {
  const proxy = (impl: any) => (() => impl) as any;

  it('постит GL, помечает строку оплаченной и снимает план', async () => {
    const trx = {} as any;
    const uow = { withTransaction: jest.fn((cb: any) => cb(trx)) } as any;
    const ledgerStorage = { commit: jest.fn() } as any;
    const tenancyContext = {
      getTenantMetadata: jest.fn().mockResolvedValue({ baseCurrency: 'RUB' }),
    } as any;

    const credit = {
      id: 7,
      paymentAccountId: 1,
      liabilityAccountId: 2,
      interestExpenseAccountId: 3,
    };
    const inst = {
      id: 71,
      status: 'planned',
      dueDate: '2026-02-15',
      principalAmount: 8000,
      interestAmount: 1500,
      paymentAmount: 9500,
    };

    const patch = jest.fn().mockResolvedValue(1);
    const creditQuery: any = {
      findById: jest.fn(() => ({
        where: () => undefined,
        patch,
        withGraphFetched: jest.fn().mockResolvedValue({ id: 7 }),
      })),
    };
    // findById(creditId) сначала возвращает credit:
    creditQuery.findById = jest
      .fn()
      .mockReturnValueOnce(Promise.resolve(credit))
      .mockReturnValue({
        patch,
        withGraphFetched: jest.fn().mockResolvedValue({ id: 7 }),
      });

    const instWhere = { where: jest.fn().mockResolvedValue(inst) };
    const installmentQuery: any = {
      findById: jest
        .fn()
        .mockReturnValueOnce(instWhere) // findById(...).where(...)
        .mockReturnValue({ patch }), // findById(...).patch(...)
      where: jest.fn(() => ({
        andWhere: jest.fn(() => ({ resultSize: jest.fn().mockResolvedValue(1) })),
      })),
    };

    const plannedQuery = {
      where: jest.fn(() => ({
        andWhere: jest.fn(() => ({ delete: jest.fn().mockResolvedValue(1) })),
      })),
    };

    const service = new MarkInstallmentPaidService(
      uow,
      ledgerStorage,
      tenancyContext,
      proxy({ query: () => creditQuery }),
      proxy({ query: () => installmentQuery }),
      proxy({ query: () => plannedQuery }),
    );

    await service.markPaid(7, 71);
    expect(ledgerStorage.commit).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalled();
  });
});
```
> Если цепочки моков окажутся хрупкими — упростить тест до проверки «commit вызван 1 раз и не падает» либо завести интеграционный тест на реальной БД при рабочем стеке. Главное — не оставлять команду без теста.

- [ ] **Step 2b: Run, fix until green**

Run: `pnpm --filter @bigfin/server test -- MarkInstallmentPaid`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/modules/Credits/commands/MarkInstallmentPaid.service.ts \
  packages/server/src/modules/Credits/commands/MarkInstallmentPaid.service.spec.ts
git commit -m "feat(credits): отметка платежа внесённым (GL платежа, закрытие кредита)"
```

---

## Task 9: Команды `DeleteCredit` и `EditCredit`

**Files:**
- Create: `packages/server/src/modules/Credits/commands/DeleteCredit.service.ts`
- Create: `packages/server/src/modules/Credits/commands/EditCredit.service.ts`

- [ ] **Step 1: `DeleteCredit.service.ts`**

Зачищает: GL выдачи (`CreditDisbursement`/credit.id) + GL каждого оплаченного платежа (`CreditInstallmentPayment`/installment.id) + планы календаря строк + строки графика + кредит.

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { Credit } from '../models/Credit.model';
import { CreditInstallment } from '../models/CreditInstallment.model';
import {
  CREDIT_DISBURSEMENT_TRANSACTION_TYPE,
  CREDIT_INSTALLMENT_PAYMENT_TRANSACTION_TYPE,
  ERRORS,
} from '../constants';

@Injectable()
export class DeleteCreditService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ledgerStorage: LedgerStorageService,

    @Inject(Credit.name)
    private readonly creditModel: TenantModelProxy<typeof Credit>,
    @Inject(CreditInstallment.name)
    private readonly installmentModel: TenantModelProxy<typeof CreditInstallment>,
    @Inject(PlannedOperation.name)
    private readonly plannedOperationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  public async delete(id: number) {
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const credit = await this.creditModel().query(trx).findById(id);
      if (!credit) throw new ServiceError(ERRORS.CREDIT_NOT_FOUND);

      const installments: any[] = await this.installmentModel()
        .query(trx)
        .where('creditId', id);
      const installmentIds = installments.map((i) => i.id);

      // GL выдачи
      await this.ledgerStorage.deleteByReference(
        id,
        CREDIT_DISBURSEMENT_TRANSACTION_TYPE,
        trx,
      );
      // GL оплаченных платежей
      for (const inst of installments.filter((i) => i.status === 'paid')) {
        await this.ledgerStorage.deleteByReference(
          inst.id,
          CREDIT_INSTALLMENT_PAYMENT_TRANSACTION_TYPE,
          trx,
        );
      }
      // планы календаря
      if (installmentIds.length) {
        await this.plannedOperationModel()
          .query(trx)
          .where('sourceType', 'CreditInstallment')
          .whereIn('sourceId', installmentIds)
          .delete();
      }
      // строки + кредит
      await this.installmentModel().query(trx).where('creditId', id).delete();
      await this.creditModel().query(trx).deleteById(id);

      return { id };
    });
  }
}
```

- [ ] **Step 2: `EditCredit.service.ts`**

MVP: правим только описательные поля (`name`/`lender`/`note`) — параметры графика после создания не меняем (пересчёт графика/GL = отдельный заход, относится к реструктуризации, вне объёма).

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Credit } from '../models/Credit.model';
import { ERRORS } from '../constants';
import { EditCreditDto } from '../dtos/Credit.dto';

@Injectable()
export class EditCreditService {
  constructor(
    private readonly uow: UnitOfWork,
    @Inject(Credit.name)
    private readonly creditModel: TenantModelProxy<typeof Credit>,
  ) {}

  public async edit(id: number, dto: EditCreditDto) {
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const credit = await this.creditModel().query(trx).findById(id);
      if (!credit) throw new ServiceError(ERRORS.CREDIT_NOT_FOUND);

      await this.creditModel()
        .query(trx)
        .findById(id)
        .patch({
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.lender !== undefined ? { lender: dto.lender } : {}),
          ...(dto.note !== undefined ? { note: dto.note } : {}),
        } as any);

      return this.creditModel().query(trx).findById(id);
    });
  }
}
```

- [ ] **Step 3: Typecheck + Commit**

Run: `pnpm typecheck` (server) — чисто.
```bash
git add packages/server/src/modules/Credits/commands/DeleteCredit.service.ts \
  packages/server/src/modules/Credits/commands/EditCredit.service.ts
git commit -m "feat(credits): команды удаления и редактирования кредита"
```

---

## Task 10: Запросы `GetCredits`, `GetCreditDetail`, `GetCreditsSummary`

**Files:**
- Create: `packages/server/src/modules/Credits/queries/GetCredits.service.ts`
- Create: `packages/server/src/modules/Credits/queries/GetCreditDetail.service.ts`
- Create: `packages/server/src/modules/Credits/queries/GetCreditsSummary.service.ts`

- [ ] **Step 1: `GetCredits.service.ts`** — список + остаток долга (Σ remaining principal неоплаченных строк)

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Credit } from '../models/Credit.model';

@Injectable()
export class GetCreditsService {
  constructor(
    @Inject(Credit.name)
    private readonly creditModel: TenantModelProxy<typeof Credit>,
  ) {}

  public async getCredits() {
    const credits: any[] = await this.creditModel()
      .query()
      .withGraphFetched('installments')
      .orderBy('startDate', 'desc');

    return credits.map((c) => {
      const planned = (c.installments || []).filter(
        (i: any) => i.status === 'planned',
      );
      const outstanding = planned.reduce(
        (s: number, i: any) => s + Number(i.principalAmount),
        0,
      );
      const nextPayment = planned
        .slice()
        .sort((a: any, b: any) => (a.dueDate < b.dueDate ? -1 : 1))[0];
      const { installments, ...rest } = c;
      return {
        ...rest,
        outstandingPrincipal: Math.round(outstanding * 100) / 100,
        nextPaymentDate: nextPayment?.dueDate ?? null,
        nextPaymentAmount: nextPayment?.paymentAmount ?? null,
      };
    });
  }
}
```

- [ ] **Step 2: `GetCreditDetail.service.ts`** — карточка + график

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Credit } from '../models/Credit.model';
import { ERRORS } from '../constants';

@Injectable()
export class GetCreditDetailService {
  constructor(
    @Inject(Credit.name)
    private readonly creditModel: TenantModelProxy<typeof Credit>,
  ) {}

  public async getCredit(id: number) {
    const credit = await this.creditModel()
      .query()
      .findById(id)
      .withGraphFetched('installments(orderBySeq)')
      .modifiers({
        orderBySeq: (q: any) => q.orderBy('seqNo', 'asc'),
      });
    if (!credit) throw new ServiceError(ERRORS.CREDIT_NOT_FOUND);
    return credit;
  }
}
```

- [ ] **Step 3: `GetCreditsSummary.service.ts`** — итоги (общий остаток долга, ближайший платёж)

```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CreditInstallment } from '../models/CreditInstallment.model';

@Injectable()
export class GetCreditsSummaryService {
  constructor(
    @Inject(CreditInstallment.name)
    private readonly installmentModel: TenantModelProxy<typeof CreditInstallment>,
  ) {}

  public async getSummary() {
    const planned: any[] = await this.installmentModel()
      .query()
      .where('status', 'planned');
    const totalOutstanding = planned.reduce(
      (s, i) => s + Number(i.principalAmount),
      0,
    );
    const next = planned
      .slice()
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0];
    return {
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      nextPaymentDate: next?.dueDate ?? null,
      nextPaymentAmount: next?.paymentAmount ?? null,
    };
  }
}
```

- [ ] **Step 4: Typecheck + Commit**

Run: `pnpm typecheck` (server) — чисто.
```bash
git add packages/server/src/modules/Credits/queries/
git commit -m "feat(credits): запросы списка, карточки и сводки"
```

---

## Task 11: Controller + Application + Module + регистрация в App.module

**Files:**
- Create: `packages/server/src/modules/Credits/Credits.application.ts`
- Create: `packages/server/src/modules/Credits/Credits.controller.ts`
- Create: `packages/server/src/modules/Credits/Credits.module.ts`
- Modify: корневой модуль приложения (имя файла — найти `@Module` с массивом `imports` модулей фич; искать рядом с `DividendsModule`).

- [ ] **Step 1: `Credits.application.ts`**

```ts
// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { CreateCreditService } from './commands/CreateCredit.service';
import { EditCreditService } from './commands/EditCredit.service';
import { DeleteCreditService } from './commands/DeleteCredit.service';
import { MarkInstallmentPaidService } from './commands/MarkInstallmentPaid.service';
import { GetCreditsService } from './queries/GetCredits.service';
import { GetCreditDetailService } from './queries/GetCreditDetail.service';
import { GetCreditsSummaryService } from './queries/GetCreditsSummary.service';
import { CreateCreditDto, EditCreditDto } from './dtos/Credit.dto';

@Injectable()
export class CreditsApplication {
  constructor(
    private readonly createService: CreateCreditService,
    private readonly editService: EditCreditService,
    private readonly deleteService: DeleteCreditService,
    private readonly markPaidService: MarkInstallmentPaidService,
    private readonly getCreditsService: GetCreditsService,
    private readonly getCreditDetailService: GetCreditDetailService,
    private readonly getSummaryService: GetCreditsSummaryService,
  ) {}

  createCredit(dto: CreateCreditDto) {
    return this.createService.create(dto);
  }
  editCredit(id: number, dto: EditCreditDto) {
    return this.editService.edit(id, dto);
  }
  deleteCredit(id: number) {
    return this.deleteService.delete(id);
  }
  markInstallmentPaid(creditId: number, installmentId: number) {
    return this.markPaidService.markPaid(creditId, installmentId);
  }
  getCredits() {
    return this.getCreditsService.getCredits();
  }
  getCredit(id: number) {
    return this.getCreditDetailService.getCredit(id);
  }
  getSummary() {
    return this.getSummaryService.getSummary();
  }
}
```

- [ ] **Step 2: `Credits.controller.ts`**

Чтение — авторизованный пользователь; мутации — `@RequirePermission('manage','all')` (как Dividends).

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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { CreditsApplication } from './Credits.application';
import { CreateCreditDto, EditCreditDto } from './dtos/Credit.dto';

@Controller('credits')
@ApiTags('Credits')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class CreditsController {
  constructor(private readonly application: CreditsApplication) {}

  @Get('summary')
  @ApiOperation({ summary: 'Credits summary: outstanding debt, next payment.' })
  getSummary() {
    return this.application.getSummary();
  }

  @Get()
  @ApiOperation({ summary: 'List credits with outstanding balance.' })
  getCredits() {
    return this.application.getCredits();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a credit with its installment schedule.' })
  getCredit(@Param('id', ParseIntPipe) id: number) {
    return this.application.getCredit(id);
  }

  @Post()
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Create a credit with schedule and GL (admin only).' })
  createCredit(@Body() dto: CreateCreditDto) {
    return this.application.createCredit(dto);
  }

  @Put(':id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Edit credit descriptive fields (admin only).' })
  editCredit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditCreditDto,
  ) {
    return this.application.editCredit(id, dto);
  }

  @Delete(':id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Delete a credit and revert its GL (admin only).' })
  deleteCredit(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteCredit(id);
  }

  @Post(':id/installments/:installmentId/pay')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Mark an installment paid with GL (admin only).' })
  markPaid(
    @Param('id', ParseIntPipe) id: number,
    @Param('installmentId', ParseIntPipe) installmentId: number,
  ) {
    return this.application.markInstallmentPaid(id, installmentId);
  }
}
```

- [ ] **Step 3: `Credits.module.ts`**

```ts
// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { LedgerModule } from '@/modules/Ledger/Ledger.module';
import { CreditsController } from './Credits.controller';
import { CreditsApplication } from './Credits.application';
import { CreateCreditService } from './commands/CreateCredit.service';
import { EditCreditService } from './commands/EditCredit.service';
import { DeleteCreditService } from './commands/DeleteCredit.service';
import { MarkInstallmentPaidService } from './commands/MarkInstallmentPaid.service';
import { GetCreditsService } from './queries/GetCredits.service';
import { GetCreditDetailService } from './queries/GetCreditDetail.service';
import { GetCreditsSummaryService } from './queries/GetCreditsSummary.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule, LedgerModule],
  controllers: [CreditsController],
  providers: [
    CreditsApplication,
    CreateCreditService,
    EditCreditService,
    DeleteCreditService,
    MarkInstallmentPaidService,
    GetCreditsService,
    GetCreditDetailService,
    GetCreditsSummaryService,
  ],
})
export class CreditsModule {}
```

- [ ] **Step 4: Зарегистрировать `CreditsModule`**

Найти корневой модуль: `grep -rn "DividendsModule" packages/server/src --include=*.ts | grep import`. В том же файле добавить импорт `CreditsModule` и включить его в массив `imports`.

- [ ] **Step 5: Typecheck + Commit**

Run: `pnpm typecheck` (server) — чисто.
```bash
git add packages/server/src/modules/Credits/Credits.application.ts \
  packages/server/src/modules/Credits/Credits.controller.ts \
  packages/server/src/modules/Credits/Credits.module.ts \
  packages/server/src/<root-app-module>.ts
git commit -m "feat(credits): контроллер, application и регистрация модуля"
```

---

## Task 12: Фронт — флаг, типы, react-query хуки

**Files:**
- Modify: `packages/webapp/src/constants/features.tsx` (+ `credits`)
- Create: `packages/webapp/src/hooks/query/credits.tsx`

- [ ] **Step 1: Флаг во фронте**

В `constants/features.tsx` добавить запись `credits` по образцу `dividends` (найти строку с `dividends` и продублировать с новым ключом/лейблом). Значение ключа — `'credits'` (совпадает с серверным enum).

- [ ] **Step 2: Хуки `hooks/query/credits.tsx`**

Образец — `hooks/query/dividends.tsx` (если есть) или другой модуль query-хуков. Концепт:
```tsx
// © 2026 Bigfin
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useApiRequest from '../useApiRequest';

const QK = { all: ['CREDITS'], summary: ['CREDITS_SUMMARY'] };

export function useCredits() {
  const apiRequest = useApiRequest();
  return useQuery(QK.all, () =>
    apiRequest.get('/credits').then((r) => r.data),
  );
}
export function useCredit(id) {
  const apiRequest = useApiRequest();
  return useQuery(['CREDIT', id], () =>
    apiRequest.get(`/credits/${id}`).then((r) => r.data),
    { enabled: !!id },
  );
}
export function useCreditsSummary() {
  const apiRequest = useApiRequest();
  return useQuery(QK.summary, () =>
    apiRequest.get('/credits/summary').then((r) => r.data),
  );
}
export function useCreateCredit() {
  const apiRequest = useApiRequest();
  const qc = useQueryClient();
  return useMutation((values) => apiRequest.post('/credits', values), {
    onSuccess: () => {
      qc.invalidateQueries(QK.all);
      qc.invalidateQueries(QK.summary);
    },
  });
}
export function useDeleteCredit() {
  const apiRequest = useApiRequest();
  const qc = useQueryClient();
  return useMutation((id) => apiRequest.delete(`/credits/${id}`), {
    onSuccess: () => qc.invalidateQueries(QK.all),
  });
}
export function useMarkInstallmentPaid() {
  const apiRequest = useApiRequest();
  const qc = useQueryClient();
  return useMutation(
    ({ id, installmentId }) =>
      apiRequest.post(`/credits/${id}/installments/${installmentId}/pay`),
    { onSuccess: () => qc.invalidateQueries() },
  );
}
```
> Точную форму `useApiRequest`/`useQuery` (v4 vs v5 синтаксис) сверить с соседним рабочим хуком в `hooks/query/` — повторить ровно его стиль.

- [ ] **Step 3: Typecheck + Commit**

Run: `pnpm --filter @bigfin/webapp exec tsc --noEmit` (или `pnpm typecheck`)
```bash
git add packages/webapp/src/constants/features.tsx \
  packages/webapp/src/hooks/query/credits.tsx
git commit -m "feat(credits): фронт — флаг и query-хуки"
```

---

## Task 13: Фронт — страница, карточка, диалог, роут, меню, переводы

**Files:**
- Create: `packages/webapp/src/containers/Credits/` (страница списка, карточка с графиком, диалог создания)
- Modify: роутер + пункт меню (по образцу Dividends/Debts)
- Modify: `packages/webapp/src/lang/en/index.json`, `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Переводы `credits.*` (парно en+ru)**

Использовать skill `i18n-add-string` ИЛИ вручную добавить парно в оба файла. Минимальный набор ключей:
```
credits.page.title            EN "Credits & loans"          RU "Кредиты и займы"
credits.summary.outstanding   EN "Outstanding debt"         RU "Остаток долга"
credits.summary.next_payment  EN "Next payment"             RU "Ближайший платёж"
credits.action.new            EN "Add credit"               RU "Добавить кредит"
credits.col.name              EN "Name"                     RU "Название"
credits.col.lender            EN "Lender"                   RU "Кредитор"
credits.col.principal         EN "Amount"                   RU "Сумма"
credits.col.rate              EN "Rate, %"                  RU "Ставка, %"
credits.col.term              EN "Term, months"             RU "Срок, мес."
credits.col.outstanding       EN "Outstanding"              RU "Остаток"
credits.col.status            EN "Status"                   RU "Статус"
credits.status.active         EN "Active"                   RU "Активный"
credits.status.closed         EN "Closed"                   RU "Закрыт"
credits.dialog.title          EN "New credit"               RU "Новый кредит"
credits.field.name            EN "Name"                     RU "Название"
credits.field.lender          EN "Lender"                   RU "Кредитор"
credits.field.principal       EN "Loan amount"              RU "Сумма кредита"
credits.field.rate            EN "Annual rate, %"           RU "Годовая ставка, %"
credits.field.term            EN "Term, months"             RU "Срок, месяцев"
credits.field.start_date      EN "Issue date"               RU "Дата выдачи"
credits.field.schedule_type   EN "Schedule"                 RU "График"
credits.schedule.annuity      EN "Annuity"                  RU "Аннуитет"
credits.schedule.differentiated EN "Differentiated"         RU "Дифференцированный"
credits.field.account         EN "Account"                  RU "Счёт"
credits.hint.account          EN "The loan amount will be added to this account automatically — don't record this inflow again manually." RU "Сумма кредита автоматически попадёт на этот счёт — не заводите этот приход вручную ещё раз."
credits.schedule.col.seq      EN "#"                        RU "№"
credits.schedule.col.due      EN "Date"                     RU "Дата"
credits.schedule.col.payment  EN "Payment"                  RU "Платёж"
credits.schedule.col.principal EN "Principal"               RU "Тело"
credits.schedule.col.interest EN "Interest"                 RU "Проценты"
credits.schedule.col.balance  EN "Balance"                  RU "Остаток"
credits.action.mark_paid      EN "Mark paid"                RU "Платёж внесён"
credits.installment.paid      EN "Paid"                     RU "Оплачен"
```

- [ ] **Step 2: Проверить парность**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: en↔ru равны, 0 расхождений.

- [ ] **Step 3: Страница списка + карточка + диалог**

Скопировать структуру из ближайшего нового shadcn-контейнера (Debts `/debts` или Dividends). Компоненты:
- `CreditsPage.tsx` — заголовок (`intl.get('credits.page.title')`), карточки сводки (`useCreditsSummary`), таблица (`useCredits`), кнопка «Добавить кредит» открывает диалог. Гейт страницы — `useFeatureCan('credits')`.
- `CreditDialog.tsx` — React Hook Form + Zod: поля name/lender/principal/rate/term/startDate/scheduleType(select annuity/differentiated)/account(select денежных счетов). Подсказка `credits.hint.account`. Превью графика — вызвать клиентский расчёт ИЛИ (проще для MVP) показать график после создания на карточке. Для MVP допустимо без превью: создать → перейти на карточку.
- `CreditCard.tsx` (или drawer) — параметры кредита + таблица графика (`useCredit(id)`), на ближайшей `planned`-строке кнопка «Платёж внесён» (`useMarkInstallmentPaid`).

Все видимые строки — через `intl.get('credits.*')`. Никакого захардкоженного английского.

- [ ] **Step 4: Роут + пункт меню**

Добавить роут `/credits` в роутер (образец — где зарегистрирован `/dividends` или `/debts`) и пункт меню, обёрнутый в проверку `useFeatureCan('credits')`.

- [ ] **Step 5: Typecheck + lang-check + Commit**

Run: `pnpm typecheck` (webapp) — чисто; `node packages/webapp/scripts/lang-check.js` — парно.
```bash
git add packages/webapp/src/containers/Credits/ \
  packages/webapp/src/lang/en/index.json \
  packages/webapp/src/lang/ru/index.json \
  packages/webapp/src/<router-file> packages/webapp/src/<menu-file>
git commit -m "feat(credits): фронт — страница, карточка, диалог, роут и переводы"
```

---

## Финальная приёмка (после всех задач)

- [ ] `pnpm --filter @bigfin/server test -- Credits` — все спеки модуля зелёные.
- [ ] `pnpm --filter @bigfin/server test -- FeaturesConfigure.credits` — зелёный.
- [ ] `pnpm typecheck` — 3 пакета чисто.
- [ ] `node packages/webapp/scripts/lang-check.js` — парность en↔ru.
- [ ] Миграция `latest → rollback → latest` (на CI/рабочем стеке).
- [ ] Ручная проверка на локальном стеке (флаг `credits` включить для орги): создать кредит → график построился → план появился в платёжном календаре → «Платёж внесён» → в Балансе долг уменьшился, в ОПиУ появились проценты, деньги списались со счёта.

---

## Self-review (выполнено при написании плана)

- **Покрытие спеки:** §1 данные → Task 4/5; §2 GL → Task 3/7/8; §3 счета → Task 6/7; §4 статья → Task 7; §5 календарь → Task 7/8; §6 чистые функции → Task 2/3; §7 сервер → Task 6–11; §8 фронт → Task 12/13; флаг → Task 1. Пробелов нет.
- **Плейсхолдеры:** код приведён для всех шагов; для фронта (Task 13) и хрупких моков (Task 8) даны конкретные образцы + явная отсылка к шаблонному файлу для сверки синтаксиса (react-query v4/v5) — это сознательная адаптация под существующие паттерны, не «TODO».
- **Согласованность типов:** `generateSchedule`/`ScheduleRow` (Task 2) ↔ поля installments в `insertGraph` (Task 7) ↔ колонки миграции (Task 4) совпадают (seqNo/dueDate/paymentAmount/principalAmount/interestAmount/remainingBalance/status). Имена транзакций `CreditDisbursement`/`CreditInstallmentPayment` едины в Task 3 (источник) и реэкспортируются в Task 6 → используются в Task 7/8/9. `liabilityAccountTypeForTerm` определён в Task 6, используется в Task 7.
