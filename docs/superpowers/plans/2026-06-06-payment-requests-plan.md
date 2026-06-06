# Заявки на оплату (㉔) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Контур согласования платежей: сотрудник создаёт заявку → админ одобряет → одобренная заявка появляется в платёжном календаре как плановый отток. За флагом `PAYMENT_REQUESTS`.

**Architecture:** Новый модуль `PaymentRequests` зеркалит `PaymentCalendar`. Одна новая additive tenant-таблица `payment_requests`. Одобрение в одной транзакции патчит заявку и **вставляет `planned_operation`** (`source_type='payment_request'`) — календарь подхватывает её сам. Согласование гейтится существующим CASL (`@RequirePermission('manage','all')` = админ). Статус-воркфлоу — чистая функция (TDD).

**Tech Stack:** NestJS 10, Objection/Knex (tenant), TypeScript, Jest; React 18 + React Query + RHF + Zod; react-intl-universal.

**Spec:** [2026-06-06-payment-requests-design.md](../specs/2026-06-06-payment-requests-design.md)

**Статус (2026-06-06):** ✅ **РЕАЛИЗОВАН** (бэкенд+фронт), 15 коммитов на `feat/payment-requests`. 8 серверных тестов + server/webapp typecheck + lang-check — зелёные. Не запушено. Полный прогон тестов/миграции — CI; визуальная приёмка — staging.

---

## Pre-flight

- **Ветка:** `feat/payment-requests` (от `origin/develop`). **Базлайн — develop**: на этой ветке НЕТ изменений ⑭ (debts). Перед правкой общих файлов (`Features.ts`, `FeaturesConfigure.ts`, `App.module.ts`, `Tenancy.module.ts`, `hooks/query/types.tsx`, `routes/dashboard.tsx`) — **прочитать их заново** (develop-версии).
- **Node:** `fnm use 18.16.1`; только `pnpm`. Тесты на Node 24 проходят (мокированы).
- **Серверные тесты:** `pnpm --filter @bigfin/server test -- <путь>`. **Типы:** `pnpm --filter @bigfin/server typecheck` / `pnpm --filter @bigfin/webapp typecheck`. **i18n:** `node packages/webapp/scripts/lang-check.js`.
- **Миграции:** локально БД нет — рабочий `down()`, прогон в CI. Мирроринг `20260531120000_create_planned_operations_table.ts`.
- **Коммиты:** атомарные, локальные, **lowercase subject** (commitlint!), trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Push/PR — по запросу.
- **Копирайт** новых файлов: `// © 2026 Bigfin`.

---

## File Structure

**Backend новый модуль** `packages/server/src/modules/PaymentRequests/`: `constants.ts`, `PaymentRequests.interfaces.ts`, `models/PaymentRequest.model.ts`, `utils/validateStatusTransition.ts(+spec)`, `dtos/PaymentRequest.dto.ts`, `dtos/GetPaymentRequestsQuery.dto.ts`, `commands/{CreatePaymentRequest,ApprovePaymentRequest,RejectPaymentRequest,CancelPaymentRequest,CommandPaymentRequestValidator}.service.ts`, `queries/{GetPaymentRequests,GetPaymentRequest}.service.ts`, `PaymentRequests.{application,controller,module}.ts`.

**Backend правки (develop-версии):** `common/types/Features.ts`, `modules/Features/FeaturesConfigure.ts`, `modules/Tenancy/TenancyModels/Tenancy.module.ts`, `modules/App/App.module.ts`, `database/tenant/migrations/<ts>_create_payment_requests_table.ts`.

**Frontend:** `hooks/query/paymentRequests.tsx`, `hooks/query/types.tsx`, `containers/PaymentRequests/{PaymentRequestsPage,PaymentRequestDialog,schemas}.tsx/ts`, `routes/dashboard.tsx`, `lang/{en,ru}/index.json`.

---

# PART A — Фундамент

## Task A1: Флаг `PAYMENT_REQUESTS`

**Files:** Modify `packages/server/src/common/types/Features.ts`, `packages/server/src/modules/Features/FeaturesConfigure.ts`

