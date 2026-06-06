# Дизайн: Заявки на оплату (под-проект ㉔)

**Дата:** 2026-06-06
**Тип документа:** Design (спецификация под-проекта)
**Статус:** Draft → одобрен основателем 2026-06-06 (модель согласования: **простая — согласует админ/владелец**)
**Реализует:** под-проект ㉔ роадмапа — Заявки на оплату (согласование платежей), Ф3a, расширяет ⑥
**Родительский роадмап:** [2026-05-27-fintablo-planfact-parity-roadmap.md](2026-05-27-fintablo-planfact-parity-roadmap.md)
**Предшественники (готовы, в develop):** ⑥ «Платёжный календарь» (`planned_operations`), `Roles` (CASL-авторизация)

---

## 0. Зачем этот документ

㉔ — следующий под-проект Ф3a после ⑭. Он **расширяет платёжный календарь** контуром согласования: сотрудник создаёт заявку на оплату, владелец одобряет, и одобренная заявка **сама появляется в календаре** как плановый отток. Ключевая удача: поля `planned_operations.source_type/source_id` уже есть и пусты (добавлены в ⑥ заранее под такой кейс) — связь делается без правок движка прогноза.

**Наследуется без изменений** (роадмап §4): additive-миграции в tenant-схему с рабочим `down()`, режим «Бизнес/Бухгалтер», парность EN↔RU (`lang-check`), RUB как база, feature flags (по умолчанию off), минимум новых зависимостей, копирайт «© 2026 Bigfin».

---

## 1. Контекст и цели

### Что строим

Контур **заявок на оплату**: сотрудник оформляет заявку (сумма, статья, контрагент, срок, основание); владелец/директор **одобряет или отклоняет**; одобренная заявка превращается в **плановый отток в платёжном календаре**. Реестр заявок с фильтром по статусу.

### Целевая аудитория

Предприниматель и его сотрудники. Сценарий: сотрудник просит оплатить счёт поставщика → владелец видит заявку, одобряет → платёж попадает в прогноз денег. Защита от хаотичных трат.

### Критерий успеха (= критерий завершения ㉔ роадмапа)

Заявка создана → согласующий одобрил → она появилась в платёжном календаре как **плановый отток**. Виден реестр заявок по статусам; отклонение работает.

### Что в коде уже есть (проверено прямым чтением)

- **Платёжный календарь** — `planned_operations` (модель `PlannedOperation`): поля `direction`, `amount`, `status` (`planned/confirmed/done/cancelled`), `plannedDate`, `articleId`, `accountId`, `branchId`, `contactId`, `currencyCode`, `description`, и **`sourceType`/`sourceId` (свободны)**. Прогноз `GetPaymentCalendarForecast` включает операции со `status ∈ (planned, confirmed)` через модификатор `forecastable`.
- **CASL-авторизация** — `modules/Roles`: декоратор `@RequirePermission(action, subject)` + `PermissionGuard` (`ability.can(action, subject)`); `AuthorizationGuard` грузит способности из роли пользователя; админ имеет `manage all` (проходит любую проверку). Действия CASL: `manage/create/read/update/delete` (действия «approve» **нет**).
- **Текущий пользователь** — `TenancyContext.getSystemUser()` (id из `cls`), `getTenant()`.
- **Справочники** — `management_articles`, `contacts`, `accounts`, `branches`.
- **Паттерны** — модуль `PaymentCalendar` (скелет), `UnitOfWork.withTransaction`, `ServiceError`, фронт `ListView`+`useListController`, React Query хуки, RHF+Zod, `useFeatureCan`.

### Чего в коде нет (строим)

- Таблицы `payment_requests` и её модели.
- Статус-воркфлоу заявки (`pending → approved/rejected/cancelled`).
- Команд create/approve/reject/cancel и связи «одобрение → плановый отток».
- Страницы-реестра заявок с действиями.

---

## 2. Объём v1

### Входит

1. **Создание заявки** (любой аутентифицированный пользователь модуля): сумма, валюта, статья, контрагент, счёт (опц.), направление/branch (опц.), срок (`due_date`), основание/описание. Статус `pending`, `created_by` = текущий пользователь.
2. **Согласование** (только админ/владелец — `manage all`): **Одобрить** → `approved` + `approved_by`/`approved_at` + **вставка планового оттока** в календарь; **Отклонить** → `rejected`.
3. **Отмена** (`cancelled`): если заявка была одобрена и породила строку календаря — связанная плановая операция отменяется (`status='cancelled'`, уходит из прогноза).
4. **Реестр** заявок с фильтром по статусу + просмотр одной заявки.

### НЕ входит (anti-scope, по роадмапу)

- **Авто-отправка платежа в банк** (требует ЭКО-сертификации).
- **Многоуровневое согласование** (цепочка согласующих) — v2.
- **Контроль «заявка превышает лимит статьи бюджета ⑤»** — позже.
- **Тонкая ролевая настройка «кто согласует»** (отдельный CASL-субъект/действие «approve») — v2; в v1 согласует админ (`manage all`).
- **Редактирование сгенерированной плановой операции напрямую** — управляется через жизненный цикл заявки.

