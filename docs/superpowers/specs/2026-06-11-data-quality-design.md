# ㉗ — Кросс-проверка ОПиУ↔ДДС (отчёт «Качество данных»)

**Дата:** 2026-06-11
**Под-проект роадмапа:** ㉗ (Ф3a, ⚡v4) — «сверка расхождений ОПиУ↔ДДС, операции без статьи, возможные дубли — список „что проверить" с переходом к операции».
**Зависит от:** ④ (отчёты), Этап 0 каркаса (`ManagementArticles` — маппинг «счёт↔статья»).
**Флаг:** `Features.DATA_QUALITY = 'data_quality'` (по умолчанию **off**, гейтит только UI — паттерн ⑦b/⑧b).
**Контекст решений (в рамках делегированного исполнения роадмапа):**
- отчёт **read-only и считается на лету** из `accounts_transactions` — без новой таблицы, без миграций (anti-scope роадмапа: «автоисправление не входит, только подсветка + переход к источнику»);
- «операция без статьи» = проводка по счёту **P&L-типа** (income/expense/COGS/other_*), не привязанному к управленческой статье в `management_article_accounts` — счета типа «деньги» статьи не требуют, это не проблема качества;
- опциональная «блокировка статей» (как у Fintablo) — отложена в v2;
- сверка ОПиУ↔ДДС — помесячное сравнение с пометкой, что расхождение само по себе не ошибка (начисления/авансы), сигнал — крупные стабильные отклонения.

---

## 1. Зачем

У целевой аудитории (предприниматель без бухгалтера) данные «загрязняются» молча: завели счёт и забыли привязать к статье — ОПиУ занижен; задвоили операцию при импорте — расход x2; прибыль есть, а денег нет — и непонятно, это нормальные начисления или дыра в данных. ㉗ даёт одну страницу «что проверить» с кликом к операции-источнику.

## 2. Модель данных

**Нет.** Никаких новых таблиц/колонок/миграций. Все три проверки — запросы поверх существующих `accounts`, `accounts_transactions`, `management_articles`, `management_article_accounts`.

## 3. Три проверки (логика)

### a) Операции без статьи

1. Счета P&L-типов (`income`, `expense`, `cost-of-goods-sold`, `other-income`, `other-expense`), у которых нет строки в `management_article_accounts`.
2. По каждому такому счёту — проводки за период: количество, сумма-нетто (по `accountNormal`), последние операции (≤20 на счёт) с `referenceType`/`referenceId` для перехода.
3. Счёт без проводок за период — не показываем (нет операций — нет проблемы).

### b) Возможные дубли

Группировка проводок за период по ключу `(date, account_id, сумма, направление)`, где сумма = ненулевой `credit` или `debit`. Группа подозрительна, если в ней ≥2 проводок с **разными источниками** (`reference_type`,`reference_id`) — задвоенный документ, а не две ноги одной проводки. Нулевые суммы исключаются. Лимит 100 групп (сортировка: сумма убыв.).

### c) ОПиУ ↔ ДДС

Помесячно за период:

```
plIncome  = Σ нетто по счетам income/other-income (credit-normal)
plExpense = Σ нетто по счетам expense/COGS/other-expense (debit-normal)
plNet     = plIncome − plExpense
cashIn    = Σ debit  по счетам типа cash/bank
cashOut   = Σ credit по счетам типа cash/bank
cashNet   = cashIn − cashOut
diff      = plNet − cashNet
```

Переводы между своими счетами в `cashNet` взаимно гасятся. Все расчёты NaN-safe (паттерн `payrollMath` ⑧a). Подпись в UI: «расхождение — повод проверить, не ошибка сама по себе».

## 4. API — новый модуль `DataQuality` (read-only)

```
GET /data-quality/unmapped-operations  ?fromDate&toDate
GET /data-quality/duplicates           ?fromDate&toDate
GET /data-quality/pl-cashflow          ?fromDate&toDate
```

Ответы (camelCase):

- `unmapped-operations` → `{ accounts: [{ accountId, accountName, accountCode, operationsCount, totalAmount, operations: [{ transactionId, date, amount, side: 'in'|'out', referenceType, referenceId, transactionNumber, referenceNumber }] }], totalCount }`
- `duplicates` → `{ groups: [{ date, accountId, accountName, amount, side, entries: [{ transactionId, referenceType, referenceId, transactionNumber, referenceNumber }] }], totalGroups }`
- `pl-cashflow` → `{ months: [{ month: 'YYYY-MM', plIncome, plExpense, plNet, cashIn, cashOut, cashNet, diff }], totals: { plNet, cashNet, diff } }`

Структура модуля — паттерн Payroll/Deals: `DataQuality.module.ts` → `DataQuality.controller.ts` → `DataQuality.application.ts` → `queries/*.service.ts`; модели через `TenantModelProxy`; детекция/арифметика — **чистые функции в `utils/`** (тестируемость). Чтение — авторизованный пользователь (без отдельного CASL-subject, как Deals/Debts). Регистрация: `App.module.ts`, флаг — `Features.ts` + `FeaturesConfigure`.

## 5. Фронт

- Маршрут `/data-quality` (route-only, без пункта сайдбара — как Deals/Debts/Payroll), страница видна при `featureCan('data_quality')`.
- Селектор периода: **год** (паттерн «Начислений» payroll), по умолчанию текущий.
- Три вкладки: **«Без статьи»** (счета с раскрытием операций), **«Дубли»** (группы с операциями), **«ОПиУ ↔ ДДС»** (помесячная таблица, подсветка `diff ≠ 0`).
- Клик по операции → существующие drawers по `referenceType` (`SaleInvoice`→invoice, `Bill`→bill, `Expense`→expense, `ManualJournal`→journal, payments → соответствующие); неизвестный тип — строка некликабельна.
- Хуки `hooks/query/dataQuality.tsx` (`useRequestQuery`, ключи `DATA_QUALITY_*` в `types.tsx`).
- i18n `data_quality.*` парно en+ru. RU: «Качество данных», «Операции без статьи», «Возможные дубли», «Расхождение ОПиУ и ДДС», «Проверьте, не задвоена ли операция».

## 6. Тесты (Jest, рядом с модулем)

- `groupPossibleDuplicates.spec.ts`: группа из 2 источников ловится / две ноги одной проводки (один источник) — нет / нулевые суммы исключены / лимит и сортировка;
- `computePlCashflowComparison.spec.ts`: помесячная сборка, знаки по `accountNormal`, NaN-safe, totals;
- `unmappedAccounts` (utils): фильтр P&L-типов, счёт без операций не попадает;
- `FeaturesConfigure.dataQuality.spec.ts`: флаг есть, дефолт off.

## 7. НЕ входит (явно отложено)

- Автоисправление и массовые операции («привязать все к статье») — v2;
- Блокировка статей (Fintablo-style) — v2;
- Фоновый пересчёт/кэш, уведомления о новых проблемах (это ㉒);
- Детекция дублей через нечёткое сравнение (±дата, похожее описание) — v1 только точный ключ;
- Произвольный период день-в-день (v1 — год).

## 8. Критерий завершения ㉗

Включить флаг → `/data-quality`: счёт расходов без статьи виден с операциями, клик открывает документ; задвоенный документ виден в «Дублях»; вкладка «ОПиУ ↔ ДДС» показывает помесячные plNet/cashNet/diff. `pnpm typecheck`, тесты модуля, `lang-check.js` — зелёные.
