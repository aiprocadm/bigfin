# Дизайн: Долги — дебиторка/кредиторка (под-проект ⑭)

**Дата:** 2026-06-05
**Тип документа:** Design (спецификация под-проекта)
**Статус:** Draft → одобрен основателем 2026-06-05 (подход A, весь scope, включая план погашения), ожидает финального review спеки
**Реализует:** под-проект ⑭ роадмапа — Дебиторка/кредиторка, модуль «Долги»
**Родительский роадмап:** [2026-05-27-fintablo-planfact-parity-roadmap.md](2026-05-27-fintablo-planfact-parity-roadmap.md) (⑭ открывает Ф3a)
**Предшественники (переиспользуем паттерны):** ④ «Статьи учёта» и ⑥ «Платёжный календарь» — реализованы; AR/AP aging-отчёты — в коде.

---

## 0. Зачем этот документ

⑭ открывает фазу Ф3a. Ключевое отличие от прежних под-проектов: **бóльшая часть данных уже есть в коде** — её надо не строить заново, а собрать в один дружелюбный экран режима «Бизнес». Этот документ фиксирует точную границу «что переиспользуем / что строим» и описывает единственный реально новый кусок — **план погашения (рассрочку)**.

**Что наследуется без изменений** из роадмапа (§4) и предыдущих под-проектов: additive-миграции в tenant-схему с рабочим `down()`, режим «Бизнес/Бухгалтер», парность EN↔RU (`lang-check`), RUB как база, feature flags (по умолчанию off), минимум новых зависимостей, проприетарный копирайт «© 2026 Bigfin».

**Принцип §4.1 роадмапа:** не переписываем работающее. Старение и напоминания уже работают в бухгалтерском контуре — мы их переиспользуем, а не дублируем.

---

## 1. Контекст и цели

### Что строим

Единую страницу **«Долги»** в режиме «Бизнес»: кто должен нам (**дебиторка**) и кому должны мы (**кредиторка**), со **старением по корзинам** (0–30 / 31–60 / 61–90 / 90+ дней просрочки), **напоминаниями** должникам по email и **планом погашения** для крупных долгов.

### Целевая аудитория

Предприниматель без бухгалтерского образования. Его вопросы: «кто мне должен», «кто просрочил», «сколько всего висит дебиторки/кредиторки», «кому напомнить», «как растянуть крупный долг на части». Бухгалтерские отчёты AR/AP Aging отвечают на это сухо и разрозненно — страница «Долги» отвечает наглядно и в одном месте.

### Критерий успеха (= критерий завершения ⑭ роадмапа)

В режиме «Бизнес» видна страница «Долги»: итоги, старение по корзинам, реестр должников и кредиторов с drill-down к их неоплаченным счетам; можно отправить напоминание дебитору; можно завести план погашения и видеть прогресс. **Цифры сходятся с бухгалтерскими отчётами AR/AP Aging** — потому что берутся из тех же источников теми же модификаторами модели.

### Что в коде уже есть (подтверждено разведкой 2026-06-05 + проверено прямым чтением)

- **Неоплаченные счета покупателям** — `SaleInvoice` (таблица `sales_invoices`): готовые геттеры `dueAmount` (`Math.max(total − balanceAmount, 0)`), `overdueDays`, `isOverdue`, `isFullyPaid`; модификаторы `overdue`, `dueInvoices`, `delivered`, `overdueInvoicesFromDate`, `dueInvoicesFromDate`; группируется по `customerId`.
- **Неоплаченные счета поставщикам** — `Bill` (таблица `bills`): зеркальные геттеры `dueAmount`, `overdueDays`, `isOverdue`; модификаторы `overdue`, `dueBills`, `opened`, `overdueBillsFromDate`, `dueBillsFromDate`; группируется по `vendorId`.
- **Старение по корзинам** — `AgingSummaryReport` (`modules/FinancialStatements/modules/AgingSummary/AgingSummary.ts`): чистая логика «положить `dueAmount` в корзину по `overdueDays`» (`beforeDays <= overdueDays && (toDays > overdueDays || !toDays)`). Репозитории `ARAgingSummaryRepository` / `APAgingSummaryRepository` грузят открытые обязательства, сгруппированные по контрагенту, с фильтром по `branchesIds`.
- **Напоминания дебитору** — `SendSaleInvoiceMailReminderJob` + `GetSaleInvoiceMailReminder` (`modules/SaleInvoices/`): механизм письма-напоминания по счёту через очередь.
- **Базовая валюта и конвертация** — `tenancyContext.getTenantMetadata().baseCurrency`, `ExchangeRatesService` (как в Платёжном календаре).
- **Движок списков на фронте** — `components/ui/list-view/` (`ListView` + `useListController` + `filter-rows` + `list-format`, со своими `.spec.ts`); хуки данных через `useRequestQuery`; формы на React Hook Form + Zod. Уже обкатано на Customers V2 / Vendors V2.

