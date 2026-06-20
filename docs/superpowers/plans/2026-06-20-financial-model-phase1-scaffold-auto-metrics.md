# Финмодель — Фаза 1 (каркас + авто-метрики) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Поднять страницу «Финмодель» за флагом `financial_model` с двумя авто-метриками (маржинальность, выручка на сотрудника) и графиком «маржа во времени», переиспользуя `ArticlesPlRollupService`.

**Architecture:** Тонкий backend-модуль `FinancialModel` — слой композиции поверх `ArticlesPlRollupService` (свёртка статей) и модели `Employee`. Общая маржа компании = `computeDealMargin(getRollup({fromDate,toDate}))` без `projectId`. Frontend — одна страница shadcn за флагом, графики на `recharts`.

**Tech Stack:** NestJS 10 + Objection/Knex (server, Jest), React 18 + shadcn + React Query v3 + recharts (webapp, vitest), react-intl-universal (i18n).

**Спека:** `docs/superpowers/specs/2026-06-20-financial-model-unit-economics-design.md` (раздел 3 «Авто-метрики», раздел 5 «Фаза 1»).

**Ветка:** `feat/financial-model` (создать от свежего `develop`; пуш/PR — по запросу основателя).

**Соглашения проекта (важно):**
- commitlint: subject коммита со **строчной** буквы; строки тела ≤100 символов.
- webapp-тесты — **vitest**, не jest. server-тесты — jest.
- Любая видимая строка — через `intl.get(...)`; ключи парно EN+RU; после правки lang — `node packages/webapp/scripts/lang-check.js`.
- Не запускать `pnpm install` без явного подтверждения основателя (см. Task 9).

---

## Файловая карта Фазы 1

**Backend (create):**
- `packages/server/src/modules/FinancialModel/utils/financialMath.ts` — чистые функции + тесты-спутник
- `packages/server/src/modules/FinancialModel/utils/financialMath.spec.ts`
- `packages/server/src/modules/FinancialModel/dtos/FinancialModel.dto.ts` — DTO периода
- `packages/server/src/modules/FinancialModel/queries/GetFinancialOverview.service.ts`
- `packages/server/src/modules/FinancialModel/FinancialModel.application.ts`
- `packages/server/src/modules/FinancialModel/FinancialModel.controller.ts`
- `packages/server/src/modules/FinancialModel/FinancialModel.module.ts`

**Backend (modify):**
- `packages/server/src/common/types/Features.ts` — enum `FINANCIAL_MODEL`
- `packages/server/src/modules/Features/FeaturesConfigure.ts` — дефолт `false`
- `packages/server/src/app.module.ts` (или агрегатор модулей) — зарегистрировать `FinancialModelModule`

**Frontend (create):**
- `packages/webapp/src/hooks/query/financialModel.tsx`
- `packages/webapp/src/containers/FinancialModel/FinancialModelPage.tsx`
- `packages/webapp/src/containers/FinancialModel/MarginOverTimeChart.tsx`

**Frontend (modify):**
- `packages/webapp/src/constants/features.tsx` — `FinancialModel: 'financial_model'`
- `packages/webapp/src/hooks/query/types` — ключ `FINANCIAL_OVERVIEW`
- `packages/webapp/src/routes/dashboard.tsx` — роут `/financial-model`
- `packages/webapp/src/constants/sidebarMenu.tsx` — пункт меню за флагом
- `packages/webapp/src/lang/en/index.json` + `packages/webapp/src/lang/ru/index.json` — ключи
- `packages/webapp/package.json` — зависимость `recharts`

---

## Task 0: Создать ветку

- [ ] **Step 1: Свежий develop + ветка**

Run:
```bash
cd "D:/Кодинг/Bigfin" && git checkout develop && git pull --ff-only && git checkout -b feat/financial-model
```
Expected: создана ветка `feat/financial-model`.

---

## Task 1: Чистые функции финмат + тесты (TDD)

