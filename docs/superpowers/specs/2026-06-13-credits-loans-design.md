# ⑳ Кредиты и займы — дизайн

**Дата:** 2026-06-13
**Roadmap:** Ф3b, пункт ⑳ (источник скоупа — `2026-05-27-fintablo-planfact-parity-roadmap.md`).
**Разведка:** `2026-06-13-roadmap-f3b-recon-credits-fixedassets-notifications.md` (раздел ⑳).
**Флаг:** `credits` (default off, мягкий гейт — управляет только видимостью в UI).
**Шаблон:** модуль `Dividends` (долг-подобная сущность, тоже постит GL через `LedgerStorageService`).
**Риск:** низкий — вся инфраструктура готова (GL, календарь ⑥, статьи ④, типы счетов-обязательств в Балансе).

---

## Решения основателя (brainstorming 2026-06-13)

| Развилка | Решение |
|---|---|
| График погашения | **Оба типа на выбор**: аннуитет + дифференцированный |
| Счёт обязательства | **Свой на каждый кредит** (find-or-create per credit) |
| Платёжный календарь ⑥ | **Весь платёж** (тело + проценты), не только проценты |
| Объём MVP | **Базовый цикл** (без досрочного/реструктуризации) |

---

## 1. Данные — 2 тенантные таблицы (TENANT-схема)

Миграция `create_credits_tables` (одна миграция, две таблицы; рабочий `down()` дропает обе). Стиль — `20260611130000_create_dividend_payouts_table.ts`.

### `credits`
| Колонка | Тип | Заметки |
|---|---|---|
| `id` | increments | |
| `name` | string | «Кредит Сбербанк», «Заём от учредителя» |
| `lender` | string nullable | кредитор/банк, опционально |
| `principal_amount` | decimal(13,3) | тело кредита (сумма выдачи) |
| `annual_interest_rate` | decimal(9,4) | годовая ставка, % (например 18.5000) |
| `term_months` | integer | срок в месяцах |
| `start_date` | date, index | дата выдачи; первый платёж — через месяц |
| `schedule_type` | string | `annuity` \| `differentiated` |
| `payment_account_id` | int → accounts, index | банк: куда пришли деньги и откуда платим |
| `liability_account_id` | int → accounts, index | счёт обязательства (свой на кредит) |
| `interest_expense_account_id` | int → accounts, index | «Проценты по кредитам» (общий) |
| `status` | string | `active` \| `closed` |
| `note` | text nullable | |
| timestamps | | |

### `credit_installments` (строки графика)
| Колонка | Тип | Заметки |
|---|---|---|
| `id` | increments | |
| `credit_id` | int → credits, index | каскад зачищаем в коде команды Delete |
| `seq_no` | integer | номер платежа 1..N |
| `due_date` | date, index | дата платежа |
| `payment_amount` | decimal(13,3) | полный платёж = principal + interest |
| `principal_amount` | decimal(13,3) | тело в этом платеже |
| `interest_amount` | decimal(13,3) | проценты в этом платеже |
| `remaining_balance` | decimal(13,3) | остаток тела после платежа |
| `status` | string | `planned` \| `paid` |
| `paid_date` | date nullable | |
| timestamps | | |

**Регистрация моделей (КРИТИЧНО):** `Credit` и `CreditInstallment` добавить в массив `models[]` в `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts` — иначе Knex не видит модель.

---

## 2. GL-проводки (двойная запись)

Чистая функция `utils/creditGLEntries.ts` строит `ILedgerEntry[]`, команда оборачивает в `new Ledger(...)` и `ledgerStorage.commit(ledger, trx)` внутри `uow.withTransaction()`. Валюта — `metadata.baseCurrency` (как Dividends; мультивалюта вне объёма).

### При создании кредита (выдача — деньги пришли)
```
Dr  payment_account (банк)        principal_amount
Cr  liability_account (долг)      principal_amount
```
Деньги на счёте растут, в Балансе появляется обязательство. `transactionType='CreditDisbursement'`, `transactionId=credit.id`.