### Чего в коде нет (строим)

- Единого бизнес-экрана «Долги» (сейчас всё разрозненно и в бухгалтерском виде).
- Дружелюбной JSON-**сводки** долгов (существующие AR/AP сервисы отдают **формат бухгалтерской таблицы** строки/колонки под PDF/Excel — не под список с действиями).
- Сущности **«План погашения» (рассрочка)** и её прогресса.
- Действия **«Напомнить»** прямо со страницы «Долги» (тонкая обёртка над существующим напоминанием).

---

## 2. Объём v1

### Входит

1. **Сводка долгов** (`GET /debts/overview`): итоги — всего дебиторка, всего кредиторка, нетто, просрочено по каждой стороне; корзины старения 0–30 / 31–60 / 61–90 / 90+ отдельно для дебиторки и кредиторки.
2. **Реестр контрагентов:** должники (контрагенты с дебиторкой) и кредиторы (с кредиторкой). По каждому: общий долг, в т.ч. просрочено, «худшая» корзина.
3. **Drill-down:** контрагент → его неоплаченные документы (№, дата, срок, сумма, остаток к оплате, дней просрочки).
4. **ТОП-должники / ТОП-кредиторы.**
5. **Напоминание дебитору** по email — переиспользуем существующий механизм (`SendSaleInvoiceMailReminderJob`).
6. **План погашения (рассрочка):** для долга — график платежей (дата / сумма / заметка), статус каждого платежа (`planned`/`paid`), прогресс «оплачено / осталось / следующий платёж».

### НЕ входит (anti-scope)

- **SMS/WhatsApp-напоминания** — открытый вопрос №10 роадмапа, отдельный мини-проект (требует провайдера).
- **Юридический документооборот по взысканию** (претензии, иски).
- **Авто-генерация плановых операций Платёжного календаря ⑥ из плана погашения** — возможное расширение; в v1 план погашения самостоятелен (см. Открытый вопрос №1).
- **Напоминания поставщикам** — кредиторка только просматривается/планируется; письмо себе не шлём.
- **Свой расчёт старения «с нуля»** — переиспользуем существующую логику корзин.
- **Изменение бухгалтерских отчётов AR/AP Aging** — не трогаем, только читаем те же источники.
- **Настройка размера корзин** пользователем — берём дефолтные 0–30/31–60/61–90/90+.

---

## 3. UX

Единая страница, переключатель стороны **«Нам должны» (дебиторка) / «Мы должны» (кредиторка)**. Приоритет — мобильность (dogfooding): одна колонка, вертикальная прокрутка.

```
┌─────────────────────────────────────────────────────┐
│  Долги            [ Нам должны ▸ ] [ Мы должны ]      │  ← переключатель стороны
├─────────────────────────────────────────────────────┤
│  Всего дебиторки   Просрочено      Нетто (деб.−кред.) │  ← карточки-итоги
│     1 240 000 ₽      318 500 ₽        +910 000 ₽      │
├─────────────────────────────────────────────────────┤
│  Старение:  0–30   31–60   61–90    90+              │  ← корзины
│            922k    180k     90k     48k              │
├─────────────────────────────────────────────────────┤
│  Должник            Всего    Просрочено   Худшая     │  ← реестр (ListView)
│  ООО «Ромашка»     420 000     120 000    61–90  ⋮   │
│  ИП Петров         180 000           0     —      ⋮   │
│     └─ раскрытие: Счёт №12 от 01.05 · срок 15.05 ·   │  ← drill-down
│        остаток 120 000 · просрочка 22 дн [Напомнить] │
│        [План погашения]                              │
└─────────────────────────────────────────────────────┘
```

