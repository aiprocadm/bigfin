# ㉒-1 Notifications Engine (core + email) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `Notifications` module behind flag `notifications` (default off) that, via a two-layer multi-tenant cron, evaluates three financial-risk events (cash gap, low balance, overdue invoices) per tenant and delivers a daily digest email (in the org language) to a configurable recipient, with 24h cooldown — designed with a pluggable `DeliveryChannel` so in-app (㉒-2) and Telegram (㉓) graft on later.

**Architecture:** `@Cron` body (no CLS) lists built tenants and enqueues one BullMQ job per tenant → `NotificationEvaluation.processor` (`@UseCls`, sets `organizationId`) checks the feature flag (early-exit if off), runs enabled evaluators, applies cooldown via the pure `selectToFire`, writes `notifications` rows, and delivers through enabled `DeliveryChannel`s (`EmailChannel` in ㉒-1). Mirrors existing patterns: `InventoryCost` processor (CLS), `ImportDeleteExpiredFilesJob` (@Cron), `SendSaleInvoiceMail` (Mail), `PayrollSettings` (settings group), `TenantRepository` (system knex + TenantModel).

**Tech Stack:** NestJS 10, Objection/Knex (MySQL/MariaDB, upperCase snake mapper), BullMQ, @nestjs/schedule, nestjs-i18n, Jest; React 18 + React Query + RHF + Zod + shadcn (webapp), react-intl-universal.

**Spec:** [docs/superpowers/specs/2026-06-15-notifications-engine-email-design.md](../specs/2026-06-15-notifications-engine-email-design.md)

**Branch:** `feat/notifications` from `develop` (create when the working tree is free + Bash available — see Preflight).

---

## Preflight (environment note)

At authoring time the working tree was occupied by a background session (branch `fix/relation-mappings-alias-require`) and the Bash classifier was unavailable. Before executing:
1. Ensure the background `@/`-fix session is done and the working tree is clean (`git status`).
2. `git checkout develop && git pull` (or fetch), then `git checkout -b feat/notifications`.
3. The spec + this plan are untracked docs already on disk — `git add` them on `feat/notifications` in Task 0.

---

## Parallelization map

- **Track A — Foundation** (T1 flag, T2 migrations, T3 models): no deps. T1/T2/T3 independent → parallel-safe.
- **Track B — Pure logic** (T4 selectToFire): no deps. Parallel with A.
- **Track C — Backend** (T5 constants/settings/dtos → T6 evaluators → T7 delivery/i18n → T8 processor → T9 cron → T10 wiring): depends on A+B; mostly sequential.
- **Track D — Frontend** (T11 flag/i18n/hooks, T12 page/route): depends on C's API (T10).
- **Track E — Verify** (T13): last.

Safe order: A+B → C → D → E.

---

## File Structure

**Server — new module** `packages/server/src/modules/Notifications/`:
- `Notifications.module.ts`, `Notifications.controller.ts`, `Notifications.application.ts`, `constants.ts`, `NotificationsSettings.service.ts`
- `dtos/NotificationPreferences.dto.ts`
- `models/NotificationPreference.model.ts`, `models/Notification.model.ts`
- `evaluators/CashGapEvaluator.service.ts`, `LowBalanceEvaluator.service.ts`, `OverdueEvaluator.service.ts`
- `delivery/DeliveryChannel.ts` (interface + token), `delivery/EmailChannel.service.ts`
- `jobs/NotificationsCron.ts`, `jobs/NotificationEvaluation.processor.ts`
- `queries/GetNotificationPreferences.service.ts`, `commands/UpdateNotificationPreferences.service.ts`
- `utils/selectToFire.ts` (+ `.spec.ts`), plus evaluator pure-helper specs.

**Server — modified:** `common/types/Features.ts`, `modules/Features/FeaturesConfigure.ts` (+ spec), `modules/Tenancy/TenancyModels/Tenancy.module.ts`, `app.module.ts`, 2 tenant migrations, `i18n/{en,ru}/notifications.json`, `static/mail/Notification.html`.

**Webapp:** `constants/features.tsx`, `hooks/query/notifications.tsx`, `containers/Notifications/NotificationsSettingsPage.tsx` (+ schema), `routes/dashboard.tsx`, `lang/{en,ru}/index.json`.

---

## Task 0: Branch + stage docs

- [ ] **Step 1: Create branch and stage spec+plan**

```bash
git checkout develop && git pull --ff-only
git checkout -b feat/notifications
git add docs/superpowers/specs/2026-06-15-notifications-engine-email-design.md docs/superpowers/plans/2026-06-15-notifications-engine-email.md
git commit -m "docs(notifications): спека и план ㉒-1 (ядро + email)"
```

---

# TRACK A — Foundation

## Task 1: Feature flag `notifications` (server)

