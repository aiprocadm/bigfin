# Bigfin — project memory for Claude Code

**Bigfin** — самостоятельный продукт российского управленческого учёта (аналог Fintablo, PlanFact). Целевая аудитория — российские предприниматели **без бухгалтерского образования**.

Основатель сам пользуется продуктом (dogfooding) — приоритет мобильности и простоте повседневных операций.

---

## Брендовое правило (BLOCKER)

- **Bigfin** — единственное допустимое название во всём: коде, UI, текстах, документации, переводах, email-шаблонах, юридических файлах.
- Исторические варианты названия (camelCase, отдельные английские слова из старой кодовой базы, кириллическая транслитерация) — **не использовать**. Всегда строго `Bigfin`.

---

## Технологии

- **Монорепо**: `lerna` + `pnpm` workspaces (см. `pnpm-workspace.yaml`)
- **Backend** (`packages/server`): NestJS 10, TypeScript, PostgreSQL через Knex, Redis, BullMQ, S3
- **Frontend** (`packages/webapp`): React 18, **Blueprint.js** (легаси) + **Radix UI / shadcn** (новый D-redesign), Webpack, Redux Toolkit, Formik (легаси) + React Hook Form (новый)
- **i18n**: `react-intl-universal` (web), `nestjs-i18n` (server)
- **Тесты**: Jest (backend), Playwright (e2e)

Shared пакеты в `shared/`: `email-components`, `pdf-templates`, `sdk-ts`, `utils`.

---

## Dev окружение

- **Node.js**: 18.16.1 — **обязательно**. Используйте `fnm use 18.16.1` или `nvm use 18.16.1` перед командами.
- **Package manager**: только `pnpm` (не `npm`, не `yarn`).
- **ОС**: Windows для локальной разработки, Ubuntu для CI, Alpine для production (Docker).
- **Локальный backend не настроен по умолчанию** — нет `.env`, нет Docker-compose. UI после авторизации не откроется. Для i18n-задач полагайтесь на `typecheck` + `lang-check.js`.

---

## Команды

```bash
# Проверка типов (все 3 пакета)
pnpm typecheck

# Парность лангов (всегда после правки lang/*.json)
node packages/webapp/scripts/lang-check.js

# Запустить только тесты RU юр-валидаторов (ИНН/КПП/БИК/ОГРН/ОГРНИП — 40 кейсов)
pnpm --filter @bigfin/server test -- src/modules/RussianLegalAttributes

# Все серверные тесты
pnpm --filter @bigfin/server test

# Production build (все пакеты)
pnpm build

# Dev режим
pnpm dev:webapp        # только фронт
pnpm dev:server        # только сервер
pnpm dev               # оба
```

Production build вебаппа делает `vite build` и требует `@tailwindcss/oxide` нативные бинарники под целевую платформу (см. **Gotchas** ниже).

---

## Миграции БД: system vs tenant (КРИТИЧНО)

Bigfin использует **две отдельные схемы**. Их путаница — **топ-источник багов**.

| Схема | Каталог | Что лежит |
|---|---|---|
| **system** | `packages/server/src/database/system/migrations/` | Данные, общие между организациями: `tenants_metadata`, `subscriptions`, `users` (auth), системные настройки |
| **tenant** | `packages/server/src/database/tenant/migrations/` | Данные, принадлежащие одной организации: `accounts`, `transactions`, `invoices`, `contacts` |

**Правило**: данные ОБЩИЕ между организациями → **system**. ВЛАДЕЕТ одна организация → **tenant**.

⚠️ `tenants_metadata` живёт в **system** схеме (часто путают).

```bash
# Создать миграцию
pnpm system:migrate:make -- --name=...
pnpm tenants:migrate:make -- --name=...

# Применить / откатить
pnpm system:migrate:latest          # / tenants:migrate:latest
pnpm system:migrate:rollback        # / tenants:migrate:rollback
```