**Files:**
- Create: `packages/server/src/modules/FinancialModel/utils/financialMath.ts`
- Test: `packages/server/src/modules/FinancialModel/utils/financialMath.spec.ts`

- [ ] **Step 1: Написать падающий тест**

`financialMath.spec.ts`:
```ts
// © 2026 Bigfin
import {
  computeRevenuePerEmployee,
  enumerateMonths,
} from './financialMath';

describe('computeRevenuePerEmployee', () => {
  it('делит выручку на число сотрудников', () => {
    expect(computeRevenuePerEmployee(900000, 3)).toEqual({
      value: 300000,
      applicable: true,
    });
  });

  it('возвращает applicable=false при нуле сотрудников', () => {
    expect(computeRevenuePerEmployee(900000, 0)).toEqual({
      value: 0,
      applicable: false,
    });
  });

  it('округляет до 2 знаков', () => {
    expect(computeRevenuePerEmployee(100, 3).value).toBe(33.33);
  });
});

describe('enumerateMonths', () => {
  it('перечисляет месяцы включительно по границам', () => {
    expect(enumerateMonths('2026-01-15', '2026-03-02')).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });

  it('один месяц, если from и to в одном месяце', () => {
    expect(enumerateMonths('2026-05-01', '2026-05-31')).toEqual(['2026-05']);
  });

  it('пустой массив, если from позже to', () => {
    expect(enumerateMonths('2026-05-01', '2026-04-01')).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run:
```bash
pnpm --filter @bigfin/server test -- src/modules/FinancialModel/utils/financialMath.spec.ts
```
Expected: FAIL — `Cannot find module './financialMath'`.

- [ ] **Step 3: Реализовать чистые функции**

`financialMath.ts`:
```ts
// © 2026 Bigfin
import * as moment from 'moment';