- [ ] **Step 1:** В `Features.ts` enum после `VENDORS_LIST_V2 = 'vendors_list_v2',` добавить:
```ts
  PAYMENT_REQUESTS = 'payment_requests',
```
- [ ] **Step 2:** В `FeaturesConfigure.getConfigure()` после блока `VENDORS_LIST_V2` добавить:
```ts
      {
        name: Features.PAYMENT_REQUESTS,
        defaultValue: false,
      },
```
- [ ] **Step 3:** `pnpm --filter @bigfin/server typecheck` → PASS.
- [ ] **Step 4:** Commit: `feat(payment-requests): add PAYMENT_REQUESTS feature flag (default off)`

## Task A2: Константы и интерфейсы

**Files:** Create `packages/server/src/modules/PaymentRequests/constants.ts`, `PaymentRequests.interfaces.ts`

- [ ] **Step 1: constants.ts**
```ts
// © 2026 Bigfin
// eslint-disable-next-line import/prefer-default-export
export const ERRORS = {
  PAYMENT_REQUEST_NOT_FOUND: 'PAYMENT_REQUEST_NOT_FOUND',
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
  CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
};

export const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export const PAYMENT_REQUEST_SOURCE = 'payment_request';
```
- [ ] **Step 2: PaymentRequests.interfaces.ts**
```ts
// © 2026 Bigfin
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
```
- [ ] **Step 3:** typecheck → PASS. **Commit:** `feat(payment-requests): module constants and interfaces`

## Task A3: `validateStatusTransition` (TDD)

**Files:** Test `packages/server/src/modules/PaymentRequests/utils/validateStatusTransition.spec.ts`; Create `.../utils/validateStatusTransition.ts`

- [ ] **Step 1: Падающий тест**
```ts
// © 2026 Bigfin
import { validateStatusTransition } from './validateStatusTransition';

describe('validateStatusTransition', () => {
  it('разрешает pending → approved/rejected/cancelled', () => {
    expect(() => validateStatusTransition('pending', 'approved')).not.toThrow();
    expect(() => validateStatusTransition('pending', 'rejected')).not.toThrow();
    expect(() => validateStatusTransition('pending', 'cancelled')).not.toThrow();
  });
  it('разрешает approved → cancelled (отзыв)', () => {
    expect(() => validateStatusTransition('approved', 'cancelled')).not.toThrow();
  });
  it('запрещает approved → pending и rejected → approved', () => {
    expect(() => validateStatusTransition('approved', 'pending')).toThrow();
    expect(() => validateStatusTransition('rejected', 'approved')).toThrow();
    expect(() => validateStatusTransition('cancelled', 'approved')).toThrow();
  });
});
```
- [ ] **Step 2:** Run `pnpm --filter @bigfin/server test -- src/modules/PaymentRequests/utils/validateStatusTransition.spec.ts` → FAIL.
- [ ] **Step 3: Реализация**
```ts
// © 2026 Bigfin
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS } from '../constants';

const ALLOWED: Record<string, string[]> = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['cancelled'],
  rejected: [],
  cancelled: [],
};

/** Бросает ServiceError, если переход статуса заявки недопустим. */
export function validateStatusTransition(current: string, next: string): void {
  if (!ALLOWED[current]?.includes(next)) {
    throw new ServiceError(ERRORS.INVALID_STATUS_TRANSITION);
  }
}
```
- [ ] **Step 4:** Run the test → PASS.
- [ ] **Step 5: Commit** `feat(payment-requests): add validateStatusTransition (TDD)`

## Task A4: Миграция `payment_requests`

**Files:** Create `packages/server/src/database/tenant/migrations/20260606130000_create_payment_requests_table.ts`

- [ ] **Step 1: Миграция (additive, рабочий down)**
```ts
// © 2026 Bigfin
exports.up = (knex) => {
  return knex.schema.createTable('payment_requests', (table) => {
    table.increments('id');
    table.decimal('amount', 13, 3).notNullable();
    table.string('currency_code', 3).notNullable();
    table.integer('article_id').unsigned().nullable().references('id').inTable('management_articles');
    table.integer('contact_id').unsigned().nullable().references('id').inTable('contacts');
    table.integer('account_id').unsigned().nullable().references('id').inTable('accounts');
    table.integer('branch_id').unsigned().nullable();
    table.date('due_date').notNullable().index();
    table.string('description').nullable();
    table.string('status').notNullable().defaultTo('pending').index();
    table.integer('created_by').unsigned().notNullable().index();
    table.integer('approved_by').unsigned().nullable();
    table.datetime('approved_at').nullable();
    table.integer('planned_operation_id').unsigned().nullable().references('id').inTable('planned_operations');
    table.timestamps();
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists('payment_requests');
```
- [ ] **Step 2:** typecheck → PASS. **Commit** `feat(payment-requests): add payment_requests table migration (additive, down())`