> UI-подсказка в диалоге создания: «Сумма кредита автоматически попадёт на выбранный счёт — не заводите этот приход вручную ещё раз».

### При «Платёж внесён» (по строке графика, MarkInstallmentPaid)
```
Dr  liability_account (долг)              principal_amount строки
Dr  interest_expense_account (проценты)   interest_amount строки
Cr  payment_account (банк)                payment_amount строки
```
Баланс сходится: дебет = тело + проценты = платёж = кредит. Долг уменьшается, проценты в ОПиУ, деньги уходят. `transactionType='CreditInstallmentPayment'`, `transactionId=installment.id`.

### Удаление
`ledgerStorage.deleteByReference(...)` по `CreditDisbursement/credit.id` и по каждой оплаченной строке `CreditInstallmentPayment/installment.id` (паттерн `DeleteDividendPayout`).

---

## 3. Счета (find-or-create)

- **Обязательство (на кредит):** find-or-create по `slug` вида `credit-liability-<creditId>` НЕ годится (slug нужен до вставки). Решение: создаём счёт обязательства ВНУТРИ транзакции создания кредита (insertAndFetch), `name` = `name` кредита, тип по сроку: `term_months <= 12` → `ACCOUNT_TYPE.OTHER_CURRENT_LIABILITY`, иначе `ACCOUNT_TYPE.LOGN_TERM_LIABILITY` (существующая константа с upstream-typo `LOGN` — НЕ переименовываем). `normal = CREDIT`. Сохраняем `liability_account_id` в строке кредита.
- **Проценты по кредитам (общий):** find-or-create по фиксированному `slug='loan-interest-expense'`, тип `ACCOUNT_TYPE.EXPENSE`, `normal=DEBIT` (паттерн `OWNER_PAYOUTS_ACCOUNT`/`findOrCreateEquityAccount`).
- **Денежный счёт (банк):** выбирает пользователь; валидируем `accountType ∈ CASH_ACCOUNT_TYPES` (как Dividends).

---

## 4. Статья ④ «Проценты по кредитам»

При первом создании кредита (или в сидере флага) find-or-create:
- расходный GL-счёт `loan-interest-expense` (см. §3),
- управленческая статья «Проценты по кредитам» (`kind=expense`, `cashflow_section=financing`),
- маппинг в `management_article_accounts` (статья → счёт).

`ArticlesPlRollupService.getRollup()` подхватит автоматически — правок в самом сервисе нет. В ОПиУ попадают **только проценты**; тело — движение по обязательству (Баланс), не расход.

---

## 5. Платёжный календарь ⑥

При создании кредита — на каждую строку графика пишем `PlannedOperation` через `CreatePlannedOperation.service.ts`:
- `source_type='CreditInstallment'`, `source_id=installment.id`
- `direction='outflow'`, `amount=payment_amount` (**весь платёж**)
- `date=due_date`, `status='planned'`

«Платёж внесён» → снимаем соответствующий план (факт уже в GL). Удаление кредита → каскадная зачистка всех планов по `source_type='CreditInstallment'` + `source_id ∈ installmentIds`.

---

## 6. Чистые функции (юнит-тесты обязательны)

### `utils/generateSchedule.ts`
Вход: `{ principal, annualRate, termMonths, startDate, scheduleType }`. Выход: `ILoanInstallment[]` (seqNo, dueDate, paymentAmount, principalAmount, interestAmount, remainingBalance).
- **Аннуитет:** месячная ставка `r = annualRate/100/12`; платёж `A = P·r / (1 − (1+r)^−n)` (при `r=0` → `P/n`); проценты месяца = `остаток·r`, тело = `A − проценты`.
- **Дифференцированный:** тело = `P/n` каждый месяц (равными долями); проценты = `остаток·r`; платёж = тело + проценты (убывает).
- Округление до 2 знаков (валюта); накопленную ошибку округления добиваем в **последний** платёж, чтобы `Σ principal = P` точно и `remaining_balance` последней строки = 0.
- `dueDate` — `startDate + seqNo месяцев` (moment `.add(seqNo,'months')`).

