# ㉑ Основные средства и амортизация — дизайн

**Дата:** 2026-06-14
**Тип:** дизайн-спека под-проекта (brainstorming → **spec** → plan → executing)
**Под-проект роадмапа:** ㉑ (Ф3b «достройка контура»), средний риск, оценка 4–6 недель.
**Флаг:** `fixed_assets` (default off).
**Источники:**
- Карта местности: [2026-06-13-roadmap-f3b-recon-credits-fixedassets-notifications.md](2026-06-13-roadmap-f3b-recon-credits-fixedassets-notifications.md) (раздел ㉑).
- Scope: [2026-05-27-fintablo-planfact-parity-roadmap.md](2026-05-27-fintablo-planfact-parity-roadmap.md) §㉑.
- Шаблон реализации: модули `Credits` и `Dividends` (тот же каркас GL-проводок).

> Это дизайн-документ. Реализация идёт маленькими шагами под флагом `fixed_assets` (default off). Каждый PR обратим (`git revert`).

---

## 1. Цель и аудитория

Дать предпринимателю без бухгалтерского образования простой учёт основных средств (ОС): завести имущество, видеть как оно «изнашивается» (амортизируется) каждый месяц, и корректно отражать это в ОПиУ и Балансе. Терминология — русская управленческая, без жаргона.

**Амортизация простыми словами:** оборудование за 600 000 ₽ со сроком службы 5 лет «изнашивается» равномерно — 10 000 ₽/мес уходит в расходы. Это «бумажный» расход (деньги уже потрачены при покупке), но он показывает реальную картину прибыли.

---

## 2. Объём

### Входит (первая версия)

1. **Реестр ОС**: название, категория (текст), первоначальная стоимость, ликвидационная стоимость, срок полезного использования (мес.), дата ввода в эксплуатацию, счёт-актив.
2. **Линейный метод** амортизации (равными долями) — автогенерация графика на весь срок при заводе ОС.
3. **Ежемесячное начисление** амортизации по **кнопке** → расход «Амортизация» в ОПиУ + накопление на контр-счёте «Накопленная амортизация».
4. **Баланс**: Первоначальная стоимость − Накопленная амортизация = Остаточная стоимость.
5. **Списание/выбытие ОС** (продажа или ликвидация) с проводкой прибыли/убытка от выбытия.
6. **Фронт**: страница `/fixed-assets` — список, сводка, карточка ОС с графиком, кнопки «Начислить за месяц» и «Списать».

### Не входит (отдельные заходы потом)

- Нелинейные методы амортизации (ускоренная и т.п.), переоценка, разница БУ/НУ (продукт управленческий).
- Авто-крон в фоне (решение: ручная кнопка, см. §5).
- Частичное выбытие, перемещение ОС между подразделениями.
- Проводка покупки ОС (стоимость уже на счёте-активе из обычной операции покупки — см. §4, событие 1).
- Справочник категорий (на старте — простое текстовое поле).

---

## 3. Решения брейншторма (2026-06-14)

1. **Накопленный износ — отдельный контр-счёт.** Заводим новый тип счёта `accumulated-depreciation` (контр-актив). Баланс показывает три строки: первоначальная, накопленная, остаточная — как у Fintablo и в нормальном бухучёте. (Альтернатива «денормализованная остаточная стоимость без счёта» отклонена — менее точна и непрозрачна в Балансе.)
2. **Выбытие ОС включаем в первую версию.** Базовое списание/продажа с проводкой прибыли/убытка.
3. **Начисление — ручной кнопкой**, не авто-кроном (см. §5). Идемпотентно.
4. **Амортизация со следующего месяца** после ввода в эксплуатацию (ПБУ 6/01) → проration первого месяца не нужен.
5. **Пред-существующий баг обязательств в `accounts.ts` НЕ трогаем** в этом заходе (отдельная проблема, отдельный фикс) — см. §6.

---

## 4. Учёт и GL-проводки

Три события, по шаблону `Credits`. Сумма каждой проводки сходится (дебет = кредит), `LedgerStorageService.commit()` это проверяет.

### Событие 1 — завод ОС (ввод в эксплуатацию)

**Проводки нет.** ОС регистрируется поверх уже учтённого счёта-актива (стоимость попала туда при обычной операции покупки). Карточка ОС лишь привязывается к `asset_account_id`. Это сознательное упрощение для непрофи.

### Событие 2 — ежемесячное начисление амортизации (по кнопке)