## Task A5: Модель + регистрация в Tenancy

**Files:** Create `.../models/PaymentRequest.model.ts`; Modify `Tenancy.module.ts`

- [ ] **Step 1: Модель**
```ts
// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class PaymentRequest extends TenantBaseModel {
  amount!: number;
  currencyCode!: string;
  articleId!: number | null;
  contactId!: number | null;
  accountId!: number | null;
  branchId!: number | null;
  dueDate!: string;
  description!: string | null;
  status!: string;
  createdBy!: number;
  approvedBy!: number | null;
  approvedAt!: string | null;
  plannedOperationId!: number | null;

  static get tableName() {
    return 'payment_requests';
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
- [ ] **Step 2:** В `Tenancy.module.ts` (develop-версия — прочитать!) добавить import после `BudgetLine`:
```ts
import { PaymentRequest } from '@/modules/PaymentRequests/models/PaymentRequest.model';
```
и в массив `models` перед `TenantUser,`:
```ts
  PaymentRequest,
```
- [ ] **Step 3:** typecheck → PASS. **Commit** `feat(payment-requests): add PaymentRequest model and tenancy registration`

---

# PART B — Команды

## Task B1: DTO

**Files:** Create `.../dtos/PaymentRequest.dto.ts`, `.../dtos/GetPaymentRequestsQuery.dto.ts`

- [ ] **Step 1: PaymentRequest.dto.ts** (паттерн — `PaymentCalendar/dtos/PlannedOperation.dto.ts`)
```ts
// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsPositive, IsString } from 'class-validator';

class CommandPaymentRequestDto {
  @ToNumber() @IsNumber() @IsPositive()
  @ApiProperty({ example: 120000 })
  amount: number;

  @IsString() @IsOptional()
  @ApiPropertyOptional({ example: 'RUB' })
  currencyCode?: string;

  @ToNumber() @IsInt() @IsOptional()
  @ApiPropertyOptional({ example: 3, description: 'Management article id' })
  articleId?: number;

  @ToNumber() @IsInt() @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Contact id' })
  contactId?: number;

  @ToNumber() @IsInt() @IsOptional()
  @ApiPropertyOptional({ example: 12, description: 'Account id' })
  accountId?: number;

  @ToNumber() @IsInt() @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Branch id' })
  branchId?: number;

  @IsDateString()
  @ApiProperty({ example: '2026-06-15', description: 'Due date' })
  dueDate: string;

  @IsString() @IsOptional()
  @ApiPropertyOptional({ example: 'Оплата аренды за июнь' })
  description?: string;
}

export class CreatePaymentRequestDto extends CommandPaymentRequestDto {}
export class EditPaymentRequestDto extends CommandPaymentRequestDto {}
```
- [ ] **Step 2: GetPaymentRequestsQuery.dto.ts**
```ts
// © 2026 Bigfin
import { IsOptional } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { REQUEST_STATUSES } from '../constants';

export class GetPaymentRequestsQueryDto {
  @IsString() @IsIn(REQUEST_STATUSES as unknown as string[]) @IsOptional()
  @ApiPropertyOptional({ enum: REQUEST_STATUSES })
  status?: string;
}
```
- [ ] **Step 3:** typecheck → PASS. **Commit** `feat(payment-requests): add request DTOs`

## Task B2: Валидатор + Create (TDD)

**Files:** Create `.../commands/CommandPaymentRequestValidator.service.ts`, `.../commands/CreatePaymentRequest.service.ts`, `.../commands/CreatePaymentRequest.service.spec.ts`

- [ ] **Step 1: Валидатор** (паттерн — `CommandPlannedOperationValidator.service.ts`)
```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { Contact } from '@/modules/Contacts/models/Contact';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ERRORS } from '../constants';

