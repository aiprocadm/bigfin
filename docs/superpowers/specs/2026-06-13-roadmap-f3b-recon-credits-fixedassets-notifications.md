# Ф3b — разведка кодовой базы: ⑳ Кредиты · ㉑ ОС · ㉒ Уведомления

**Дата:** 2026-06-13
**Тип:** read-only разведка (3 параллельных агента code-explorer), вводные для будущих дизайн-сессий
**Контекст:** русификация (этапы 0→4) завершена и в `develop` (PR #76 merged). Следующий блок роадмапа — Ф3b «достройка контура»: ⑲ дивиденды (готово) → **⑳ кредиты → ㉑ ОС → ㉒ уведомления**.
**Источник скоупа:** `docs/superpowers/specs/2026-05-27-fintablo-planfact-parity-roadmap.md` (разделы ⑳/㉑/㉒).

> Это НЕ дизайн-спека. Это карта местности: что уже есть в коде, какой модуль брать за шаблон, где риски. Каждый подпроект дальше идёт по дисциплине brainstorming → spec → plan → executing.

---

## Сводка: порядок и риск

Порядок роадмапа (⑳→㉑→㉒) удачно совпадает с возрастанием риска — можно идти по нему:

| # | Подпроект | Риск/объём | Главное |
|---|---|---|---|
| ⑳ | Кредиты и займы | **Низкий** | Вся инфраструктура есть. По сути — сборка по шаблону Dividends. |
| ㉑ | Основные средства | **Средний** | Нужен механизм ежемесячного начисления + тип счёта «накопленная амортизация» (его нет). |
| ㉒ | Уведомления | **Высокий** | Socket вещает всем (нет per-user комнат/авторизации), нет in-app инбокса, нужен мульти-тенантный крон. |

---

## Общие паттерны (одинаковы для всех трёх)

**Фича-флаг (default off) — 3 шага на сервере + 1 на фронте:**
1. Enum: `packages/server/src/common/types/Features.ts` — добавить `X = 'x'`.
2. Дефолт: `packages/server/src/modules/Features/FeaturesConfigure.ts` → `getConfigure()` → `{ name: Features.X, defaultValue: false }`.
3. Spec: `FeaturesConfigure.x.spec.ts` (по образцу `FeaturesConfigure.dividends.spec.ts`).
4. Фронт: `packages/webapp/src/constants/features.tsx` + гейт `useFeatureCan()` (`packages/webapp/src/hooks/state/feature.tsx`).
- Гард на контроллере НЕ ставится — флаг управляет только видимостью в UI («мягкий гейт»). Модуль всегда импортируется в `App.module.ts`.

**GL-проводки (эталон — Dividends):** `CreateDividendPayout.service.ts` → `UnitOfWork.withTransaction()` → строит `Ledger` из чистых `ILedgerEntry[]` (`utils/payoutGLEntries.ts`) → `LedgerStorageService.commit(ledger, trx)`. Удаление — `deleteByReference()`.

**Регистрация модели (КРИТИЧНО):** каждую новую Objection-модель добавить в массив `models[]` в `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts` — иначе модель невидима для Knex.

**Миграции:** все три подпроекта — данные одной организации → **TENANT** схема (`packages/server/src/database/tenant/migrations/`). Команда: `pnpm tenants:migrate:make -- --name=...`. Обязателен рабочий `down()`. Эталон стиля: `20260610120000_create_payroll_tables.ts`, `20260611130000_create_dividend_payouts_table.ts`.

**Язык писем/строк сервера:** `OrganizationI18nService` (`@Global`, инжектится без импорта модуля) — `translate(key, { lang })` берёт язык из `tenants_metadata.language`. Требует CLS-контекст (работает в BullMQ-процессорах, НЕ в теле `@Cron`). i18n JSON — `packages/server/src/i18n/{en,ru}/`.

---

## ⑳ Кредиты и займы — НИЗКИЙ риск

**Вердикт:** почти вся инфраструктура готова. Шаблон — модуль `Dividends` (капитал/долг-подобная сущность, тоже постит GL).

**Зависимость ④ (статьи):** `ManagementArticles`. Создать статью «Проценты по кредитам» (`kind=expense`, `cashflow_section=financing`), завести расходный GL-счёт `loan-interest-expense`, смэппить через `management_article_accounts`. `ArticlesPlRollupService.getRollup()` подхватит автоматически — правок в самом сервисе НЕ нужно.

**Зависимость ⑥ (календарь):** `PlannedOperation.model.ts` уже имеет полиморфную привязку `source_type/source_id`. Кредит при создании пишет по строке на платёж через `CreatePlannedOperation.service.ts` (`source_type='CreditLoan'`, `source_id=loan.id`, `direction='outflow'`, `status='planned'`). Удаление кредита → каскадная зачистка по `source_type/source_id`.

**Баланс (тело долга → обязательство):** типы счетов-обязательств есть в `packages/server/src/constants/accounts.ts`: `other-current-liability` (кратко), `long-term-liability` (долго). `BalanceSheetSchema.ts` уже их рендерит. Паттерн find-or-create счёта — как `OWNER_PAYOUTS_ACCOUNT` в Dividends.

**⚠️ Пред-существующий баг:** в `constants/accounts.ts` (~строки 151–170) типы обязательств `*-liability` помечены `balanceSheet:false, incomeSheet:true` (похоже, ошибка из upstream). Если где-то пикер счетов фильтрует по `balanceSheet:true` — счёт обязательства не покажется. Проверить в дизайне до реализации. Также консистентный typo `LOGN_TERM_LIABILITY` в enum и schema — НЕ «чинить» в одиночку.

**Открытые вопросы для дизайна:** один агрегатный счёт обязательства vs по счёту на кредит (для непрофи — агрегатный проще); аннуитет vs дифференцированный — чистая функция `utils/generateSchedule.ts` (тестируемая); фидить ли в календарь тело или только проценты; GL при оплате платежа = Dr тело + Dr проценты / Cr банк (значит инсталмент хранит `principal_amount` и `interest_amount` раздельно).

**Скелет:** `packages/server/src/modules/Credits/` (module/controller/application/constants, `models/Credit.model.ts` + `CreditInstallment.model.ts`, `commands/Create|Edit|Delete|MarkInstallmentPaid`, `queries/GetCredits|Summary`, `utils/generateSchedule(.spec)`, `utils/creditGLEntries(.spec)`). Миграции: `credits` + `credit_installments`. Фронт: `containers/Credits/` + `hooks/query/credits.tsx` + роут + `credits.*` ключи (en+ru).

---

## ㉑ Основные средства и амортизация — СРЕДНИЙ риск

**Шаблон:** Dividends (GL) + Payroll (settings со ссылкой на article_id, draft/approve как ручной триггер начисления).

**Главный риск — ежемесячное начисление.** В коде НЕТ готового мульти-тенантного крона начисления. Есть 3 примитива: `@Cron` (есть `ScheduleModule.forRoot()`, но пример `ImportDeleteExpiredFilesJob` — system-scope, без тенанта); BullMQ `@Processor`+`WorkerHost` (мульти-тенант-готов, ставит CLS `organizationId` — эталон `InventoryCost/processors/ComputeItemCost.processor.ts`); Payroll-approve как **ручной** триггер (кнопка, без авто-крона).
→ **Рекомендация MVP:** не строить авто-крон. Кнопка «Начислить амортизацию за [месяц]» → постит GL по всем активным ОС за месяц (UX как Payroll-approve). Проще, без фонового джоба. Авто-крон — позже.
Список активных тенантов для крона (если понадобится): `getAllInitializedTenants(sysKnex)` — см. `CLI/commands/TenantsMigrateLatest.command.ts`.

**⚠️ Пробел — нет типа счёта «накопленная амортизация» (контр-актив).** В `ACCOUNT_TYPE` нет `accumulated-depreciation`. Варианты: (a) добавить новый тип (правки в `accounts.ts` + `BalanceSheetSchema.ts` + enum + сид — средний объём, но корректная двойная запись); (b) хранить `residual_value` денормализованно на записи ОС, без контр-счёта (проще, ниже точность). Решение — в дизайне.

**Баланс:** типы `fixed-asset` / `non-current-asset` уже `balanceSheet:true, normal:DEBIT`, узлы есть в `BalanceSheetSchema.ts`. Остаточная стоимость = первоначальная − накопленная.

**Зависимость ④:** расходный счёт «Амортизация ОС» → статья «Амортизация» (`kind=expense`). article_id хранить в настройках по образцу `PayrollSettings.service.ts`.

**Открытые вопросы:** проration первого месяца (по ПБУ 6/01 — амортизация со следующего месяца после ввода → proration не нужен); блокировка редактирования после первого начисления; взаимодействие с `TransactionsLocking` (закрытые периоды); базовое списание/выбытие (Dr накопл.аморт + Dr убыток / Cr ОС).

**Скелет:** `packages/server/src/modules/FixedAssets/` (+ `FixedAssetsSettings.service.ts`, `commands/AccrueMonthDepreciation`, `commands/GenerateDepreciationSchedule`, `commands/WriteOff`, `utils/linearDepreciation(.spec)`, `utils/fixedAssetGLEntries(.spec)`). Миграции: `fixed_assets` + `fixed_asset_depreciation_schedule` (+ опц. тип счёта). Фронт: `containers/FixedAssets/`.

---

## ㉒ Движок уведомлений — ВЫСОКИЙ риск/объём

**Каналы:**
- **In-app (Socket):** `Socket.gateway.ts` сейчас вещает ВСЕМ (`server.emit`), без комнат и без авторизации хендшейка. Для адресной доставки нужно: авторизация WS-хендшейка (токен) + `client.join('user:'+id)` + методы `emitToUser/emitToOrg`. Нетривиальная правка auth-модели.
- **Email (Mail):** `Mail.ts` (fluent: setSubject/setTo/setContent/setView) → `MailTransporter.service.ts`. Эталон: `SendSaleInvoiceMail.ts` (command) + `SendSaleInvoiceMail.processor.ts` (processor, ставит CLS). Строки — через `OrganizationI18nService`.
- **Telegram (㉓):** оставить шов — интерфейс `DeliveryChannel.deliver(notification, prefs)`, каналы как инжектируемые стратегии.

**Источники событий (всё переиспользуемо, правок в источниках почти нет):**
- Кассовый разрыв / остаток: `GetPaymentCalendarForecast.service.ts` → `result.gap` (`CashGap{date,amount,daysFromStart}`); остаток счёта — `Account.amount` (фильтр `CASH_ACCOUNT_TYPES`).
- Просрочка: `SaleInvoice` модификатор `overdueInvoicesFromDate`; `Debts/queries/GetDebtsOverview.service.ts`.
- Дубль операции: `DataQuality/utils/groupPossibleDuplicates.ts` + `GetPossibleDuplicates.service.ts`. «Резкое отклонение суммы» — НОВАЯ утилита (скользящее среднее/медиана), её нет.

**BullMQ:** глобально сконфигурен (`App.module.ts`). Новая очередь — `BullModule.registerQueue` + `BullBoardModule.forFeature`. Процессор — `@Processor`+`WorkerHost`, в `process()` ставить CLS `organizationId`/`userId`. Крон-оценка — `@Cron` (тело крона только ставит джобы per-tenant, вся tenant-работа в процессорах из-за CLS).

**Настройки (events × channels × thresholds):** рекомендована отдельная таблица `notification_preferences` (tenant) + `notifications` (tenant, in-app инбокс с `user_id`, `read_at`). Обе в TENANT.

**Открытые вопросы/риски:** авторизация Socket (A); мульти-тенантный крон + CLS (B,C); новая утилита отклонения сумм (D); in-app инбокс с нуля + bell-компонент (E); шов Telegram (F); частота оценки vs нагрузка — события + ночной крон + «dirty flag» (G); подавление повторов — `last_fired_at` + cooldown 24ч (H).

**Скелет:** `packages/server/src/modules/Notifications/` (models `Notification`+`NotificationPreference`; `evaluators/` по 4 типам; `delivery/InApp|Email`; `jobs/` крон+процессоры; commands/queries). Миграции: `notification_preferences` + `notifications`. i18n: `notifications.json` (en+ru).

---

## Рекомендация

Идти по порядку роадмапа: **следующий — ⑳ Кредиты** (низкий риск, вся инфраструктура есть). Старт — brainstorming-сессия (superpowers), затем spec → plan → реализация маленькими шагами под флагом `credits` (default off).
