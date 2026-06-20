# In-app уведомления (㉒-2) — дизайн

> **Roadmap:** ㉒-2 «In-app уведомления». Продолжение блока уведомлений после
> ㉒-1 (email, PR #81) и ㉓ (Telegram, PR #83).
> **Дата:** 2026-06-20. **Ветка:** `feat/in-app-notifications`.

## Цель

Показать пользователю **внутри приложения** уведомления, которые система уже
сохраняет в таблице `notifications` (кассовый разрыв, низкий остаток, просрочка).
Колокольчик в шапке со счётчиком непрочитанных + выпадающий список последних
уведомлений с персональной отметкой «прочитано». За существующим флагом
`Features.NOTIFICATIONS`: если уведомления выключены — колокольчика нет.

## Контекст (что уже есть)

Блок уведомлений ㉒-1/㉓ уже смержен в `develop`:

- Таблица `notifications` (tenant-схема, миграция
  `20260615120100_create_notifications_table.ts`) сохраняет **каждое**
  сработавшее уведомление: `event_type`, `title`, `body`, `dedup_key`,
  `payload`, `fired_at`, `read_at` (org-level, **не используется**),
  `user_id` (nullable, **не заполняется**), `channels_sent`.
- `NotificationEvaluationProcessor` (BullMQ, по cron) прогоняет эвалуаторы
  `cash_gap` / `low_balance` / `overdue`, вставляет строку `notifications` и
  доставляет в каналы `email` / `telegram`.
- Контроллер `NotificationsController` отдаёт только `preferences` и
  `telegram/connect|disconnect`. **API чтения уведомлений нет.**
- Фронт: `hooks/query/notifications.tsx` (preferences + telegram),
  `NotificationsSettingsPage.tsx`.

**Вывод:** ㉒-2 — это read-модель поверх уже сохраняемых строк. Добавляем
персональный статус прочтения, API чтения/отметки и колокольчик. Эвалуаторы,
настройки, каналы доставки **не трогаем**.

## Принятые решения

| Вопрос | Решение |
|---|---|
| Модель «прочитано» | **Персональная** (на пользователя), join-таблица `notification_reads` |
| Источник ленты | **Вся история** `notifications`, всегда; in-app не является каналом |
| UI | **Колокольчик + выпадающий список** в шапке |
| Обновление счётчика | **Поллинг** `unread-count` каждые ~60с (react-query `refetchInterval`) |
| Гейтинг | Существующий флаг `Features.NOTIFICATIONS` |

## Архитектура

```
cron → evaluator → notifications row  (как сейчас, не трогаем)
                         │
        GET /notifications              → список + per-user read flag
        GET /notifications/unread-count → число (поллинг 60с)
        PUT /notifications/:id/read     → отметить одно
        PUT /notifications/read-all     → отметить всё
                         │
   notification_reads (user_id, notification_id, read_at)  ← новое
```

Непрочитанные для пользователя = `notifications` LEFT JOIN `notification_reads`
по текущему `userId`, где read-строки нет.

## Бэкенд

### Миграция (tenant)

`packages/server/src/database/tenant/migrations/<ts>_create_notification_reads_table.ts`

```
notification_reads
  id               increments
  notification_id  integer, index            (→ notifications.id)
  user_id          integer, index            (system users.id; FK между схемами не ставим)
  read_at          dateTime, notNullable
  timestamps()
  UNIQUE (notification_id, user_id)           ← идемпотентность + индекс джойна
```

`down()`: `dropTableIfExists('notification_reads')`. Прогон
`latest → rollback → latest` — на CI/staging (локально БД может отсутствовать).

> FK между схемами не ставим намеренно: `notifications` — tenant, `users` —
> system. Целостность user_id обеспечивается на уровне приложения (текущий
> залогиненный пользователь).

### Модель

`packages/server/src/modules/Notifications/models/NotificationRead.model.ts` —
Objection, tenant-scoped. `relationMappings`: `notification` → `Notification`.

> **Грабля (из памяти проекта):** в `relationMappings` использовать только
> **относительные** пути в `require()`, без алиаса `@/` — Nest не переписывает
> строку, иначе runtime `MODULE_NOT_FOUND`.

### Сервис

`packages/server/src/modules/Notifications/queries/InAppNotifications.service.ts`.
Текущий `userId` — из `TenancyContext` (`cls.get('userId')`).

- `list({ limit = 20 })` — последние N `notifications` по `fired_at desc`;
  LEFT JOIN `notification_reads` по `userId` → к каждой добавить `read: boolean`.
- `unreadCount()` — count `notifications` без read-строки для `userId`.
- `markRead(id)` — upsert в `notification_reads`
  (`INSERT ... ON CONFLICT (notification_id, user_id) DO NOTHING`). Если
  `notification` с таким id нет — 404.
- `markAllRead()` — вставить read-строки для всех ещё непрочитанных текущим
  пользователем (idempotent через тот же UNIQUE).

### Контроллер

4 новых метода в существующий `NotificationsController`. Гард
`AuthorizationGuard` (как у класса), **без** `RequirePermission('manage','all')`
— персональную ленту видит любой залогиненный пользователь.

```
GET /notifications              → { notifications: [{ id, eventType, title, body, payload, firedAt, read }] }
GET /notifications/unread-count → { count }
PUT /notifications/:id/read     → { success: true }
PUT /notifications/read-all     → { success: true }
```

### Тесты (Jest)

`InAppNotifications.service.spec.ts`:
- `list` помечает `read` верно (прочитанное → true, остальное → false).
- `unreadCount` исключает прочитанные текущим пользователем.
- `markRead` идемпотентен (двойной вызов не падает и не дублирует строку).
- `markAllRead` обнуляет счётчик непрочитанных.

## Фронтенд

### Query-хуки (дополнить `hooks/query/notifications.tsx`)

- `useNotifications()` — `GET /notifications`.
- `useUnreadCount()` — `GET /notifications/unread-count`, `refetchInterval:
  60_000`, `enabled` завязан на флаг фичи (нет фичи → нет поллинга).
- `useMarkNotificationRead()` / `useMarkAllNotificationsRead()` — `PUT`-мутации;
  `onSuccess` инвалидирует **оба** ключа (список + счётчик), чтобы бейдж и
  содержимое не рассинхронились.

### Компоненты (`containers/Notifications/InApp/`)

- `NotificationBell.tsx` — иконка в шапке + бейдж со счётчиком (если > 0).
  Blueprint `Popover` по клику. Монтируется в `DashboardTopbar.tsx` рядом с
  существующими иконками. Рендерится только если `Features.Notifications`
  доступен.
- `NotificationsList.tsx` — внутри поповера: последние 20; у каждого `title`,
  `body`, относительное время (`fired_at`); непрочитанные визуально выделены.
  Кнопка «Прочитать всё» сверху; пусто-состояние «Нет уведомлений».
- Клик по элементу → `markRead(id)`.

### i18n

Ключи `notifications.inapp.*` (заголовок, «Прочитать всё», «Нет уведомлений»
и пр.) — парно EN+RU. После правок: `node packages/webapp/scripts/lang-check.js`
+ RU-ревью сабагентом `ru-translation-reviewer`.

## Обработка ошибок

- `markRead` несуществующего id → 404 (NestJS `NotFoundException`).
- Повторная отметка (гонка, повторный клик) → no-op на уровне БД (UNIQUE +
  `DO NOTHING`), 200.
- Сбой запроса на фронте → бейдж/список остаются прежними (react-query кэш),
  тихих ложных «прочитано» нет (оптимистично состояние не меняем до `onSuccess`).

## Анти-скоуп (НЕ делаем в MVP)

- Реалтайм (WebSocket/SSE).
- Отдельная страница `/notifications` с пагинацией (в выпадашке фикс. 20).
- Deep-link/переход по `payload`.
- Группировка, фильтры, поиск.
- Звук, desktop/browser push.
- Канал `in_app` в настройках (лента = вся история, не зависит от каналов).
- Изменение эвалуаторов, каналов доставки, cron, существующих настроек.

## Критерии приёмки

- `pnpm --filter @bigfin/server test` — сервис-спеки зелёные.
- `pnpm typecheck` — 3 пакета, exit 0.
- `node packages/webapp/scripts/lang-check.js` — парность.
- RU-ревью ключей `notifications.inapp.*` — без замечаний.
- Ручная приёмка (staging/CI):
  - Флаг `notifications` **off** → колокольчика нет, поллинга нет.
  - Флаг **on** → колокольчик виден; счётчик = числу непрочитанных.
  - Открыть выпадашку, «Прочитать всё» → счётчик 0, при перезагрузке остаётся 0.
  - Второй пользователь той же организации видит свой счётчик независимо.
  - Миграция `latest → rollback → latest` зелёная на CI.