**Files:** Modify `packages/server/src/common/types/Features.ts`, `packages/server/src/modules/Features/FeaturesConfigure.ts`; Test `packages/server/src/modules/Features/FeaturesConfigure.notifications.spec.ts`

- [ ] **Step 1: Failing test**

```typescript
// © 2026 Bigfin
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure — notifications', () => {
  it('флаг notifications присутствует и по умолчанию выключен', () => {
    const configure = new FeaturesConfigure({ get: () => undefined } as any);
    const entry = configure.getConfigure().find((f) => f.name === Features.NOTIFICATIONS);
    expect(entry).toBeDefined();
    expect(entry.defaultValue).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @bigfin/server test -- FeaturesConfigure.notifications`
- [ ] **Step 3: Add enum member** — in `Features.ts` enum, after `CREDITS = 'credits',` add `NOTIFICATIONS = 'notifications',`. (If `FIXED_ASSETS` already merged, place after it.)
- [ ] **Step 4: Add configure entry** — in `FeaturesConfigure.getConfigure()` array add `{ name: Features.NOTIFICATIONS, defaultValue: false },`
- [ ] **Step 5: Run, expect PASS**
- [ ] **Step 6: Commit** — `git commit -am "feat(notifications): серверный флаг notifications (default off)"`

---

## Task 2: Migrations (two tenant tables)

**Files:** Create `packages/server/src/database/tenant/migrations/20260615120000_create_notification_preferences_table.ts` and `..._120100_create_notifications_table.ts`

- [ ] **Step 1: notification_preferences migration**

```typescript
// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema.createTable('notification_preferences', (table) => {
    table.increments('id');
    table.string('event_type').notNullable().index(); // cash_gap | low_balance | overdue
    table.boolean('enabled').notNullable().defaultTo(false);
    table.text('channels').notNullable().defaultTo('["email"]'); // JSON
    table.text('threshold').nullable(); // JSON
    table.timestamps();
  });

exports.down = (knex) => knex.schema.dropTableIfExists('notification_preferences');
```

- [ ] **Step 2: notifications migration**

```typescript
// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema.createTable('notifications', (table) => {
    table.increments('id');
    table.string('event_type').notNullable().index();
    table.string('title').notNullable();
    table.text('body').notNullable();
    table.string('dedup_key').notNullable().index();
    table.text('payload').nullable(); // JSON
    table.dateTime('fired_at').notNullable().index();
    table.dateTime('read_at').nullable();
    table.integer('user_id').unsigned().nullable();
    table.text('channels_sent').nullable(); // JSON
    table.timestamps();
  });

exports.down = (knex) => knex.schema.dropTableIfExists('notifications');
```

- [ ] **Step 3: Verify both directions (requires DB + Bash)** — `pnpm tenants:migrate:latest && pnpm tenants:migrate:rollback && pnpm tenants:migrate:latest`. If no built tenant exists, this is a no-op — note it; the build flow runs tenant migrations on org build (validated in Task 13). Use Node 18 PATH (`export PATH="$HOME/AppData/Roaming/fnm/node-versions/v18.16.1/installation:$PATH"`).
- [ ] **Step 4: Commit** — `git add ...migrations/2026061512*.ts && git commit -m "feat(notifications): миграции notification_preferences + notifications"`

---

## Task 3: Models + Tenancy registration

**Files:** Create `models/NotificationPreference.model.ts`, `models/Notification.model.ts`; Modify `Tenancy.module.ts`

- [ ] **Step 1: NotificationPreference model**

```typescript
// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class NotificationPreference extends TenantBaseModel {
  eventType!: string;
  enabled!: boolean;
  channels!: string; // JSON string
  threshold!: string | null; // JSON string

  static get tableName() {
    return 'notification_preferences';
  }
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
```

- [ ] **Step 2: Notification model**

```typescript
// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class Notification extends TenantBaseModel {
  eventType!: string;
  title!: string;
  body!: string;
  dedupKey!: string;
  payload!: string | null;
  firedAt!: string;
  readAt!: string | null;
  userId!: number | null;
  channelsSent!: string | null;

  static get tableName() {
    return 'notifications';
  }
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
```

- [ ] **Step 3: Register in Tenancy** — in `Tenancy.module.ts`, add imports + add `NotificationPreference, Notification,` to the `models` array (same treatment as other models — the array is mapped through `RegisterTenancyModel`).
- [ ] **Step 4: Typecheck** — `pnpm typecheck`
- [ ] **Step 5: Commit** — `git commit -am "feat(notifications): модели + регистрация в Tenancy"`

---

# TRACK B — Pure logic

## Task 4: `selectToFire` (cooldown/dedup)

**Files:** Create `utils/selectToFire.ts` (+ `.spec.ts`)

- [ ] **Step 1: Failing test**

