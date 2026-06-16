# ㉓ Telegram-канал доставки уведомлений — дизайн

**Дата:** 2026-06-16
**Контекст:** ㉒-1 (движок уведомлений: крон + email за флагом `notifications`) реализован и в `develop` ([PR #81](https://github.com/aiprocadm/bigfin/pull/81)). Шов `DeliveryChannel` заложен в ㉒-1 именно под добавление каналов. ㉓ — второй канал доставки поверх того же движка; in-app инбокс (㉒-2) и прочие каналы графтятся позже тем же приёмом.
**Тип:** дизайн-спека (вход для плана реализации).
**Флаг:** существующий `notifications` (off). Отдельный флаг не вводится — Telegram это канал той же фичи.

> Брейнсторм-решения основателя (2026-06-16): (1) **свой бот у каждой организации** (токен в настройках), не общий SaaS-бот; (2) привязка чата — **авто через `getUpdates`** (не ручной ввод chat_id, не webhook); (3) транспорт — **прямые HTTPS-вызовы через `axios`** (без библиотек вроде telegraf).

---

## 1. Модель подключения (на уровне организации)

Одна связка «бот + чат» на организацию. Хранится в `SettingsStore` (group `notifications`), как `recipient_email`/`cooldown_hours` в ㉒-1:

| Ключ | Значение |
|---|---|
| `telegram_bot_token` | Токен бота от @BotFather (секрет). |
| `telegram_chat_id` | Куда слать — `chat_id` (личка владельца или групповой чат; для Telegram это одинаковая строка/число). |

Поле `channels` у каждого `notification_preferences`-ряда уже массив (`['email']`). Telegram добавляется значением `'telegram'` → клиент может включить разные каналы на разные события (напр., кассовый разрыв в email+telegram, просрочку только в telegram).

**Подключение считается активным**, когда заданы оба ключа (`telegram_bot_token` И `telegram_chat_id`).

---

## 2. Flow привязки (новые эндпоинты)

### `POST /notifications/telegram/connect { botToken }`
1. Сохранить `telegram_bot_token` в настройки.
2. Вызвать `getUpdates` этого бота (axios).
3. Чистая функция `extractChatId(updatesResponse)` → `chat_id` последнего сообщения или `null`.
4. Если `null` → `ServiceError(TELEGRAM_NO_CHAT)` («Напишите боту /start в Telegram и повторите»).
5. Сохранить `telegram_chat_id`.
6. Отправить подтверждение `sendMessage` → «✅ Bigfin подключён. Сюда будут приходить уведомления.» (на языке организации).
7. Вернуть `{ connected: true }`. **Токен и chat_id наружу не отдаются.**

Пользовательский сценарий: создать бота в @BotFather → скопировать токен → написать боту `/start` → вставить токен в Bigfin и нажать «Подключить».

### `POST /notifications/telegram/disconnect`
Очистить `telegram_bot_token` и `telegram_chat_id`. Вернуть `{ connected: false }`.

### `GET /notifications/preferences` (дополнение)
К существующему ответу добавляется `telegram: { connected: boolean }`. Токен/chat_id НИКОГДА не возвращаются.

---

## 3. Переработка диспетчера каналов (улучшение шва ㉒-1)

**Проблема:** процессор ㉒-1 жёстко зовёт `email.deliver(candidate, recipient)` — адресация живёт в процессоре, поэтому второй канал туда не встроить чисто.

**Решение:** обобщить интерфейс так, чтобы канал сам владел своей адресацией:

```ts
export interface DeliveryChannel {
  readonly key: string;                          // 'email' | 'telegram'
  isConfigured(): Promise<boolean>;              // канал сам знает, настроен ли он
  deliver(candidate: Candidate): Promise<void>;  // адрес канал берёт сам (из настроек/CLS)
}
```

- `EmailChannel` дорабатывается: `isConfigured()` = есть recipient (через текущий `resolveRecipient`/настройки); `deliver(candidate)` сам читает email (раньше его передавал процессор). Текст по-прежнему через `OrganizationI18nService`.
- `Candidate` получает опциональное поле `channels?: string[]`. Процессор проставляет его из `preference.channels` при сборке кандидатов; `selectToFire` пропускает объекты как есть (поле сохраняется).
- **Процессор:** строит реестр `Map<key, DeliveryChannel>` (`email`, `telegram`). Для каждого `toFire`-кандидата перебирает `candidate.channels`; для каждого ключа берёт канал из реестра, проверяет `isConfigured()`, вызывает `deliver` в `try/catch`. Успешные ключи пишутся в `channels_sent`. Падение одного канала не мешает другим.

Так добавление 3-го канала (㉒-2 in-app) не потребует правок процессора — только новый класс-стратегия + регистрация.

---

## 4. Транспорт (прямые HTTPS через axios)

`axios ^1.6.0` уже прямая зависимость сервера (прецедент — `LoopsEvents.subscriber.ts`). Новых зависимостей нет.

- **`TelegramApiService`** — тонкая обёртка:
  - `getUpdates(token): Promise<any>` → `GET https://api.telegram.org/bot{token}/getUpdates`.
  - `sendMessage(token, chatId, text): Promise<void>` → `POST .../bot{token}/sendMessage` с `{ chat_id, text }`.
  - Маппинг ошибок Telegram (401 → invalid token; 409 → webhook занят) в `ServiceError`.
- **`TelegramChannelService implements DeliveryChannel`** (`key='telegram'`):
  - `isConfigured()` = в настройках есть token И chat_id.
  - `deliver(candidate)` — собирает текст через `OrganizationI18nService` (те же ключи `notifications.<event>.title/body` + футер), формат **простой текст** `title\n\nbody\n\nfooter` (без `parse_mode` — без возни с экранированием в MVP), читает token+chat_id из настроек, шлёт через `TelegramApiService`.

---

## 5. Ошибки, безопасность, тесты

**Ошибки connect:**
| Код | Когда | Сообщение (RU) |
|---|---|---|
| `TELEGRAM_INVALID_TOKEN` | Telegram вернул 401 | «Неверный токен бота. Проверьте токен от @BotFather.» |
| `TELEGRAM_NO_CHAT` | `getUpdates` пуст | «Напишите боту /start в Telegram и повторите подключение.» |
| `TELEGRAM_WEBHOOK_SET` | Telegram вернул 409 | «У бота уже настроен webhook — `getUpdates` недоступен.» |

**Доставка:** если token/chat_id отсутствуют → `isConfigured()=false`, канал тихо пропускается (логируется). Ошибка отправки одного канала ловится `try/catch`, не блокирует остальные.

**Безопасность:** токен хранится в tenant-настройках (БД, плейнтекст) — принимаемый риск MVP: бот принадлежит самой организации, радиус поражения ограничен её ботом. Токен **не логируется** и **не возвращается** ни в одном API-ответе.

**Тесты:**
- Чистая `extractChatId` (unit, без сети): пустой ответ → `null`; несколько апдейтов → берёт последний `message.chat.id`; личка vs группа (отрицательный id группы).
- `TelegramApiService` / `TelegramChannelService` — мок axios (лёгкий), проверка формы вызова и маппинга ошибок.
- Диспетчер каналов в процессоре — кандидат с `channels:['email','telegram']` → оба настроенных канала вызваны; ненастроенный пропущен; `channels_sent` = успешные.
- **Живая отправка** требует реального бот-токена → проверяется на staging (как email в ㉒-1, где SMTP-заглушка локально). Локально проверяется бутстрап модуля + форма вызовов.

---

## 6. Фронтенд

- **Страница настроек уведомлений** (`NotificationsSettingsPage`) — новая секция «Telegram»:
  - Если не подключено: поле ввода токена + кнопка «Подключить» + краткая инструкция (создать бота в @BotFather, написать /start).
  - Если подключено: статус «Подключено ✅» + кнопка «Отключить».
  - В чек-боксах каналов на каждое событие появляется «Telegram» — **только когда подключено**.
- **Хуки:** `useConnectTelegram()` (POST connect, инвалидирует preferences), `useDisconnectTelegram()` (POST disconnect, инвалидирует).
- Все строки — через `intl.get('notifications.telegram.*')`, парность en+ru.

---

## 7. Файлы

**Сервер — новое** (`modules/Notifications/`):
- `delivery/TelegramApi.service.ts`
- `delivery/TelegramChannel.service.ts`
- `commands/ConnectTelegram.service.ts` (connect + disconnect)
- `utils/extractChatId.ts` (+ `.spec.ts`)

**Сервер — правки:**
- `delivery/DeliveryChannel.ts` (интерфейс v2: `isConfigured` + `deliver(candidate)`)
- `delivery/EmailChannel.service.ts` (реализовать `isConfigured`, адресацию внутрь)
- `jobs/NotificationEvaluation.processor.ts` (реестр каналов + диспетч-цикл)
- `utils/selectToFire.ts` (`Candidate.channels?`)
- `NotificationsSettings.service.ts` (читать/возвращать telegram-настройки + `isTelegramConnected`)
- `commands/UpdateNotificationPreferences.service.ts` (без изменений логики; telegram-настройки идут через connect/disconnect)
- `queries/GetNotificationPreferences.service.ts` (вернуть `telegram:{connected}`)
- `Notifications.controller.ts` (POST telegram/connect, telegram/disconnect)
- `Notifications.application.ts` (делегирование)
- `Notifications.module.ts` (регистрация `TelegramApiService`, `TelegramChannelService`, `ConnectTelegramService`)
- `constants.ts` (ключи настроек telegram, `ERRORS.TELEGRAM_*`)
- `i18n/{en,ru}/notifications.json` (подтверждение подключения + футер telegram, при необходимости)

**Фронт:**
- `containers/Notifications/NotificationsSettingsPage.tsx` (+ schema) — секция Telegram
- `hooks/query/notifications.tsx` — connect/disconnect хуки
- `lang/{en,ru}/index.json` — ключи `notifications.telegram.*`

---

## 8. Что НЕ входит в ㉓ (anti-scope / YAGNI)

- Интерактивный бот с командами/диалогами (только исходящая доставка + один `getUpdates` при привязке).
- Webhook-приём входящих (выбран `getUpdates`).
- Несколько чатов/получателей на организацию (один chat_id; per-user адресация — территория ㉒-2 in-app).
- Шифрование токена at-rest (принятый риск MVP).
- Telegram-форматирование (Markdown/HTML) — простой текст.
- Общий SaaS-бот (выбран per-org).