@Injectable()
export class CommandPaymentRequestValidatorService {
  constructor(
    @Inject(ManagementArticle.name) private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
    @Inject(Contact.name) private readonly contactModel: TenantModelProxy<typeof Contact>,
    @Inject(Account.name) private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  public async validateRefs(dto: { articleId?: number; contactId?: number; accountId?: number }) {
    if (dto.articleId && !(await this.articleModel().query().findById(dto.articleId)))
      throw new ServiceError(ERRORS.ARTICLE_NOT_FOUND);
    if (dto.contactId && !(await this.contactModel().query().findById(dto.contactId)))
      throw new ServiceError(ERRORS.CONTACT_NOT_FOUND);
    if (dto.accountId && !(await this.accountModel().query().findById(dto.accountId)))
      throw new ServiceError(ERRORS.ACCOUNT_NOT_FOUND);
  }
}
```
- [ ] **Step 2: CreatePaymentRequest** (current user via TenancyContext)
```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { CommandPaymentRequestValidatorService } from './CommandPaymentRequestValidator.service';
import { CreatePaymentRequestDto } from '../dtos/PaymentRequest.dto';

@Injectable()
export class CreatePaymentRequestService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandPaymentRequestValidatorService,
    private readonly tenancyContext: TenancyContext,
    @Inject(PaymentRequest.name) private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,
  ) {}

  public async create(dto: CreatePaymentRequestDto) {
    await this.validator.validateRefs(dto);
    const user: any = await this.tenancyContext.getSystemUser();
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      return this.requestModel().query(trx).insert({
        ...dto,
        currencyCode: dto.currencyCode || 'RUB',
        status: 'pending',
        createdBy: user.id,
      } as any);
    });
  }
}
```
- [ ] **Step 3: Тест валидатора** (моки; ассерт `errorType` — ServiceError хранит код в `.errorType`)
```ts
// © 2026 Bigfin
import { Test } from '@nestjs/testing';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { Contact } from '@/modules/Contacts/models/Contact';
import { Account } from '@/modules/Accounts/models/Account.model';
import { CommandPaymentRequestValidatorService } from './CommandPaymentRequestValidator.service';

const model = (found: any) => () => ({ query: () => ({ findById: async () => found }) });

describe('CommandPaymentRequestValidatorService', () => {
  it('бросает ARTICLE_NOT_FOUND', async () => {
    const ref = await Test.createTestingModule({
      providers: [
        CommandPaymentRequestValidatorService,
        { provide: ManagementArticle.name, useValue: model(null) },
        { provide: Contact.name, useValue: model({ id: 1 }) },
        { provide: Account.name, useValue: model({ id: 1 }) },
      ],
    }).compile();
    await expect(
      ref.get(CommandPaymentRequestValidatorService).validateRefs({ articleId: 9 }),
    ).rejects.toMatchObject({ errorType: 'ARTICLE_NOT_FOUND' });
  });
});
```
- [ ] **Step 4:** Run `pnpm --filter @bigfin/server test -- src/modules/PaymentRequests/commands/CreatePaymentRequest.service.spec.ts` → PASS. typecheck → PASS.
- [ ] **Step 5: Commit** `feat(payment-requests): add create request with validator (1 test)`

## Task B3: Approve (+ плановый отток) — TDD

**Files:** Create `.../commands/ApprovePaymentRequest.service.ts`, `.../commands/ApprovePaymentRequest.service.spec.ts`

- [ ] **Step 1: ApprovePaymentRequest**
```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { validateStatusTransition } from '../utils/validateStatusTransition';
import { ERRORS, PAYMENT_REQUEST_SOURCE } from '../constants';

@Injectable()
export class ApprovePaymentRequestService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly tenancyContext: TenancyContext,
    @Inject(PaymentRequest.name) private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,
    @Inject(PlannedOperation.name) private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  public async approve(id: number) {
    const request: any = await this.requestModel().query().findById(id);
    if (!request) throw new ServiceError(ERRORS.PAYMENT_REQUEST_NOT_FOUND);
    validateStatusTransition(request.status, 'approved');
    const user: any = await this.tenancyContext.getSystemUser();

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const operation: any = await this.operationModel().query(trx).insert({
        direction: 'outflow',
        amount: request.amount,
        currencyCode: request.currencyCode,
        plannedDate: moment(request.dueDate).format('YYYY-MM-DD'),
        articleId: request.articleId,
        accountId: request.accountId,
        branchId: request.branchId,
        contactId: request.contactId,
        status: 'confirmed',
        sourceType: PAYMENT_REQUEST_SOURCE,
        sourceId: request.id,
        description: request.description || `Заявка №${request.id}`,
      } as any);

      await this.requestModel().query(trx).findById(id).patch({
        status: 'approved',
        approvedBy: user.id,
        approvedAt: moment().toISOString(),
        plannedOperationId: operation.id,
      } as any);

      return this.requestModel().query(trx).findById(id);
    });
  }
}
```
- [ ] **Step 2: Тест** — мок requestModel/operationModel/tenancyContext: approve вставляет outflow со `sourceType='payment_request'` и проставляет `plannedOperationId`.
```ts
// © 2026 Bigfin
import { ApprovePaymentRequestService } from './ApprovePaymentRequest.service';