```typescript
// © 2026 Bigfin
import { selectToFire } from './selectToFire';

const cand = (dedupKey: string) => ({ eventType: dedupKey, dedupKey, title: 't', body: 'b', payload: {} });

describe('selectToFire', () => {
  it('пропускает кандидата, если есть свежее срабатывание в окне cooldown', () => {
    const recent = [{ dedupKey: 'cash_gap', firedAt: '2026-06-15T06:00:00Z' }];
    const out = selectToFire([cand('cash_gap')], recent, 24, '2026-06-15T07:00:00Z');
    expect(out).toHaveLength(0);
  });
  it('отправляет, если последнее срабатывание старше окна', () => {
    const recent = [{ dedupKey: 'cash_gap', firedAt: '2026-06-10T06:00:00Z' }];
    const out = selectToFire([cand('cash_gap')], recent, 24, '2026-06-15T07:00:00Z');
    expect(out.map((c) => c.dedupKey)).toEqual(['cash_gap']);
  });
  it('отправляет, если срабатываний ещё не было', () => {
    const out = selectToFire([cand('overdue')], [], 24, '2026-06-15T07:00:00Z');
    expect(out).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @bigfin/server test -- selectToFire`
- [ ] **Step 3: Implement**

```typescript
// © 2026 Bigfin
import * as moment from 'moment';

export interface Candidate {
  eventType: string;
  dedupKey: string;
  title: string;
  body: string;
  payload: any;
}
export interface RecentFire {
  dedupKey: string;
  firedAt: string;
}

/** Отбирает кандидатов, по которым не было срабатывания за последние cooldownHours. */
export const selectToFire = (
  candidates: Candidate[],
  recent: RecentFire[],
  cooldownHours: number,
  now: string,
): Candidate[] => {
  const cutoff = moment(now).subtract(cooldownHours, 'hours');
  const blocked = new Set(
    recent
      .filter((r) => moment(r.firedAt).isAfter(cutoff))
      .map((r) => r.dedupKey),
  );
  return candidates.filter((c) => !blocked.has(c.dedupKey));
};
```

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** — `git add utils/selectToFire.* && git commit -m "feat(notifications): чистый отбор кандидатов с учётом cooldown"`

---

# TRACK C — Backend module

## Task 5: constants + settings + DTOs

**Files:** Create `constants.ts`, `NotificationsSettings.service.ts`, `dtos/NotificationPreferences.dto.ts`

- [ ] **Step 1: constants.ts**

```typescript
// © 2026 Bigfin
export const NOTIFICATION_EVENTS = ['cash_gap', 'low_balance', 'overdue'] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const NOTIFICATIONS_QUEUE = 'notifications-evaluation';
export const NOTIFICATIONS_EVAL_JOB = 'evaluate-tenant';

export const DEFAULT_COOLDOWN_HOURS = 24;
export const DEFAULT_CASH_GAP_HORIZON_DAYS = 7;

export const SETTINGS_GROUP = 'notifications';

export const ERRORS = {
  INVALID_EVENT_TYPE: 'INVALID_EVENT_TYPE',
};
```

- [ ] **Step 2: NotificationsSettings.service.ts** (mirror `Payroll/PayrollSettings.service.ts` exactly for the `SETTINGS_PROVIDER` injection)

```typescript
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_GROUP, DEFAULT_COOLDOWN_HOURS } from './constants';

@Injectable()
export class NotificationsSettingsService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
  ) {}

  public async get() {
    const store = await this.settingsStore();
    const cooldownRaw = store.get(
      { group: SETTINGS_GROUP, key: 'cooldown_hours' },
      DEFAULT_COOLDOWN_HOURS,
    );
    const cooldownHours = Number(cooldownRaw) > 0 ? Number(cooldownRaw) : DEFAULT_COOLDOWN_HOURS;
    const recipientEmail = store.get(
      { group: SETTINGS_GROUP, key: 'recipient_email' },
      null,
    ) as string | null;
    return { cooldownHours, recipientEmail };
  }
}
```

> Confirm the exact import path of `SETTINGS_PROVIDER` / `SettingsStore` by opening `Payroll/PayrollSettings.service.ts`; use whatever it imports.

- [ ] **Step 3: DTOs**

```typescript
// © 2026 Bigfin
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ToNumber } from '@/common/decorators/Validators';
import { NOTIFICATION_EVENTS } from '../constants';

export class PreferenceItemDto {
  @IsIn(NOTIFICATION_EVENTS as unknown as string[])
  @ApiProperty({ enum: NOTIFICATION_EVENTS })
  eventType: string;

  @IsBoolean()
  @ApiProperty()
  enabled: boolean;

  @IsArray()
  @ApiProperty({ example: ['email'] })
  channels: string[];

  @IsOptional()
  @ApiPropertyOptional({ example: { horizonDays: 7 } })
  threshold?: Record<string, any>;
}

export class UpdateNotificationPreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  @ApiProperty({ type: [PreferenceItemDto] })
  preferences: PreferenceItemDto[];

  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({ example: 'owner@org.ru' })
  recipientEmail?: string;

  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ example: 24 })
  cooldownHours?: number;
}
```

