# Сравнение сценариев в план-факте — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в отчёт план-факт режим «Сравнить сценарии» — таблицу `Статья | Факт | Оптимистичный | Реалистичный | Пессимистичный` с % отклонения плана от факта и подсветкой ближайшего к факту сценария, за существующим флагом `budgets` (default off).

**Architecture:** Только фронтенд. В режиме сравнения компонент `BudgetPlanFactCompare` зовёт существующий эндпоинт `GET /budgets/:id/plan-fact?scenario=…` три раза (по одному на сценарий) и склеивает ответы чистой функцией `mergePlanFactScenarios`. Факт от сценария не зависит — берётся из любого ответа. Без правок бэкенда, миграций и SDK-регена.

**Tech Stack:** React 18 + TypeScript, React Query v3 (хук `useBudgetPlanFact`), Tailwind (классы как в текущей таблице), Vitest (unit-тест чистой функции), `react-intl-universal` (i18n).

**Spec:** [2026-06-02-budget-scenario-compare-design.md](../specs/2026-06-02-budget-scenario-compare-design.md)

---

## Pre-flight (читать до старта)

- **Окружение:** Node 18.16.1 (`fnm use 18.16.1` / `nvm use 18.16.1`), только `pnpm`. Локальный backend не нужен — фича фронтовая, проверки локальные.
- **Тест-раннер:** Vitest, уже настроен (`packages/webapp/vite.config.mts` → `test: { globals:true, environment:'jsdom', include:['src/**/*.{test,spec}.{ts,tsx}'] }`). Глобальные `describe/it/expect` — **импортировать из 'vitest' не нужно**. Алиас `@` → `packages/webapp/src`.
  - Запуск одного файла разово (не watch): `pnpm --filter @bigfin/webapp test -- run mergePlanFactScenarios`
- **Типы:** `pnpm --filter @bigfin/webapp typecheck` (= `tsc --noEmit`).
- **i18n:** новые ключи — напрямую в `lang/{en,ru}/index.json` парно; после правок `node packages/webapp/scripts/lang-check.js` (строгая парность EN↔RU).
- **commitlint:** в репо `@commitlint/config-conventional`. Заголовок ≤100 симв., без точки в конце; **строки тела ≤100 симв.** (иначе commit-msg hook упадёт). Проще — коммит только с заголовком.
- **Правила основателя:** маленькие шаги, после каждой задачи — проверка + способ отката. Всё additive, удалений нет. Бренд везде — только `Bigfin`.
- **Флаг:** `budgets` остаётся `false` по умолчанию — фича невидима, пока не включена.

---

## File Structure

| Файл | Ответственность | Действие |
|---|---|---|
| `packages/webapp/src/containers/Budgets/mergePlanFactScenarios.ts` | Чистая функция: склейка трёх наборов план-факта в строки сравнения (факт, 3 плана, % отклонения, ближайший) | Create |
| `packages/webapp/src/containers/Budgets/mergePlanFactScenarios.spec.ts` | Vitest unit-тесты чистой функции (edge-кейсы) | Create |
| `packages/webapp/src/containers/Budgets/BudgetPlanFactCompare.tsx` | Компонент таблицы сравнения: 3 вызова `useBudgetPlanFact`, склейка, рендер | Create |
| `packages/webapp/src/containers/Budgets/BudgetPlanFact.tsx` | + переключатель «Сравнить»; рендерит одиночную таблицу ИЛИ `<BudgetPlanFactCompare/>` | Modify |
| `packages/webapp/src/lang/en/index.json`, `packages/webapp/src/lang/ru/index.json` | + ключи `budgets.planfact.compare`, `budgets.planfact.closest` | Modify |

Порядок задач: чистая функция (с тестами) → i18n → компонент-таблица → переключатель → финальная проверка.

---

## Task 1: Чистая функция `mergePlanFactScenarios` (TDD)

**Files:**
- Create: `packages/webapp/src/containers/Budgets/mergePlanFactScenarios.ts`
- Test: `packages/webapp/src/containers/Budgets/mergePlanFactScenarios.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Create `packages/webapp/src/containers/Budgets/mergePlanFactScenarios.spec.ts`:

```ts
import { mergePlanFactScenarios } from './mergePlanFactScenarios';

