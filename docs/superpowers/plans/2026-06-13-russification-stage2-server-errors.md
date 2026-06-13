# Русификация, этап 2 «Серверные ошибки» — план

**Дата:** 2026-06-13
**Ветка:** `feat/russification-stage-2` (от свежего develop с влитым этапом 1 / PR #72)
**Спека:** `docs/superpowers/specs/2026-06-11-full-russification-design.md` (раздел «Этап 2»)

## Что показала разведка (3 параллельных агента)

1. **Парность серверных переводов уже 100%** — `packages/server/src/i18n/` содержит 32 файла en и 32 ru, **530 = 530 ключей**, недостающих нет. Оценка спеки «617 vs 614» устарела. 11 «непереведённых» значений в `audit_log.json` — намеренные шаблоны-заготовки (`{amount}`, `{name}` и т.п.), не пользовательский текст. → Переводить нечего; добавляем **скрипт-сторож парности**, чтобы не уехало в будущем.
2. **Фронт переводит ошибки по коду** — механизм «`error.type` → `intl.get(ключ)`» уже есть локально (Items/utils, UserFormDialog/utils). Центральные точки, где показывается **сырой английский** с сервера:
   - `containers/GlobalErrors/GlobalErrors.tsx:82` — хардкод-строка о подписке.
   - `containers/GlobalErrors/GlobalErrors.tsx:60` — `access_denied.message || intl.get(...)` (сырое 403-сообщение).
   - `containers/Preferences/ApiKeys/ApiKeysDataTable.tsx:40` — `error.response.data.message || intl.get(...)`.
3. **Сервер на языке организации** — вся «сантехника» есть: `TenancyContext.getTenantMetadata().language` (таблица `tenants_metadata`, system-схема) + `i18n.translate(key,{lang})` принимает явный язык. Письма/PDF сейчас на хардкод-EN (это этапы 3–4). Задел этапа 2 — тестируемый сервис-обёртка.

## Работы (3 блока, A и B независимы → параллельно)

### Блок A — Фронт: ошибки по коду (только `packages/webapp`)
- `GlobalErrors.tsx:82` → `intl.get('global_error.subscription_inactive')`; добавить ключ en+ru.
- `GlobalErrors.tsx:60` → убрать показ сырого `access_denied.message`, оставить `intl.get('global_error.you_dont_have_permissions')`.
- `ApiKeysDataTable.tsx:40` → убрать сырой `data.message`, оставить `intl.get(...)`.
- Консервативный аудит других центральных мест показа сырого серверного `message`; править только явные, остальное — в отчёт.
- `lang-check.js` зелёный после правок.

### Блок B — Сервер: i18n на языке организации (только `packages/server`)
- Новый `OrganizationAwareI18nService` (request-scoped): инжектит `I18nService` + `TenancyContext`; метод `translate(key, options?)` берёт `lang` из метаданных тенанта (fallback `en`).
- Зарегистрировать как **глобальный** провайдер (стейджи 3–4 будут потреблять: SaleInvoices/mail/PDF).
- Unit-тест: мок `TenancyContext` → проверяем, что `i18n.translate` зовётся с языком организации и с fallback при отсутствии метаданных.
- Без переписывания писем/PDF — это этапы 3–4 (anti-scope).

### Блок C — Сторож парности серверных переводов (координатор)
- `packages/server/scripts/i18n-parity-check.js` — аналог webapp `lang-check.js`: сверяет ключи en↔ru во всех файлах `src/i18n/`, падает при расхождении. (Опционально подключить в CI/хук — отдельно.)

## Приёмка
- `pnpm typecheck` (3 пакета) чисто.
- `node packages/webapp/scripts/lang-check.js` — парность веб-словаря.
- `node packages/server/scripts/i18n-parity-check.js` — парность серверного словаря.
- Серверные тесты блока B зелёные.
- Спровоцированная ошибка подписки/доступа показывается по-русски (визуальная проверка — опционально на локальном стеке).

## Anti-scope
- Не трогаем письма (этап 3) и PDF (этап 4) — только готовим сервис-обёртку.
- Не добавляем ключи в `ar/es/sv`.
- Не меняем серверный контракт кодов ошибок.