- [ ] **Step 4: Typecheck + commit** — `pnpm typecheck`; `git add modules/Notifications/constants.ts modules/Notifications/NotificationsSettings.service.ts modules/Notifications/dtos/ && git commit -m "feat(notifications): константы, настройки (получатель/cooldown), DTO"`

---

## Task 6: Evaluators (3 services + pure helpers)

**Files:** Create `evaluators/CashGapEvaluator.service.ts`, `LowBalanceEvaluator.service.ts`, `OverdueEvaluator.service.ts` (+ pure-helper `.spec.ts` each)

Each evaluator returns `Candidate[]`. The threshold DECISION is a small exported pure function (unit-tested); the service wires the data source to it.

- [ ] **Step 1: CashGap pure helper + test**

Create `evaluators/cashGapDecide.ts`:
```typescript
// © 2026 Bigfin
import { Candidate } from '../utils/selectToFire';

export const cashGapDecide = (
  gap: { date: string; amount: number; daysFromStart: number } | null,
  horizonDays: number,
): Candidate[] => {
  if (!gap || gap.daysFromStart > horizonDays) return [];
  return [{
    eventType: 'cash_gap',
    dedupKey: 'cash_gap',
    title: 'cash_gap.title',
    body: 'cash_gap.body',
    payload: gap,
  }];
};
```
Test `evaluators/cashGapDecide.spec.ts`:
```typescript
// © 2026 Bigfin
import { cashGapDecide } from './cashGapDecide';
describe('cashGapDecide', () => {
  it('нет разрыва → нет кандидата', () => {
    expect(cashGapDecide(null, 7)).toHaveLength(0);
  });
  it('разрыв за горизонтом → нет', () => {
    expect(cashGapDecide({ date: '2026-07-01', amount: 100, daysFromStart: 20 }, 7)).toHaveLength(0);
  });
  it('разрыв в горизонте → кандидат с payload', () => {
    const out = cashGapDecide({ date: '2026-06-20', amount: 5000, daysFromStart: 5 }, 7);
    expect(out).toHaveLength(1);
    expect(out[0].payload.amount).toBe(5000);
  });
});
```

- [ ] **Step 2: LowBalance pure helper + test**

Create `evaluators/lowBalanceDecide.ts`:
```typescript
// © 2026 Bigfin
import { Candidate } from '../utils/selectToFire';

export const lowBalanceDecide = (
  accounts: { name: string; amount: number }[],
  minAmount: number,
): Candidate[] => {
  const below = accounts.filter((a) => Number(a.amount) < minAmount);
  if (!below.length) return [];
  return [{
    eventType: 'low_balance',
    dedupKey: 'low_balance',
    title: 'low_balance.title',
    body: 'low_balance.body',
    payload: { minAmount, accounts: below },
  }];
};
```
Test (3 cases: none below → empty; some below → one digest candidate listing them; boundary `amount === minAmount` not "below"). Write the spec analogous to cashGapDecide.

- [ ] **Step 3: Overdue pure helper + test**

Create `evaluators/overdueDecide.ts`:
```typescript
// © 2026 Bigfin
import { Candidate } from '../utils/selectToFire';

export const overdueDecide = (
  invoices: { id: number; amount: number; dueDate: string }[],
): Candidate[] => {
  if (!invoices.length) return [];
  const total = Math.round(invoices.reduce((s, i) => s + Number(i.amount), 0) * 100) / 100;
  return [{
    eventType: 'overdue',
    dedupKey: 'overdue',
    title: 'overdue.title',
    body: 'overdue.body',
    payload: { count: invoices.length, total, top: invoices.slice(0, 5) },
  }];
};
```
Test (empty → []; non-empty → one candidate with count+total).

- [ ] **Step 4: Evaluator services** wire data → helper. Example `CashGapEvaluator.service.ts`:
```typescript
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { GetPaymentCalendarForecastService } from '@/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service';
import { Candidate } from '../utils/selectToFire';
import { cashGapDecide } from './cashGapDecide';
import { DEFAULT_CASH_GAP_HORIZON_DAYS } from '../constants';

@Injectable()
export class CashGapEvaluatorService {
  constructor(
    private readonly tenancyContext: TenancyContext,
    private readonly forecast: GetPaymentCalendarForecastService,
  ) {}

  public async evaluate(threshold: any): Promise<Candidate[]> {
    const tenant = await this.tenancyContext.getTenant();
    // horizon as configured; forecast over that window
    const horizonDays = Number(threshold?.horizonDays) || DEFAULT_CASH_GAP_HORIZON_DAYS;
    const res: any = await this.forecast.getForecast(tenant.id, {
      // build the query DTO the same way the PaymentCalendar controller does;
      // confirm GetPaymentCalendarQueryDto fields (fromDate/toDate horizon).
    } as any);
    return cashGapDecide(res?.gap ?? null, horizonDays);
  }
}
```
**Confirmed (resolved during planning):** `getForecast(tenantId, query)` where `query: GetPaymentCalendarQueryDto = { fromDate, toDate }` (+ branches). CashGap evaluator builds `{ fromDate: moment().format('YYYY-MM-DD'), toDate: moment().add(horizonDays,'days').format('YYYY-MM-DD') }` and reads `res.gap`. `LowBalanceEvaluator` queries `accountModel().query().whereIn('accountType', CASH_ACCOUNT_TYPES)` and maps `{name, amount}`. `OverdueEvaluator` uses `saleInvoiceModel().query().modify('overdueInvoicesFromDate', today)` and maps `{id, amount: Number(inv.dueAmount), dueDate: inv.dueDate}` — the overdue/outstanding field is **`dueAmount`** (confirmed in `Debts/GetDebtsOverview.service.ts`).

