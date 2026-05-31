# Bigfin — Сводный мастер-план (все под-проекты) — 2026-05-31

> **Назначение.** Этот документ сводит **все 9 планов реализации** репозитория в один навигационный мастер-план: что сделано, что в работе, что писать дальше и в каком порядке. Детали по шагам остаются в под-планах (ссылки ниже) — здесь верхний уровень, статусы и единая pre-flight.
>
> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans` (или `subagent-driven-development`). Источник истины по per-task шагам — под-планы, на которые ссылается §3.

---

## 1. Два трека

Планы делятся на два независимых трека:

| Трек | Что это | Состояние |
|---|---|---|
| **A. Ф1 «Фундамент»** | Русификация, редизайн (Bold Fintech), РФ-юр-реквизиты, auth-флоу | ✅ В основном **смержен / завершён** (PR #1–#20) |
| **B. Управленческий каркас** | Статьи учёта → платёжный календарь → бюджеты/план-факт | ✅ Этапы 0/1/2+3 реализованы (за флагами, default off; миграции — прогон в CI) |

Жёсткая связь между треками: каркас (трек B) зависит от русификации и режимов из трека A (без RU-терминологии новые модули некак именовать). Поскольку Этап 0 трека B уже реализован, зависимости трека A считаются удовлетворёнными.

---

## 2. Трек A — Ф1 «Фундамент» (каталог, исторический)

Шесть планов. Большинство уже на `develop`. Здесь они зафиксированы для полноты; **новый код по ним не пишем** (только финальные приёмки, если отмечено).

| План | Под-проект | Goal | Статус |
|---|---|---|---|
| [2026-05-21-russian-localization-plan.md](2026-05-21-russian-localization-plan.md) | ① Русификация v1 | Полная RU-локаль (frontend+server), терминология упр.учёта, RUB, форматы | 📦 **Историческая** версия (старые `bigcapital/` пути). Заменена v2/v3 |
| [2026-05-22-russian-localization-plan.md](2026-05-22-russian-localization-plan.md) | ① Русификация v2 | То же, с учётом, что фундамент (PR #1/#2) уже готов | 📦 **Заменена** v3 |
| [2026-05-27-russian-localization-plan.md](2026-05-27-russian-localization-plan.md) | ① Русификация v3 | Доперевод модулей; workflow через `translations/ru.json` + `apply-ru-translations.js` | ✅ **Почти завершён** (PR #1,#4,#5,#6,#7). Осталась визуальная приёмка `?lang=ru` |
| [2026-05-25-redesign-plan.md](2026-05-25-redesign-plan.md) | D-редизайн Ф0/1/2 | Tailwind 4 + Storybook 8 + shadcn рядом с Blueprint; Login/Register/Forgot на Bold Fintech | ✅ **Смержен** (PR #11,#12,#13) |
| [2026-05-27-russian-legal-attributes-plan.md](2026-05-27-russian-legal-attributes-plan.md) | ②a Юр-реквизиты | ИНН/КПП/ОГРН/банк-реквизиты, ставки НДС, юр.формы; checksum-валидаторы; данные в `tenants_metadata` | ✅ **Готов** (PR #14,#20). Модуль `RussianLegalAttributes` (5 валидаторов, 40 тестов) |
| [2026-05-29-d-phase-3-plan.md](2026-05-29-d-phase-3-plan.md) | D-редизайн Ф3 | 3 оставшиеся auth-страницы (EmailConfirmation/RegisterVerify/InviteAccept) + DashboardShell (Sidebar/Topbar) | ✅ **Реализован** — Block A (auth-страницы+проводка, легаси удалён), Block B (DS-v2: avatar/dropdown/tabs/badge/breadcrumb/Sidebar/Topbar), Block C (DashboardShell в живом app), Block D (приёмка). Визуальная проверка — staging |

> Примечание: 3 плана русификации (05-21 / 05-22 / 05-27) — это **итерации одного** под-проекта ①. Актуальна v3; v1/v2 оставлены как история.

---

## 3. Трек B — Управленческий каркас (живая работа)

Один связный конвейер из трёх под-планов. Общая модель данных: «статьи» (дерево упр.категорий) и «направления» (`branch_id`). Всё за feature-флагами, по умолчанию `false`.

Опорная спека (объединённая): [2026-05-29-management-core-and-planning-design.md](../specs/2026-05-29-management-core-and-planning-design.md).
Дорожная карта: [2026-05-27-fintablo-planfact-parity-roadmap.md](../specs/2026-05-27-fintablo-planfact-parity-roadmap.md) (v3-патч: «Этап 0 готов, следующий — Этап 1»).

### Этап 0 — «Статьи учёта» ✅ ГОТОВ

План: [2026-05-29-management-articles-foundation.md](2026-05-29-management-articles-foundation.md)

Реализовано и встроено в код:
- Модуль `packages/server/src/modules/ManagementArticles/` — модели (`ManagementArticle`, `ManagementArticleAccount`), CRUD-команды, запросы (список/дерево, `ArticlesPlRollup` — свёртка «счёт→статья»), DTO, контроллер, application, module.
- Подключён в `App.module.ts` (`ManagementArticlesModule`), модели в `Tenancy.module.ts`.
- Сид RU-дерева: `database/tenant/seeds/data/managementArticles.ts`.
- Фронт: `packages/webapp/src/containers/ManagementArticles/` (страница-дерево, форма, схемы).
- Флаг `Features.MGMT_ARTICLES` (`common/types/Features.ts`), запись в `FeaturesConfigure`.

**Переиспользуется дальше:** модели и чистые функции свёртки из `ArticlesPlRollup.service` нужны Этапам 1 и 2+3.

### Этап 1 — «Платёжный календарь» ✅ ГОТОВ (backend+frontend, 16 unit-тестов)

План: [2026-05-31-payment-calendar-plan.md](2026-05-31-payment-calendar-plan.md) · Спека: [2026-05-31-payment-calendar-design.md](../specs/2026-05-31-payment-calendar-design.md)

Прогноз остатка денег по дням из 4 источников (неоплаченные счета/акты, денежные счета, ручные и повторяющиеся плановые операции) с подсветкой кассового разрыва. Флаг `payment_calendar`.

- **Part A** — CRUD плановых операций: флаг, миграция `planned_operations`, модель, DTO, валидатор, Create/Edit/Delete, список.
- **Part B** — движок прогноза: чистые `expandRecurrence` + `computeRunningBalance`, оркестратор `GetPaymentCalendarForecast`.
- **Part C** — application, controller (`payment-calendar` + `planned-operations`), module, wiring (App/Tenancy).
- **Frontend** — хуки React Query, страница-лента по дням, `DayRow`, модалка операции (RHF+Zod), маршрут, i18n.

### Этапы 2+3 — «Бюджеты и план-факт» ✅ ГОТОВ (backend+frontend, 14 unit-тестов)

План: [2026-05-31-budgets-plan.md](2026-05-31-budgets-plan.md) · Спека: [2026-05-31-budgets-design.md](../specs/2026-05-31-budgets-design.md)

Бюджеты (БДиР/БДДС, сценарии опт/реал/пес, сетка статья×месяцы) + отчёт план-факт. Флаг `budgets`.

- **Part A** — бюджеты CRUD + сетка: флаг, миграции `budgets`/`budget_lines`, модели, DTO, валидатор, CRUD, `UpsertBudgetLines` (upsert ячеек), запросы списка/сетки.
- **Part B** — план-факт: чистые `computeVariance` + `cashSettledReferenceKeys`, `ArticlesCashflowRollup` (кассовый факт, переиспользует свёртку Этапа 0), `GetBudgetPlanFact`.
- **Part C** — application, controller, module, wiring.
- **Frontend** — хуки, список бюджетов, сетка ввода, экран план-факт, форма, маршрут, i18n.

---

## 4. Единая pre-flight (для трека B)

**Гейтинг.** Каркас идёт после Ф1 (① русификация, ③ режимы) — удовлетворено (Этап 0 реализован). Флаги по умолчанию `false`: смерженный код невидим, пока не включён для организации.

**Окружение.** Node 18.16.1 (`fnm use`/`nvm use`), только `pnpm`. Локальный backend не поднят:
- Серверная логика → `pnpm --filter @bigfin/server test` (юнит-тесты мокированы, работают даже на глобальном Node 24) + `pnpm typecheck`.
- ⚠️ **Миграции локально не прогнать** (нет БД) — пишем с рабочим `down()`, прогон `latest→rollback→latest` выполняется в CI/staging.
- SDK-типы для новых endpoint'ов регенерируются **в CI** (локально заблокировано) — `shared/sdk-ts` руками не трогаем; фронт-хуки строим по образцу существующих ManagementArticles-хуков.

**Правила основателя.** Маленькие шаги по умолчанию; на этот заход основатель явно выбрал **автономное исполнение** Этапов 1 и 2+3 (без пауз по задачам). Перед правкой существующего файла — показывать фрагмент. Удалений нет (всё additive).

**Миграции.** Только additive. Обязательный рабочий `down()`. Через скилл `make-migration` (корректный timestamp).

**i18n.** Любая строка экрана — `intl.get('...')` / `<T id="..." />`; сообщения Zod — тоже через `intl.get`. После правок lang-файлов — `node packages/webapp/scripts/lang-check.js` (парность EN↔RU). Скилл `i18n-add-string`.

**Бренд.** Везде только `Bigfin`.

---

## 5. Порядок и зависимости (трек B)

```
Этап 0 (статьи) ✅ → Этап 1 (календарь) ⏳ → Этапы 2+3 (бюджеты + план-факт) ⏳
```

- Этап 1 импортирует модель `ManagementArticle` (FK `planned_operations.article_id`).
- Этапы 2+3 импортируют чистые функции свёртки из `ArticlesPlRollup` (Этап 0) для кассового факта `ArticlesCashflowRollup`, и FK `budget_lines.article_id` → `management_articles`.
- Внутри каждого этапа: Part A → B → C → Frontend. Чистые функции (`expandRecurrence`, `computeRunningBalance`, `computeVariance`, `cashSettledReferenceKeys`) — TDD, тесты обязательны.

Точка естественной паузы: после Этапа 1 (рабочий календарь) и после Этапов 2+3 (MVP управленческого каркаса).

---

## 6. Текущее состояние кода (на 2026-05-31)

| Компонент | Есть? |
|---|---|
| `Features.MGMT_ARTICLES` | ✅ |
| `Features.PAYMENT_CALENDAR` / `BUDGETS` | ✅ (добавлены, default off) |
| Модуль `ManagementArticles` (backend+frontend+seed) | ✅ |
| Модуль `PaymentCalendar` | ✅ (Этап 1 — backend+frontend) |
| Модуль `Budgets` | ✅ (Этапы 2+3 — backend+frontend) |

**Проверка после работы:** `pnpm --filter @bigfin/server test` (новые специи) → `pnpm typecheck` → `node packages/webapp/scripts/lang-check.js`. Миграции — отметить для прогонки в CI.