describe('ApprovePaymentRequestService', () => {
  it('вставляет плановый отток и помечает заявку approved', async () => {
    const inserted = { id: 99 };
    const patch = jest.fn().mockResolvedValue(undefined);
    const requestModel = () => ({
      query: () => ({
        findById: () => ({
          // findById(id) used 3 ways: read request, patch, return; make it chainable+thenable
          patch,
          then: (r: any) => Promise.resolve({ id: 1, status: 'pending', amount: 100, currencyCode: 'RUB', dueDate: '2026-06-15' }).then(r),
        }),
      }),
    });
    const operationModel = () => ({ query: () => ({ insert: async () => inserted }) });
    const uow = { withTransaction: async (work: any) => work({}) };
    const tenancyContext = { getSystemUser: async () => ({ id: 7 }) };

    const service = new ApprovePaymentRequestService(
      uow as any, tenancyContext as any, requestModel as any, operationModel as any,
    );
    await service.approve(1);
    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved', approvedBy: 7, plannedOperationId: 99 }),
    );
  });
});
```
> ⚠️ На исполнении подогнать форму мока под фактическое использование `findById` (read vs patch vs return) — возможно проще разнести на отдельные query-стабы по счётчику вызовов, как в ⑭ `GetDebtsOverview.service.spec.ts`.
- [ ] **Step 3:** Run the spec → PASS. typecheck → PASS.
- [ ] **Step 4: Commit** `feat(payment-requests): approve request creates planned outflow (TDD)`

## Task B4: Reject + Cancel

**Files:** Create `.../commands/RejectPaymentRequest.service.ts`, `.../commands/CancelPaymentRequest.service.ts`

- [ ] **Step 1: Reject** — `validateStatusTransition(status,'rejected')`, patch `status='rejected'`.
```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { validateStatusTransition } from '../utils/validateStatusTransition';
import { ERRORS } from '../constants';

@Injectable()
export class RejectPaymentRequestService {
  constructor(
    private readonly uow: UnitOfWork,
    @Inject(PaymentRequest.name) private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,
  ) {}
  public async reject(id: number) {
    const request: any = await this.requestModel().query().findById(id);
    if (!request) throw new ServiceError(ERRORS.PAYMENT_REQUEST_NOT_FOUND);
    validateStatusTransition(request.status, 'rejected');
    return this.uow.withTransaction(async (trx: Knex.Transaction) =>
      this.requestModel().query(trx).findById(id).patch({ status: 'rejected' } as any),
    );
  }
}
```
- [ ] **Step 2: Cancel** — `validateStatusTransition(status,'cancelled')`; если `plannedOperationId` — отменить ту операцию (`status='cancelled'`); patch заявки `status='cancelled'`.
```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { PlannedOperation } from '@/modules/PaymentCalendar/models/PlannedOperation.model';
import { validateStatusTransition } from '../utils/validateStatusTransition';
import { ERRORS } from '../constants';

@Injectable()
export class CancelPaymentRequestService {
  constructor(
    private readonly uow: UnitOfWork,
    @Inject(PaymentRequest.name) private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,
    @Inject(PlannedOperation.name) private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}
  public async cancel(id: number) {
    const request: any = await this.requestModel().query().findById(id);
    if (!request) throw new ServiceError(ERRORS.PAYMENT_REQUEST_NOT_FOUND);
    validateStatusTransition(request.status, 'cancelled');
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      if (request.plannedOperationId) {
        await this.operationModel().query(trx).findById(request.plannedOperationId).patch({ status: 'cancelled' } as any);
      }
      return this.requestModel().query(trx).findById(id).patch({ status: 'cancelled' } as any);
    });
  }
}
```
- [ ] **Step 3:** typecheck → PASS. **Commit** `feat(payment-requests): add reject and cancel commands`

---

# PART C — Запросы + wiring

## Task C1: Queries

**Files:** Create `.../queries/GetPaymentRequests.service.ts`, `.../queries/GetPaymentRequest.service.ts`

- [ ] **Step 1: GetPaymentRequests** (фильтр по статусу)
```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { GetPaymentRequestsQueryDto } from '../dtos/GetPaymentRequestsQuery.dto';