```
Дебет  «Амортизация» (расход, ОПиУ)              amount
Кредит «Накопленная амортизация» (контр-актив)   amount
```
- `transactionType = 'FixedAssetDepreciation'`, `transactionId = id строки графика`.
- Денег не трогает. В ОПиУ растёт расход, в Балансе растёт накопленный износ → остаточная падает.

### Событие 3 — списание/выбытие ОС

Пример: стоимость 600 000, накоплено 200 000 (остаточная 400 000), продали за 350 000:
```
Дебет  «Накопленная амортизация»      200 000   (закрываем накопленный износ)
Дебет  банк (если продажа)            350 000   (пришли деньги)
Дебет  «Убыток от выбытия ОС»          50 000   (400 000 − 350 000)
Кредит счёт-актив ОС                  600 000   (актив уходит с баланса)
```
- Продали дороже остаточной → вместо убытка **«Прибыль от выбытия ОС»** по кредиту.
- Ликвидация (без денег) → вся остаточная стоимость в убыток.
- `transactionType = 'FixedAssetDisposal'`, `transactionId = id ОС`.

### Счета (find-or-create по slug, паттерн `LOAN_INTEREST_EXPENSE_ACCOUNT`)

| Slug | Назначение | Статус |
|---|---|---|
| `depreciation-expense` | «Амортизация» (расход) | **уже есть в базе** (код 40007), переиспользуем |
| `accumulated-depreciation` | «Накопленная амортизация» (контр-актив) | новый тип счёта + новый счёт |
| `fixed-asset-disposal` | «Прибыль/убыток от выбытия ОС» | новый счёт (прочий доход/расход) |

**Управленческая статья (зависимость ④):** при первом начислении создаётся (find-or-create) управленческая статья «Амортизация» (`kind=expense`) и мэппится на счёт `depreciation-expense` через `management_article_accounts` — как «Проценты по кредитам» в Credits. `ArticlesPlRollupService.getRollup()` подхватит автоматически, правок в сервисе свёртки не нужно. Отдельного сервиса настроек (`FixedAssetsSettings`) не заводим — следуем паттерну Credits, где `article_id` в настройках модуля не хранится.

### Удаление ОС (до выбытия, через UI)

Откатывает проводки всех `posted`-строк начисления через `ledgerStorage.deleteByReference(entryId, 'FixedAssetDepreciation', trx)` — как удаление кредита. Счета не удаляем (аудит-след), как в `DeleteCredit`.

---

## 5. Поток начисления и закрытые периоды

### Кнопка «Начислить амортизацию за [месяц]» (идемпотентна)

Команда `AccrueMonthDepreciation` в `uow.withTransaction`:
1. Берёт строки графика `status='planned'` за выбранный месяц по всем активным ОС.
2. На каждую пишет проводку (событие 2), переводит `planned → posted`, ставит `posted_at`.
3. Обновляет `accumulated_depreciation` на карточке ОС.
4. Строки уже `posted` — пропускаются (повторное нажатие безопасно, задвоения нет).

По умолчанию выбран текущий месяц; можно выбрать прошлый незакрытый.

### Закрытые периоды (TransactionsLocking)

Перед проводкой начисления и выбытия — проверка даты через существующий `FinancialTransactionLocking.transactionLockingGuard(date)` (группа `TransactionsLockingGroup.Financial`). Если период закрыт — операция не проходит с понятной ошибкой. Не изобретаем свой механизм.

---

## 6. Новый тип счёта и Баланс

Сейчас типа `accumulated-depreciation` нет (разведка подтвердила). Заводим контр-актив:
- Нормаль — `CREDIT` (обратный знак к активу), `balanceSheet: true`, `incomeSheet: false`, `rootType: ASSET`.
- В Балансе — в раздел «Основные средства», рядом с ОС. Кредитовый знак даёт отрицательный вклад в активы → автоматическое вычитание → остаточная стоимость.

**Файлы (по карте разведки):**
1. `packages/server/src/constants/accounts.ts` — enum + метаданные нового типа.
2. `packages/webapp/src/constants/accountTypes.tsx` — зеркально на фронте.
3. `packages/server/src/modules/FinancialStatements/modules/BalanceSheet/BalanceSheetSchema.ts` — включить тип в узел «Основные средства».
4. find-or-create счёта «Накопленная амортизация» (в команде модуля по slug).

**⚠️ Обязательная верификация при реализации:** схема Баланса пока *не нетит* контр-счета явно — складывает по знаку остатка. Кредитовый контр-счёт даёт нужное вычитание, но это надо подтвердить тестом на реальных цифрах (первоначальная − накопленная = остаточная). Шаг включён в план как блокирующий.