### Элементы

- **Переключатель стороны** — дебиторка/кредиторка; всё ниже пересчитывается под сторону.
- **Карточки-итоги** — всего по стороне, просрочено, нетто (дебиторка − кредиторка).
- **Полоса старения** — суммы по 4 корзинам; клик по корзине фильтрует реестр.
- **Реестр** — на `ListView` (как Customers/Vendors V2): контрагент, всего, просрочено, худшая корзина; поиск, сортировка, пагинация — из коробки движка.
- **Drill-down** — раскрытие строки контрагента: его неоплаченные документы; действия **«Напомнить»** (дебиторка) и **«План погашения»**.
- **План погашения** — модалка (RHF + Zod): сумма, валюта, привязка к контрагенту (опц. к документу), строки графика (дата/сумма/заметка); экран прогресса с отметкой «оплачено».
- **Мобильный** — та же страница в одну колонку.

### Переиспользование UI

`components/ui` (shadcn) + ListView + RHF + Zod + Tailwind. Новых UI-пакетов не вводим (роадмап §4.7).

---

## 4. Модель данных

Две новые таблицы в **tenant**-схему. `sales_invoices` / `bills` / `contacts` — **только читаем**. Всё additive, рабочий `down()`.

### `debt_repayment_plans`

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | increments | PK |
| `side` | string, index | `receivable` (нам должны) / `payable` (мы должны) |
| `contact_id` | integer → `contacts.id`, index | должник/кредитор |
| `source_type` | string nullable | `invoice` / `bill` / null (план на контрагента целиком) |
| `source_id` | integer nullable | id счёта/счёта-поставщика, если план по конкретному документу |
| `total_amount` | decimal(13,3) | сумма плана (формат как у счетов) |
| `currency_code` | string(3) | валюта (по умолчанию базовая орг.) |
| `status` | string, index | `active` / `completed` / `cancelled` |
| `description` | string nullable | заметка |
| `created_at` / `updated_at` | timestamps | |

### `debt_repayment_installments`

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | increments | PK |
| `plan_id` | integer → `debt_repayment_plans.id` (onDelete cascade), index | план |
| `due_date` | date, index | дата платежа |
| `amount` | decimal(13,3) | сумма платежа |
| `status` | string, index | `planned` / `paid` |
| `paid_at` | datetime nullable | когда отмечен оплаченным |
| `note` | string nullable | заметка к платежу |
| `sort_order` | integer, default 0 | порядок в графике |
| `created_at` / `updated_at` | timestamps | |

**Связь:** `debt_repayment_plans` 1 — N `debt_repayment_installments` (Objection `HasManyRelation`, как `Budget` → `BudgetLine`). Удаление плана каскадно удаляет строки графика.

---

## 5. Логика (чистые функции — TDD, обязательно)

Вся «считающая» логика — чистые функции в `modules/Debts/utils/`, покрытые Jest-юнитами (как `expandRecurrence` / `computeRunningBalance` в Платёжном календаре). Сервисы лишь грузят данные и зовут эти функции.

### 5.1 Старение — `bucketByAging(dueAmount, overdueDays, periods)`

Зеркалит существующую логику `AgingSummaryReport.getContactAgingDueAmount`, но как самостоятельная чистая функция: кладёт `dueAmount` в корзину, где `period.beforeDays <= overdueDays && (period.toDays > overdueDays || period.toDays === null)`. `periods` — дефолтный набор `[{beforeDays:0,toDays:30},{30,60},{60,90},{90,null}]` из `constants.ts`. Тест: суммы на границах (0, 30, 31, 90, 91), нулевая просрочка, отсутствие корзины.

### 5.2 Свёртка по контрагенту — `aggregateContactDebts(docsByContact)`

Из сгруппированных по контрагенту неоплаченных документов (с уже посчитанными `dueAmount`/`overdueDays`) даёт на контрагента: `total`, `overdueTotal`, `buckets[4]`, `worstBucketIndex`. Тест: несколько документов в разных корзинах, частично/полностью просроченные.

### 5.3 Сводка — `summarizeDebts(contactsAgg)`