@Injectable()
export class GetPaymentRequestsService {
  constructor(
    @Inject(PaymentRequest.name) private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,
  ) {}
  public getPaymentRequests(filter: GetPaymentRequestsQueryDto) {
    return this.requestModel().query().onBuild((q) => {
      if (filter.status) q.modify('filterByStatus', filter.status);
      q.orderBy('dueDate', 'asc');
    });
  }
}
```
- [ ] **Step 2: GetPaymentRequest** — `findById` или `ServiceError(PAYMENT_REQUEST_NOT_FOUND)`.
```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { ERRORS } from '../constants';

@Injectable()
export class GetPaymentRequestService {
  constructor(
    @Inject(PaymentRequest.name) private readonly requestModel: TenantModelProxy<typeof PaymentRequest>,
  ) {}
  public async getPaymentRequest(id: number) {
    const request = await this.requestModel().query().findById(id);
    if (!request) throw new ServiceError(ERRORS.PAYMENT_REQUEST_NOT_FOUND);
    return request;
  }
}
```
- [ ] **Step 3:** typecheck → PASS. **Commit** `feat(payment-requests): add list and get queries`

## Task C2: Application + Controller + Module + wiring + gating

**Files:** Create `.../PaymentRequests.application.ts`, `.../PaymentRequests.controller.ts`, `.../PaymentRequests.module.ts`; Modify `App.module.ts`

- [ ] **Step 1: Application** — фасад: getList/get/create/approve/reject/cancel делегируют в сервисы (паттерн `PaymentCalendar.application.ts`).
- [ ] **Step 2: Module** — `imports: [TenancyDatabaseModule, TenancyModule]`, controller, providers (validator + 4 команды + 2 запроса + application). Образец `PaymentCalendar.module.ts`.
- [ ] **Step 3: Controller** (`@Controller('payment-requests')`, `@ApiTags`, `@ApiCommonHeaders`):
```ts
  @Get() getList(@Query() q: GetPaymentRequestsQueryDto) { return this.app.getPaymentRequests(q); }
  @Get(':id') get(@Param('id', ParseIntPipe) id: number) { return this.app.getPaymentRequest(id); }
  @Post() create(@Body() dto: CreatePaymentRequestDto) { return this.app.createPaymentRequest(dto); }

  @Post(':id/approve')
  @RequirePermission('manage', 'all')
  approve(@Param('id', ParseIntPipe) id: number) { return this.app.approvePaymentRequest(id); }

  @Post(':id/reject')
  @RequirePermission('manage', 'all')
  reject(@Param('id', ParseIntPipe) id: number) { return this.app.rejectPaymentRequest(id); }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number) { return this.app.cancelPaymentRequest(id); }