- [ ] **Step 5: Run helper specs, typecheck, commit** — `pnpm --filter @bigfin/server test -- Decide`; `pnpm typecheck`; `git add modules/Notifications/evaluators/ && git commit -m "feat(notifications): оценщики разрыва/остатка/просрочки + чистые решающие функции"`

---

## Task 7: Delivery (interface + EmailChannel + template + i18n)

**Files:** Create `delivery/DeliveryChannel.ts`, `delivery/EmailChannel.service.ts`, `packages/server/static/mail/Notification.html`, `packages/server/src/i18n/{en,ru}/notifications.json`

- [ ] **Step 1: DeliveryChannel interface + token**

```typescript
// © 2026 Bigfin
import { Candidate } from '../utils/selectToFire';

export interface DeliveryChannel {
  readonly key: string; // 'email' | 'in_app' | 'telegram'
  deliver(candidate: Candidate, recipient: string, lang: string): Promise<void>;
}
```

- [ ] **Step 2: i18n notifications.json (en + ru, parity)**

`i18n/en/notifications.json`:
```json
{
  "cash_gap": { "title": "Cash gap approaching", "body": "A cash shortfall of {amount} is expected on {date} ({days} days away)." },
  "low_balance": { "title": "Low account balance", "body": "{count} account(s) are below your minimum threshold." },
  "overdue": { "title": "Overdue customer invoices", "body": "{count} invoice(s) are overdue, totaling {total}." },
  "email_footer": "Open Bigfin to see details."
}
```
`i18n/ru/notifications.json` (same keys, RU values: «Приближается кассовый разрыв», «{amount} не хватит {date} (через {days} дн.)», «Остаток ниже минимума», «{count} счёт(ов) ниже вашего порога», «Просроченные счета клиентов», «Просрочено счетов: {count} на сумму {total}», «Откройте Bigfin, чтобы посмотреть детали.»).

- [ ] **Step 3: Generic email template** `static/mail/Notification.html` (Mustache):
```html
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
  <h2 style="color:#1a1a1a">{{title}}</h2>
  <p style="font-size:15px;color:#333">{{body}}</p>
  <p style="font-size:13px;color:#888">{{footer}}</p>
</div>
```

- [ ] **Step 4: EmailChannel** — build subject/body via `OrganizationI18nService`, render template, send via `MailTransporter` (mirror `SendSaleInvoiceMail.sendMail`):
```typescript
// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';
import { MailTransporter } from '@/modules/Mail/MailTransporter.service';
import { Mail } from '@/modules/Mail/Mail';
import { DeliveryChannel } from './DeliveryChannel';
import { Candidate } from '../utils/selectToFire';

@Injectable()
export class EmailChannelService implements DeliveryChannel {
  readonly key = 'email';
  constructor(
    private readonly orgI18n: OrganizationI18nService,
    private readonly mailTransporter: MailTransporter,
  ) {}

  public async deliver(candidate: Candidate, recipient: string): Promise<void> {
    const args = candidate.payload ?? {};
    const subject = await this.orgI18n.translate(`notifications.${candidate.eventType}.title`);
    const body = await this.orgI18n.translate(`notifications.${candidate.eventType}.body`, { args });
    const footer = await this.orgI18n.translate('notifications.email_footer');
    const mail = new Mail()
      .setSubject(subject)
      .setTo(recipient)
      .setView('mail/Notification.html')
      .setData({ title: subject, body, footer } as any);
    await this.mailTransporter.send(mail);
  }
}
```
> Confirm `Mail.setView` path convention (the recon shows templates under `static/mail/`); confirm i18n key namespacing (the server flattens to `notifications.cash_gap.title`). Verify `translate` arg-interpolation works with `{amount}` tokens (nestjs-i18n + args).

- [ ] **Step 5: Typecheck + lang/i18n parity** — `pnpm typecheck`; `node packages/server/scripts/i18n-parity-check.js`; commit.

---