Итоги по стороне: `total`, `overdueTotal`, `buckets[4]` (сумма по контрагентам), `top` (N контрагентов по `total`). Тест: пустой набор, сортировка ТОПа, совпадение суммы корзин с total.

### 5.4 Прогресс плана — `computePlanProgress(installments, asDate)`

Чистая функция: `{ plannedTotal, paidTotal, remaining, percentPaid, nextDueDate, isOverdue }`. `nextDueDate` — ближайший `planned`-платёж; `isOverdue` — есть `planned` с `due_date < asDate`. Тест: всё оплачено, частично, просроченный платёж, пустой график.

### 5.5 Валюта

Суммы приводятся к базовой валюте организации по зафиксированному `exchange_rate` документа (чтобы сходилось с aging-отчётами), как в Платёжном календаре. Пер-валютная разбивка — не в v1.

---

## 6. Структура модуля (зеркалит `PaymentCalendar`)

```
packages/server/src/modules/Debts/
├── Debts.module.ts                 # NestJS-модуль (imports: TenancyDatabaseModule, TenancyModule, ExchangeRatesModule)
├── Debts.application.ts            # фасад, делегирует в queries/commands
├── Debts.controller.ts            # @Controller('debts')
├── Debts.interfaces.ts
├── constants.ts                    # корзины старения, статусы
├── models/
│   ├── DebtRepaymentPlan.model.ts
│   └── DebtRepaymentInstallment.model.ts
├── dtos/
│   ├── GetDebtsOverviewQuery.dto.ts
│   ├── GetContactDebtsQuery.dto.ts
│   ├── DebtRepaymentPlan.dto.ts        # create/edit + строки графика
│   └── DebtsResponse.dto.ts
├── commands/
│   ├── CreateRepaymentPlan.service.ts
│   ├── EditRepaymentPlan.service.ts
│   ├── DeleteRepaymentPlan.service.ts
│   ├── MarkInstallmentPaid.service.ts
│   ├── SendDebtReminder.service.ts     # тонкая обёртка над SaleInvoices reminder
│   └── CommandRepaymentPlanValidator.service.ts
├── queries/
│   ├── GetDebtsOverview.service.ts      # дебиторка+кредиторка, корзины, ТОП
│   ├── GetContactDebts.service.ts       # drill-down по контрагенту
│   └── GetRepaymentPlans.service.ts
└── utils/
    ├── bucketByAging.ts
    ├── aggregateContactDebts.ts
    ├── summarizeDebts.ts
    └── computePlanProgress.ts
```

**Wiring:** `DebtsModule` → `App.module.ts`; модели `DebtRepaymentPlan` / `DebtRepaymentInstallment` → массив `models` в `Tenancy.module.ts`. Загрузка обязательств переиспользует те же модификаторы `SaleInvoice`/`Bill`, что и `ARAgingSummaryRepository`/`GetPaymentCalendarForecast`.

---

## 7. API

| Метод | Путь | Назначение |
|---|---|---|
| `GET` | `/debts/overview?side=&branchesIds=&asDate=` | сводка: итоги, корзины, реестр, ТОП (по стороне; без `side` — обе) |
| `GET` | `/debts/contact/:contactId?side=` | drill-down: неоплаченные документы контрагента |
| `POST` | `/debts/invoices/:invoiceId/remind` | напоминание дебитору (reuse) |
| `GET` | `/debts/repayment-plans?side=&contactId=` | список планов погашения с прогрессом |
| `POST` | `/debts/repayment-plans` | создать план + строки графика |
| `GET` | `/debts/repayment-plans/:id` | план + график + прогресс |
| `PUT` | `/debts/repayment-plans/:id` | правка плана + upsert строк (как `UpsertBudgetLines`) |
| `DELETE` | `/debts/repayment-plans/:id` | удалить план (каскад строк) |
| `POST` | `/debts/repayment-plans/:planId/installments/:installmentId/pay` | отметить платёж оплаченным |

Всё под флагом `Features.DEBTS`. `Debts.application.ts` делегирует в сервисы; контроллер достаёт `tenantId` через `TenancyContext`, как `PaymentCalendarController`.

---

## 8. Фронтенд

