# ㉒-1 Движок уведомлений (ядро + email) — дизайн

**Дата:** 2026-06-15
**Тип:** дизайн-спека под-проекта (brainstorming → **spec** → plan → executing)
**Под-проект роадмапа:** ㉒ (Ф3b «достройка контура»), высокий риск — **декомпозирован**.
**Флаг:** `notifications` (default off; гейтит И UI, И крон — см. §1).
**Ветка (план):** `feat/notifications` от `develop`.
**Источники:**
- Карта инфраструктуры: [2026-06-13-roadmap-f3b-recon-credits-fixedassets-notifications.md](2026-06-13-roadmap-f3b-recon-credits-fixedassets-notifications.md) (㉒).
- Scope: [2026-05-27-fintablo-planfact-parity-roadmap.md](2026-05-27-fintablo-planfact-parity-roadmap.md) §㉒.

> Дизайн-документ. Реализация — маленькими шагами под флагом `notifications` (default off). Каждый PR обратим.

---

## 0. Декомпозиция ㉒ (решение брейншторма 2026-06-15)

㉒ «все три канала» (email + in-app + Telegram) — это не один под-проект, а **ядро + три канала**, причём Telegram = отдельный под-проект роадмапа ㉓. Строим последовательно, ядро проектируем под расширение каналов:

| Фаза | Что | Риск | Статус |
|---|---|---|---|
| **㉒-1 (эта спека)** | Ядро движка + **email**-канал | низкий | проектируется |
| **㉒-2** | **In-app** канал (авторизация Socket + комнаты + инбокс + bell) | средний/высокий | позже |
| **㉓** | **Telegram** канал (бот, привязка аккаунтов) | высокий | позже |

Подключаемость обеспечивает интерфейс `DeliveryChannel` (§5): ㉒-2 и ㉓ добавят по одной реализации, не трогая ядро.

---

## 1. Цель и архитектура

Проактивно предупреждать предпринимателя о финансовых рисках письмом на языке организации. Аудитория — непрофи; тексты простые, без жаргона.

**Поток:**
```
@Cron (ночью, напр. 07:00; тело БЕЗ CLS)
  └─ для каждого активного тенанта с флагом notifications → ставит BullMQ-джобу {organizationId}
        │
        ▼
NotificationEvaluation.processor (@UseCls → ставит organizationId/CLS)
        ├─ читает notification_preferences тенанта (что включено + пороги)
        ├─ прогоняет включённые оценщики: cash_gap / low_balance / overdue
        ├─ для каждого сработавшего кандидата: проверка cooldown по (event_type, dedup_key)
        ├─ пишет запись в notifications (журнал + задел под in-app инбокс ㉒-2)
        └─ доставляет через включённые каналы: DeliveryChannel.deliver()
                                                   └─ EmailChannel (Mail + MailTransporter)
```

**Почему крон в два слоя.** `OrganizationI18nService` (язык писем) и тенантные модели требуют CLS-контекст, которого **нет в теле `@Cron`**. Поэтому тело крона тенантного ничего не делает — только перечисляет тенантов (`getAllInitializedTenants(sysKnex)`, см. `CLI/commands/BaseCommand.ts`) и ставит per-tenant джобы; вся тенантная работа — в процессоре с `@UseCls()` (паттерн `InventoryCost/processors/ComputeItemCost.processor.ts`).

**Флаг гейтит крон (отличие от обычного «мягкого гейта»).** Крон рассылает письма сам, поэтому обрабатывает только тенантов с включённым `notifications`. То есть флаг имеет backend-эффект (не только UI) — сознательно, чтобы не слать письма неподписавшимся. **Проверка флага — в начале процессора** (там есть CLS и доступ к тенантной фиче-системе): тело крона ставит джобы на всех инициализированных тенантов, а процессор с выключенным `notifications` сразу выходит (early-exit), ничего не оценивая и не отправляя. Так избегаем чтения фич-флага без CLS в теле крона.

---

## 2. Объём

### Входит (㉒-1)
1. **3 оценщика событий:** кассовый разрыв (из ⑥), остаток денежного счёта ниже минимума, просрочка счёта клиента (из ⑭).
2. **Email-канал** через готовый `Mail` + `MailTransporter`, тексты на языке организации.
3. **Дайджест-доставка** (одно письмо на тип события за прогон) + **cooldown** (по умолчанию 24ч) — защита от спама.
4. **Настройки** (per-tenant): включение событий, пороги, email-получатель, cooldown.
5. **Фронт:** страница/раздел настроек уведомлений за флагом.
6. **Журнал** `notifications` (фундамент in-app инбокса ㉒-2).

### Не входит (отдельные заходы)
- In-app канал (Socket auth + комнаты + инбокс + bell) → ㉒-2.
- Telegram → ㉓.
- Событие «подозрительная операция» (дубли + «резкое отклонение суммы»; последнее требует новой утилиты) → позже.
- Per-user адресная доставка (㉒-1 шлёт на один настраиваемый адрес).
- SMS/WhatsApp/push.