## Task 8: Evaluation processor (CLS + cooldown + deliver)

**Files:** Create `jobs/NotificationEvaluation.processor.ts`

- [ ] **Step 1: Processor** (mirror `InventoryCost/processors/ComputeItemCost.processor.ts` for `@Processor`/`WorkerHost`/`@UseCls`)

```typescript
// © 2026 Bigfin
import { Inject, Scope } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ClsService } from 'nestjs-cls';
import * as moment from 'moment';
import { UseCls } from '...'; // same import as ComputeItemCost.processor
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { FeatureService } from '...'; // service that answers featureCan(Features.NOTIFICATIONS); confirm from how controllers/UI check flags
import { NOTIFICATIONS_QUEUE } from '../constants';
import { Notification } from '../models/Notification.model';
import { NotificationPreference } from '../models/NotificationPreference.model';
import { NotificationsSettingsService } from '../NotificationsSettings.service';
import { CashGapEvaluatorService } from '../evaluators/CashGapEvaluator.service';
import { LowBalanceEvaluatorService } from '../evaluators/LowBalanceEvaluator.service';
import { OverdueEvaluatorService } from '../evaluators/OverdueEvaluator.service';
import { EmailChannelService } from '../delivery/EmailChannel.service';
import { selectToFire } from '../utils/selectToFire';
import { resolveRecipient } from '../utils/resolveRecipient';

@Processor({ name: NOTIFICATIONS_QUEUE, scope: Scope.REQUEST })
export class NotificationEvaluationProcessor extends WorkerHost {
  constructor(
    private readonly cls: ClsService,
    private readonly featureService: FeatureService,
    private readonly settings: NotificationsSettingsService,
    private readonly cashGap: CashGapEvaluatorService,
    private readonly lowBalance: LowBalanceEvaluatorService,
    private readonly overdue: OverdueEvaluatorService,
    private readonly email: EmailChannelService,
    @Inject(NotificationPreference.name) private readonly prefModel: TenantModelProxy<typeof NotificationPreference>,
    @Inject(Notification.name) private readonly notifModel: TenantModelProxy<typeof Notification>,
  ) { super(); }

  @UseCls()
  async process(job: Job<{ organizationId: string }>) {
    this.cls.set('organizationId', job.data.organizationId);

    // Early-exit if the feature is off for this tenant.
    const enabled = await this.featureService.featureCan(/* Features.NOTIFICATIONS */ 'notifications');
    if (!enabled) return { skipped: 'feature_off' };

    const prefs: any[] = await this.prefModel().query().where('enabled', true);
    if (!prefs.length) return { posted: 0 };

    const { cooldownHours, recipientEmail } = await this.settings.get();
    const recipient = await resolveRecipient(recipientEmail);

    // Run enabled evaluators → candidates.
    const candidates = [];
    for (const p of prefs) {
      const threshold = p.threshold ? JSON.parse(p.threshold) : {};
      if (p.eventType === 'cash_gap') candidates.push(...await this.cashGap.evaluate(threshold));
      if (p.eventType === 'low_balance') candidates.push(...await this.lowBalance.evaluate(threshold));
      if (p.eventType === 'overdue') candidates.push(...await this.overdue.evaluate(threshold));
    }
    if (!candidates.length) return { posted: 0 };

    // Cooldown: pull recent fires for these dedup keys.
    const recent: any[] = await this.notifModel()
      .query()
      .whereIn('dedupKey', candidates.map((c) => c.dedupKey))
      .orderBy('firedAt', 'desc');
    const now = moment().toISOString();
    const toFire = selectToFire(candidates, recent, cooldownHours, now);

    let posted = 0;
    for (const c of toFire) {
      // Translate title/body for the stored record (org language) — reuse i18n via the channel or org-i18n.
      const inserted: any = await this.notifModel().query().insertAndFetch({
        eventType: c.eventType,
        title: c.title,            // i18n key; render human text at delivery + store rendered if desired
        body: c.body,
        dedupKey: c.dedupKey,
        payload: JSON.stringify(c.payload ?? {}),
        firedAt: moment().toMySqlDateTime(),
        channelsSent: JSON.stringify([]),
      } as any);

      const channelsSent: string[] = [];
      if (recipient) {
        try { await this.email.deliver(c, recipient); channelsSent.push('email'); }
        catch (e) { console.error('notification email failed', e); }
      }
      await this.notifModel().query().findById(inserted.id).patch({ channelsSent: JSON.stringify(channelsSent) } as any);
      posted++;
    }
    return { posted };
  }
}
```