```
packages/webapp/src/
├── containers/Debts/
│   ├── DebtsPage.tsx                # переключатель стороны, карточки, старение, реестр
│   ├── DebtsContactRow.tsx          # drill-down строки контрагента
│   ├── RepaymentPlanDialog.tsx      # RHF + Zod: план + график
│   ├── RepaymentPlanProgress.tsx
│   ├── columns.tsx                  # колонки реестра для ListView
│   ├── schemas.ts                   # Zod-схемы (сообщения через intl.get)
│   └── transform.ts                 # transformDebtsStateToQuery (для useListController)
└── hooks/query/Debts.tsx           # useDebtsOverview, useContactDebts, useRepaymentPlans, мутации
```

- Данные — `useRequestQuery` (как `payment-calendar`/`budgets`).
- Реестр — `ListView` + `useListController` (`transform`, `searchFields`).
- Формы — React Hook Form + Zod; сообщения валидации через `intl.get`.
- Маршрут + пункт меню — за `featureCan('debts')` (как `PaymentCalendarPage`).
- i18n — все строки `intl.get('debts.*')` / `<T id="debts.*" />`; ключи парно EN+RU; после правок — `node packages/webapp/scripts/lang-check.js`.

---

## 9. Тестирование (роадмап §4.5)

- **Чистые функции** (`bucketByAging`, `aggregateContactDebts`, `summarizeDebts`, `computePlanProgress`) — Jest, **TDD, обязательно** (граничные корзины, прогресс, пустые наборы).
- **Сервисы** — юнит с моками `TenantModelProxy` (как 16 тестов Платёжного календаря): сводка из мок-счетов, drill-down, валидатор плана.
- **Миграции** — additive, рабочий `down()`; прогон `latest → rollback → latest` в CI/staging (локально БД нет).
- **Типы** — `pnpm typecheck` зелёный (3 пакета).
- **i18n** — `lang-check.js` = 0 рассинхронов.
- **Ручная проверка** `?lang=ru` — чек-лист в PR.

---

## 10. Порядок реализации (маленькие шаги, каждый отгружаем отдельно)

| Part | Содержание | Проверка |
|---|---|---|
| **A. Флаг + сводка** | `Features.DEBTS` (+ `FeaturesConfigure`), чистые функции старения/свёртки/сводки (TDD), `GetDebtsOverview`, контроллер/application/module, wiring | `pnpm --filter @bigfin/server test` (utils + service), `typecheck` |
| **B. Drill-down + напоминание** | `GetContactDebts`, `SendDebtReminder` (reuse), эндпоинты | server test, `typecheck` |
| **C. План погашения** | миграции 2 таблиц (+`down()`), модели + relation, `computePlanProgress` (TDD), CRUD + upsert графика + mark-paid | server test, миграция в CI |
| **Frontend** | страница «Долги» (итоги/старение/реестр/drill-down/действия/план), хуки, маршрут+меню за флагом, i18n EN+RU | `typecheck`, `lang-check`, ручная `?lang=ru` |

Точка естественной паузы — после Part B (страница «Долги» уже ценна: видно все долги, старение, можно напомнить). Part C достраивается поверх, не блокируя выгоду.

---

## 11. Откат

- **Мгновенный:** выключить `Features.DEBTS` — модуль невидим, эндпоинты закрыты.
- **Код:** `git revert` PR (всё additive — существующее не ломается).
- **БД:** `down()` миграций удаляет 2 новые таблицы; `sales_invoices`/`bills`/`contacts` не затронуты.

---

## 12. Открытые вопросы

1. **Связь плана погашения с Платёжным календарём ⑥** — генерить ли из графика плановые операции (`planned_operations`), чтобы рассрочка попадала в прогноз остатка? Отложено: решение после первого dogfooding на ⑭.
2. **Порог «крупного долга»** для авто-предложения плана погашения — в v1 план доступен для любого долга вручную; авто-подсказка по порогу — позже.
3. **Внутренние напоминания по кредиторке** (себе: «через 3 дня платить поставщику») — кандидат в ㉒ «Движок уведомлений», не в ⑭.
4. **Кэш сводки** — при росте числа документов считать «на лету» или кэшировать? В v1 — на лету (как aging); оптимизация по факту нагрузки.
