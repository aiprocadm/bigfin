# Сравнение сценариев в план-факте — Design (spec)

> **Дата:** 2026-06-02
> **Статус:** утверждён в brainstorm (founder), готов к написанию плана.
> **Реализует:** follow-up №6 плана бюджетов ([2026-05-31-budgets-plan.md](../plans/2026-05-31-budgets-plan.md)) и Открытый вопрос №4 спеки бюджетов ([2026-05-31-budgets-design.md](2026-05-31-budgets-design.md)) — «режим сравнения трёх сценариев».
> **Трек:** B (управленческий каркас), за существующим флагом `budgets` (default off).

---

## 1. Цель

Дать в отчёте **план-факт** режим «Сравнить сценарии»: рядом с фактом показать план по всем трём сценариям (оптимистичный/реалистичный/пессимистичный) и понять, к какому сценарию реальность оказалась ближе.

Сегодня план-факт показывает **один** сценарий (управляется селектором сценария, поднятым в `BudgetsPage` — PR #40). Эта фича добавляет переключатель «Сравнить», который превращает отчёт в таблицу из четырёх чисел на статью: факт + три плана.

## 2. Что уже есть (контекст)

- **Бэкенд план-факта** `GET /budgets/:id/plan-fact?fromDate&toDate&scenario` — `GetBudgetPlanFactService`. Возвращает строки `{ articleId, name, kind, plan, fact, varianceAbs, variancePct }`. **`scenario` уже принимается и применяется** (берётся `query.scenario || budget.activeScenario`, фильтрует `budget_lines`). **Факт от сценария не зависит** (это фактические обороты по статьям из проводок).
- **Фронт:** `BudgetPlanFact.tsx` (таблица одного сценария), хук `useBudgetPlanFact(id, query, props)`. Селектор сценария — в `BudgetsPage.tsx`, управляет и сеткой, и план-фактом.
- **i18n:** `budgets.scenario.{optimistic,realistic,pessimistic}` (RU+EN) уже есть; `budgets.planfact.col_*` есть.

## 3. Зафиксированные решения (brainstorm)

1. **Где:** только в **план-факте** (не в сетке ввода).
2. **Подход к данным:** **фронтенд-веер** — фронт зовёт существующий эндпоинт `plan-fact` три раза (по сценарию) и склеивает на клиенте. **Без правок бэкенда, без миграций, без SDK-регена** (последний локально заблокирован — known gotcha). Факт берём из любого ответа (одинаков), планы — из каждого.
3. **Вид таблицы:** `Статья | Факт | Оптимистичный | Реалистичный | Пессимистичный`. Заголовки сценариев — **полными словами** (не сокращения). Под каждым планом — **% отклонения плана от факта**. В строке зелёным подсвечен план, ближайший к факту.
4. **Формула %:** `(план − факт) / факт × 100` («план на X% выше/ниже факта»), «—» если факт = 0. **Внимание:** это отличается от одиночного отчёта, где «Отклонение» = факт относительно плана. В режиме сравнения вопрос другой («куда попал факт относительно планов»), поэтому формула своя и считается на клиенте.

## 4. Архитектура и компоненты

Правки только во фронте, `packages/webapp/src/`. Мелкие изолированные единицы:

| Файл | Ответственность | Тип |
|---|---|---|
| `containers/Budgets/mergePlanFactScenarios.ts` | **Чистая функция** склейки трёх наборов план-факта в строки сравнения | новый, **TDD** |
| `containers/Budgets/mergePlanFactScenarios.spec.ts` | Unit-тесты чистой функции | новый |
| `containers/Budgets/BudgetPlanFactCompare.tsx` | Таблица сравнения: 3 вызова `useBudgetPlanFact`, склейка, рендер | новый |
| `containers/Budgets/BudgetPlanFact.tsx` | + переключатель «Сравнить»; рендерит либо текущую одиночную таблицу, либо `<BudgetPlanFactCompare/>` | правка |
| `lang/{en,ru}/index.json` | + ключи `budgets.planfact.compare`, `budgets.planfact.closest` | правка |

**Почему отдельный `BudgetPlanFactCompare`, а не `if` внутри `BudgetPlanFact`:** три вызова `useBudgetPlanFact` должны подчиняться Rules of Hooks (безусловный фиксированный порядок). Вынеся их в отдельный компонент, который монтируется только при «Сравнить = вкл», мы держим хуки чистыми и не делаем три лишних запроса в одиночном режиме.

## 5. Поток данных

```
BudgetPlanFact (toggle "Сравнить")
  ├─ выкл → существующая таблица одного сценария (без изменений)
  └─ вкл  → <BudgetPlanFactCompare budgetId fromDate toDate />
               ├─ useBudgetPlanFact(id, {fromDate,toDate, scenario:'optimistic'})
               ├─ useBudgetPlanFact(id, {fromDate,toDate, scenario:'realistic'})
               ├─ useBudgetPlanFact(id, {fromDate,toDate, scenario:'pessimistic'})
               ├─ mergePlanFactScenarios({optimistic, realistic, pessimistic})  // чистая
               └─ рендер таблицы сравнения
```

React Query кэширует три запроса по разным ключам. Факт во всех трёх ответах совпадает (от сценария не зависит) — в склейке берём канонический из `realistic`, с фолбэком на любой присутствующий.

## 6. Расчёты (точные правила — для тестов)

**Сигнатура:**
```ts
mergePlanFactScenarios(byScenario: {
  optimistic: PlanFactRow[];
  realistic: PlanFactRow[];
  pessimistic: PlanFactRow[];
}): CompareRow[]
```
где `PlanFactRow = { articleId, name, kind, plan, fact, ... }` (ответ бэкенда), и
```ts
CompareRow = {
  articleId: number;
  name: string;
  fact: number;
  plans: { optimistic: number; realistic: number; pessimistic: number };
  deviations: {            // % = (plan − fact)/fact*100, округление до целого; null если fact==0
    optimistic: number | null;
    realistic: number | null;
    pessimistic: number | null;
  };
  closest: 'optimistic' | 'realistic' | 'pessimistic' | null;
}
```

**Правила:**
- **Объединение статей:** строки = объединение `articleId` из всех трёх наборов. Если в каком-то сценарии статьи нет → её `plan = 0` для этого сценария.
- **Факт:** из строки статьи в `realistic`; если там нет — из `optimistic`, затем `pessimistic`. `name`/`kind` — из любой присутствующей строки.
- **deviation %:** `Math.round((plan − fact) / fact * 100)`; `null`, если `fact === 0`.
- **closest:** сценарий с минимальным `|plan − fact|`. Ничья → по порядку `optimistic → realistic → pessimistic` (первый побеждает). `null`, если `fact === 0` (подсветки нет — сравнивать не с чем).

**Edge-кейсы для тестов:**
1. Статья во всех трёх сценариях, факт ≠ 0 → три плана, % и closest посчитаны.
2. Статья только в части сценариев → отсутствующие планы = 0.
3. `fact == 0` → все deviations = `null`, `closest = null` (без подсветки).
4. Ничья по |план−факт| → побеждает по порядку opt→real→pes.
5. Пустые наборы → пустой результат.

## 7. i18n

Новые ключи (парно EN+RU), добавляются напрямую в `lang/{en,ru}/index.json`, проверка `lang-check.js`:

| Ключ | EN | RU |
|---|---|---|
| `budgets.planfact.compare` | "Compare scenarios" | "Сравнить сценарии" |
| `budgets.planfact.closest` | "Closest to actual" | "Ближайший к факту" |

Заголовки колонок сценариев — переиспользуем `budgets.scenario.{optimistic,realistic,pessimistic}`. `budgets.planfact.col_fact` — есть.

## 8. Тестирование

- **TDD на `mergePlanFactScenarios`** (Vitest — уже настроен в вебаппе, запуск `pnpm --filter @bigfin/webapp test`; файл `*.spec.ts` рядом с функцией) — все edge-кейсы §6. Это сердце фичи, чистая функция без React.
- `pnpm --filter @bigfin/webapp typecheck` — 0 ошибок.
- `node packages/webapp/scripts/lang-check.js` — парность EN↔RU.
- Бэкенд не трогаем → серверные тесты не затрагиваются; миграций/SDK-регена нет.
- e2e/визуальная приёмка `?lang=ru` — за флагом `budgets`, на staging (как и весь трек B).

> Тест-раннер вебаппа: **Vitest** (`vitest ^2.1.3`, `@testing-library/react`) — подтверждён, конфигурация уже есть.

## 9. Вне scope (non-goals)

- **Сетка ввода** не меняется (сравнение — только в отчёте). «Три сетки рядом» в режиме ввода — не делаем.
- **Бэкенд/миграции/SDK** не трогаем.
- **Формулы между сценариями** («пес = реал × 0.8») — бэклог (роадмап).
- **Экспорт план-факта (PDF/Excel)** — отдельная фича/цикл.
- Одиночный режим отчёта (текущая таблица с «Отклонение» = факт vs план) остаётся как есть.

## 10. Критерии приёмки

1. На план-факте есть переключатель «Сравнить сценарии»; **выкл** — поведение не изменилось.
2. **Вкл** — таблица `Статья | Факт | Оптимистичный | Реалистичный | Пессимистичный`; под каждым планом % отклонения от факта; в строке подсвечен ближайший к факту план.
3. Факт в режиме сравнения совпадает с фактом одиночного отчёта за тот же период.
4. `mergePlanFactScenarios` покрыта unit-тестами (edge-кейсы §6) — зелёные.
5. `typecheck` и `lang-check` — зелёные. Флаг `budgets` остаётся `false` по умолчанию.

## 11. Открытые вопросы

1. **Округление %:** в спеке — до целого (как в макете B). Если при dogfooding нужна точность — до 1 знака (тривиальная правка).