---

## 3. Данные (tenant-схема)

Обе таблицы — `packages/server/src/database/tenant/migrations/`, рабочий `down()`. Регистрация моделей в `Tenancy.module.ts` (КРИТИЧНО).

### `notification_preferences` (строка на тип события)
| Поле | Тип | Назначение |
|---|---|---|
| `id` | increments | PK |
| `event_type` | string | `cash_gap` / `low_balance` / `overdue` |
| `enabled` | boolean, default false | включено ли событие |
| `channels` | json/text | в ㉒-1 `["email"]` (задел: `in_app`, `telegram`) |
| `threshold` | json/text | пороги: `cash_gap`→`{horizonDays:7}`; `low_balance`→`{minAmount, accountId?}`; `overdue`→`{}` |
| timestamps | | createdAt/updatedAt |

### `notifications` (журнал сработавших + фундамент инбокса)
| Поле | Тип | Назначение |
|---|---|---|
| `id` | increments | PK |
| `event_type` | string, index | тип события |
| `title` | string | заголовок (язык организации) |
| `body` | text | тело (язык организации) |
| `dedup_key` | string, index | ключ cooldown (напр. `cash_gap`, `low_balance`) |
| `payload` | json/text | детали (дата/сумма разрыва, список счетов/инвойсов) |
| `fired_at` | datetime, index | когда сработало (для cooldown) |
| `read_at` | datetime, nullable | NULL (задел под «прочитано» ㉒-2) |
| `user_id` | int, nullable | NULL (задел под per-user инбокс ㉒-2) |
| `channels_sent` | json/text | фактически отправленные каналы |
| timestamps | | createdAt/updatedAt |

**Получатель и cooldown** — в существующей таблице `settings` (group `notifications`, как `PayrollSettings`): `recipient_email` (string, fallback — email владельца), `cooldown_hours` (number, default 24).

---

## 4. Оценщики событий

Каждый — отдельный сервис с одной задачей; чистая логика «данные + пороги → кандидаты[]» (тестируемо). Кандидат = `{ eventType, dedupKey, title, body, payload }`.

| Событие | Источник (готов) | Срабатывает | dedup_key | payload |
|---|---|---|---|---|
| `cash_gap` | `GetPaymentCalendarForecast.getForecast()` → `gap: CashGap\|null` | `gap` ≠ null и `gap.daysFromStart ≤ threshold.horizonDays` | `cash_gap` | `{date, amount, daysFromStart}` |
| `low_balance` | `Account.amount` по типам `CASH_ACCOUNT_TYPES` (`cash`,`bank`) | есть счёт с `amount < threshold.minAmount` | `low_balance` | `{accounts:[{name, amount}]}` |
| `overdue` | `SaleInvoice` модификатор `overdueInvoicesFromDate(today)` (см. `Debts/GetDebtsOverview`) | есть просроченные | `overdue` | `{count, total, top:[...]}` |

**Дайджест:** один кандидат на тип события за прогон (остаток — со списком всех счетов ниже порога; просрочка — со сводкой). Максимум 3 письма в день на тенант.

---

## 5. Доставка (подключаемые каналы)

- **Интерфейс** `DeliveryChannel.deliver(notification, recipient, lang): Promise<void>` — шов под каналы. В ㉒-1 одна реализация — `EmailChannel`.
- `EmailChannel`: строит `Mail` (готовый fluent API `Mail.ts`), тема и тело — через `OrganizationI18nService.translate(key, {args})` на языке организации (с подстановкой сумм/дат), отправляет через `MailTransporter.send()`. Один generic-шаблон `static/mail/Notification.html` (заголовок + тело + ссылка в кабинет).
- **i18n:** серверный словарь `packages/server/src/i18n/{en,ru}/notifications.json` (плоские ключи с точками). Парность поддерживается `i18n-parity-check.js`.
- **Получатель:** `settings.notifications.recipient_email`; если пусто — email владельца организации (из системного `USERS`/`tenants_metadata`).
- **Движок** берёт `notification_preferences.channels` и вызывает каждую включённую реализацию `DeliveryChannel`. Добавить in-app/Telegram = новая реализация, ядро не меняется.

---

## 6. Оценка и подавление повторов (cooldown)

В процессоре, в рамках одного прогона на тенант:
1. Загрузить включённые `notification_preferences`.
2. Для каждого включённого события вызвать оценщик → кандидаты.
3. Для каждого кандидата: найти в `notifications` запись с тем же `(event_type, dedup_key)` и `fired_at` свежее `cooldown_hours` → если есть, **пропустить**.
4. Иначе: вставить запись в `notifications` (с payload, title, body) и доставить через включённые каналы; записать `channels_sent`.

**Идемпотентность:** повторный прогон крона в тот же день не задваивает (cooldown). Чистая функция отбора («список кандидатов + последние fired_at + cooldown → к отправке») тестируется юнитами.

---

## 7. Фронт