```
> `@RequirePermission` из `@/modules/Roles/RequirePermission.decorator`. На исполнении подтвердить, что `AuthorizationGuard`+`PermissionGuard` зарегистрированы как `APP_GUARD` глобально (App.module). Если нет — навесить `@UseGuards(AuthorizationGuard, PermissionGuard)` на эти эндпоинты.
- [ ] **Step 4: Wire** `PaymentRequestsModule` в `App.module.ts` (import + в массив `imports` рядом с `PaymentCalendarModule`).
- [ ] **Step 5:** `pnpm --filter @bigfin/server test -- src/modules/PaymentRequests` (все юниты) + typecheck → PASS.
- [ ] **Step 6: Commit** `feat(payment-requests): wire application, controller, module + endpoints (admin-gated approve)`

---

# PART D — Фронтенд

> Открыть образцы: `hooks/query/paymentCalendar.tsx` (хуки), `containers/PaymentCalendar/PaymentCalendarPage.tsx` + `PlannedOperationDialog.tsx`, `routes/dashboard.tsx`. Базлайн develop — в `types.tsx`/`dashboard.tsx` НЕТ ключей ⑭.

## Task D1: Хуки + ключи кэша
**Files:** Create `hooks/query/paymentRequests.tsx`; Modify `hooks/query/types.tsx`
- [ ] **Step 1:** В `types.tsx` добавить `const PAYMENT_REQUESTS = { PAYMENT_REQUESTS: 'PAYMENT_REQUESTS', PAYMENT_REQUEST: 'PAYMENT_REQUEST' };` и `...PAYMENT_REQUESTS,` в дефолтный экспорт.
- [ ] **Step 2:** `paymentRequests.tsx` — `usePaymentRequests(query)`, `usePaymentRequest(id)`, мутации `useCreatePaymentRequest`, `useApprovePaymentRequest`, `useRejectPaymentRequest`, `useCancelPaymentRequest` (POST на `payment-requests/:id/{approve,reject,cancel}`), инвалидация `PAYMENT_REQUESTS`. Паттерн — `paymentCalendar.tsx`.
- [ ] **Step 3:** webapp typecheck → PASS. **Commit** `feat(webapp/payment-requests): react-query hooks and cache keys`

## Task D2: Zod-схема + страница + диалог
**Files:** Create `containers/PaymentRequests/{schemas.ts,PaymentRequestsPage.tsx,PaymentRequestDialog.tsx}`
- [ ] **Step 1: schemas.ts** — Zod: amount>0, dueDate непустой, опц. articleId/contactId/accountId/branchId/description (сообщения через `intl.get`).
- [ ] **Step 2: PaymentRequestsPage** — `featureCan('payment_requests')`; табы статуса; таблица заявок (`usePaymentRequests({status})`); кнопки «Одобрить»/«Отклонить» на `pending` (мутации); кнопка «Создать» → диалог. Все строки `intl.get('payment_requests.*')`.
- [ ] **Step 3: PaymentRequestDialog** — RHF+Zod, поля суммы/статьи/контрагента/счёта/срока/основания; submit → `useCreatePaymentRequest`. Паттерн — `PlannedOperationDialog.tsx`.
- [ ] **Step 4:** webapp typecheck → PASS. **Commit** `feat(webapp/payment-requests): page, dialog and schema`

## Task D3: Маршрут + i18n
**Files:** Modify `routes/dashboard.tsx`, `lang/en/index.json`, `lang/ru/index.json`
- [ ] **Step 1:** В `dashboard.tsx` добавить route `/payment-requests` → `lazy(() => import('@/containers/PaymentRequests/PaymentRequestsPage'))`, `breadcrumb/pageTitle: intl.get('payment_requests.page_title')`, `subscriptionActive: [SUBSCRIPTION_TYPE.MAIN]` (мирроринг budgets).
- [ ] **Step 2:** Добавить парные ключи `payment_requests.*` в EN и RU (page_title, статусы pending/approved/rejected/cancelled, поля, действия approve/reject/cancel/create, сообщения Zod). RU — натуральный бух-русский («Заявки на оплату», «На согласовании», «Одобрить», «Отклонить»).
- [ ] **Step 3:** `node packages/webapp/scripts/lang-check.js` → 0. webapp typecheck → PASS.
- [ ] **Step 4: Commit** `feat(webapp/payment-requests): route and i18n keys (en+ru parity)`

---

## Self-Review

- **Покрытие спеки:** §2.1 создание→B2; §2.2 согласование (approve→planned_operation)→B3; §2.2 reject→B4; §2.3 cancel(+снятие операции)→B4; §2.4 реестр→C1+D2; статус-воркфлоу §5.1→A3; гейтинг §7→C2 (`@RequirePermission('manage','all')`); флаг→A1; миграция/модель→A4/A5; фронт §8→D. ✅
- **Без заглушек:** «⚠️ на исполнении…» — шаги верификации/подгонки моков под реальные сигнатуры, не скрытый код; новый код в шагах полный. Boilerplate (application/controller/module, фронт-страница) — мирроринг названного образца + точные команды.
- **Согласованность:** статусы (`pending/approved/rejected/cancelled`) и `validateStatusTransition` едины; `sourceType='payment_request'`; имена сервисов совпадают между Module/Application/Controller.
- **Зона подгонки на исполнении:** форма мока в `ApprovePaymentRequest.spec` (findById используется тройственно) — свериться с ⑭ `GetDebtsOverview.service.spec.ts`; глобальность guard'ов — подтвердить в App.module.