describe('mergePlanFactScenarios', () => {
  it('merges three scenarios for one article (fact != 0)', () => {
    const rows = mergePlanFactScenarios({
      optimistic: [{ articleId: 1, name: 'Выручка', plan: 1500000, fact: 1200000 }],
      realistic: [{ articleId: 1, name: 'Выручка', plan: 1250000, fact: 1200000 }],
      pessimistic: [{ articleId: 1, name: 'Выручка', plan: 1000000, fact: 1200000 }],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      articleId: 1,
      name: 'Выручка',
      fact: 1200000,
      plans: { optimistic: 1500000, realistic: 1250000, pessimistic: 1000000 },
      deviations: { optimistic: 25, realistic: 4, pessimistic: -17 },
      closest: 'realistic',
    });
  });

  it('treats a missing article in a scenario as plan 0', () => {
    const rows = mergePlanFactScenarios({
      optimistic: [],
      realistic: [{ articleId: 2, name: 'Аренда', plan: 180000, fact: 180000 }],
      pessimistic: [],
    });

    expect(rows[0].plans).toEqual({
      optimistic: 0,
      realistic: 180000,
      pessimistic: 0,
    });
    expect(rows[0].closest).toBe('realistic');
  });

  it('returns null deviations and no highlight when fact is 0', () => {
    const rows = mergePlanFactScenarios({
      optimistic: [{ articleId: 3, name: 'Новая', plan: 5000, fact: 0 }],
      realistic: [{ articleId: 3, name: 'Новая', plan: 4000, fact: 0 }],
      pessimistic: [{ articleId: 3, name: 'Новая', plan: 3000, fact: 0 }],
    });

    expect(rows[0].deviations).toEqual({
      optimistic: null,
      realistic: null,
      pessimistic: null,
    });
    expect(rows[0].closest).toBeNull();
  });

  it('resolves a closest tie by scenario order (optimistic first)', () => {
    const rows = mergePlanFactScenarios({
      optimistic: [{ articleId: 4, name: 'X', plan: 80, fact: 100 }],
      realistic: [{ articleId: 4, name: 'X', plan: 120, fact: 100 }],
      pessimistic: [{ articleId: 4, name: 'X', plan: 80, fact: 100 }],
    });

    expect(rows[0].closest).toBe('optimistic');
  });

  it('returns an empty array for empty input', () => {
    expect(
      mergePlanFactScenarios({ optimistic: [], realistic: [], pessimistic: [] }),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm --filter @bigfin/webapp test -- run mergePlanFactScenarios`
Expected: FAIL — `Failed to resolve import './mergePlanFactScenarios'` (модуль не создан).

- [ ] **Step 3: Реализовать функцию**

Create `packages/webapp/src/containers/Budgets/mergePlanFactScenarios.ts`:

```ts
export type ScenarioKey = 'optimistic' | 'realistic' | 'pessimistic';

/** Строка ответа эндпоинта план-факт (фронт использует это подмножество полей). */
export interface PlanFactRow {
  articleId: number;
  name: string;
  kind?: string;
  plan: number;
  fact: number;
}

export interface CompareRow {
  articleId: number;
  name: string;
  fact: number;
  plans: Record<ScenarioKey, number>;
  deviations: Record<ScenarioKey, number | null>;
  closest: ScenarioKey | null;
}

const SCENARIO_ORDER: ScenarioKey[] = ['optimistic', 'realistic', 'pessimistic'];

/**
 * Склеивает три набора план-факта (по одному сценарию каждый) в строки сравнения.
 * Факт от сценария не зависит — берётся из realistic, затем optimistic, затем pessimistic.
 * deviation% = round((plan - fact) / fact * 100); null, если fact === 0.
 * closest = сценарий с минимальным |plan - fact|; ничья — по SCENARIO_ORDER (первый);
 * null, если fact === 0.
 * @param {Record<ScenarioKey, PlanFactRow[]>} byScenario
 * @returns {CompareRow[]}
 */
export function mergePlanFactScenarios(
  byScenario: Record<ScenarioKey, PlanFactRow[]>,
): CompareRow[] {
  const index: Record<ScenarioKey, Map<number, PlanFactRow>> = {
    optimistic: new Map(),
    realistic: new Map(),
    pessimistic: new Map(),
  };
  SCENARIO_ORDER.forEach((s) => {
    (byScenario[s] ?? []).forEach((row) => index[s].set(row.articleId, row));
  });

  // Объединение статей: порядок первого появления (realistic → optimistic → pessimistic).
  const unionOrder: ScenarioKey[] = ['realistic', 'optimistic', 'pessimistic'];
  const seen = new Set<number>();
  const articleIds: number[] = [];
  unionOrder.forEach((s) => {
    (byScenario[s] ?? []).forEach((row) => {
      if (!seen.has(row.articleId)) {
        seen.add(row.articleId);
        articleIds.push(row.articleId);
      }
    });
  });

  return articleIds.map((articleId) => {
    const ref =
      index.realistic.get(articleId) ??
      index.optimistic.get(articleId) ??
      index.pessimistic.get(articleId);
    const fact = Number(ref?.fact ?? 0);
    const name = ref?.name ?? '';

    const plans: Record<ScenarioKey, number> = {
      optimistic: Number(index.optimistic.get(articleId)?.plan ?? 0),
      realistic: Number(index.realistic.get(articleId)?.plan ?? 0),
      pessimistic: Number(index.pessimistic.get(articleId)?.plan ?? 0),
    };

    const dev = (plan: number): number | null =>
      fact === 0 ? null : Math.round(((plan - fact) / fact) * 100);
    const deviations: Record<ScenarioKey, number | null> = {
      optimistic: dev(plans.optimistic),
      realistic: dev(plans.realistic),
      pessimistic: dev(plans.pessimistic),
    };

    let closest: ScenarioKey | null = null;
    if (fact !== 0) {
      let best = Infinity;
      SCENARIO_ORDER.forEach((s) => {
        const dist = Math.abs(plans[s] - fact);
        if (dist < best) {
          best = dist;
          closest = s;
        }
      });
    }

    return { articleId, name, fact, plans, deviations, closest };
  });
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `pnpm --filter @bigfin/webapp test -- run mergePlanFactScenarios`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/containers/Budgets/mergePlanFactScenarios.ts packages/webapp/src/containers/Budgets/mergePlanFactScenarios.spec.ts
git commit -m "feat(webapp): add mergePlanFactScenarios pure function with tests"
```
Откат: `git checkout -- packages/webapp/src/containers/Budgets/mergePlanFactScenarios.ts packages/webapp/src/containers/Budgets/mergePlanFactScenarios.spec.ts` (или удалить новые файлы).

---

## Task 2: i18n-ключи

**Files:**
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Найти блок `budgets.planfact.*` в EN**

В `packages/webapp/src/lang/en/index.json` найти строку `"budgets.planfact.title"` (и соседние `budgets.planfact.col_*`). Новые ключи добавим рядом.

- [ ] **Step 2: Добавить ключи в EN**

В `packages/webapp/src/lang/en/index.json` добавить две строки в блоке `budgets.planfact.*` (например, сразу после `"budgets.planfact.title": ...`):

```json
  "budgets.planfact.compare": "Compare scenarios",
  "budgets.planfact.closest": "Closest to actual",
```

- [ ] **Step 3: Добавить ключи в RU (те же ключи, тот же порядок)**

В `packages/webapp/src/lang/ru/index.json` в том же месте блока `budgets.planfact.*`:

```json
  "budgets.planfact.compare": "Сравнить сценарии",
  "budgets.planfact.closest": "Ближайший к факту",
```

- [ ] **Step 4: Проверить парность**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: `✅ OK: парность ключей en↔ru соблюдена.` (и счётчик ключей в EN == RU).

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(webapp): i18n keys for budget plan-fact scenario compare"
```
Откат: `git checkout -- packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json`.

---

## Task 3: Компонент таблицы сравнения `BudgetPlanFactCompare`

**Files:**
- Create: `packages/webapp/src/containers/Budgets/BudgetPlanFactCompare.tsx`

> Логика склейки уже покрыта тестами Task 1; здесь проверка — `typecheck` (компонент тонкий: 3 запроса → склейка → рендер).

- [ ] **Step 1: Создать компонент**

Create `packages/webapp/src/containers/Budgets/BudgetPlanFactCompare.tsx`:

```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { useBudgetPlanFact } from '@/hooks/query/budgets';
import { mergePlanFactScenarios, ScenarioKey } from './mergePlanFactScenarios';

const SCENARIOS: ScenarioKey[] = ['optimistic', 'realistic', 'pessimistic'];

const fmt = (n: number) => n.toLocaleString('ru-RU');
const pct = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v}%`);

export function BudgetPlanFactCompare({
  budgetId,
  fromDate,
  toDate,
}: {
  budgetId: number;
  fromDate: string;
  toDate: string;
}) {
  const opt = useBudgetPlanFact(
    budgetId,
    { fromDate, toDate, scenario: 'optimistic' },
    {},
  );
  const real = useBudgetPlanFact(
    budgetId,
    { fromDate, toDate, scenario: 'realistic' },
    {},
  );
  const pes = useBudgetPlanFact(
    budgetId,
    { fromDate, toDate, scenario: 'pessimistic' },
    {},
  );

  const rows = React.useMemo(
    () =>
      mergePlanFactScenarios({
        optimistic: opt.data?.rows ?? [],
        realistic: real.data?.rows ?? [],
        pessimistic: pes.data?.rows ?? [],
      }),
    [opt.data, real.data, pes.data],
  );

  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr>
          <th className="px-2 py-1 text-left">
            {intl.get('management_articles.field.name')}
          </th>
          <th className="px-2 py-1 text-right">
            {intl.get('budgets.planfact.col_fact')}
          </th>
          {SCENARIOS.map((s) => (
            <th key={s} className="px-2 py-1 text-right">
              {intl.get(`budgets.scenario.${s}`)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.articleId} className="border-t">
            <td className="px-2 py-1">{r.name}</td>
            <td className="px-2 py-1 text-right font-semibold">{fmt(r.fact)}</td>
            {SCENARIOS.map((s) => (
              <td
                key={s}
                title={
                  r.closest === s
                    ? intl.get('budgets.planfact.closest')
                    : undefined
                }
                className={`px-2 py-1 text-right ${
                  r.closest === s ? 'bg-green-100 font-semibold' : ''
                }`}
              >
                {fmt(r.plans[s])}
                <span className="block text-xs text-gray-500">
                  {pct(r.deviations[s])}
                </span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

> Примечание: `useBudgetPlanFact` вызывается ровно 3 раза в фиксированном порядке — соответствует Rules of Hooks. Компонент монтируется только когда «Сравнить» включено (Task 4), поэтому в одиночном режиме лишних запросов нет. Ключи `management_articles.field.name`, `budgets.planfact.col_fact`, `budgets.scenario.*` уже существуют (используются в текущем `BudgetPlanFact`/`BudgetFormDialog`).

- [ ] **Step 2: Проверка типов**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/containers/Budgets/BudgetPlanFactCompare.tsx
git commit -m "feat(webapp): add BudgetPlanFactCompare table component"
```
Откат: `git checkout -- packages/webapp/src/containers/Budgets/BudgetPlanFactCompare.tsx` (или удалить файл).

---

## Task 4: Переключатель «Сравнить» в `BudgetPlanFact`

**Files:**
- Modify: `packages/webapp/src/containers/Budgets/BudgetPlanFact.tsx`

- [ ] **Step 1: Показать текущий файл**

Открыть `packages/webapp/src/containers/Budgets/BudgetPlanFact.tsx`. Сейчас он принимает `{ budgetId, fromDate, toDate, scenario }`, зовёт `useBudgetPlanFact` и рисует одиночную таблицу. Добавим локальное состояние `compare` и переключатель; одиночную таблицу оставляем в ветке `else` без изменений.

- [ ] **Step 2: Заменить содержимое файла**

Replace the entire contents of `packages/webapp/src/containers/Budgets/BudgetPlanFact.tsx` with:

```tsx
import React from 'react';
import intl from 'react-intl-universal';
import { Button } from '@/components/ui/button';
import { useBudgetPlanFact } from '@/hooks/query/budgets';
import { BudgetPlanFactCompare } from './BudgetPlanFactCompare';

export function BudgetPlanFact({
  budgetId,
  fromDate,
  toDate,
  scenario,
}: {
  budgetId: number;
  fromDate: string;
  toDate: string;
  scenario: string;
}) {
  const [compare, setCompare] = React.useState(false);
  const { data } = useBudgetPlanFact(
    budgetId,
    { fromDate, toDate, scenario },
    {},
  );
  const rows = data?.rows ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          variant={compare ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setCompare((v) => !v)}
        >
          {intl.get('budgets.planfact.compare')}
        </Button>
      </div>

      {compare ? (
        <BudgetPlanFactCompare
          budgetId={budgetId}
          fromDate={fromDate}
          toDate={toDate}
        />
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">
                {intl.get('management_articles.field.name')}
              </th>
              <th className="px-2 py-1 text-right">
                {intl.get('budgets.planfact.col_plan')}
              </th>
              <th className="px-2 py-1 text-right">
                {intl.get('budgets.planfact.col_fact')}
              </th>
              <th className="px-2 py-1 text-right">
                {intl.get('budgets.planfact.col_variance_abs')}
              </th>
              <th className="px-2 py-1 text-right">
                {intl.get('budgets.planfact.col_variance_pct')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.articleId} className="border-t">
                <td className="px-2 py-1">{r.name}</td>
                <td className="px-2 py-1 text-right">
                  {r.plan.toLocaleString('ru-RU')}
                </td>
                <td className="px-2 py-1 text-right">
                  {r.fact.toLocaleString('ru-RU')}
                </td>
                <td
                  className={`px-2 py-1 text-right ${
                    r.varianceAbs < 0 ? 'text-red-600' : ''
                  }`}
                >
                  {r.varianceAbs.toLocaleString('ru-RU')}
                </td>
                <td className="px-2 py-1 text-right">
                  {r.variancePct == null ? '—' : `${r.variancePct}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

> Одиночная таблица (ветка `else`) — это текущая разметка без изменений, просто обёрнута в контейнер с переключателем. Ключи `budgets.planfact.col_plan/col_fact/col_variance_abs/col_variance_pct` уже существуют.

- [ ] **Step 3: Проверка типов и парности**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: без ошибок.

Run: `node packages/webapp/scripts/lang-check.js`
Expected: парность соблюдена.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/containers/Budgets/BudgetPlanFact.tsx
git commit -m "feat(webapp): add compare-scenarios toggle to budget plan-fact"
```
Откат: `git checkout -- packages/webapp/src/containers/Budgets/BudgetPlanFact.tsx`.

---

## Финальная проверка (после всех задач)

- [ ] **Unit-тесты чистой функции:** `pnpm --filter @bigfin/webapp test -- run mergePlanFactScenarios` — 5 зелёных.
- [ ] **Типы:** `pnpm --filter @bigfin/webapp typecheck` — 0 ошибок.
- [ ] **Парность langs:** `node packages/webapp/scripts/lang-check.js` — exit 0.
- [ ] Бэкенд/миграции/SDK не трогались → серверные тесты не затронуты.
- [ ] Флаг `budgets` остаётся `false` по умолчанию.
- [ ] **Ручная проверка (staging, за флагом):** открыть бюджет → План-факт → кнопка «Сравнить сценарии» переключает на таблицу `Факт | Оптимистичный | Реалистичный | Пессимистичный`; факт совпадает с одиночным отчётом; ближайший к факту план подсвечен; повторный клик возвращает одиночный вид.

---

## Открытые вопросы (из спеки)

1. **Округление %:** до целого (как в макете). Если при dogfooding нужна точность — заменить `Math.round(... )` на округление до 1 знака в `mergePlanFactScenarios` (и поправить ожидания в тесте).