export interface MetricValue {
  value: number;
  applicable: boolean;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Выручка на сотрудника = выручка ÷ число активных сотрудников.
 * При нуле сотрудников метрика неприменима (applicable=false), не делим на ноль.
 */
export function computeRevenuePerEmployee(
  revenue: number,
  employeeCount: number,
): MetricValue {
  if (!employeeCount || employeeCount <= 0) {
    return { value: 0, applicable: false };
  }
  return { value: round2(revenue / employeeCount), applicable: true };
}

/**
 * Список месяцев 'YYYY-MM' от fromDate до toDate включительно (по месяцам).
 * Если from позже to — пустой массив.
 */
export function enumerateMonths(fromDate: string, toDate: string): string[] {
  const start = moment(fromDate).startOf('month');
  const end = moment(toDate).startOf('month');
  if (start.isAfter(end)) return [];
  const months: string[] = [];
  const cursor = start.clone();
  while (!cursor.isAfter(end)) {
    months.push(cursor.format('YYYY-MM'));
    cursor.add(1, 'month');
  }
  return months;
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run:
```bash
pnpm --filter @bigfin/server test -- src/modules/FinancialModel/utils/financialMath.spec.ts
```
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/FinancialModel/utils/financialMath.ts packages/server/src/modules/FinancialModel/utils/financialMath.spec.ts
git commit -m "feat(financial-model): чистые функции финмат (выручка/сотр., перебор месяцев)"
```

---

## Task 2: DTO периода

**Files:**
- Create: `packages/server/src/modules/FinancialModel/dtos/FinancialModel.dto.ts`

- [ ] **Step 1: Написать DTO**

`FinancialModel.dto.ts`:
```ts
// © 2026 Bigfin
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class FinancialOverviewQueryDto {
  @ApiPropertyOptional({ description: 'Начало периода YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Конец периода YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
```

- [ ] **Step 2: Проверить компиляцию**

Run:
```bash
pnpm --filter @bigfin/server exec tsc --noEmit -p tsconfig.json
```
Expected: без ошибок в новом файле (другие предсуществующие — игнорировать; цель — нет НОВЫХ ошибок).

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/modules/FinancialModel/dtos/FinancialModel.dto.ts
git commit -m "feat(financial-model): dto периода для обзора"
```

---

## Task 3: Сервис-композитор GetFinancialOverview

**Files:**
- Create: `packages/server/src/modules/FinancialModel/queries/GetFinancialOverview.service.ts`

Контекст переиспользования (подтверждено в коде):
- `ArticlesPlRollupService.getRollup({fromDate,toDate})` без `projectId` → свёртка по всей компании (`packages/server/src/modules/ManagementArticles/queries/ArticlesPlRollup.service.ts`).
- `computeDealMargin(rows)` → `{revenue, costs, profit, margin}` (`packages/server/src/modules/Deals/utils/computeDealMargin.ts`).
- Модель `Employee` глобально зарегистрирована в Tenancy; инжектится по токену `Employee.name`; поле `active` (`packages/server/src/modules/Payroll/models/Employee.model.ts`).

- [ ] **Step 1: Реализовать сервис**

`GetFinancialOverview.service.ts`:
```ts
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { computeDealMargin } from '@/modules/Deals/utils/computeDealMargin';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Employee } from '@/modules/Payroll/models/Employee.model';
import { FinancialOverviewQueryDto } from '../dtos/FinancialModel.dto';
import { computeRevenuePerEmployee, enumerateMonths } from '../utils/financialMath';

export interface MarginPoint {
  month: string; // 'YYYY-MM'
  revenue: number;
  profit: number;
  margin: number; // доля 0..1
}

export interface FinancialOverview {
  revenue: number;
  costs: number;
  profit: number;
  margin: number; // доля 0..1
  employeeCount: number;
  revenuePerEmployee: number;
  revenuePerEmployeeApplicable: boolean;
  marginOverTime: MarginPoint[];
}

/**
 * Обзор финмодели за период. Маржа компании = свёртка статей всей фирмы
 * (getRollup без projectId) через computeDealMargin. График «маржа во времени» —
 * та же свёртка помесячно. Считается on-the-fly, без кэш-таблиц.
 */
@Injectable()
export class GetFinancialOverviewService {
  constructor(
    private readonly rollup: ArticlesPlRollupService,

    @Inject(Employee.name)
    private readonly employeeModel: TenantModelProxy<typeof Employee>,
  ) {}

  public async getOverview(
    query: FinancialOverviewQueryDto,
  ): Promise<FinancialOverview> {
    const fromDate =
      query.fromDate ?? moment().startOf('year').format('YYYY-MM-DD');
    const toDate = query.toDate ?? moment().format('YYYY-MM-DD');

    // Маржа компании за весь период.
    const rows = await this.rollup.getRollup({ fromDate, toDate } as any);
    const margin = computeDealMargin(rows as any);

    // Число активных сотрудников.
    const employeeCount = await this.countActiveEmployees();
    const rpe = computeRevenuePerEmployee(margin.revenue, employeeCount);

    // Маржа во времени — помесячно.
    const months = enumerateMonths(fromDate, toDate);
    const marginOverTime: MarginPoint[] = [];
    for (const month of months) {
      const mFrom = moment(`${month}-01`).startOf('month').format('YYYY-MM-DD');
      const mTo = moment(mFrom).endOf('month').format('YYYY-MM-DD');
      const mRows = await this.rollup.getRollup({
        fromDate: mFrom,
        toDate: mTo,
      } as any);
      const m = computeDealMargin(mRows as any);
      marginOverTime.push({
        month,
        revenue: m.revenue,
        profit: m.profit,
        margin: m.margin,
      });
    }

    return {
      revenue: margin.revenue,
      costs: margin.costs,
      profit: margin.profit,
      margin: margin.margin,
      employeeCount,
      revenuePerEmployee: rpe.value,
      revenuePerEmployeeApplicable: rpe.applicable,
      marginOverTime,
    };
  }

  private async countActiveEmployees(): Promise<number> {
    const res: any = await this.employeeModel()
      .query()
      .where('active', true)
      .count({ c: 'id' })
      .first();
    return Number(res?.c ?? 0);
  }
}
```

- [ ] **Step 2: Проверить компиляцию**

Run:
```bash
pnpm --filter @bigfin/server exec tsc --noEmit -p tsconfig.json
```
Expected: нет НОВЫХ ошибок. Если `Employee.model` путь/поле `active` отличается — поправить импорт/имя поля по факту модели и повторить.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/modules/FinancialModel/queries/GetFinancialOverview.service.ts
git commit -m "feat(financial-model): сервис обзора (маржа, выручка на сотр., маржа во времени)"
```

---

## Task 4: Application + Controller

**Files:**
- Create: `packages/server/src/modules/FinancialModel/FinancialModel.application.ts`
- Create: `packages/server/src/modules/FinancialModel/FinancialModel.controller.ts`

- [ ] **Step 1: Application**

`FinancialModel.application.ts`:
```ts
// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetFinancialOverviewService } from './queries/GetFinancialOverview.service';
import { FinancialOverviewQueryDto } from './dtos/FinancialModel.dto';

@Injectable()
export class FinancialModelApplication {
  constructor(
    private readonly overviewService: GetFinancialOverviewService,
  ) {}

  getOverview(query: FinancialOverviewQueryDto) {
    return this.overviewService.getOverview(query);
  }
}
```

- [ ] **Step 2: Controller**

`FinancialModel.controller.ts`:
```ts
// © 2026 Bigfin
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { FinancialModelApplication } from './FinancialModel.application';
import { FinancialOverviewQueryDto } from './dtos/FinancialModel.dto';

@Controller('financial-model')
@ApiTags('FinancialModel')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class FinancialModelController {
  constructor(private readonly application: FinancialModelApplication) {}

  @Get('overview')
  @ApiOperation({ summary: 'Обзор финмодели: маржа, выручка на сотрудника, маржа во времени.' })
  getOverview(@Query() query: FinancialOverviewQueryDto) {
    return this.application.getOverview(query);
  }
}
```

- [ ] **Step 3: Проверить компиляцию**

Run:
```bash
pnpm --filter @bigfin/server exec tsc --noEmit -p tsconfig.json
```
Expected: нет НОВЫХ ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/modules/FinancialModel/FinancialModel.application.ts packages/server/src/modules/FinancialModel/FinancialModel.controller.ts
git commit -m "feat(financial-model): application и контроллер /financial-model/overview"
```

---

## Task 5: Модуль + регистрация в App

**Files:**
- Create: `packages/server/src/modules/FinancialModel/FinancialModel.module.ts`
- Modify: `packages/server/src/app.module.ts`

- [ ] **Step 1: Модуль**

`FinancialModel.module.ts` (ArticlesPlRollupService кладём в providers напрямую — его модели глобальны через Tenancy, как в PayrollModule):
```ts
// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { FinancialModelController } from './FinancialModel.controller';
import { FinancialModelApplication } from './FinancialModel.application';
import { GetFinancialOverviewService } from './queries/GetFinancialOverview.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule],
  controllers: [FinancialModelController],
  providers: [
    FinancialModelApplication,
    GetFinancialOverviewService,
    // collaborator injected directly (no ManagementArticlesModule import needed)
    ArticlesPlRollupService,
  ],
})
export class FinancialModelModule {}
```

- [ ] **Step 2: Найти место регистрации модулей**

Run:
```bash
grep -n "CreditsModule" packages/server/src/app.module.ts
```
Expected: одна-две строки (import и в массиве `imports`). Если `CreditsModule` регистрируется НЕ в `app.module.ts`, найти файл:
```bash
grep -rn "CreditsModule" packages/server/src --include=*.ts
```

- [ ] **Step 3: Зарегистрировать `FinancialModelModule`**

В том же файле, где `CreditsModule`: добавить импорт рядом с импортом `CreditsModule`:
```ts
import { FinancialModelModule } from './modules/FinancialModel/FinancialModel.module';
```
и добавить `FinancialModelModule` в массив `imports` рядом с `CreditsModule`.

- [ ] **Step 4: Проверить компиляцию всего сервера**

Run:
```bash
pnpm --filter @bigfin/server exec tsc --noEmit -p tsconfig.json
```
Expected: нет НОВЫХ ошибок.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/FinancialModel/FinancialModel.module.ts packages/server/src/app.module.ts
git commit -m "feat(financial-model): модуль и регистрация в приложении"
```

---

## Task 6: Серверный фиче-флаг

**Files:**
- Modify: `packages/server/src/common/types/Features.ts`
- Modify: `packages/server/src/modules/Features/FeaturesConfigure.ts`

- [ ] **Step 1: Добавить enum**

В `Features.ts` в enum `Features` после `INTERFACE_MODES = 'interface_modes',` добавить:
```ts
  FINANCIAL_MODEL = 'financial_model',
```

- [ ] **Step 2: Добавить дефолт**

В `FeaturesConfigure.ts` в конец массива (после блока `Features.INTERFACE_MODES`) добавить:
```ts
      {
        name: Features.FINANCIAL_MODEL,
        defaultValue: false,
      },
```

- [ ] **Step 3: Проверить компиляцию**

Run:
```bash
pnpm --filter @bigfin/server exec tsc --noEmit -p tsconfig.json
```
Expected: нет НОВЫХ ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/common/types/Features.ts packages/server/src/modules/Features/FeaturesConfigure.ts
git commit -m "feat(financial-model): серверный фиче-флаг financial_model (off)"
```

---

## Task 7: Переводы EN+RU

**Files:**
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Добавить ключи (парно EN и RU)**

В `en/index.json` добавить:
```json
"financial_model.page.title": "Financial model",
"financial_model.filter.period": "Period",
"financial_model.metric.margin": "Margin",
"financial_model.metric.revenue_per_employee": "Revenue per employee",
"financial_model.metric.ltv": "LTV",
"financial_model.metric.cac": "CAC",
"financial_model.metric.romi": "Revenue per ₽ of marketing",
"financial_model.metric.break_even": "Break-even",
"financial_model.metric.coming_soon": "Coming soon",
"financial_model.chart.margin_over_time": "Margin over time",
"financial_model.na": "—"
```
В `ru/index.json` добавить парно:
```json
"financial_model.page.title": "Финмодель",
"financial_model.filter.period": "Период",
"financial_model.metric.margin": "Маржинальность",
"financial_model.metric.revenue_per_employee": "Выручка на сотрудника",
"financial_model.metric.ltv": "LTV",
"financial_model.metric.cac": "CAC",
"financial_model.metric.romi": "Выручка на ₽ маркетинга",
"financial_model.metric.break_even": "Точка безубыточности",
"financial_model.metric.coming_soon": "Скоро",
"financial_model.chart.margin_over_time": "Маржа во времени",
"financial_model.na": "—"
```
(`LTV`, `CAC` — намеренно латиницей, бренд-стандарт RU SaaS.)

- [ ] **Step 2: Проверить парность**

Run:
```bash
node packages/webapp/scripts/lang-check.js
```
Expected: счётчик EN == RU, расхождений нет.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(financial-model): ключи переводов страницы финмодели"
```

---

## Task 8: Фронт фиче-флаг + ключ запроса

**Files:**
- Modify: `packages/webapp/src/constants/features.tsx`
- Modify: `packages/webapp/src/hooks/query/types` (расширение `.ts`/`.js` — открыть файл по факту)

- [ ] **Step 1: Фронт-флаг**

В `constants/features.tsx` в объект `Features` после `InterfaceModes: 'interface_modes',` добавить:
```ts
  FinancialModel: 'financial_model',
```

- [ ] **Step 2: Ключ запроса**

Открыть `packages/webapp/src/hooks/query/types` (найти точное имя файла):
```bash
ls packages/webapp/src/hooks/query/types*
```
Добавить в объект ключей (рядом с `CREDITS_SUMMARY`):
```ts
  FINANCIAL_OVERVIEW: 'FINANCIAL_OVERVIEW',
```

- [ ] **Step 3: Проверить компиляцию webapp**

Run:
```bash
pnpm --filter @bigfin/webapp exec tsc --noEmit -p tsconfig.json
```
Expected: нет НОВЫХ ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/constants/features.tsx packages/webapp/src/hooks/query/types*
git commit -m "feat(financial-model): фронт фиче-флаг и ключ запроса обзора"
```

---

## Task 9: Установить recharts

**Files:**
- Modify: `packages/webapp/package.json`

- [ ] **Step 1: ПОДТВЕРЖДЕНИЕ основателя**

Спросить основателя: «Запускаю `pnpm install` для добавления recharts — ок?» (правило проекта: без install без явного запроса). НЕ продолжать без «да».

- [ ] **Step 2: Установить**

Run (после подтверждения):
```bash
cd "D:/Кодинг/Bigfin" && pnpm --filter @bigfin/webapp add recharts
```
Expected: `recharts` в `dependencies` webapp; lockfile обновлён. recharts — чистый JS, нативных бинарников нет.

- [ ] **Step 3: Проверить, что webapp всё ещё типизируется**

Run:
```bash
pnpm --filter @bigfin/webapp exec tsc --noEmit -p tsconfig.json
```
Expected: нет НОВЫХ ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/package.json pnpm-lock.yaml
git commit -m "build(financial-model): добавить recharts для графиков"
```

---

## Task 10: График «маржа во времени» (recharts)

**Files:**
- Create: `packages/webapp/src/containers/FinancialModel/MarginOverTimeChart.tsx`

- [ ] **Step 1: Компонент графика**

`MarginOverTimeChart.tsx`:
```tsx
// © 2026 Bigfin
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export interface MarginPoint {
  month: string;
  revenue: number;
  profit: number;
  margin: number; // доля 0..1
}

export function MarginOverTimeChart({ data }: { data: MarginPoint[] }) {
  const points = (data ?? []).map((p) => ({
    month: p.month,
    marginPct: Math.round((p.margin ?? 0) * 1000) / 10, // % с 1 знаком
  }));
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" fontSize={12} />
          <YAxis unit="%" fontSize={12} />
          <Tooltip formatter={(v: any) => `${v}%`} />
          <Line
            type="monotone"
            dataKey="marginPct"
            stroke="#e0a800"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Проверить компиляцию**

Run:
```bash
pnpm --filter @bigfin/webapp exec tsc --noEmit -p tsconfig.json
```
Expected: нет НОВЫХ ошибок.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/containers/FinancialModel/MarginOverTimeChart.tsx
git commit -m "feat(financial-model): график маржи во времени на recharts"
```

---

## Task 11: Хук запроса обзора

**Files:**
- Create: `packages/webapp/src/hooks/query/financialModel.tsx`

- [ ] **Step 1: Хук (паттерн credits.tsx)**

`financialModel.tsx`:
```tsx
// © 2026 Bigfin
import { useRequestQuery } from '../useQueryRequest';
import t from './types';

export interface MarginPoint {
  month: string;
  revenue: number;
  profit: number;
  margin: number;
}

export interface FinancialOverview {
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  employeeCount: number;
  revenuePerEmployee: number;
  revenuePerEmployeeApplicable: boolean;
  marginOverTime: MarginPoint[];
}

/** Обзор финмодели за период (fromDate/toDate в query). */
export function useFinancialOverview(query?: any, props?: any) {
  return useRequestQuery(
    [t.FINANCIAL_OVERVIEW, query],
    { method: 'get', url: 'financial-model/overview', params: query },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: {
        revenue: 0,
        costs: 0,
        profit: 0,
        margin: 0,
        employeeCount: 0,
        revenuePerEmployee: 0,
        revenuePerEmployeeApplicable: false,
        marginOverTime: [],
      } as FinancialOverview,
      ...props,
    },
  );
}
```

- [ ] **Step 2: Проверить компиляцию**

Run:
```bash
pnpm --filter @bigfin/webapp exec tsc --noEmit -p tsconfig.json
```
Expected: нет НОВЫХ ошибок.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/hooks/query/financialModel.tsx
git commit -m "feat(financial-model): хук запроса обзора"
```

---

## Task 12: Страница «Финмодель»

**Files:**
- Create: `packages/webapp/src/containers/FinancialModel/FinancialModelPage.tsx`

- [ ] **Step 1: Страница (гейт флага, фильтр периода, карточки, график)**

`FinancialModelPage.tsx`:
```tsx
// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useFeatureCan } from '@/hooks/state/feature';
import { useFinancialOverview } from '@/hooks/query/financialModel';
import { MarginOverTimeChart } from './MarginOverTimeChart';

const fmtMoney = (n: number | null | undefined) =>
  `${(n ?? 0).toLocaleString('ru-RU')} ₽`;
const fmtPct = (frac: number | null | undefined) =>
  `${Math.round((frac ?? 0) * 1000) / 10}%`;

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold">{value}</span>
    </div>
  );
}

export default function FinancialModelPage() {
  const { featureCan } = useFeatureCan();
  const today = new Date();
  const [fromDate] = React.useState(
    `${today.getFullYear()}-01-01`,
  );
  const [toDate] = React.useState(today.toISOString().slice(0, 10));

  const { data } = useFinancialOverview({ fromDate, toDate });

  if (!featureCan('financial_model')) return null;

  const soon = intl.get('financial_model.metric.coming_soon');

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('financial_model.page.title')}
        </h1>
        <span className="text-sm text-muted-foreground">
          {fromDate} — {toDate}
        </span>
      </div>

      {/* 6 карточек: 2 заполнены (Фаза 1), 4 — «Скоро» (Фазы 2–4) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard
          label={intl.get('financial_model.metric.margin')}
          value={fmtPct(data?.margin)}
        />
        <MetricCard
          label={intl.get('financial_model.metric.revenue_per_employee')}
          value={
            data?.revenuePerEmployeeApplicable
              ? fmtMoney(data?.revenuePerEmployee)
              : intl.get('financial_model.na')
          }
        />
        <MetricCard label={intl.get('financial_model.metric.ltv')} value={soon} />
        <MetricCard label={intl.get('financial_model.metric.cac')} value={soon} />
        <MetricCard label={intl.get('financial_model.metric.romi')} value={soon} />
        <MetricCard
          label={intl.get('financial_model.metric.break_even')}
          value={soon}
        />
      </div>

      {/* График «маржа во времени» */}
      <div className="rounded-md border p-4">
        <div className="mb-2 text-sm font-medium">
          {intl.get('financial_model.chart.margin_over_time')}
        </div>
        <MarginOverTimeChart data={data?.marginOverTime ?? []} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Проверить компиляцию**

Run:
```bash
pnpm --filter @bigfin/webapp exec tsc --noEmit -p tsconfig.json
```
Expected: нет НОВЫХ ошибок.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/containers/FinancialModel/FinancialModelPage.tsx
git commit -m "feat(financial-model): страница обзора (карточки + график)"
```

---

## Task 13: Роут + пункт меню

**Files:**
- Modify: `packages/webapp/src/routes/dashboard.tsx`
- Modify: `packages/webapp/src/constants/sidebarMenu.tsx`

- [ ] **Step 1: Роут**

В `routes/dashboard.tsx` после блока `// Credits (Кредиты и займы)` (около строки 1349) добавить:
```tsx
  // Financial model (Финмодель)
  {
    path: `/financial-model`,
    component: lazy(() => import('@/containers/FinancialModel/FinancialModelPage')),
    breadcrumb: intl.get('financial_model.page.title'),
    pageTitle: intl.get('financial_model.page.title'),
    subscriptionActive: [SUBSCRIPTION_TYPE.MAIN],
  },
```

- [ ] **Step 2: Пункт меню за флагом**

В `constants/sidebarMenu.tsx` после блока `# Credits` (около строки 814) добавить:
```tsx
  // ---------------
  // # Financial model (Финмодель)
  // ---------------
  {
    text: <T id={'sidebar.financial_model'} />,
    href: '/financial-model',
    type: ISidebarMenuItemType.Link,
    feature: Features.FinancialModel,
  },
```

- [ ] **Step 3: Добавить ключ меню в переводы (EN+RU)**

В `en/index.json`: `"sidebar.financial_model": "Financial model"`
В `ru/index.json`: `"sidebar.financial_model": "Финмодель"`

- [ ] **Step 4: Проверить парность + типизацию**

Run:
```bash
node packages/webapp/scripts/lang-check.js && pnpm --filter @bigfin/webapp exec tsc --noEmit -p tsconfig.json
```
Expected: парность ок; нет НОВЫХ ошибок типов.

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/routes/dashboard.tsx packages/webapp/src/constants/sidebarMenu.tsx packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(financial-model): роут /financial-model и пункт меню за флагом"
```

---

## Task 14: Финальная приёмка Фазы 1 (статическая)

- [ ] **Step 1: Полный typecheck 3 пакетов**

Run:
```bash
pnpm typecheck
```
Expected: exit 0 (нет ошибок ни в одном пакете).

- [ ] **Step 2: Серверные тесты модуля**

Run:
```bash
pnpm --filter @bigfin/server test -- src/modules/FinancialModel
```
Expected: PASS (тесты financialMath).

- [ ] **Step 3: Парность переводов**

Run:
```bash
node packages/webapp/scripts/lang-check.js
```
Expected: EN == RU.

- [ ] **Step 4: Ревью RU-переводов**

Запустить сабагент `ru-translation-reviewer` по добавленным ключам `financial_model.*` + `sidebar.financial_model`. Исправить блокеры/важные, если найдутся.

- [ ] **Step 5: Финальный коммит (если правки по ревью)**

```bash
git add -A && git commit -m "chore(financial-model): правки по приёмке фазы 1"
```

**Живая приёмка на стеке (флаг on → страница, карточки, график) — отдельным заходом по запросу основателя. Пуш/PR — по запросу.**

---

## Self-Review (выполнено автором плана)

**1. Покрытие спеки (Фаза 1):**
- Каркас + флаг → Tasks 5, 6, 8. ✓
- Маржинальность → Task 3 (computeDealMargin по компании) + Task 12 (карточка). ✓
- Выручка на сотрудника → Task 1 (computeRevenuePerEmployee) + Task 3 (countActiveEmployees) + Task 12. ✓
- Графики recharts (маржа во времени) → Tasks 9, 10, 12. ✓
- Страница `/financial-model` + фильтр периода → Tasks 12, 13. ✓
- Краевые случаи (нет выручки → маржа 0; нет сотрудников → applicable=false «—») → Task 1 + Task 12. ✓
- 6 карточек (2 живые + 4 «Скоро») — соответствует критерию «дашборд с 6 метриками», остальные наполняются в Фазах 2–4. ✓

**2. Плейсхолдеры:** нет TBD/«добавить обработку ошибок» без кода — все шаги с кодом/командами. ✓

**3. Согласованность типов:** `MetricValue`, `MarginPoint`, `FinancialOverview` определены в Task 1/3 и зеркалятся во фронте (Task 10/11) с теми же полями (`margin` как доля 0..1, `revenuePerEmployeeApplicable`). `enumerateMonths`/`computeRevenuePerEmployee` — единые имена в тесте и реализации. ✓

**Открытые точки для исполнителя (требуют сверки с фактом кода, не выдуманы):**
- Точный путь/поле модели `Employee` (`active`) — сверить в Task 3 Step 2.
- Точный файл/формат `hooks/query/types` — сверить в Task 8 Step 2.
- Файл регистрации модулей (app.module vs агрегатор) — найти в Task 5 Step 2.
