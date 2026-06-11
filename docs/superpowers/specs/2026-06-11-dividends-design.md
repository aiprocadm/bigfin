# ⑲ — Дивиденды / вывод средств собственнику

**Дата:** 2026-06-11
**Под-проект роадмапа:** ⑲ — «расчёт чистой прибыли, доступной к выводу; регистрация выплат собственнику; статья капитала „Выплаты собственнику"; история выплат; подсказка безопасной к выводу суммы».
**Зависит от:** леджер (`accounts_transactions`), ⑥ (Debts — кредиторка для «безопасной суммы»).
**Флаг:** `Features.DIVIDENDS = 'dividends'` (по умолчанию **off**, гейтит UI — паттерн ㉗/⑧b).
**Контекст решений (в рамках делегированного исполнения роадмапа):**
- «доступно к выводу» = **накопленная нераспределённая прибыль по леджеру за всё время** минус уже выведенное — без отдельного «закрытия периодов» (его в продукте нет);
- выплата пишет **настоящие GL-проводки** (паттерн Expenses: `Ledger` → `LedgerStorageService.commit`), а не плановые операции — она должна попасть в баланс и ДДС;
- статья капитала «Выплаты собственнику» — отдельный equity-счёт, создаётся **find-or-create по slug** (паттерн `findOrCreateTaxPayable`), а не правка сидов;
- «безопасная сумма» v1 = доступная прибыль минус **непогашенная кредиторка** (неоплаченные Bills, modifiers из Debts) — платёжный календарь подключим в v2.

---

## 1. Зачем

Самый частый вопрос предпринимателя без бухгалтера: «сколько я могу забрать из бизнеса и не убить его?». Вывод «на глазок» по остатку на счёте — классическая причина кассового разрыва: деньги на счёте ≠ прибыль (там сидят авансы клиентов и неоплаченные счета поставщиков). ⑲ даёт три числа — «доступно», «безопасно», «уже выведено» — и регистрацию выплаты в два клика с предупреждением о риске.

## 2. Модель данных

Одна новая tenant-таблица `dividend_payouts` (выплаты принадлежат организации):

| колонка | тип | что |
|---|---|---|
| `id` | increments | |
| `date` | date, not null | дата выплаты |
| `amount` | decimal(13,3), not null | сумма в базовой валюте |
| `payment_account_id` | int unsigned, FK → `accounts.id` | счёт списания (банк/касса) |
| `equity_account_id` | int unsigned, FK → `accounts.id` | equity-счёт «Выплаты собственнику» |
| `note` | text, null | комментарий |
| timestamps | | |

Откат (`down()`): дроп таблицы. Equity-счёт «Выплаты собственнику» (slug `owner-payouts`, type `equity`, code `30004`) создаётся лениво при первой выплате — миграция сидов не нужна.

## 3. Расчёты (чистые функции `utils/dividendsMath.ts`)

```
netProfit   = Σ нетто по P&L-счетам за всё время
              (income/other-income: credit−debit; expense/COGS/other-expense: debit−credit)
totalPaidOut = Σ amount по dividend_payouts
available   = netProfit − totalPaidOut
unpaidBills = Σ dueAmount × exchangeRate по неоплаченным Bills (due + overdue, modifiers из Debts)
safe        = available − unpaidBills   (может быть < 0 — UI показывает 0 и предупреждение)
```

Все расчёты NaN-safe, округление до 3 знаков (паттерн `payrollMath`/`dataQualityMath`). P&L-агрегация — SQL `SUM(credit)/SUM(debit)` по `accountId` (паттерн ㉗ `GetPlCashflowComparison`), без даты — за всё время.

## 4. Проводки выплаты

Регистрация (`CreateDividendPayout`, в одной транзакции UnitOfWork):

1. валидация: `amount > 0`; счёт списания существует и имеет тип `cash`/`bank`;
2. find-or-create equity-счёта «Выплаты собственнику» (`slug: owner-payouts`);
3. insert строки `dividend_payouts`;
4. GL: **дебет** equity «Выплаты собственнику» / **кредит** денежного счёта, `transactionType: 'DividendPayout'`, `transactionId: payout.id` → `LedgerStorageService.commit` (обновляет и балансы счетов).

