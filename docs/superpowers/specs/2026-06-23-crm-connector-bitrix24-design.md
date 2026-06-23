# ⑯a CRM-интеграция: абстракция `CrmConnector` + Битрикс24 (дизайн)

**Дата:** 2026-06-23
**Роадмап:** Ф4, пункт ⑯a (CRM-интеграции, волна 1). §4.11 — абстракция перед коннектором.
**Флаг:** `crm_integration` (off по умолчанию).
**Статус:** автономное исполнение роадмапа (брейншторм-решения взяты из роадмап-спеки
`2026-05-27-fintablo-planfact-parity-roadmap.md`, §4.11 / ⑯a; микрорешения — мои).

---

## 1. Контекст и границы (из роадмапа)

⑯ — это **CRM-ИНТЕГРАЦИИ**, а НЕ построение CRM внутри Bigfin. Явно (роадмап):
- «Разработка собственной CRM Bigfin как продукта — это другой проект».
- ⑯a НЕ входит: двунаправленная синхронизация; CRM-функционал внутри Bigfin (задачи, воронка лидов).
- §4.11: «Перед написанием ⑯a сначала выделяется интерфейс `CrmConnector` с базовыми
  операциями: `fetchDeals`, `fetchContacts`, `mapDealToBigfin`, `handleWebhook`».
- ⑯a Scope: REST API Битрикс24, односторонняя синхронизация **Битрикс → Bigfin**, маппинг
  «CRM-сделка ↔ Bigfin-сделка», «CRM-контакт ↔ Bigfin-контрагент», импорт CAC в ⑮.
- Критерий завершения: подключить аккаунт Битрикс24 → видеть импортируемые сделки в Bigfin →
  прогрузить CAC в ⑮.

## 2. Цель этого PR (⑯a ядро)

Построить **провайдер-агностичную абстракцию `CrmConnector`** (§4.11) + первую реализацию
**Битрикс24** + движок синхронизации, под флагом `crm_integration`. Живой тест с реальным
аккаунтом Битрикс отложен (нет аккаунта — как Telegram-бот в ㉓): статически тестируется чистый
маппинг и оркестрация синхронизации.

## 3. Архитектура

```
Bitrix24Connector (implements CrmConnector)
   │  fetchContacts()  ← axios crm.contact.list → mapBitrixContact (чистая)
   │  fetchDeals()     ← axios crm.deal.list    → mapBitrixDeal (чистая)
   ▼  канонические CrmContact[] / CrmDeal[]
CrmSyncService (оркестрация)
   │  upsert контактов: link есть? → пропустить : создать Customer (CreateCustomer) + записать link
   │  upsert сделок:    link есть? → пропустить : создать Deal (CreateDeal, contactId по link) + link
   ▼
crm_sync_links (connector_key, external_id, entity_type, entity_id)  ← дедуп/идемпотентность
```

### Канонические типы (провайдер-агностичные)

```ts
interface CrmContact {
  externalId: string;
  displayName: string;
  inn: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
}
interface CrmDeal {
  externalId: string;
  name: string;
  amount: number | null;            // → Deal.costEstimate
  contactExternalId: string | null; // связь со своим CrmContact
  closedAt: string | null;          // → Deal.deadline (если есть)
}
interface CrmConnector {
  readonly key: string;             // 'bitrix24'
  isConfigured(): Promise<boolean>; // webhook-URL сохранён
  fetchContacts(): Promise<CrmContact[]>;
  fetchDeals(): Promise<CrmDeal[]>;
}
```

### Реестр

`CrmConnectorRegistry` — `Record<string, CrmConnector>` по `key` (зеркалит реестр каналов
процессора уведомлений). Активный коннектор берётся из настроек (`active_connector`).

### Хранение учётных данных (per-tenant Settings, как Telegram)

`CrmSettingsService` (`SETTINGS_PROVIDER`, group `crm`): ключи `active_connector`,
`bitrix24_webhook_url` (входящий webhook-URL Битрикс24 содержит токен — простейшая аутентификация,
без OAuth для MVP). `connect(webhookUrl)` валидирует URL пробным вызовом, сохраняет; `disconnect()`
очищает.

### Маппинг Битрикс24 (чистые функции, TDD)

REST Битрикс24 стабилен и документирован:
- `crm.contact.list` → `ID`, `NAME`+`LAST_NAME`/`COMPANY_TITLE`, `EMAIL[]`, `PHONE[]`, `UF_*` (ИНН в польз. поле).
- `crm.deal.list` → `ID`, `TITLE`, `OPPORTUNITY` (сумма), `CONTACT_ID`, `CLOSEDATE`, `STAGE_ID`.

`mapBitrixContact(raw): CrmContact`, `mapBitrixDeal(raw): CrmDeal` — чистые, легко тестируются
фикстурой сырого JSON Битрикс.

## 4. Изменения в данных

Аддитивная **tenant**-миграция (`.ts`, с `down()`): таблица `crm_sync_links`
(`connector_key` string, `external_id` string, `entity_type` enum('contact','deal'),
`entity_id` integer unsigned, `created_at`/`updated_at`, **unique(connector_key, external_id, entity_type)**).
Никаких колонок на `projects`/`contacts` — связь во внешней таблице (идемпотентность импорта).

## 5. Объём по фазам ⑯

- **⑯a (этот PR):** абстракция `CrmConnector` + реестр + `crm_sync_links` + `CrmSyncService` +
  Битрикс24-коннектор (маппинг TDD, fetch через axios, gated) + Settings connect/disconnect +
  эндпоинты + флаг. CAC-импорт — минимальный задел (см. §6). Фронт — секция «Битрикс24» в настройках
  (URL + кнопка «Синхронизировать»).
- **⑯b amoCRM / ⑯c собственная CRM** — новые реализации `CrmConnector` поверх готовой абстракции.

## 6. CAC-импорт в ⑮ (минимально)

Битрикс не даёт прямой «расход на маркетинг». MVP: посчитать число импортированных НОВЫХ сделок
по месяцу закрытия → опционально записать в `marketing_monthly.new_customers` для существующего
канала. Полноценный CAC (расход÷клиенты) — follow-up (нужен источник расхода). В ⑯a — НЕ обязательно
для критерия (критерий = «видеть сделки + прогрузить CAC»); оставляю хук, помечаю follow-up.

## 7. Тестирование

- **Юнит (TDD):** `mapBitrixContact`/`mapBitrixDeal` (фикстуры сырого JSON: имя из NAME+LAST_NAME
  или COMPANY_TITLE; сумма OPPORTUNITY→number; пустые поля→null; ИНН из UF-поля).
- **Юнит:** дедуп/идемпотентность — `CrmSyncService` с **fake-коннектором** (in-memory), upsert не
  задваивает при повторном прогоне (по `crm_sync_links`), связывает сделку с контактом.
- Статическая приёмка: `pnpm typecheck` (3 пакета), серверные тесты зелёные, lang-check, ru-review.
- **Живой тест отложен** (нужен реальный аккаунт Битрикс24).

## 8. Anti-scope

- Двунаправленная синхронизация (Bigfin → Битрикс).
- OAuth-поток Битрикс (MVP — входящий webhook-URL).
- CRM-функционал внутри Bigfin (лиды/задачи/воронка).
- Реалтайм-webhook от Битрикс (MVP — pull по кнопке; `handleWebhook` — задел интерфейса для ⑯c).
- Полный CAC (расход÷клиенты) — follow-up.
