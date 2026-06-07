# ⑦b — Автораспределение общих расходов по сделкам (Cost Allocation)

**Дата:** 2026-06-07
**Под-проект роадмапа:** ⑦b (Ф3a), §4.10 «Правила автораспределения общих расходов».
**Зависит от:** ⑦a Сделки (смержено, PR #57), `ArticlesPlRollupService`, измерение `projectId`.
**Флаг:** `Features.COST_ALLOCATION` (по умолчанию **off**).
**Подход:** A — распределение по выручке + ручные доли (одобрено основателем 2026-06-07).

---

## 1. Зачем (проблема)

Рентабельность сделки сегодня (`GetDealProfitabilityService`) = свёртка ОПиУ по статьям,
отфильтрованная по `projectId` сделки. **Общие (накладные) расходы** — аренда, зарплата
администрации, банковское обслуживание — **не привязаны ни к одной сделке** (у проводки
`projectId IS NULL`), поэтому не попадают в прибыль ни одной сделки. Предприниматель видит
«грязную» маржу сделки, но не **истинную чистую прибыль** после доли накладных.

⑦b закрывает это: позволяет создать правило «эту общую статью раскидать по сделкам по такому-то
ключу» и увидеть в карточке рентабельности строки **«после распределения»**.

## 2. Ключевой принцип (из §4.10) — распределение на стороне отчёта

Распределение **считается в момент построения отчёта, а не записывается проводками** в
`accounts_transactions`. Следствия:
- Правило можно включить/выключить — отчёт мгновенно возвращается «как было», без миграции данных.
- Журнал/книга остаются нетронутыми — бухгалтер всегда видит исходные «чистые» цифры.
- Прямо закрывает риск №15 роадмапа («автораспределение даёт неожиданные цифры»).

Это зеркалит то, как уже работает `ArticlesPlRollupService` (суммирует проводки по статьям в момент запроса).

## 3. Объём первой версии (Approach A)

**Входит:**
- Сущность-правило `CostAllocationRule` (тенантная таблица).
- Ключи распределения: **`revenue`** (пропорционально выручке сделки за период) и
  **`manual_share`** (явные доли по сделкам).
- Движок распределения на стороне отчёта; строки «после распределения» в рентабельности сделки.
- CRUD правил (создать/список/изменить/удалить) за флагом `COST_ALLOCATION`.
- Фронт: страница управления правилами + блок «после распределения» в карточке сделки.

**НЕ входит (явно отложено):**
- Ключи `payroll` / `headcount` — для сделок нет данных о ФОТ/численности (актуальны для
  «направлений/отделов», это отдельная цель). Архитектура ключа оставляет место для них.
- Цели-«направления/подразделения» (только сделки в v1).
- Кастомные формулы распределения (backlog §4.10).
- UI истории версий правил и автопересчёт прошлых отчётов (версионирование хранится в полях
  `valid_from`/`valid_to`, но без отдельного UI-просмотра истории).

## 4. Модель данных — тенантная таблица `cost_allocation_rules`

Миграция в `packages/server/src/database/tenant/migrations/` (стиль `exports.up/down`, как
`20260606130000_create_payment_requests_table.ts`).

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | increments | PK |
| `name` | string | Название правила, напр. «Аренда по выручке» |
| `source_article_id` | int unsigned, FK → `management_articles.id` | Какую общую статью расхода распределяем |
| `allocation_key` | string | `'revenue'` \| `'manual_share'` |
| `manual_shares` | json, nullable | `{ "<dealId>": <weight> }` — только для `manual_share` |
| `target_deal_ids` | json, nullable | Ограничение набора сделок для `revenue`; `null` = все активные сделки |
| `valid_from` | date, nullable | Версионирование: с какой даты действует |
| `valid_to` | date, nullable | По какую дату действует (`null` = бессрочно) |
| `is_active` | boolean, default true | Вкл/выкл правила (риск №15) |
| `created_at`/`updated_at` | timestamps | — |

Модель `CostAllocationRule` (objection, наследует `TenantBaseModel`), зарегистрировать в
`Tenancy.module.ts` (как `PaymentRequest`/`Deal`).

## 5. Движок распределения (чистая функция, тестируемая)

`utils/allocatePool.ts`:

```
allocatePool(pool: number, weights: { dealId: number; weight: number }[]): { dealId: number; amount: number }[]
```

- `totalWeight = Σ weight`. Если `totalWeight <= 0` → `[]` (распределять нечего/некуда).
- `raw_i = pool * weight_i / totalWeight`, округление до 2 знаков (копейки).
- **Метод наибольшего остатка**: остаток округления (`pool − Σ округлённых`) добавляется сделке с
  наибольшим весом, чтобы `Σ amount == pool` точно (без копеечного дрейфа).
- Отрицательные веса игнорируются (вес < 0 → 0).

Чистая, без зависимостей → юнит-тесты (как `computeDealMargin.spec`).

## 6. Расчёт «пула» и весов

Для правила и периода `[fromDate, toDate]`:

- **Пул** = сумма по `source_article_id` за период по проводкам, **не привязанным ни к какой сделке**
  (`projectId IS NULL`). Это избегает двойного счёта сумм, уже привязанных к сделкам напрямую.
  Реализация: расширить `ArticlesPlRollupService`/запрос модификатором «проект не задан»
  (`whereNull('project_id')`) — зеркало существующего `filterByProjects`.
- **Веса:**
  - `revenue`: `weight_i` = выручка сделки *i* за период. Источник — существующий расчёт выручки по
    сделкам из `getSummary` (свёртка, сгруппированная по `projectId`). Цели — активные сделки или
    `target_deal_ids`.
  - `manual_share`: `weight_i` из `manual_shares` JSON.
- **Окно действия:** правило применяется к периоду, если `valid_from ≤ toDate` (или `null`) И
  `valid_to ≥ fromDate` (или `null`). Без дат в запросе — применяются все активные правила.

> Уточнить в плане: точный источник батч-выручки по сделкам в `GetDealsSummaryService` (чтобы не
> делать N запросов `getRollup` по одной сделке).

## 7. Встраивание в рентабельность сделки

- Новый query-сервис `GetDealAllocationService.getForDeal(dealId, { fromDate, toDate })`:
  для каждого активного правила с пересечением окна — считает пул, веса, долю **этой** сделки;
  возвращает строки по правилам.
- `GetDealProfitabilityService`: **всегда** накладывает распределение на стороне отчёта (без серверной
  проверки флага). Ответ `DealProfitability` расширяется (обратносовместимо — поля только добавляются):

```ts
allocations: Array<{ ruleId: number; ruleName: string; articleId: number; articleName: string; amount: number }>;
allocatedTotal: number;                 // Σ allocations.amount
costsAfterAllocation: number;           // costs + allocatedTotal
profitAfterAllocation: number;          // profit − allocatedTotal
marginAfterAllocation: number;          // (revenue − costsAfterAllocation) / revenue, 0 если revenue<=0
```

- Нет правил → `allocations = []`, новые поля не добавляются (ответ ⑦a без изменений), поэтому
  серверная проверка флага не нужна. Флаг `COST_ALLOCATION` гейтит **фронт** (страница правил + показ
  блока «после распределения»), а не серверный API — так фичи гейтятся в этой кодовой базе.

## 8. Серверный модуль `CostAllocation`

Структура зеркалит `PaymentRequests` (проверенный паттерн этой ветки):

- `models/CostAllocationRule.model.ts`
- `dtos/CostAllocationRule.dto.ts` (Create/Edit), `dtos/GetRulesQuery.dto.ts`
- `commands/CreateCostAllocationRule.service.ts`, `EditCostAllocationRule.service.ts`,
  `DeleteCostAllocationRule.service.ts`, `CommandCostAllocationValidator.service.ts`
- `queries/GetCostAllocationRules.service.ts`, `queries/GetDealAllocation.service.ts`
- `utils/allocatePool.ts`
- `CostAllocation.application.ts`, `CostAllocation.controller.ts` (`/cost-allocation-rules`),
  `CostAllocation.module.ts`, `constants.ts`

**Валидатор** (`CommandCostAllocationValidator`):
- `source_article_id` существует и статья — расходная (`kind === 'expense'`);
- `allocation_key ∈ {revenue, manual_share}`;
- для `manual_share`: `manual_shares` непустой, значения числовые ≥ 0, ключи — id существующих сделок;
- `valid_from ≤ valid_to` (если обе заданы).

**Доступ:** управление правилами — действие финансовой настройки → админ. Зеркалить guard-паттерн
PaymentRequests (`AuthorizationGuard` + `PermissionGuard`, для записи — `@RequirePermission('manage','all')`).

## 9. Фронтенд (shadcn, RU-first)

- Страница `/cost-allocation` за флагом `COST_ALLOCATION` (+ маршрут в `routes/dashboard.tsx`):
  список правил + диалог создания/редактирования (React Hook Form + Zod), зеркало
  `PaymentRequestsPage`/`PaymentRequestDialog`.
- `containers/Deals/DealProfitability.tsx`: при наличии `allocations` — блок «после распределения»
  (строка на правило + «прибыль после распределения · маржа»), визуально отделён (приглушённый/с
  отступом) — индикатор «после распределения» по риску №15.
- `hooks/query/costAllocation.tsx` (зеркало `paymentRequests.tsx`).
- Языковые ключи EN+RU (`cost_allocation.*`, `deals.profitability.after_allocation`,
  `deals.profitability.allocated`, `deals.profitability.profit_after`) — строго парно,
  `lang-check.js` после правки.

## 10. Тесты (Jest, рядом с модулем)

- `allocatePool.spec.ts`: пропорция по выручке; ручные доли; нулевой/отрицательный вес; одна сделка;
  копеечный остаток (Σ == pool).
- `CommandCostAllocationValidator.service.spec.ts`: статья есть/расходная; ручные доли; даты.
- `GetDealAllocation.service.spec.ts`: пул × вес; окно действия; неактивное правило исключено;
  флаг off → пусто.
- `FeaturesConfigure.costAllocation.spec.ts`: флаг зарегистрирован, off по умолчанию (зеркало
  `FeaturesConfigure.deals.spec.ts`).

## 11. Проверка и откат

- `pnpm --filter @bigfin/server test` (новые спеки зелёные), `pnpm typecheck`,
  `node packages/webapp/scripts/lang-check.js` (парность EN↔RU).
- Миграция: функция `down()` обязательна (`dropTableIfExists`). Локальный прогон
  `latest→rollback→latest` — на CI/staging (локальный backend не настроен).
- **Откат фичи целиком:** флаг `COST_ALLOCATION` по умолчанию off → нулевое изменение поведения,
  пока основатель не включит. Полный откат — `git revert` ветки.

## 12. Порядок сборки (для плана)

1. Миграция `cost_allocation_rules` + модель + флаг `COST_ALLOCATION` + регистрация в `Tenancy.module`.
2. Движок `allocatePool` (чистый) + тесты.
3. Валидатор + CRUD (commands/queries) + контроллер + модуль + тесты.
4. `GetDealAllocation` + расширение `ArticlesPlRollup` (`whereNull('project_id')`) +
   встраивание в `GetDealProfitability` + тесты.
5. Фронт: хуки, страница/диалог правил, блок «после распределения», языковые ключи, маршрут.
6. Полный прогон: тесты + typecheck + lang-check.

## 13. Принятые решения и открытые детали

**Решено (зафиксировано):**
- Отдельный флаг `COST_ALLOCATION` (по умолчанию off), а не переиспользование `DEALS` — даёт
  включить сделки без распределения и безопасно вводить «неожиданные» цифры (риск №15).
- Пул = только непривязанные суммы (`projectId IS NULL`), чтобы не задвоить уже привязанное к сделкам.
- Распределение на стороне отчёта (не проводки), ключи `revenue` + `manual_share`.

**Детали к уточнению в плане (не блокеры дизайна):**
- Точный батч-источник выручки по сделкам (`GetDealsSummaryService`) для ключа `revenue`
  (избежать N запросов `getRollup` по одной сделке).
- Точный декоратор прав для записи правил (подтвердить по PaymentRequests).