**Не пишите миграцию без рабочей функции `down()`.** Тестируйте оба направления локально (`latest` → `rollback` → `latest`).

---

## i18n конвенции

- **Lang-файлы**: `packages/webapp/src/lang/{en,ru,ar,es,sv}/index.json`
- **Активные локали** (`SUPPORTED_LOCALES` в `AppIntlLoader.tsx`): `en` + `ru` + `ar`. RU активен (развивается для founder'а); `es`/`sv` — папки есть, но не активны (мёртвый код).
- **Парность ключей en↔ru поддерживается строго**. После каждого изменения — `node packages/webapp/scripts/lang-check.js`.
- **Новые ключи добавляются напрямую** в `lang/{en,ru}/index.json` (парно EN+RU); отдельного промежуточного `ru.json`-генератора нет.

### Паттерны в коде

- В JSX: `intl.get('key.path')` (с `import intl from 'react-intl-universal'`) — основной паттерн.
- Также легитимно: `<T id="key.path" />` (где `T` = `FormattedMessage` из `@/components`) — используется в части файлов.
- НИКОГДА: hardcoded английский текст в JSX, `placeholder`, `title`, `aria-label`, `label` props.

### Русский стиль

- Натуральный русский, **без калек**: ✅ «учёт», ❌ «аккаунтинг»; ✅ «счёт», ❌ «инвойс».
- Стандартная бухгалтерская терминология: **журнал**, **проводка**, **контрагент**, **счёт**, **оборот**, **сальдо**, **дебет**/**кредит**.
- Кнопки в императиве: «Сохранить», «Удалить», «Добавить контрагента».
- Обращение: **«вы» (с маленькой буквы)** внутри предложений. «Вы» с большой — только в личных письмах.
- В ошибках конкретика: «Не удалось сохранить счёт» лучше чем «Ошибка».

### Брендинговые исключения для i18n

Эти ключи **намеренно остаются латиницей** в `ru/index.json` (стандарт для российских SaaS):

- `email`, `customer.drawer.label.email`, `warehouse.dialog.label.email`, `branch.dialog.label.email`, `invite_user.label.email` → "Email"
- `paypal` → "Paypal", `pro` → "PRO"
- `audit_log.col_id` → "ID", `audit_log.col_ip` → "IP"
- `english` → "English" (в picker'е языки в своём скрипте, как arabic = "العربية")
- `mm_dd_yy_`, `dd_mm_yy_`, `yy_mm_dd_` → форматные спецификаторы для библиотеки дат (перевод сломает форматирование)

---

## Working rules (предпочтения основателя)

1. **Показать файл до правки** — покажите релевантный фрагмент ДО внесения изменения.
2. **Объяснять простыми словами** — основатель **не разработчик**; избегайте жаргона, разбирайте по шагам.
3. **Маленькие шаги** — одно логическое изменение за раз, без бандлинга. После каждого — пауза.
4. **Инструкция проверки и отката** — после правки: команда для верификации + способ отката (git checkout, ctrl+Z или явный revert).
5. **Не удалять без разрешения** — предложите, дождитесь подтверждения, потом удаляйте. Это касается файлов, ключей переводов, миграций.

Дополнительно:
- **Не запускать `pnpm install` без явного запроса** — известные проблемы на Windows + bcrypt.
- **Перед обзором/отчётом по PR** — `git fetch` + `gh pr list --state all`. Иначе локальные ветки выглядят несмёрженными, а PR — несуществующими.

---

## Known gotchas

- **`pnpm install` на Windows**: проблемы с bcrypt. Используется `pnpm.overrides`: `bcrypt: npm:bcryptjs@^2.4.3` (в корневом `package.json`). Не убирайте этот overrides без переноса всех `import bcrypt` на `bcryptjs`.
- **Lerna + Node**: lerna может спавнить subprocesses с системным Node (не 18). Typecheck сходит, но build/SDK gen может падать. Для генерации SDK типов используйте CI вместо локального запуска.
- **`@tailwindcss/oxide` платформенные бинарники**: D-redesign использует Tailwind 4 с Rust-движком oxide. Нативные бинарники для **win32-x64** (локально), **linux-x64-gnu** (CI Ubuntu), **linux-x64-musl** (production Alpine Docker). В корневом `package.json` указано `pnpm.supportedArchitectures` — pnpm подтянет всё нужное. После любой правки этой секции — `pnpm install` для обновления lockfile.
- **SDK regen блокер**: `pnpm run generate:sdk-types` на локали может падать (lerna запускает subprocess с Node 24, отсутствует bcrypt binding). Workaround: запускайте через GitHub workflow `Generate OpenAPI SDK Types` либо после `nvm use 18.16.1`.
- **Локальный backend не настроен**: UI после авторизации не откроется без docker-compose. Для большинства frontend-задач этого не требуется — полагайтесь на typecheck + `pnpm dev:webapp` с мокированными данными.

---

## Claude Code setup

В репозитории НЕ хранятся скиллы/хуки Claude Code (они в `~/.claude/` пользователя). Однако в репо есть **установщики**, которые их разворачивают:

- `apply-claude-automation.js` (в parent-каталоге) — устанавливает:
  - Скилл `i18n-add-string` — добавление перевода во все lang-файлы с проверкой парности.
  - Скилл `make-migration` — мастер создания миграции с правильным выбором system/tenant.
  - Сабагент `ru-translation-reviewer` — ревью RU-переводов на калькированность, термины, бренд-комплаенс.
  - PostToolUse хук `lang-check` — автозапуск `lang-check.js` после правок lang-файлов.
- `apply-block-secrets-hook.js` — PreToolUse хук, блокирующий правки `.env`, `pnpm-lock.yaml`, `*.key`, `*.pem`, `docker-compose.prod.yml`.
- MCP сервер `context7` — рекомендуется добавить: `claude mcp add --transport http context7 https://mcp.context7.com/mcp` (живая документация по NestJS, Blueprint, Radix, Stripe, BullMQ и пр.).

Откат любого пакета: `node apply-*.js --revert`.

---

## Ключевые пути

| Путь | Что |
|---|---|
| `packages/server/src/modules/RussianLegalAttributes/` | Валидаторы ИНН/КПП/БИК/ОГРН/ОГРНИП (5 валидаторов, 40 тестов) |
| `packages/server/src/database/system/migrations/` | Миграции системной БД |
| `packages/server/src/database/tenant/migrations/` | Миграции тенантной БД |
| `packages/webapp/src/lang/{en,ru,ar,es,sv}/index.json` | Файлы переводов |
| `packages/webapp/scripts/lang-check.js` | Скрипт парности EN↔RU |
| `packages/webapp/src/components/auth/` | Новый shadcn-based RU-first auth flow (D-redesign Phase 2) |
| `packages/webapp/src/components/ui/` | shadcn-примитивы (намеренно англоязычные имена компонентов — это не баг i18n) |
| `shared/sdk-ts/` | **Авто-генерируется** из OpenAPI спеки server'а. Руками не редактировать. |

---

## При генерации нового кода

- **Любая видимая пользователю строка** — через `intl.get('...')` или `<T id="..." />`. Hardcoded английский в JSX = реальный баг.
- **Новые страницы по дизайн-системе** — берите примитивы из `components/ui/` (shadcn), формы — React Hook Form + Zod (как в `ResetPasswordPage.tsx`).
- **Легаси-страницы** — Formik + Blueprint.js остаются легитимны; не переписывайте «на ходу» без явного запроса.
- **TypeScript strict** где возможно. Файлы с `// @ts-nocheck` — легаси; не добавляйте новые, но и не убирайте существующие без тестового прогона.
- **Тесты** для новой бизнес-логики на сервере — Jest spec файлы рядом с модулем. Для критичных validators обязательно (как `RussianLegalAttributes`).