Тест-кейсы: оба типа; `r=0` (беспроцентный заём); срок 1 месяц; проверка `Σprincipal=P` и нулевого остатка.

### `utils/creditGLEntries.ts`
`getCreditDisbursementGLEntries(credit)` и `getCreditInstallmentPaymentGLEntries(installment, accounts)` → `ILedgerEntry[]`. Тесты: суммы debit=credit, правильные `accountNormal`.

---

## 7. Сервер — модуль `packages/server/src/modules/Credits/`

```
Credits.module.ts            импортируется в App.module.ts (всегда; гард на контроллере НЕ ставим)
Credits.controller.ts        /credits CRUD + /credits/:id/installments/:iid/pay
Credits.application.ts
constants.ts                 типы транзакций, slug счёта процентов, ERRORS, CASH_ACCOUNT_TYPES
dtos/Credit.dto.ts           Create/Edit DTO + class-validator
models/Credit.model.ts       relation hasMany installments
models/CreditInstallment.model.ts
commands/CreateCredit.service.ts        (+ .spec) генерит график, счёт-обязательство, GL выдачи, планы календаря
commands/EditCredit.service.ts          MVP: правка только полей карточки до первого платежа; пересборка графика если параметры менялись и нет оплат
commands/DeleteCredit.service.ts        зачистка installments + планов + GL
commands/MarkInstallmentPaid.service.ts (+ .spec) GL платежа, статус paid, снять план
queries/GetCredits.service.ts           список + остаток долга (Σ remaining planned)
queries/GetCreditDetail.service.ts      карточка + график
queries/GetCreditsSummary.service.ts    итоги (всего долга, ближайший платёж)
utils/generateSchedule.ts (+ .spec)
utils/creditGLEntries.ts (+ .spec)
```

**Фича-флаг (3 шага сервер):** `Features.CREDITS='credits'` в `common/types/Features.ts`; дефолт `{ name: Features.CREDITS, defaultValue: false }` в `FeaturesConfigure.getConfigure()`; spec `FeaturesConfigure.credits.spec.ts` (по `FeaturesConfigure.dividends.spec.ts`).

---

## 8. Фронт — `packages/webapp/src/`

- `containers/Credits/` — страница списка (таблица: название, кредитор, сумма, ставка, срок, остаток долга, статус) + карточка кредита (параметры + график-таблица + кнопка «Платёж внесён» на ближайшей неоплаченной строке) + диалог создания (поля + переключатель аннуитет/дифференцированный + превью графика до сохранения).
- `hooks/query/credits.tsx` — react-query хуки CRUD + pay.
- Роут `/credits` + пункт меню.
- `constants/features.tsx` + гейт `useFeatureCan('credits')` (`hooks/state/feature.tsx`).
- Ключи `credits.*` парно в `lang/{en,ru}/index.json`; после правки — `lang-check.js`.

---

## Вне объёма (явно)

- Досрочное / частично-досрочное погашение, реструктуризация (ставка/срок) — отдельные заходы.
- Мультивалютные кредиты — берём `baseCurrency`.
- Починка upstream-бага флага `balanceSheet:false` у типов обязательств — отчёты выбирают счета **по типу**, не по флагу, на наш поток не влияет; правка отдельно (и не тащит typo `LOGN_TERM_LIABILITY`).
- Авто-крон напоминаний о платеже — это ㉒ уведомления (следующий блок).

---

## Приёмка

- `pnpm --filter @bigfin/server test` — спеки `generateSchedule`, `creditGLEntries`, `CreateCredit`, `MarkInstallmentPaid`, `FeaturesConfigure.credits` зелёные.
- `pnpm typecheck` — 3 пакета чисто.
- `node packages/webapp/scripts/lang-check.js` — парность en↔ru.
- `node packages/server/scripts/i18n-parity-check.js` — если трогаем серверный словарь (для MVP — нет, серверных строк нет).
- Миграция `latest → rollback → latest` (на CI).
- Ручная проверка на локальном стеке: создать кредит → график построился → план в календаре → «Платёж внесён» → долг в Балансе уменьшился, проценты в ОПиУ.