- Раздел/страница настроек уведомлений (по дизайн-системе shadcn, React Hook Form + Zod), гейт `featureCan('notifications')`:
  - тумблеры 3 событий;
  - пороги: горизонт разрыва (дни), минимальный остаток (сумма);
  - email-получатель; cooldown (часы).
- Бэкенд: `GET /notifications/preferences` + `PUT /notifications/preferences` (запись = админ `@RequirePermission('manage','all')`).
- Query-хуки `hooks/query/notifications.tsx`; флаг `Notifications: 'notifications'` в `constants/features.tsx`; ключи `notifications.*` (en+ru, парно; `lang-check.js`).

---

## 8. Структура модуля (бэкенд)

`packages/server/src/modules/Notifications/`:
```
Notifications.module.ts        — imports Tenancy*, Mail, OrganizationI18n, BullModule.registerQueue, PaymentCalendar/Debts/Accounts (источники)
Notifications.controller.ts    — GET/PUT /notifications/preferences (+ guards)
Notifications.application.ts    — тонкий слой
constants.ts                   — ключи событий, дефолты, имена очереди/крона
NotificationsSettings.service.ts — recipient_email + cooldown (group 'notifications')
models/
  NotificationPreference.model.ts
  Notification.model.ts
evaluators/
  CashGapEvaluator.service.ts
  LowBalanceEvaluator.service.ts
  OverdueEvaluator.service.ts
delivery/
  DeliveryChannel.ts           — интерфейс
  EmailChannel.service.ts
jobs/
  NotificationsCron.ts         — @Cron, перечисляет тенантов → ставит джобы
  NotificationEvaluation.processor.ts — @UseCls, оценка + cooldown + доставка
queries/GetNotificationPreferences.service.ts
commands/UpdateNotificationPreferences.service.ts
utils/selectToFire.ts (+ .spec) — чистый отбор кандидатов с учётом cooldown
```
Модуль всегда импортируется в `App.module.ts`. Очередь — `BullModule.registerQueue` + `BullBoardModule.forFeature`.

---

## 9. Фича-флаг
- `common/types/Features.ts` — `NOTIFICATIONS = 'notifications'`.
- `Features/FeaturesConfigure.ts` — `{ name: Features.NOTIFICATIONS, defaultValue: false }`.
- `FeaturesConfigure.notifications.spec.ts` — флаг присутствует, off по умолчанию.
- Фронт `constants/features.tsx` — `Notifications: 'notifications'`.
- **Процессор проверяет флаг per-tenant** (early-exit при off; backend-эффект, см. §1).

---

## 10. Тестирование
| Тест | Что |
|---|---|
| `CashGapEvaluator.spec` | срабатывание по `gap.daysFromStart` vs `horizonDays` |
| `LowBalanceEvaluator.spec` | счета ниже порога → кандидат со списком |
| `OverdueEvaluator.spec` | есть просрочка → кандидат-дайджест |
| `selectToFire.spec` | cooldown: пропуск, если `fired_at` в окне; иначе к отправке |
| recipient resolution | настройка → fallback владелец |
| `FeaturesConfigure.notifications.spec` | флаг off по умолчанию |
| Живая приёмка | крон ставит per-tenant джобы; процессор оценивает; запись в `notifications` создана; письмо поставлено в очередь |

**⚠️ Ограничение приёмки:** на локальном стеке **почта — заглушка** (SMTP/S3/PDF локально не работают, см. run-bigfin). Фактическую доставку письма локально не проверить → живая приёмка = «джоба поставлена + запись в `notifications` создана + письмо ушло в очередь» (логи + БД). Реальная доставка — на staging/CI. Зафиксировано как явный остаток.

---

## 11. Риски
| Риск | Митигация |
|---|---|
| Мульти-тенантный крон + CLS | Двухслойно: тело крона только enqueue, тенантная работа в процессоре с `@UseCls()` |
| Спам уведомлениями | Дайджест (1 письмо/событие/прогон) + cooldown 24ч |
| Крон шлёт неподписавшимся | Флаг `notifications` гейтит крон per-tenant |
| Локально почта-заглушка | Приёмка по очереди/БД/логам; доставка — staging/CI |
| Язык письма не тот | `OrganizationI18nService` в процессоре (CLS); НЕ в теле крона |

---

## 12. Критерий завершения
Тенант с включённым флагом и настройками: ночной крон ставит джобу → процессор оценивает 3 события по порогам → при срабатывании пишет запись в `notifications` и ставит email на языке организации настроенному получателю → cooldown не даёт задвоить → всё под флагом `notifications` (off → ни UI, ни рассылки). Каналы расширяемы через `DeliveryChannel` (㉒-2 in-app, ㉓ Telegram) без переписывания ядра.

---

## 13. Известный долг / вне объёма
- In-app (Socket auth + комнаты + инбокс + bell) — ㉒-2.
- Telegram — ㉓.
- Событие «подозрительная операция» (+ утилита отклонения суммы) — позже.
- Per-user адресная доставка — позже.
- Реальная визуальная приёмка письма — staging/CI.