**⚠️ Пред-существующий баг (НЕ чиним здесь):** в `accounts.ts` (~строки 146–171) типы обязательств `other-current-liability` / `long-term-liability` (с опечаткой `LOGN_TERM_LIABILITY`) / `non-current-liability` помечены `balanceSheet:false, incomeSheet:true` — баг из upstream (обязательства не попадают в Баланс). Это **другая** проблема, отдельный фикс. По правилу «маленькие шаги» в этом заходе не трогаем. Зафиксировано здесь как известный долг.

---

## 7. Данные (tenant-схема)

Обе таблицы — в `packages/server/src/database/tenant/migrations/`, с рабочим `down()`. Эталон стиля: `20260611130000_create_dividend_payouts_table.ts`.

### `fixed_assets`

| Поле | Тип | Назначение |
|---|---|---|
| `id` | increments | PK |
| `name` | string | Название ОС |
| `category` | string, nullable | Категория (текст) |
| `cost` | decimal(15,5) | Первоначальная стоимость |
| `salvage_value` | decimal(15,5), default 0 | Ликвидационная стоимость |
| `service_life_months` | integer | Срок полезного использования |
| `commissioned_at` | date | Дата ввода в эксплуатацию |
| `asset_account_id` | integer FK accounts | Счёт-актив, где числится ОС |
| `accumulated_depreciation` | decimal(15,5), default 0 | Накоплено износа (денормализовано) |
| `status` | string | `active` / `disposed` |
| `disposed_at` | date, nullable | Дата выбытия |
| `disposal_type` | string, nullable | `sale` / `liquidation` |
| `disposal_account_id` | integer FK accounts, nullable | Счёт зачисления при продаже |
| `disposal_proceeds` | decimal(15,5), nullable | Сумма продажи |
| `note` | text, nullable | Заметка |
| timestamps | | createdAt/updatedAt |

### `fixed_asset_depreciation_entries`

| Поле | Тип | Назначение |
|---|---|---|
| `id` | increments | PK |
| `fixed_asset_id` | integer FK fixed_assets | ОС |
| `period` | string (`YYYY-MM`) | Месяц начисления |
| `seq_no` | integer | Порядковый номер строки графика |
| `amount` | decimal(15,5) | Доля износа за месяц |
| `status` | string | `planned` / `posted` |
| `posted_at` | date, nullable | Когда фактически провели |
| timestamps | | createdAt/updatedAt |

**Почему график + факт в одной таблице:** при заводе ОС генерируем все строки как `planned` (как `credit_installments`). Кнопка переводит `planned → posted` и пишет проводку — отсюда идемпотентность и видимый график на весь срок.

**Регистрация моделей (КРИТИЧНО):** `FixedAsset` и `FixedAssetDepreciationEntry` добавить в массив `models[]` в `Tenancy.module.ts` — иначе невидимы для Knex.

---

## 8. Расчёт графика (чистая функция)

`utils/linearDepreciation.ts` — чистая тестируемая функция:
- Вход: `cost`, `salvageValue`, `serviceLifeMonths`, `commissionedAt`.
- База амортизации = `cost − salvageValue`. Доля = база / `serviceLifeMonths`.
- Первый период = месяц, **следующий** за `commissionedAt` (ПБУ 6/01).
- Округление до копеек; «хвостик» (остаток от округления) добавляется к последнему месяцу, чтобы сумма строк точно равнялась базе.
- Выход: массив `{ period: 'YYYY-MM', seqNo, amount }`.

---

## 9. Структура модуля (бэкенд)

По шаблону `Credits`. `packages/server/src/modules/FixedAssets/`:

```
FixedAssets.module.ts        — imports [TenancyDatabaseModule, TenancyModule, LedgerModule]
FixedAssets.application.ts   — тонкий слой делегирования
FixedAssets.controller.ts    — @Controller('fixed-assets'), guards, @RequirePermission('manage','all') на запись
constants.ts                 — коды ошибок, шаблоны счетов (slug), transactionType-строки
dtos/                        — CreateFixedAsset / DisposeFixedAsset / AccrueMonth
models/
  FixedAsset.model.ts
  FixedAssetDepreciationEntry.model.ts
commands/
  CreateFixedAsset.service.ts         (+ generateSchedule, insert planned-строк)
  DeleteFixedAsset.service.ts         (revert GL, delete children)
  AccrueMonthDepreciation.service.ts  (идемпотентно, locking guard)
  DisposeFixedAsset.service.ts        (выбытие, locking guard)
queries/
  GetFixedAssets.service.ts           ([{...asset, netValue}])
  GetFixedAssetDetail.service.ts      (карточка + график)
  GetFixedAssetsSummary.service.ts    ({ totalCost, totalAccumulated, totalNet })
utils/
  linearDepreciation.ts (+ .spec)
  fixedAssetGLEntries.ts (+ .spec)
```

