# Русификация, этап 3 «Письма клиентам» — план

**Дата:** 2026-06-13
**Ветка:** `feat/russification-stage-3` (поверх этапа 2)
**Спека:** `docs/superpowers/specs/2026-06-11-full-russification-design.md` (раздел «Этап 3»)
**Решение основателя по объёму:** письма клиентам (на языке организации) **И** системные письма (на русском). Полный русский путь пользователя.

## Что показала разведка (2 параллельных Explore)

- **Письма клиентам (4)** — Invoice / Estimate / Receipt / PaymentReceived — рендерятся из **React `@bigfin/email-components`** через сервисы `Get*MailTemplate.service.ts`. Лейблы задаются **захардкоженными строками в трансформерах** `Get*MailAttributes.transformer.ts` (напр. `subtotalLabel() { return 'Subtotal'; }`). Темы/тела — константы `DEFAULT_*_MAIL_SUBJECT/CONTENT` в `*/constants.ts`, заполняются через `formatMailOptions` (Mustache).
- **Системные письма (3)** — ResetPassword / SignupVerify / UserInvite — это Mustache `packages/server/static/mail/*.html` + захардкоженные темы. Контекста организации нет (pre-tenant) → на русском по умолчанию.
- Все письма отправляются **фоновыми задачами BullMQ**; бизнес-письма прокидывают `organizationId` в задачу и ставят в CLS (`@UseCls()`), поэтому язык организации доступен.

## Доказанный механизм (де-рискнут на эталоне «счёт»)

1. **Форматтер nestjs-i18n = `string-format`.** Проверено эмпирически: при передаче `args` он **затирает несопоставленные `{токены}` в пустоту**, а вызывается **только если args переданы** (i18n.service.js:139). **Правило:** перевод лейблов/тем/тел вызывать **БЕЗ `args`** → токены (`{invoiceNumber}`, `{Customer Name}`) сохраняются для последующей подстановки React `.replace()` / Mustache.
2. **Язык организации в трансформере — бесплатно:** `this.context.organization` имеет тип `TenantMetadata` с полем `language`. Трансформер: `this.context.i18n.t(key, { lang: this.context.organization?.language ?? 'en' })`. Query-сервис менять не нужно.
3. **Язык организации в send-сервисе:** инжектить `OrganizationI18nService` (этап 2), вызывать `await orgI18n.translate(key)` (без args). Сервис переведён в **singleton** (обе зависимости — синглтоны, организация из CLS), поэтому инъекция не «всплывает» request-scope.
4. **Ключи** — плоские с точками (`"label.subtotal"`, `"invoice.subject"`) в `packages/server/src/i18n/{en,ru}/mail.json`, как существующие `account.json`/`audit_log.json`.

## Работы

### Блок A — Счёт (Invoice) — ЭТАЛОН, ГОТОВ ✅
`mail.json` (label.*, invoice.*), `GetInvoicePaymentMailAttributes.transformer.ts` (8 лейблов → i18n), `SendInvoiceInvoiceMailCommon.service.ts` (subject/body → orgI18n). Тест `mail-translations.spec.ts` (4 кейса). tsc/parity/тесты зелёные. Находка: reminder-константы счёта мёртвые (не используются) — не трогаем.

### Блок B — Смета (Estimate), блок C — Квитанция (Receipt), блок D — Уведомление об оплате (PaymentReceived)
Тот же паттерн, что A. Для каждого: лейблы трансформера → `mail.json` (estimate.*/receipt.*/payment.*), subject/body send-сервиса → orgI18n. Параллельно (разные модули, файлы не пересекаются). Общий `mail.json` ключи добавляет координатор (агенты возвращают предложенные пары en+ru) — как на этапе 1.

### Блок E — Системные письма (на русском)
ResetPassword / SignupVerify / UserInvite: перевести видимый текст в `static/mail/*.html` и темы (`AuthMailMessages.esrvice.ts`, `SendInviteUsersMailMessage`). Без org-контекста — русский по умолчанию. (Отдельный механизм; возможно отдельный заход.)

## Приёмка
- `pnpm typecheck` (3 пакета) чисто.
- `node packages/server/scripts/i18n-parity-check.js` — парность серверного словаря.
- Серверные тесты писем зелёные.
- ru-translation-reviewer по `mail.json`.
- (Опц.) визуальная проверка письма на локальном стеке.

## Anti-scope
- Архитектуру `email-components` (props-based) не меняем.
- PDF — этап 4 (спайк кириллицы first).
- `ar/es/sv` не трогаем.