**Confirmed (resolved during planning):** `import { ClsService, UseCls } from 'nestjs-cls'` (from `ComputeItemCost.processor.ts`). Feature check = **`FeaturesManager.accessible(feature: string)`** (`modules/Features/FeaturesManager.ts`, delegates to `FeaturesSettingsDriver.accessible`, reads tenant settings under CLS) — inject `FeaturesManager`, call `await this.featuresManager.accessible(Features.NOTIFICATIONS)`; early-exit if false. `toMySqlDateTime()` is a moment extension (used in `Tenant.repository.ts`). Still to resolve at execution: owner-email lookup in `resolveRecipient` (read tenant→owner via `USER_TENANTS`/`USERS` system tables; if unresolved, return null → processor logs and skips email). Store the *rendered* title/body if you want the inbox (㉒-2) to show human text — optional in ㉒-1; keys are acceptable for now since email renders live.

- [ ] **Step 2: resolveRecipient util** `utils/resolveRecipient.ts` — returns `recipientEmail` if set, else the org owner's email (read from system `USERS` via the tenant's owner; confirm the owner lookup — `TenancyContext.getSystemUser()` gives the acting user, but the cron has no user; resolve owner via tenant→user mapping `USER_TENANTS`). If owner can't be resolved, return null and the processor skips email (logs).
- [ ] **Step 3: Typecheck + commit** — `pnpm typecheck`; commit.

---

## Task 9: Cron (enumerate tenants → enqueue)

**Files:** Create `jobs/NotificationsCron.ts`

- [ ] **Step 1: Cron** (mirror `ImportDeleteExpiredFilesJob` for `@Cron`; mirror `Tenant.repository.ts` for system knex + TenantModel)

```typescript
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Knex } from 'knex';
import { SystemKnexConnection } from '@/modules/System/SystemDB/SystemDB.constants';
import { TenantModel } from '@/modules/System/models/TenantModel';
import { NOTIFICATIONS_QUEUE, NOTIFICATIONS_EVAL_JOB } from '../constants';

@Injectable()
export class NotificationsCron {
  constructor(
    @Inject(SystemKnexConnection) private readonly sysKnex: Knex,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}

  // Daily at 07:00 server time. Body has NO CLS — only enqueues per-tenant jobs.
  @Cron('0 7 * * *')
  async dispatch() {
    const tenants: any[] = await TenantModel.bindKnex(this.sysKnex)
      .query()
      .whereNotNull('builtAt');
    for (const t of tenants) {
      await this.queue.add(NOTIFICATIONS_EVAL_JOB, { organizationId: t.organizationId });
    }
  }
}
```

- [ ] **Step 2: Typecheck + commit** — `pnpm typecheck`; commit. (No unit test for the cron timing; the enqueue logic is trivial and exercised in Task 13.)

---

## Task 10: Queries/commands + controller + module + App.module

**Files:** Create `queries/GetNotificationPreferences.service.ts`, `commands/UpdateNotificationPreferences.service.ts`, `Notifications.application.ts`, `Notifications.controller.ts`, `Notifications.module.ts`; Modify root app module.

- [ ] **Step 1: GetNotificationPreferences** — returns `{ preferences: [{eventType, enabled, channels, threshold}], recipientEmail, cooldownHours }`. For each of `NOTIFICATION_EVENTS`, return the stored row or a default (enabled:false, channels:['email'], threshold per type default). Merge settings from `NotificationsSettingsService`.
- [ ] **Step 2: UpdateNotificationPreferences** — upsert a row per `preferences[]` item (find-by `eventType` → patch/insert; store `channels`/`threshold` as JSON strings); write `recipient_email`/`cooldown_hours` to settings (group `notifications`). Validate `eventType ∈ NOTIFICATION_EVENTS` (else `ERRORS.INVALID_EVENT_TYPE`).
- [ ] **Step 3: Application** — thin delegation (`getPreferences()`, `updatePreferences(dto)`).
- [ ] **Step 4: Controller** `@Controller('notifications')` (copy guard/decorator imports from `Credits.controller.ts`):
```typescript
@Get('preferences') getPreferences() { return this.app.getPreferences(); }
@Put('preferences') @RequirePermission('manage','all') update(@Body() dto: UpdateNotificationPreferencesDto) { return this.app.updatePreferences(dto); }
```
- [ ] **Step 5: Module** — imports `[TenancyDatabaseModule, TenancyModule, MailModule, OrganizationI18nModule, PaymentCalendarModule, DebtsModule(or SaleInvoices), AccountsModule, FeaturesModule, BullModule.registerQueue({name: NOTIFICATIONS_QUEUE}), BullBoardModule.forFeature({...})]`; controllers `[NotificationsController]`; providers = application + settings + 3 evaluators + EmailChannelService + processor + cron + get/update services. Confirm which modules export the source services (PaymentCalendar forecast, SaleInvoice model/Debts, Account model, Mail, OrganizationI18n, Features) and import those.
- [ ] **Step 6: Register module** in root `app.module.ts` next to other feature modules.
- [ ] **Step 7: Typecheck + run all Notifications unit tests** — `pnpm typecheck && pnpm --filter @bigfin/server test -- Notifications`; commit.

---