---

## 3. UX

Страница `/payment-requests` (режим «Бизнес», за флагом). Реестр + фильтр по статусу + создание; для админа — кнопки согласования.

```
┌──────────────────────────────────────────────────────────┐
│  Заявки на оплату            [ + Создать заявку ]          │
│  [ Все ][ На согласовании ][ Одобрены ][ Отклонены ]       │  ← фильтр статуса
├──────────────────────────────────────────────────────────┤
│  Срок     Контрагент      Статья      Сумма     Статус  ⋮  │
│  15.06    ООО «Ромашка»   Аренда     120 000   ⏳ ждёт  │
│      └─ основание: «оплата за июнь» · автор: Пётр         │
│         [ Одобрить ] [ Отклонить ]   ← видно админу       │
│  10.06    ИП Сидоров      Маркетинг   40 000   ✅ одобр. │
└──────────────────────────────────────────────────────────┘
```

- **Реестр** — `ListView` или простая таблица; фильтр-табы по статусу.
- **Создание** — диалог (RHF+Zod): сумма, статья, контрагент, счёт, срок, основание.
- **Согласование** — кнопки «Одобрить»/«Отклонить» на заявке `pending`; видны только админу (фронт прячет, сервер enforce'ит).
- **Мобильный** — одна колонка, как остальные новые экраны.

---

## 4. Модель данных

Одна новая таблица в **tenant**-схему. Справочники и `planned_operations` — читаем/дополняем строкой, схемы не меняем. Всё additive, рабочий `down()`.

### `payment_requests`

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | increments | PK |
| `amount` | decimal(13,3) | сумма заявки |
| `currency_code` | string(3) | валюта (по умолчанию базовая орг.) |
| `article_id` | integer nullable → `management_articles.id` | статья учёта |
| `contact_id` | integer nullable → `contacts.id` | контрагент (получатель) |
| `account_id` | integer nullable → `accounts.id` | счёт оплаты |
| `branch_id` | integer nullable | направление |
| `due_date` | date, index | срок оплаты |
| `description` | string nullable | основание / комментарий |
| `status` | string, index | `pending` / `approved` / `rejected` / `cancelled` |
| `created_by` | integer, index | id пользователя-автора (`systemUserId`) |
| `approved_by` | integer nullable | id согласующего |
| `approved_at` | datetime nullable | когда одобрено |
| `planned_operation_id` | integer nullable → `planned_operations.id` | сгенерированная строка календаря |
| `created_at` / `updated_at` | timestamps | |

---

## 5. Логика

### 5.1 Статус-воркфлоу — `validateStatusTransition(current, next)` (чистая, TDD)

Разрешённые переходы:
- `pending → approved`
- `pending → rejected`
- `pending → cancelled`
- `approved → cancelled` (отзыв одобренной заявки)

Любой другой переход → `ServiceError(INVALID_STATUS_TRANSITION)`. Тест: все разрешённые + примеры запрещённых (`approved→pending`, `rejected→approved`, `cancelled→*`).

### 5.2 Одобрение → плановый отток (в одной транзакции)

`ApprovePaymentRequest`:
1. Загрузить заявку; проверить переход `pending→approved`.
2. `patch`: `status='approved'`, `approved_by=currentUser.id`, `approved_at=now`.
3. **Вставить `planned_operation`**: `direction='outflow'`, `amount`, `currency_code`, `plannedDate=due_date`, `articleId/accountId/branchId/contactId` из заявки, `status='confirmed'`, `sourceType='payment_request'`, `sourceId=request.id`, `description` (основание или «Заявка №id»).
4. Сохранить `planned_operation_id` в заявке.

Прогноз календаря подхватывает операцию (она `confirmed`).

### 5.3 Отмена одобренной

`CancelPaymentRequest`: если `planned_operation_id` задан — `patch` той операции `status='cancelled'` (уходит из прогноза); заявке `status='cancelled'`.

### 5.4 Валюта

Сумма заявки в её `currency_code` (по умолчанию базовая). Плановая операция наследует валюту; конвертацию делает уже календарь (как для прочих операций).

---

## 6. Структура модуля (зеркалит `PaymentCalendar`)

```
packages/server/src/modules/PaymentRequests/
├── PaymentRequests.module.ts
├── PaymentRequests.application.ts
├── PaymentRequests.controller.ts
├── constants.ts                       # статусы, source-type, ERRORS
├── PaymentRequests.interfaces.ts
├── models/
│   └── PaymentRequest.model.ts
├── dtos/
│   ├── PaymentRequest.dto.ts           # create/edit
│   └── GetPaymentRequestsQuery.dto.ts  # фильтр по статусу
├── commands/
│   ├── CreatePaymentRequest.service.ts
│   ├── ApprovePaymentRequest.service.ts     # + вставка planned_operation
│   ├── RejectPaymentRequest.service.ts
│   ├── CancelPaymentRequest.service.ts
│   └── CommandPaymentRequestValidator.service.ts
├── queries/
│   ├── GetPaymentRequests.service.ts
│   └── GetPaymentRequest.service.ts
└── utils/
    └── validateStatusTransition.ts
```

**Wiring:** `PaymentRequestsModule` → `App.module.ts`; модель `PaymentRequest` → массив `models` в `Tenancy.module.ts`. Импортирует `PlannedOperation` (вставка) — тенант-модели глобальны, доступны по DI.

---

## 7. API

| Метод | Путь | Гейтинг | Назначение |
|---|---|---|---|
| `GET` | `/payment-requests?status=` | аутентификация | реестр (фильтр по статусу) |
| `GET` | `/payment-requests/:id` | аутентификация | одна заявка |
| `POST` | `/payment-requests` | аутентификация | создать (status=pending) |
| `PUT` | `/payment-requests/:id` | аутентификация (автор) | правка `pending`-заявки |
| `POST` | `/payment-requests/:id/approve` | **`@RequirePermission('manage','all')`** (админ) | одобрить → плановый отток |
| `POST` | `/payment-requests/:id/reject` | **админ** | отклонить |
| `POST` | `/payment-requests/:id/cancel` | автор или админ | отменить (+ снять операцию) |

Всё под флагом `Features.PAYMENT_REQUESTS`. Гейтинг согласования — через существующие `AuthorizationGuard`+`PermissionGuard` (глобальные `APP_GUARD`; подтвердить при реализации, иначе навесить `@UseGuards` на эндпоинты approve/reject).

---

## 8. Фронтенд

```
packages/webapp/src/
├── containers/PaymentRequests/
│   ├── PaymentRequestsPage.tsx       # реестр + табы статусов + действия
│   ├── PaymentRequestDialog.tsx      # RHF+Zod создание
│   └── schemas.ts
└── hooks/query/paymentRequests.tsx   # useRequestQuery + мутации (create/approve/reject/cancel)
```

- Данные — `useRequestQuery`; ключи кэша в `hooks/query/types.tsx`.
- Действия — мутации с инвалидцией кэша.
- Маршрут `/payment-requests` за `featureCan('payment_requests')` (как календарь/бюджеты).
- Кнопки «Одобрить»/«Отклонить» — показываем по флагу админа (если на фронте доступна роль; иначе показываем всем, а сервер вернёт 403 не-админу). i18n EN+RU, `lang-check`.

---

## 9. Тестирование (роадмап §4.5)

- **Чистая** `validateStatusTransition` — Jest, **TDD, обязательно** (все переходы + запрещённые).
- **Валидатор** (существование статьи/контрагента/счёта) — юнит с моками.
- **ApprovePaymentRequest** — юнит с моками: проверяем, что вставляется `planned_operation` со `sourceType='payment_request'`, `direction='outflow'`, и заявка получает `planned_operation_id`.
- **Миграция** — additive, рабочий `down()`; прогон `latest→rollback→latest` в CI.
- **Типы** — `pnpm typecheck` (3 пакета).
- **i18n** — `lang-check` = 0.

---

## 10. Порядок реализации (маленькие шаги)

| Part | Содержание | Проверка |
|---|---|---|
| **A. Фундамент** | флаг `PAYMENT_REQUESTS`, constants/interfaces, миграция + модель + Tenancy, `validateStatusTransition` (TDD) | server test (utils), typecheck |
| **B. Команды** | Create + валидатор, **Approve (+planned_operation)**, Reject, Cancel; юнит-тест approve | server test, typecheck |
| **C. Запросы + wiring** | GetPaymentRequests (фильтр статуса) + GetPaymentRequest; controller/application/module + App-wiring + гейтинг | server test, typecheck |
| **D. Фронт** | страница-реестр + диалог + действия, хуки, маршрут за флагом, i18n EN+RU | typecheck, lang-check |

Точка паузы — после Part C (бэкенд-контур согласования работает; календарь получает одобренные заявки).

---

## 11. Откат

- **Мгновенный:** выключить `Features.PAYMENT_REQUESTS`.
- **Код:** `git revert` (всё additive).
- **БД:** `down()` дропает `payment_requests`; `planned_operations` не меняется структурно (только строки со `source_type='payment_request'` остаются — их можно отфильтровать/удалить отдельно при необходимости).

---

## 12. Открытые вопросы

1. **Тонкая роль «согласующий»** (директор ≠ полный админ) — отдельный CASL-субъект/действие; v2 по запросу.
2. **Статус планового оттока** — `confirmed` (одобрено) или `planned`? В v1 — `confirmed`; пересмотр после dogfooding.
3. **Уведомление автору** об одобрении/отклонении — кандидат в ㉒ «Движок уведомлений», не в ㉔.
4. **Лимит статьи бюджета ⑤** при создании заявки — позже (anti-scope сейчас).
