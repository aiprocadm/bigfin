# ⑨ Банковские выписки — Фаза 2 «Bigfin угадывает контрагента и статью» (план)

**Дата:** 2026-06-23
**Ветка:** `feat/bank-statement-import-phase2` (от develop = PR #98 merged)
**Флаг:** `bank_statement_import` (off) — тот же, что в Фазе 1; гейтит UI.
**Спека:** `docs/superpowers/specs/2026-06-22-bank-statement-import-design.md` (§4 Фаза 2).

---

## Находка разведки (2026-06-23), меняющая объём

Спека предполагала, что **движок применения правил `BankRules` отсутствует** («только CRUD»).
Разведка опровергла: движок **существует и подключён** — модуль `BankingTranasctionsRegonize`
(опечатка как в upstream BigCapital), зарегистрирован в `App.module.ts`:

- `bankRulesMatchTransaction()` (`_utils.ts`) — матчинг условий правила к операции;
- `RecognizeTranasctions.service.ts` — распознавание, запись в `recognized_bank_transactions`;
- авто-триггер по событиям `bankRules.onCreated/onEdited/onDeleted` (BullMQ-очередь);
- результат уже течёт в UI через autofill (`GetAutofillCategorizeTransaction*` →
  `creditAccountId`/`transactionType`/`recognizedByRuleId`); Фаза 1 уже читает это в
  `useGetAutofillCategorizeTransaction`.

**Следствие:** «движок правил» Фазы 2 делать НЕ нужно — он есть. Реально недостающее —
**память по контрагенту** + **авто-подстановка контрагента по ИНН** (в Фазе 1 ИНН только
показывается тегом, контрагент не подставляется).

Это зеркалит приём «Сделки переиспользовали Проекты»: дотягиваем унаследованный конвейер.

---

## Объём Фазы 2 (re-scoped)

1. **Авто-контрагент по ИНН.** Если у непривязанной операции есть `payee_inn` и она НЕ
   распознана правилом — найти контрагента по ИНН (`GetContactByInn`) и вернуть его в autofill,
   чтобы форма «Разбор» подставила контрагента.
2. **Память по контрагенту (статья).** Из истории `cashflow_transactions` (Фаза 1 пишет туда
   `contact_id` + `credit_account_id` + `transaction_type`) взять последнюю подтверждённую
   статью этого контрагента и подставить как подсказку. **Без новой таблицы** — память
   выводится из истории, «учится на подтверждениях» автоматически.
3. **Приоритет подсказки в autofill:** распознанное правило → память по контрагенту →
   дефолт по направлению (приход→`other_income`, расход→`other_expense`). Поведение без
   истории/правил не меняется (обратная совместимость).
4. **Фронт:** форма «Разбор» подставляет контрагента из `suggestedContactId`, статью — из
   памяти, и показывает тонкую подсказку «Статья подставлена по контрагенту».

### Anti-scope (не входит в Фазу 2)

- Движок правил (уже есть).
- «Создать контрагента из {имя, ИНН}» одним кликом — отдельный заход (нужен модальный флоу;
  ГЛАВНЫЙ follow-up Фазы 1).
- Память **по правилам пользователя** сверх существующего движка.
- Память «по частоте» (most-frequent) — v1 берёт **последнее подтверждение** (most-recent);
  most-frequent — follow-up.
- Сопоставление со счетами и CSV/Excel — Фаза 3.

---

## Архитектура

```
autofill(ids)  ← GET /banking/uncategorized/autofill (существует)
   │
   ├─ если recognizedTransaction есть → как сейчас (правило выигрывает)
   │
   └─ иначе:
        ├─ payee_inn → GetContactByInn → suggestedContactId
        └─ suggestedContactId → GetContactCategoryMemory(history) →
              { creditAccountId, transactionType }  (most-recent)
   ▼
трансформер: creditAccountId = rule ?? memory ?? null
             transactionType = rule ?? memory ?? directionDefault
             + suggestedContactId, + suggestedByContact (bool)
```

### Границы единиц

- **`pickContactMemory(rows): {creditAccountId, transactionType} | null`** — чистая функция:
  из массива кандидатов (уже отсортированных date desc, id desc) берёт первый с непустым
  `creditAccountId`. Тестируется напрямую (TDD).
- **`GetContactCategoryMemoryService`** (в `BankingTransactions/queries/`) — запрос истории
  `BankTransaction` по `contactId` (`whereNotNull('creditAccountId')`, `orderBy date desc,
  id desc`, limit небольшой) → `pickContactMemory`.
- **`GetAutofillCategorizeTransactionService`** — оркестрация: инжектит `GetContactByInn`
  (через ContactsModule) + `GetContactCategoryMemory`; считает подсказки ТОЛЬКО когда не
  распознано; прокидывает в трансформер опциями.
- **Трансформер** — добавляет поля, не ломая существующие.

---

## Задачи (TDD)

1. **[server, TDD]** Чистая `pickContactMemory(rows)` + spec (пустой массив→null; первый с
   `creditAccountId`; пропуск строк с null-creditAccountId).
2. **[server]** `GetContactCategoryMemoryService.getForContact(contactId)` — запрос истории +
   `pickContactMemory`. Возвращает `null`, если `contactId` пуст.
3. **[server]** Убедиться, что `ContactsModule` экспортирует `GetContactByInnService`; если
   нет — добавить в `exports`.
4. **[server]** Расширить `GetAutofillCategorizeTransactionService`: инжект двух сервисов;
   при `!recognizedTransaction` — резолв контрагента по `payeeInn` + память; опции в трансформер.
5. **[server]** Расширить `GetAutofillCategorizeTransctionTransformer`: поля `suggestedContactId`,
   `suggestedByContact`; `creditAccountId()`/`transactionType()` с фолбэком на память.
6. **[server]** Зарегистрировать новый сервис в `BankingTransactions.module` (+ import
   `ContactsModule`).
7. **[webapp]** Интерфейс `GetAutofillCategorizeTransaction` хука +`suggestedContactId:number|null`,
   `suggestedByContact:boolean`.
8. **[webapp]** `CategorizeTransactionFormContent`/initial-values: подставить `contactId` из
   `suggestedContactId`; подсказка «Статья подставлена по контрагенту» при `suggestedByContact`.
9. **[i18n]** Ключ `bank_import.suggested_by_contact` (en+ru).
10. **[приёмка]** `pnpm typecheck` (3 пакета), `lang-check`, `pnpm --filter @bigfin/server test`
    (новые + Banking наборы зелёные), ru-translation-reviewer.

---

## Изменения в данных

**Нет миграций.** Память выводится из истории `cashflow_transactions` (колонка `contact_id`
добавлена в Фазе 1). Чисто аддитивные поля в JSON-ответе autofill.

---

## Риски / крайние случаи

- **Несколько контрагентов с одним ИНН** → `GetContactByInn` берёт первого (как в Фазе 1).
- **Нет истории по контрагенту** → подсказки статьи нет, поведение как сейчас.
- **Вокабуляр `transaction_type`:** память берёт реальное значение прошлой операции
  (`other_income`/`other_expense`/…) — корректно по построению (подставляем то, что юзер уже
  подтверждал).
- **Правило важнее памяти** — если операция распознана правилом, память не вмешивается.
- **Тенант-скоуп:** оба запроса через `TenantModelProxy`, как остальной модуль.