# TRACK D — Frontend

## Task 11: Web flag + i18n + query hooks

**Files:** Modify `constants/features.tsx`, `lang/{en,ru}/index.json`; Create `hooks/query/notifications.tsx`

- [ ] **Step 1: Web flag** — add `Notifications: 'notifications'` to `constants/features.tsx`.
- [ ] **Step 2: i18n keys** (en+ru parity) — `notifications.settings.title`, per-event labels, `notifications.settings.recipient`, `notifications.settings.cooldown`, `notifications.settings.horizon_days`, `notifications.settings.min_balance`, `notifications.settings.save`, toasts `notifications.toast.saved`/`.error`. Run `node packages/webapp/scripts/lang-check.js` (expect 0).
- [ ] **Step 3: Query hooks** `hooks/query/notifications.tsx` (mirror `hooks/query/credits.tsx` imports): `useNotificationPreferences()` (GET `notifications/preferences`), `useUpdateNotificationPreferences()` (PUT `notifications/preferences`, invalidates the query).
- [ ] **Step 4: Typecheck + commit** — `pnpm typecheck`; commit.

## Task 12: Settings page + route

**Files:** Create `containers/Notifications/NotificationsSettingsPage.tsx`, `containers/Notifications/schema.ts`; Modify `routes/dashboard.tsx`

- [ ] **Step 1:** Build the page (mirror an existing shadcn settings form; gate `if (!featureCan('notifications')) return null;`): RHF+Zod form with 3 event toggles, per-event threshold inputs (horizon days for cash_gap, min amount for low_balance), recipient email, cooldown hours. Submit → `useUpdateNotificationPreferences()`. All strings via `intl.get('notifications.*')`.
- [ ] **Step 2:** Register route `/settings/notifications` in `routes/dashboard.tsx` (same object shape as neighbors); add a nav entry gated by `featureCan('notifications')` if a menu config exists.
- [ ] **Step 3: Typecheck + lang-check + commit.**

---

# TRACK E — Verification

## Task 13: End-to-end verification

- [ ] **Step 1: Static** — `pnpm typecheck` (3 pkgs); `node packages/webapp/scripts/lang-check.js`; `node packages/server/scripts/i18n-parity-check.js`; `pnpm --filter @bigfin/server test -- Notifications` (+ `selectToFire`, `*Decide`, `FeaturesConfigure.notifications`).
- [ ] **Step 2: Live (requires built tenant + Bash)** — start stack (run-bigfin). Build/confirm a tenant (this runs the new tenant migrations → validates Task 2 up). Enable the `notifications` feature for the tenant; via API `PUT /notifications/preferences` enable `cash_gap`+`low_balance`+`overdue` with thresholds + a recipient. Manually trigger the cron path: either call the processor's queue directly (add a job `{organizationId}` to `notifications-evaluation`) or temporarily invoke `NotificationsCron.dispatch()`. **Verify:** a `NOTIFICATIONS` row is written for each fired event; `channels_sent` reflects email attempt; re-run → cooldown prevents duplicate rows (idempotent).
- [ ] **Step 3: Mail caveat** — local SMTP is a stub (run-bigfin notes mail/S3/PDF don't work locally). Do NOT claim delivery. Verify the email job was attempted (logs) + the `notifications` row exists. Real delivery → staging/CI.
- [ ] **Step 4: Report** — what passed, what's blocked (mail delivery), and confirm cooldown idempotency on the live tenant.

---

## Self-Review (plan author)

- **Spec coverage:** §1 cron/flag → T1,T8,T9; §3 data → T2,T3; §4 evaluators → T6; §5 delivery → T7; §6 cooldown → T4,T8; §7 frontend → T11,T12; §9 flag → T1,T8(early-exit),T11; §10 tests → T4,T6,T13. All covered.
- **Placeholder scan:** Tasks 6/8 contain explicit `> Confirm ...` notes pointing at REAL template files for signatures I could not fully verify with Bash unavailable (PaymentCalendar query DTO, SaleInvoice due-amount field, feature-check service, UseCls import, owner-email lookup). These are concrete pointers, not vague TODOs — the executing agent resolves each against the named file. Where code is shown, it is complete.
- **Type consistency:** `Candidate` defined in `utils/selectToFire.ts`, reused by evaluators + processor; `NOTIFICATION_EVENTS`/`NOTIFICATIONS_QUEUE` from `constants.ts`; model prop names camelCase (`eventType`, `dedupKey`, `firedAt`) ↔ snake columns via the global mapper (as elsewhere). DTO field names (`preferences`, `recipientEmail`, `cooldownHours`) consistent across DTO ↔ Update service ↔ frontend hooks.

**Known assumption:** the executing agent must verify, against real files, the items flagged with `> Confirm` in Tasks 6 and 8 (signatures/imports that Bash-unavailability prevented confirming at authoring time). Treat those as required verification steps, not optional.