Модуль всегда импортируется в `App.module.ts` (мягкий гейт — флаг управляет только видимостью в UI; гарда на контроллере по флагу нет, как в Credits/Dividends).

---

## 10. Фронт

По шаблону `containers/Credits/`. `packages/webapp/src/containers/FixedAssets/`:
- `FixedAssetsPage.tsx` — гейт `if (!featureCan('fixed_assets')) return null;`. Список + сводка (всего ОС, накопленный износ, остаточная).
- `FixedAssetCreateDialog.tsx` — форма (React Hook Form + Zod).
- `FixedAssetDetailCard.tsx` — карточка с графиком, кнопки «Начислить за месяц», «Списать».
- `hooks/query/fixed-assets.tsx` — `useFixedAssets`, `useFixedAsset`, `useFixedAssetsSummary`, `useCreateFixedAsset`, `useDeleteFixedAsset`, `useAccrueMonth`, `useDisposeFixedAsset`.
- Роут `/fixed-assets` в `routes/dashboard.tsx`.
- Флаг: `FixedAssets: 'fixed_assets'` в `constants/features.tsx`.

**i18n:** ключи `fixed_assets.*` парно в `lang/en/index.json` + `lang/ru/index.json`. После правки — `node packages/webapp/scripts/lang-check.js`. RU-стиль: «Основные средства», «амортизация», «остаточная стоимость», «выбытие», «накопленная амортизация».

---

## 11. Фича-флаг

- `packages/server/src/common/types/Features.ts` — `FIXED_ASSETS = 'fixed_assets'`.
- `packages/server/src/modules/Features/FeaturesConfigure.ts` — `{ name: Features.FIXED_ASSETS, defaultValue: false }`.
- `packages/server/src/modules/Features/FeaturesConfigure.fixed_assets.spec.ts` — флаг присутствует и выключен по умолчанию (по образцу `FeaturesConfigure.credits.spec.ts`).
- `packages/webapp/src/constants/features.tsx` — `FixedAssets: 'fixed_assets'`.

---

## 12. Тестирование

| Тест | Что проверяет |
|---|---|
| `linearDepreciation.spec.ts` | Равные доли; старт со следующего месяца; «хвостик» округления на последнем месяце; сумма строк = база |
| `fixedAssetGLEntries.spec.ts` | Проводки начисления (Dr расход / Cr контр-актив) и выбытия (прибыль vs убыток; баланс дебет=кредит) |
| `AccrueMonthDepreciation.service.spec.ts` | Идемпотентность (двойное нажатие не задваивает); пропуск `posted`-строк |
| `DisposeFixedAsset.service.spec.ts` | Выбытие закрывает накопленный износ и убирает актив; прибыль/убыток считается верно |
| `FeaturesConfigure.fixed_assets.spec.ts` | Флаг по умолчанию off |
| Ручная верификация Баланса | Контр-счёт нетится: первоначальная − накопленная = остаточная (блокирующий шаг плана) |

---

## 13. Риски

| Риск | Митигация |
|---|---|
| Контр-счёт не нетится в схеме Баланса автоматически | Блокирующий шаг верификации на реальных цифрах до завершения; при необходимости — явная логика нетинга в `BalanceSheetSchema` |
| Округление копеек ломает сумму графика | «Хвостик» на последний месяц + unit-тест на сумму |
| Начисление в закрытый период искажает сданную отчётность | Reuse `FinancialTransactionLocking` guard на начислении и выбытии |
| Повторное нажатие кнопки задваивает проводки | Идемпотентность через `planned → posted`; тест |
| Путаница system/tenant схемы | Обе таблицы — tenant; зафиксировано в §7 |

---

## 14. Критерий завершения

Объект ОС заводится → автоматически строится график амортизации → ежемесячная амортизация начисляется кнопкой и падает в ОПиУ → в Балансе видно первоначальную, накопленную и остаточную стоимость → ОС можно списать/продать с корректной проводкой прибыли/убытка → всё под флагом `fixed_assets` (default off), флаг выключен — UI скрыт.

---

## 15. Известный технический долг (вне объёма)

- Баг `balanceSheet:false` на типах счетов-обязательств в `accounts.ts` (§6) — починить отдельным заходом.
- Авто-крон ежемесячного начисления (мульти-тенантный) — добавить позже как аддитивное расширение поверх кнопки.