Итог в отчётах: ОПиУ не трогаем (выплата — не расход), ДДС видит отток по денежному счёту, баланс — уменьшение капитала. Удаление выплаты: `ledgerStorage.deleteByReference(id, 'DividendPayout')` + delete строки — полное сторнирование (паттерн Expenses).

Превышение «безопасной» суммы **не блокирует** выплату — продукт управленческий, решает собственник; сервер не запрещает, UI предупреждает.

## 5. API — новый модуль `Dividends`

```
GET    /dividends/summary      → { netProfit, totalPaidOut, available, unpaidBills, safe }
GET    /dividends/payouts      → { payouts: [{ id, date, amount, paymentAccountId,
                                   paymentAccountName, note }] }
POST   /dividends/payouts      { date, amount, paymentAccountId, note? }
DELETE /dividends/payouts/:id
```

Структура — паттерн Payroll/DataQuality: `Dividends.module.ts` → `Dividends.controller.ts` → `Dividends.application.ts` → `queries/` + `commands/`; модель через `TenantModelProxy` (регистрация в `Tenancy.module.ts`); арифметика — чистые функции в `utils/`. Мутации — `@RequirePermission('manage', 'all')` (вывод средств — операция владельца). Регистрация: `App.module.ts`; флаг — `Features.ts` + `FeaturesConfigure`.

## 6. Фронт

- Маршрут `/dividends` (route-only, без пункта сайдбара — как Deals/Debts/Payroll/DataQuality), страница видна при `featureCan('dividends')`.
- Три карточки: **«Доступно к выводу»**, **«Безопасно к выводу»** (с подписью «с учётом долгов поставщикам»), **«Выведено всего»**.
- Форма регистрации: сумма, дата (по умолчанию сегодня), счёт списания (select по `useAccounts`, только cash/bank), комментарий. Если сумма > safe — жёлтое предупреждение «возможен кассовый разрыв» (не блокирует).
- Таблица истории выплат (дата, сумма, счёт, комментарий, удалить с confirm).
- Хуки `hooks/query/dividends.tsx` (`useRequestQuery`/`useMutation`, ключи `DIVIDENDS_*` в `types.tsx`, инвалидация сводки/истории/счетов/отчётов).
- i18n `dividends.*` парно en+ru. RU: «Вывод средств», «Доступно к выводу», «Безопасно к выводу», «Зарегистрировать выплату», «Сумма больше безопасной — возможен кассовый разрыв».

## 7. Тесты (Jest, рядом с модулем)

- `dividendsMath.spec.ts`: netProfit по нормалям счетов, available/safe, NaN-safe, отрицательный safe;
- `GetDividendsSummary.service.spec.ts`: сборка сводки на стабах моделей (паттерн `GetDebtsOverview.service.spec.ts`);
- `CreateDividendPayout.service.spec.ts`: валидации (сумма ≤ 0, не-денежный счёт), find-or-create equity-счёта, проводка дебет-equity/кредит-cash;
- `FeaturesConfigure.dividends.spec.ts`: флаг есть, дефолт off.

## 8. НЕ входит (явно отложено)

- Авто-расчёт НДФЛ 13% с дивидендов — anti-scope роадмапа;
- Распределение между несколькими учредителями по долям — v2;
- Юридическое оформление решения о выплате (документы) — не входит;
- «Безопасная сумма» с учётом платёжного календаря/будущих плановых оттоков — v2 (v1 — только кредиторка);
- Редактирование выплаты — v1 только создать/удалить (правка = удалить и создать заново).

## 9. Критерий завершения ⑲

Включить флаг → `/dividends`: видны «доступно/безопасно/выведено»; регистрация выплаты создаёт GL-проводки (дебет equity, кредит банка) и видна в истории и отчётах; при сумме больше безопасной — предупреждение; удаление выплаты убирает проводки. `pnpm typecheck`, тесты модуля, `lang-check.js` — зелёные.
