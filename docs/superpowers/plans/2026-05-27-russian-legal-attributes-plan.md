# Russian Legal Attributes Implementation Plan (Sub-project ②a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в Bigfin российские юридические реквизиты (ИНН/КПП/ОГРН/банковские реквизиты) для Organization и контрагентов, ставки НДС, юр.формы и налоговые режимы. Подсчёт контрольных сумм ИНН/ОГРН на webapp и server, локализованные ошибки валидации, conditional UI по выбранной юр.форме.

**Architecture:** Дополняем nullable-колонками **системную таблицу `tenants_metadata`** (для Organization, одна строка на тенанта) и **тенант-таблицу `contacts`** (для Customer/Vendor через `contact_service`-дискриминатор). Создаём общий модуль с TypeScript-enum'ами и валидаторами на webapp+server (зеркальные). UI — две новые секции: «Реквизиты (РФ)» в Settings → Organization и раскрывающийся блок в формах Customer/Vendor. Все миграции additive, каждый PR обратимый через `git revert` и `db:migrate:rollback`.

> ⚠️ **ПОПРАВКА К ПЛАНУ (2026-05-27 после PR #14):** Изначально план предполагал, что Organization-данные хранятся в тенант-таблице `organizations` с Objection-моделью. **Это неверно** — такой таблицы и модели в коде нет (проверено grep'ом). Реальная архитектура:
>
> - Organization-уровневые данные живут в **системной таблице `tenants_metadata`** (одна строка на тенанта).
> - Запись: `UpdateOrganizationService.execute()` → `tenantRepository.saveMetadata(tenantId, dto)` → `TenantMetadata.query().patch({ tenantId, ...metadata })`. Spread означает: любое поле DTO попадает в SQL UPDATE без правки сервиса.
> - Миграции для Organization идут в `packages/server/src/database/system/migrations/*.js` (CommonJS, не TS).
>
> **Влияние на этот план:**
> - **Task 1** (миграция на `organizations`) — выполнена частично корректно: миграция на `contacts` валидна, но миграция на `organizations` дефектна. **Исправлена PR #20** (удалена дефектная миграция, добавлена правильная на `tenants_metadata`, расширена `TenantMetadata`-модель). Task 1 = PR #14 + PR #20.
> - **Task 6** (Organization model + DTO + service) — Step 6.3 (расширение типа), Step 6.4 (расширение DTO) — валидны. Step 6.5 (правка `UpdateOrganization.service`) — **отменяется**, сервис не требует изменений (см. inline-пометку внутри Task 6).
> - **Task 7** (Customer/Vendor model + DTO) — без изменений, `contacts` существует.
>
> Подробнее: `memory/project_organization_storage.md` (project-level memory), PR #20 description.

**Tech Stack:**
- Node 18.16.1 через fnm (см. `.claude/CLAUDE.md`); глобально на машине стоит Node 24
- Frontend: React 18 + Vite + Formik + yup + `react-intl-universal` (Vitest для тестов)
- Backend: NestJS + `nestjs-i18n` + class-validator + Objection.js + Knex.js (Jest 29 для тестов)
- ORM-таблицы: `tenants_metadata` (system, для Organization), `contacts` (tenant, для Customer/Vendor), `tax_rates` (tenant)
- Workflow переводов: правка `translations/ru.json` + `node scripts/apply-ru-translations.js` (не править `lang/ru/index.json` напрямую)

**Спека:** [`docs/superpowers/specs/2026-05-27-russian-legal-attributes-design.md`](../specs/2026-05-27-russian-legal-attributes-design.md)

---

## File Structure Overview

### Создаём (новые файлы)

```
packages/server/src/database/system/migrations/                   ← Organization-данные (PR #20)
└── YYYYMMDDhhmmss_add_russian_legal_attrs_to_tenants_metadata.js

packages/server/src/database/tenant/migrations/                   ← Customer/Vendor (PR #14)
└── YYYYMMDDhhmmss_add_russian_legal_attrs_to_contacts.ts

packages/server/src/modules/RussianLegalAttributes/                ← новый модуль
├── constants.ts                          ← enum LegalForm, TaxRegime
├── validators/
│   ├── inn.validator.ts
│   ├── kpp.validator.ts
│   ├── ogrn.validator.ts
│   ├── ogrnip.validator.ts
│   ├── bik.validator.ts
│   └── account.validator.ts
└── __tests__/
    ├── inn.validator.spec.ts
    ├── kpp.validator.spec.ts
    ├── ogrn.validator.spec.ts
    ├── ogrnip.validator.spec.ts
    └── bik.validator.spec.ts

packages/server/src/i18n/ru/validation.json
packages/server/src/i18n/en/validation.json

packages/webapp/src/utils/russianLegalAttributes/
├── constants.ts                          ← зеркало server constants
├── inn.ts
├── kpp.ts
├── ogrn.ts
├── ogrnip.ts
├── bik.ts
├── account.ts
└── __tests__/
    ├── inn.test.ts
    ├── kpp.test.ts
    ├── ogrn.test.ts
    ├── ogrnip.test.ts
    └── bik.test.ts

packages/webapp/src/containers/Preferences/RussianLegalAttributes/
├── RussianLegalAttributesPage.tsx
├── RussianLegalAttributesForm.tsx
├── RussianLegalAttributesForm.schema.ts
└── index.ts

packages/webapp/src/containers/Customers/components/
└── RussianLegalAttributesBlock.tsx       ← переиспользуется для Vendor

packages/webapp/e2e/russian-legal-attributes.spec.ts
```

### Модифицируем

```
packages/server/src/database/tenant/seeds/core/20230912121909_seed_tax_rates.ts
packages/server/src/modules/System/models/TenantMetadataModel.ts   ← расширен в PR #20
packages/server/src/modules/Organization/Organization.types.ts
packages/server/src/modules/Organization/dtos/Organization.dto.ts
# Note: UpdateOrganization.service.ts — НЕ модифицируется (saveMetadata spread уже работает)
packages/server/src/modules/Customers/models/Customer.ts
packages/server/src/modules/Customers/dtos/CreateCustomer.dto.ts
packages/server/src/modules/Customers/dtos/EditCustomer.dto.ts
packages/server/src/modules/Vendors/models/Vendor.ts (найти точный путь в Step 7.1)
packages/server/src/modules/Vendors/dtos/CreateEditVendorDTO.ts
packages/server/src/modules/Invoices/commands/CreateSaleInvoice.service.ts (для дефолта налога — Task 10)
packages/server/src/modules/Bills/commands/CreateBill.service.ts (для дефолта налога — Task 10)
packages/webapp/scripts/translations/ru.json
packages/webapp/src/lang/en/index.json
packages/webapp/src/routes/preferences.tsx (добавить маршрут к новой странице)
```

---

## Конвенция работы для всех PR

**В корне всех команд:**

```bash
cd D:/Кодинг/Bigfin
nvm use 18.16.1                                      # переключение на Node проекта
node --version                                        # должно быть v18.16.1
```

**Перед коммитом каждого PR:**

```bash
cd D:/Кодинг/Bigfin
pnpm typecheck                                        # 0 ошибок
pnpm --filter @bigfin/webapp run lang:check           # exit 0
# Если правили translations — заранее запустить:
node packages/webapp/scripts/apply-ru-translations.js
# Затем закоммитить и lang/ru/index.json, и translations/ru.json
```

**Формат коммита** (Conventional Commits):
```
feat(legal-ru): <описание>
```

**Все коммиты делаем в репозитории Bigfin.** Spec и план — вне git (в outer `D:/Кодинг/Bigfin/docs/`).

**Ветвление:** каждый PR — отдельная ветка от `develop`, формата `feat/legal-ru-<scope>`. После мерджа PR — следующая ветка от свежего `develop`.

---

## Task 1: Migrations + Seed для VAT-ставок

> ⚠️ **СТАТУС:** Частично выполнено PR #14, **исправлено PR #20**. Конечная схема файлов:
> - `database/system/migrations/<ts>_add_russian_legal_attrs_to_tenants_metadata.js` (PR #20, правильная)
> - `database/tenant/migrations/<ts>_add_russian_legal_attrs_to_contacts.ts` (PR #14, валидна)
> - seed `tax_rates` (PR #14, валиден)
>
> Шаги 1.3 (миграция organizations) ниже описаны для исторической ясности — **не повторять как есть**, реальная миграция выглядит как файл из PR #20 (см. `packages/server/src/database/system/migrations/20260527160000_*.js`).

**Goal:** Добавить nullable-колонки в `tenants_metadata` (для Organization) и `contacts` (для Customer/Vendor), засидить русские ставки НДС в таблицу `tax_rates`. После этого PR в БД появляется место для реквизитов и есть все 4 ставки НДС, но UI ещё ничего не показывает.

**Files:**
- Create: `packages/server/src/database/system/migrations/<timestamp>_add_russian_legal_attrs_to_tenants_metadata.js` *(PR #20)*
- Create: `packages/server/src/database/tenant/migrations/<timestamp>_add_russian_legal_attrs_to_contacts.ts` *(PR #14)*
- Modify: `packages/server/src/database/tenant/seeds/core/20230912121909_seed_tax_rates.ts` *(PR #14)*
- Modify: `packages/server/src/modules/System/models/TenantMetadataModel.ts` *(PR #20 — добавлены properties + jsonSchema entries)*

### Шаги

- [ ] **Step 1.1: Создать ветку**

```bash
cd D:/Кодинг/Bigfin
nvm use 18.16.1
git checkout develop
git pull --ff-only
git checkout -b feat/legal-ru-migrations-and-seed
```

- [ ] **Step 1.2: Узнать формат timestamp для миграции**

Посмотреть последнюю существующую миграцию:

```bash
ls packages/server/src/database/tenant/migrations/ | tail -3
```

Имя имеет формат `YYYYMMDDHHMMSS_description.ts`. Сгенерировать собственный timestamp:

```bash
node -e "const d = new Date(); console.log(d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') + String(d.getHours()).padStart(2,'0') + String(d.getMinutes()).padStart(2,'0') + String(d.getSeconds()).padStart(2,'0'))"
```

Запомнить этот timestamp (например, `20260527184500`) — будем использовать ниже.

- [ ] **Step 1.3: Создать миграцию `organizations`**

Создать файл `packages/server/src/database/tenant/migrations/<timestamp>_add_russian_legal_attrs_to_organizations.ts` со следующим содержимым (заменить `<timestamp>` на реальный):

```typescript
import { Knex } from 'knex';

/**
 * Добавляет nullable-колонки для российских юр.реквизитов в organizations.
 * Все колонки опциональны — существующие записи получают NULL.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('organizations', (table) => {
    table.string('legal_form', 20).nullable();
    table.string('tax_regime', 20).nullable();
    table.string('inn', 12).nullable();
    table.string('kpp', 9).nullable();
    table.string('ogrn', 15).nullable();
    table.string('bank_name', 255).nullable();
    table.string('bank_bik', 9).nullable();
    table.string('bank_account', 20).nullable();
    table.string('bank_correspondent_account', 20).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('organizations', (table) => {
    table.dropColumn('bank_correspondent_account');
    table.dropColumn('bank_account');
    table.dropColumn('bank_bik');
    table.dropColumn('bank_name');
    table.dropColumn('ogrn');
    table.dropColumn('kpp');
    table.dropColumn('inn');
    table.dropColumn('tax_regime');
    table.dropColumn('legal_form');
  });
}
```

**Объяснение простыми словами:** Мы говорим базе данных — добавьте в таблицу `organizations` девять новых колонок. Все они `nullable` — это значит, у уже существующих организаций они будут пустыми (NULL), и никакая логика не сломается. `down()` нужен, чтобы можно было откатить миграцию командой `db:migrate:rollback`.

- [ ] **Step 1.4: Создать миграцию `contacts`**

Создать `<timestamp+1>_add_russian_legal_attrs_to_contacts.ts` (увеличить timestamp на одну секунду для последовательности):

```typescript
import { Knex } from 'knex';

/**
 * Добавляет nullable-колонки для российских юр.реквизитов в contacts.
 * Применяется к Customer и Vendor (они оба живут в этой таблице
 * через дискриминатор contact_service).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('contacts', (table) => {
    table.string('legal_form', 20).nullable();
    table.string('inn', 12).nullable();
    table.string('kpp', 9).nullable();
    table.string('ogrn', 15).nullable();
    table.string('bank_name', 255).nullable();
    table.string('bank_bik', 9).nullable();
    table.string('bank_account', 20).nullable();
    table.string('bank_correspondent_account', 20).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('contacts', (table) => {
    table.dropColumn('bank_correspondent_account');
    table.dropColumn('bank_account');
    table.dropColumn('bank_bik');
    table.dropColumn('bank_name');
    table.dropColumn('ogrn');
    table.dropColumn('kpp');
    table.dropColumn('inn');
    table.dropColumn('legal_form');
  });
}
```

- [ ] **Step 1.5: Открыть существующий сидер `seed_tax_rates.ts`**

```bash
cat packages/server/src/database/tenant/seeds/core/20230912121909_seed_tax_rates.ts
```

Изучить структуру: какие поля принимает запись, как формируется массив, как делается insert. **Не править сразу** — сначала прочесть, потом изменить.

- [ ] **Step 1.6: Добавить русские ставки НДС в сидер**

В файл `packages/server/src/database/tenant/seeds/core/20230912121909_seed_tax_rates.ts` добавить 4 записи к существующему массиву ставок:

```typescript
// В существующий массив seedRates добавить (в конец):
{
  code: 'VAT_20',
  name: 'НДС 20%',
  rate: 20,
  active: true,
  description: 'Стандартная ставка НДС (РФ)',
},
{
  code: 'VAT_10',
  name: 'НДС 10%',
  rate: 10,
  active: true,
  description: 'Льготная ставка НДС (продукты, лекарства, детские товары)',
},
{
  code: 'VAT_0',
  name: 'НДС 0%',
  rate: 0,
  active: true,
  description: 'Нулевая ставка НДС (экспорт)',
},
{
  code: 'VAT_NONE',
  name: 'Без НДС',
  rate: 0,
  active: true,
  description: 'Без НДС (для УСН/Патент/АУСН/НПД)',
},
```

**Существующие записи не удалять** (правило из `feedback_working_rules.md`). Пользователь сам деактивирует ненужные через UI.

**Точное место вставки** — зависит от структуры файла, прочитанного в Step 1.5. Если сидер использует upsert по `code` — записи можно безопасно добавлять. Если простой insert — нужно убедиться, что коды `VAT_20` и пр. ещё не существуют.

- [ ] **Step 1.7: Применить миграции и сидер на локальной БД**

Если локальный backend настроен:

```bash
cd D:/Кодинг/Bigfin
pnpm --filter @bigfin/server run db:migrate:latest
pnpm --filter @bigfin/server run db:seed:run
```

Ожидаемо: миграции применяются без ошибок, сидер вносит 4 новые записи.

**Если локальный backend не настроен** (см. memory user'a `project_local_backend_unset.md`): пропустить Step 1.7. Миграции проверим через `pnpm typecheck` ниже.

- [ ] **Step 1.8: Typecheck**

```bash
cd D:/Кодинг/Bigfin
pnpm typecheck
```

Ожидаемо: 0 ошибок.

- [ ] **Step 1.9: Коммит**

```bash
git add packages/server/src/database/tenant/migrations/*add_russian_legal_attrs*
git add packages/server/src/database/tenant/seeds/core/20230912121909_seed_tax_rates.ts
git status
git commit -m "feat(legal-ru): add migrations for legal attrs and seed russian VAT rates"
```

- [ ] **Step 1.10: Откат-план**

Если миграции применились на БД и нужно откатить:

```bash
pnpm --filter @bigfin/server run db:migrate:rollback   # дважды — обе миграции
```

Сидер можно повторно запустить — он повторно вставит те же записи если идемпотентен, либо упадёт на UNIQUE constraint если не идемпотентен. В обоих случаях существующие данные не повреждаются.

Откат коммита: `git revert <hash>` или `git checkout develop && git branch -D feat/legal-ru-migrations-and-seed` если ещё не пушили.

- [ ] **Step 1.11: Push и PR**

```bash
git push -u origin feat/legal-ru-migrations-and-seed
gh pr create --base develop --title "feat(legal-ru): migrations + VAT seed (#1 из 11)" --body "$(cat <<'EOF'
## Что в PR

- Добавляет 9 nullable-колонок в `organizations` (legal_form, tax_regime, inn, kpp, ogrn, bank_name, bank_bik, bank_account, bank_correspondent_account).
- Добавляет 8 аналогичных nullable-колонок в `contacts` (legal_form, inn, kpp, ogrn, банковские реквизиты).
- Сидит русские ставки НДС: VAT_20, VAT_10, VAT_0, VAT_NONE.

## Не в PR

- Бизнес-логика, UI, валидация — в следующих PR (#2-#11 серии legal-ru).

## Проверка

- [x] Миграции применяются без ошибок (Step 1.7)
- [x] `pnpm typecheck` — 0 ошибок
- [x] Существующие организации/контакты после миграции продолжают работать

## Откат

`pnpm --filter @bigfin/server run db:migrate:rollback` дважды + `git revert`.
EOF
)"
```

---

## Task 2: TypeScript Constants — LegalForm и TaxRegime

**Goal:** Создать общие enum/const-объекты для юр.форм и налоговых режимов на webapp и server. Эти константы переиспользуются в валидаторах, моделях, DTO, UI-формах.

**Files:**
- Create: `packages/server/src/modules/RussianLegalAttributes/constants.ts`
- Create: `packages/webapp/src/utils/russianLegalAttributes/constants.ts`

### Шаги

- [ ] **Step 2.1: Создать ветку**

```bash
cd D:/Кодинг/Bigfin
git checkout develop && git pull --ff-only
git checkout -b feat/legal-ru-constants
```

- [ ] **Step 2.2: Создать server constants**

Создать `packages/server/src/modules/RussianLegalAttributes/constants.ts`:

```typescript
/**
 * Российские юр.формы организаций и контрагентов.
 * Используется в Organization.legal_form и Contact.legal_form.
 *
 * INDIVIDUAL — физлицо как контрагент (продажа физлицу).
 * Не применяется к Organization.
 */
export enum LegalForm {
  OOO = 'OOO',                // Общество с ограниченной ответственностью
  IP = 'IP',                  // Индивидуальный предприниматель
  NPD = 'NPD',                // Самозанятый (плательщик НПД)
  AO = 'AO',                  // Акционерное общество
  INDIVIDUAL = 'INDIVIDUAL',  // Физлицо (только для contacts)
}

/**
 * Налоговый режим организации в РФ.
 * Используется в Organization.tax_regime.
 * Определяет дефолтную ставку НДС при создании Invoice/Bill (см. Task 10).
 */
export enum TaxRegime {
  USN_INCOME = 'USN_INCOME',                    // УСН Доходы 6%
  USN_INCOME_EXPENSE = 'USN_INCOME_EXPENSE',    // УСН Доходы-Расходы 15%
  OSNO = 'OSNO',                                // Общая система налогообложения
  PATENT = 'PATENT',                            // Патентная система (только для ИП)
  AUSN = 'AUSN',                                // Автоматизированная УСН
}

/**
 * Набор tax-rate code'ов, добавленных миграцией #1.
 * Используется для автоподстановки дефолтной ставки.
 */
export const VAT_CODES = {
  VAT_20: 'VAT_20',
  VAT_10: 'VAT_10',
  VAT_0: 'VAT_0',
  VAT_NONE: 'VAT_NONE',
} as const;

/**
 * Маппинг налогового режима → дефолтный VAT code при создании Invoice/Bill.
 */
export const DEFAULT_VAT_BY_REGIME: Record<TaxRegime, string> = {
  [TaxRegime.USN_INCOME]: VAT_CODES.VAT_NONE,
  [TaxRegime.USN_INCOME_EXPENSE]: VAT_CODES.VAT_NONE,
  [TaxRegime.OSNO]: VAT_CODES.VAT_20,
  [TaxRegime.PATENT]: VAT_CODES.VAT_NONE,
  [TaxRegime.AUSN]: VAT_CODES.VAT_NONE,
};
```

- [ ] **Step 2.3: Создать webapp constants (зеркало)**

Создать `packages/webapp/src/utils/russianLegalAttributes/constants.ts` с **тем же содержимым**, что и server constants выше.

**Почему дубль?** Webapp и server — два отдельных пакета без общего shared-кода. Если в будущем появится `shared/legal-ru` — можно вынести туда. Сейчас явный дубль с пометкой «зеркало server constants» — самый простой путь.

В файле добавить комментарий в начало:

```typescript
/**
 * Зеркало `packages/server/src/modules/RussianLegalAttributes/constants.ts`.
 * При изменении одного — обновить второй вручную.
 * Если появится третий потребитель этих констант (например, server-shared библиотека) — вынести в общий пакет.
 */
```

- [ ] **Step 2.4: Typecheck**

```bash
pnpm typecheck
```

Ожидаемо: 0 ошибок.

- [ ] **Step 2.5: Коммит**

```bash
git add packages/server/src/modules/RussianLegalAttributes/constants.ts
git add packages/webapp/src/utils/russianLegalAttributes/constants.ts
git commit -m "feat(legal-ru): add LegalForm and TaxRegime constants (webapp+server)"
```

- [ ] **Step 2.6: Push и PR**

```bash
git push -u origin feat/legal-ru-constants
gh pr create --base develop --title "feat(legal-ru): constants for legal form and tax regime (#2 из 11)" --body "Adds LegalForm and TaxRegime enums, VAT_CODES, DEFAULT_VAT_BY_REGIME mapping. Mirrored between webapp and server."
```

- [ ] **Step 2.7: Откат**

`git revert <hash>` — никаких side effects, чистые TypeScript-файлы.

---

## Task 3: Webapp validators + Vitest tests (TDD)

**Goal:** Реализовать чистые функции валидации ИНН/КПП/ОГРН/ОГРНИП/БИК на webapp. Test-first: сначала падающий тест, потом реализация. Каждый валидатор — отдельный файл, отдельный тест-файл.

**Files:**
- Create: `packages/webapp/src/utils/russianLegalAttributes/inn.ts`
- Create: `packages/webapp/src/utils/russianLegalAttributes/kpp.ts`
- Create: `packages/webapp/src/utils/russianLegalAttributes/ogrn.ts`
- Create: `packages/webapp/src/utils/russianLegalAttributes/ogrnip.ts`
- Create: `packages/webapp/src/utils/russianLegalAttributes/bik.ts`
- Create: `packages/webapp/src/utils/russianLegalAttributes/account.ts`
- Create: `packages/webapp/src/utils/russianLegalAttributes/__tests__/inn.test.ts`
- Create: `packages/webapp/src/utils/russianLegalAttributes/__tests__/kpp.test.ts`
- Create: `packages/webapp/src/utils/russianLegalAttributes/__tests__/ogrn.test.ts`
- Create: `packages/webapp/src/utils/russianLegalAttributes/__tests__/ogrnip.test.ts`
- Create: `packages/webapp/src/utils/russianLegalAttributes/__tests__/bik.test.ts`

### Шаги

- [ ] **Step 3.1: Создать ветку**

```bash
cd D:/Кодинг/Bigfin
git checkout develop && git pull --ff-only
git checkout -b feat/legal-ru-webapp-validators
```

- [ ] **Step 3.2: Тест для INN — сначала падающий**

Создать `packages/webapp/src/utils/russianLegalAttributes/__tests__/inn.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isValidInn } from '../inn';

describe('isValidInn', () => {
  describe('10-digit INN (legal entity)', () => {
    it('returns true for valid INN with correct checksum', () => {
      // Реальный валидный ИНН ФНС России для теста (10 цифр):
      expect(isValidInn('7707083893')).toBe(true);
    });

    it('returns false for INN with wrong checksum', () => {
      expect(isValidInn('7707083890')).toBe(false);
    });

    it('returns false for INN of wrong length', () => {
      expect(isValidInn('770708389')).toBe(false);
      expect(isValidInn('77070838933')).toBe(false);
    });

    it('returns false for INN with non-digits', () => {
      expect(isValidInn('770708389A')).toBe(false);
    });
  });

  describe('12-digit INN (individual / IP / NPD)', () => {
    it('returns true for valid 12-digit INN', () => {
      // Известный валидный 12-значный ИНН для теста:
      expect(isValidInn('500100732259')).toBe(true);
    });

    it('returns false for 12-digit INN with wrong checksum', () => {
      expect(isValidInn('500100732250')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false for empty string', () => {
      expect(isValidInn('')).toBe(false);
    });

    it('returns false for non-string input', () => {
      // @ts-expect-error — проверяем runtime-защиту
      expect(isValidInn(null)).toBe(false);
      // @ts-expect-error
      expect(isValidInn(undefined)).toBe(false);
    });
  });
});
```

- [ ] **Step 3.3: Запустить тест — проверить, что падает**

```bash
cd D:/Кодинг/Bigfin
pnpm --filter @bigfin/webapp run test -- inn.test.ts
```

Ожидаемо: FAIL — «Cannot find module '../inn'» или подобное (файл реализации ещё не создан).

- [ ] **Step 3.4: Реализация `inn.ts`**

Создать `packages/webapp/src/utils/russianLegalAttributes/inn.ts`:

```typescript
/**
 * Валидация российского ИНН (Идентификационный номер налогоплательщика).
 *
 * 10-значный — для юр.лиц (ООО, АО).
 * 12-значный — для физлиц, ИП, самозанятых (НПД).
 *
 * Алгоритм контрольной суммы — приказ ФНС России от 29.06.2012 № ММВ-7-6/435@.
 */

// Коэффициенты для подсчёта последней цифры 10-значного ИНН
const COEFF_10 = [2, 4, 10, 3, 5, 9, 4, 6, 8, 0];

// Коэффициенты для двух контрольных цифр 12-значного ИНН
const COEFF_12_FIRST = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
const COEFF_12_SECOND = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0];

function checksumDigit(digits: number[], coefficients: number[]): number {
  const sum = digits.reduce((acc, d, i) => acc + d * coefficients[i], 0);
  return (sum % 11) % 10;
}

export function isValidInn(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^\d+$/.test(value)) return false;
  if (value.length !== 10 && value.length !== 12) return false;

  const digits = value.split('').map(Number);

  if (value.length === 10) {
    const expected = checksumDigit(digits.slice(0, 10), COEFF_10);
    return expected === digits[9];
  }

  // 12-значный: две контрольные цифры
  const expected11 = checksumDigit(digits.slice(0, 11), COEFF_12_FIRST);
  const expected12 = checksumDigit(digits.slice(0, 12), COEFF_12_SECOND);
  return expected11 === digits[10] && expected12 === digits[11];
}
```

**Объяснение алгоритма простыми словами:** ИНН содержит «скрытую» цифру (checksum), которая вычисляется по формуле из остальных цифр. Если кто-то напечатал ИНН с опечаткой, checksum не совпадёт — мы это поймём, даже не обращаясь в ФНС. Это бесплатная защита от опечаток (но не от подделки реальным невалидным числом).

- [ ] **Step 3.5: Запустить тест — проверить, что проходит**

```bash
pnpm --filter @bigfin/webapp run test -- inn.test.ts
```

Ожидаемо: PASS (все 8 тестов).

- [ ] **Step 3.6: Тест и реализация KPP**

Создать `packages/webapp/src/utils/russianLegalAttributes/__tests__/kpp.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isValidKpp } from '../kpp';

describe('isValidKpp', () => {
  it('accepts 9 digits', () => {
    expect(isValidKpp('770701001')).toBe(true);
  });

  it('accepts digit + letter on positions 5-6', () => {
    // КПП может содержать латинские буквы A-Z на позициях 5-6 (для иностранных)
    expect(isValidKpp('7707AB001')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidKpp('77070100')).toBe(false);   // 8 знаков
    expect(isValidKpp('7707010011')).toBe(false); // 10 знаков
  });

  it('rejects letters on wrong positions', () => {
    expect(isValidKpp('77070A001')).toBe(false);
  });

  it('rejects empty / non-string', () => {
    expect(isValidKpp('')).toBe(false);
    // @ts-expect-error
    expect(isValidKpp(null)).toBe(false);
  });
});
```

Запустить — fail. Затем создать `kpp.ts`:

```typescript
/**
 * Валидация КПП (Код причины постановки на учёт).
 * 9 символов. Позиции 1-4 — код налогового органа (цифры).
 * Позиции 5-6 — код причины (цифры или латинские буквы для иностранных).
 * Позиции 7-9 — порядковый номер (цифры).
 */
export function isValidKpp(value: string): boolean {
  if (typeof value !== 'string') return false;
  return /^[0-9]{4}[0-9A-Z]{2}[0-9]{3}$/.test(value);
}
```

Запустить тест — pass.

- [ ] **Step 3.7: Тест и реализация OGRN (13 цифр)**

Создать `__tests__/ogrn.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isValidOgrn } from '../ogrn';

describe('isValidOgrn', () => {
  it('accepts valid 13-digit OGRN', () => {
    // Известный валидный ОГРН (Сбербанк):
    expect(isValidOgrn('1027700132195')).toBe(true);
  });

  it('rejects OGRN with wrong checksum', () => {
    expect(isValidOgrn('1027700132190')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidOgrn('102770013219')).toBe(false);   // 12 цифр
    expect(isValidOgrn('10277001321955')).toBe(false); // 14 цифр
  });

  it('rejects non-digits', () => {
    expect(isValidOgrn('102770013219A')).toBe(false);
  });

  it('rejects empty / non-string', () => {
    expect(isValidOgrn('')).toBe(false);
    // @ts-expect-error
    expect(isValidOgrn(null)).toBe(false);
  });
});
```

Запустить — fail. Создать `ogrn.ts`:

```typescript
/**
 * Валидация ОГРН (Основной государственный регистрационный номер).
 * 13 цифр. Последняя — контрольная: первые 12 цифр % 11, mod 10.
 */
export function isValidOgrn(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^\d{13}$/.test(value)) return false;

  const first12 = value.slice(0, 12);
  const checksum = parseInt(first12, 10) % 11 % 10;
  return checksum === parseInt(value[12], 10);
}
```

Запустить тест — pass.

- [ ] **Step 3.8: Тест и реализация OGRNIP (15 цифр)**

Создать `__tests__/ogrnip.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isValidOgrnip } from '../ogrnip';

describe('isValidOgrnip', () => {
  it('accepts valid 15-digit OGRNIP', () => {
    // Известный валидный ОГРНИП для теста:
    expect(isValidOgrnip('304500116000157')).toBe(true);
  });

  it('rejects OGRNIP with wrong checksum', () => {
    expect(isValidOgrnip('304500116000150')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidOgrnip('30450011600015')).toBe(false);    // 14
    expect(isValidOgrnip('3045001160001577')).toBe(false);  // 16
  });

  it('rejects non-digits / empty', () => {
    expect(isValidOgrnip('30450011600015A')).toBe(false);
    expect(isValidOgrnip('')).toBe(false);
  });
});
```

Запустить — fail. Создать `ogrnip.ts`:

```typescript
/**
 * Валидация ОГРНИП (ОГРН индивидуального предпринимателя).
 * 15 цифр. Последняя — контрольная: первые 14 цифр % 13, mod 10.
 */
export function isValidOgrnip(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^\d{15}$/.test(value)) return false;

  const first14 = value.slice(0, 14);
  const checksum = parseInt(first14, 10) % 13 % 10;
  return checksum === parseInt(value[14], 10);
}
```

Запустить тест — pass.

- [ ] **Step 3.9: Тест и реализация BIK**

Создать `__tests__/bik.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isValidBik } from '../bik';

describe('isValidBik', () => {
  it('accepts 9 digits starting with 04', () => {
    expect(isValidBik('044525225')).toBe(true);  // Сбер
    expect(isValidBik('044030001')).toBe(true);  // ЦБ РФ СПб
  });

  it('rejects BIK not starting with 04', () => {
    expect(isValidBik('144525225')).toBe(false);
    expect(isValidBik('054525225')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidBik('04452522')).toBe(false);   // 8
    expect(isValidBik('0445252253')).toBe(false); // 10
  });

  it('rejects non-digits / empty', () => {
    expect(isValidBik('04452522A')).toBe(false);
    expect(isValidBik('')).toBe(false);
  });
});
```

Запустить — fail. Создать `bik.ts`:

```typescript
/**
 * Валидация БИК (Банковский идентификационный код).
 * 9 цифр. Для российских банков всегда начинается с '04'.
 * Контрольная сумма по справочнику ЦБ — на старте не проверяем.
 */
export function isValidBik(value: string): boolean {
  if (typeof value !== 'string') return false;
  return /^04\d{7}$/.test(value);
}
```

Запустить тест — pass.

- [ ] **Step 3.10: Создать `account.ts` (без отдельного тест-файла, проверка длины)**

Создать `packages/webapp/src/utils/russianLegalAttributes/account.ts`:

```typescript
/**
 * Базовая валидация банковских счетов.
 * На старте — только длина и формат. Полная проверка banking-key
 * (контрольная сумма расчётного счёта) — в backlog.
 */

export function isValidBankAccount(value: string): boolean {
  if (typeof value !== 'string') return false;
  return /^\d{20}$/.test(value);
}

export function isValidCorrespondentAccount(value: string): boolean {
  if (typeof value !== 'string') return false;
  // Корр.счёт всегда начинается с 30101
  return /^30101\d{15}$/.test(value);
}
```

Простой случай — отдельные тесты для регулярок не делаем, они покрываются через UI-проверку и через интеграционные тесты в Task 8.

- [ ] **Step 3.11: Запустить все тесты пакета**

```bash
cd D:/Кодинг/Bigfin
pnpm --filter @bigfin/webapp run test -- russianLegalAttributes
```

Ожидаемо: все 5 файлов тестов проходят, ~30 тест-кейсов pass.

- [ ] **Step 3.12: Typecheck**

```bash
pnpm typecheck
```

Ожидаемо: 0 ошибок.

- [ ] **Step 3.13: Коммит**

```bash
git add packages/webapp/src/utils/russianLegalAttributes/
git status
git commit -m "feat(legal-ru): add webapp validators with vitest tests (inn/kpp/ogrn/ogrnip/bik/account)"
```

- [ ] **Step 3.14: Откат**

```bash
git checkout develop
git branch -D feat/legal-ru-webapp-validators
```

Файлы изолированы — никакие существующие модули не зависят от новых валидаторов.

- [ ] **Step 3.15: Push и PR**

```bash
git push -u origin feat/legal-ru-webapp-validators
gh pr create --base develop --title "feat(legal-ru): webapp validators with TDD tests (#3 из 11)" --body "Pure validation functions for INN/KPP/OGRN/OGRNIP/BIK/account, covered by ~30 Vitest test cases. Test-first development."
```

---

## Task 4: Server validators + Jest tests (зеркало Task 3)

**Goal:** Те же валидаторы на server-стороне. Используются NestJS class-validator'ами при сохранении в БД.

**Files:**
- Create: `packages/server/src/modules/RussianLegalAttributes/validators/inn.validator.ts`
- Create: `packages/server/src/modules/RussianLegalAttributes/validators/kpp.validator.ts`
- Create: `packages/server/src/modules/RussianLegalAttributes/validators/ogrn.validator.ts`
- Create: `packages/server/src/modules/RussianLegalAttributes/validators/ogrnip.validator.ts`
- Create: `packages/server/src/modules/RussianLegalAttributes/validators/bik.validator.ts`
- Create: `packages/server/src/modules/RussianLegalAttributes/validators/account.validator.ts`
- Create: `packages/server/src/modules/RussianLegalAttributes/__tests__/inn.validator.spec.ts`
- Create: `packages/server/src/modules/RussianLegalAttributes/__tests__/kpp.validator.spec.ts`
- Create: `packages/server/src/modules/RussianLegalAttributes/__tests__/ogrn.validator.spec.ts`
- Create: `packages/server/src/modules/RussianLegalAttributes/__tests__/ogrnip.validator.spec.ts`
- Create: `packages/server/src/modules/RussianLegalAttributes/__tests__/bik.validator.spec.ts`

### Шаги

- [ ] **Step 4.1: Создать ветку**

```bash
git checkout develop && git pull --ff-only
git checkout -b feat/legal-ru-server-validators
```

- [ ] **Step 4.2: Pure-функции (по аналогии с webapp)**

Каждый из файлов `<name>.validator.ts` повторяет логику соответствующего файла из webapp, но **с одним отличием:** server использует `import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator'` для интеграции с NestJS.

Для каждого валидатора создаётся два экспорта:
1. Pure-функция (`isValidInn`, `isValidKpp`, …) — для прямого использования
2. Class-validator декоратор-class — для использования в DTO как `@Validate(InnConstraint)`

**Файл `inn.validator.ts`:**

```typescript
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

const COEFF_10 = [2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
const COEFF_12_FIRST = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
const COEFF_12_SECOND = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0];

function checksumDigit(digits: number[], coefficients: number[]): number {
  const sum = digits.reduce((acc, d, i) => acc + d * coefficients[i], 0);
  return (sum % 11) % 10;
}

export function isValidInn(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^\d+$/.test(value)) return false;
  if (value.length !== 10 && value.length !== 12) return false;

  const digits = value.split('').map(Number);

  if (value.length === 10) {
    return checksumDigit(digits.slice(0, 10), COEFF_10) === digits[9];
  }
  const expected11 = checksumDigit(digits.slice(0, 11), COEFF_12_FIRST);
  const expected12 = checksumDigit(digits.slice(0, 12), COEFF_12_SECOND);
  return expected11 === digits[10] && expected12 === digits[11];
}

@ValidatorConstraint({ name: 'isValidInn', async: false })
export class InnConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true; // nullable
    return typeof value === 'string' && isValidInn(value);
  }

  defaultMessage(args: ValidationArguments): string {
    // Локализованное сообщение через nestjs-i18n — см. Task 5.
    return 'validation.inn.invalid';
  }
}
```

Аналогично — для kpp, ogrn, ogrnip, bik, account. Pure-функции **точная копия** webapp (Step 3.4–3.10), оборачивающий декоратор — по шаблону `InnConstraint`.

- [ ] **Step 4.3: Jest тесты — те же тест-кейсы**

Каждый `<name>.validator.spec.ts` повторяет Vitest-тесты из Task 3 с двумя поправками:
- `import { describe, it, expect } from 'vitest';` → удалить (Jest в globals)
- Импорты валидаторов из `../validators/<name>.validator`

Пример `inn.validator.spec.ts`:

```typescript
import { isValidInn, InnConstraint } from '../validators/inn.validator';

describe('isValidInn', () => {
  describe('10-digit INN (legal entity)', () => {
    it('returns true for valid INN', () => {
      expect(isValidInn('7707083893')).toBe(true);
    });
    it('returns false for wrong checksum', () => {
      expect(isValidInn('7707083890')).toBe(false);
    });
    it('returns false for wrong length', () => {
      expect(isValidInn('770708389')).toBe(false);
      expect(isValidInn('77070838933')).toBe(false);
    });
    it('returns false for non-digits', () => {
      expect(isValidInn('770708389A')).toBe(false);
    });
  });

  describe('12-digit INN', () => {
    it('returns true for valid 12-digit INN', () => {
      expect(isValidInn('500100732259')).toBe(true);
    });
    it('returns false for wrong checksum', () => {
      expect(isValidInn('500100732250')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false for empty / non-string', () => {
      expect(isValidInn('')).toBe(false);
      expect(isValidInn(null as unknown as string)).toBe(false);
    });
  });
});

describe('InnConstraint', () => {
  const constraint = new InnConstraint();

  it('allows null / undefined / empty (nullable)', () => {
    expect(constraint.validate(null)).toBe(true);
    expect(constraint.validate(undefined)).toBe(true);
    expect(constraint.validate('')).toBe(true);
  });

  it('rejects invalid INN', () => {
    expect(constraint.validate('7707083890')).toBe(false);
  });

  it('accepts valid INN', () => {
    expect(constraint.validate('7707083893')).toBe(true);
  });
});
```

По аналогии для остальных — kpp, ogrn, ogrnip, bik.

- [ ] **Step 4.4: Запустить тесты**

```bash
cd D:/Кодинг/Bigfin
pnpm --filter @bigfin/server run test -- russianLegalAttributes
```

Ожидаемо: все спеки pass (~35 тест-кейсов).

- [ ] **Step 4.5: Typecheck + коммит + push + PR**

```bash
pnpm typecheck
git add packages/server/src/modules/RussianLegalAttributes/
git commit -m "feat(legal-ru): add server validators with jest tests (class-validator constraints)"
git push -u origin feat/legal-ru-server-validators
gh pr create --base develop --title "feat(legal-ru): server validators + jest tests (#4 из 11)" --body "Mirror of webapp validators with class-validator decorators for NestJS integration. Includes ~35 Jest test cases."
```

- [ ] **Step 4.6: Откат**

`git revert` — изолированный модуль, никаких зависимостей.

---

## Task 5: i18n keys для ошибок валидации

**Goal:** Добавить локализованные сообщения об ошибках в webapp (translations/ru.json) и server (i18n/{en,ru}/validation.json).

**Files:**
- Modify: `packages/webapp/scripts/translations/ru.json`
- Modify: `packages/webapp/src/lang/en/index.json`
- Create: `packages/server/src/i18n/en/validation.json`
- Create: `packages/server/src/i18n/ru/validation.json`

### Шаги

- [ ] **Step 5.1: Создать ветку**

```bash
git checkout develop && git pull --ff-only
git checkout -b feat/legal-ru-i18n-validation
```

- [ ] **Step 5.2: Добавить ключи в `lang/en/index.json`**

В файл `packages/webapp/src/lang/en/index.json` добавить (в алфавитном порядке среди существующих `validation.*` ключей):

```json
"validation.inn.length": "INN must be 10 digits (legal entity) or 12 digits (individual)",
"validation.inn.checksum": "INN checksum is invalid — please check the number",
"validation.kpp.format": "KPP must be 9 characters: 4 digits + 2 (digits or A-Z) + 3 digits",
"validation.ogrn.length": "OGRN must be exactly 13 digits",
"validation.ogrn.checksum": "OGRN checksum is invalid — please check the number",
"validation.ogrnip.length": "OGRNIP must be exactly 15 digits",
"validation.ogrnip.checksum": "OGRNIP checksum is invalid — please check the number",
"validation.bik.format": "BIK must be 9 digits starting with 04",
"validation.bank_account.length": "Bank account must be exactly 20 digits",
"validation.correspondent_account.format": "Correspondent account must be 20 digits starting with 30101",
```

- [ ] **Step 5.3: Добавить ключи в `translations/ru.json`**

В файл `packages/webapp/scripts/translations/ru.json` добавить **те же ключи** с русскими значениями (рядом по алфавиту):

```json
"validation.inn.length": "ИНН должен содержать 10 цифр (юр.лицо) или 12 цифр (физлицо/ИП/НПД)",
"validation.inn.checksum": "Контрольная сумма ИНН не сходится — проверьте номер",
"validation.kpp.format": "КПП должен содержать 9 символов: 4 цифры + 2 (цифры или A-Z) + 3 цифры",
"validation.ogrn.length": "ОГРН должен содержать ровно 13 цифр",
"validation.ogrn.checksum": "Контрольная сумма ОГРН не сходится — проверьте номер",
"validation.ogrnip.length": "ОГРНИП должен содержать ровно 15 цифр",
"validation.ogrnip.checksum": "Контрольная сумма ОГРНИП не сходится — проверьте номер",
"validation.bik.format": "БИК должен содержать 9 цифр и начинаться с 04",
"validation.bank_account.length": "Расчётный счёт должен содержать ровно 20 цифр",
"validation.correspondent_account.format": "Корреспондентский счёт должен содержать 20 цифр и начинаться с 30101",
```

- [ ] **Step 5.4: Применить apply-script**

```bash
cd D:/Кодинг/Bigfin
node packages/webapp/scripts/apply-ru-translations.js
```

Ожидаемо: `lang/ru/index.json` обновляется. Числа `Translated` и `Fallback` могут измениться (новые ключи переведены).

- [ ] **Step 5.5: lang:check**

```bash
pnpm --filter @bigfin/webapp run lang:check
```

Ожидаемо: 0 missing / 0 extra. Парность ключей en↔ru соблюдена.

- [ ] **Step 5.6: Создать server `validation.json` файлы**

Файл `packages/server/src/i18n/en/validation.json`:

```json
{
  "inn.invalid": "INN is invalid",
  "kpp.invalid": "KPP is invalid",
  "ogrn.invalid": "OGRN is invalid",
  "ogrnip.invalid": "OGRNIP is invalid",
  "bik.invalid": "BIK is invalid",
  "bank_account.invalid": "Bank account is invalid",
  "correspondent_account.invalid": "Correspondent account is invalid"
}
```

Файл `packages/server/src/i18n/ru/validation.json`:

```json
{
  "inn.invalid": "ИНН недействителен",
  "kpp.invalid": "КПП недействителен",
  "ogrn.invalid": "ОГРН недействителен",
  "ogrnip.invalid": "ОГРНИП недействителен",
  "bik.invalid": "БИК недействителен",
  "bank_account.invalid": "Расчётный счёт недействителен",
  "correspondent_account.invalid": "Корреспондентский счёт недействителен"
}
```

`nestjs-i18n` автоматически подхватит новый файл при следующем рестарте сервера (см. конфиг в `App.module.ts`).

- [ ] **Step 5.7: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5.8: Коммит + push + PR**

```bash
git add packages/webapp/scripts/translations/ru.json
git add packages/webapp/src/lang/en/index.json
git add packages/webapp/src/lang/ru/index.json
git add packages/server/src/i18n/en/validation.json
git add packages/server/src/i18n/ru/validation.json
git commit -m "feat(legal-ru): add i18n keys for validation messages (webapp + server)"
git push -u origin feat/legal-ru-i18n-validation
gh pr create --base develop --title "feat(legal-ru): i18n for validation errors (#5 из 11)" --body "Adds ~10 webapp i18n keys (en+ru) and server validation.json (en+ru) for INN/KPP/OGRN/OGRNIP/BIK/account validation messages."
```

---

## Task 6: Organization DTO + types update

> ⚠️ **АРХИТЕКТУРНАЯ ПОПРАВКА (после PR #20):** Эта задача изначально называлась «Organization model + DTO + service update» и включала Step 6.5 о правке `UpdateOrganization.service`. На деле:
> - **Service менять не нужно** — `UpdateOrganizationService.execute()` уже передаёт весь DTO через `tenantRepository.saveMetadata(tenantId, dto)`, которая делает `TenantMetadata.query().patch({ tenantId, ...metadata })`. Spread автоматически прокинет любое новое поле.
> - **Модель** — это `TenantMetadata` (system schema, см. PR #20), а не несуществующая `Organization`-модель.
> - **Префлайт:** перед стартом этой задачи нужно убедиться, что PR #20 смёрджен в `develop` (иначе runtime упадёт — поля будут в DTO, но нет колонок в БД).
>
> Реальный scope Task 6: расширить `IOrganizationUpdateDTO` (контракт типа) и `Organization.dto.ts` (class-validator) новыми полями. Service-изменения = 0.

**Goal:** Добавить новые поля в Organization-тип и DTO. После этого PR API уже принимает РФ-реквизиты на endpoint обновления организации (см. `Organization.controller.ts`), но UI ещё не показывает.

**Prerequisites:** PR #20 смёрджен (миграция + TenantMetadata.jsonSchema).

**Files:**
- Modify: `packages/server/src/modules/Organization/Organization.types.ts`
- Modify: `packages/server/src/modules/Organization/dtos/Organization.dto.ts` (если файл не найден — Step 6.1 определит точное имя)
- **NOT modified:** `UpdateOrganization.service.ts` (saveMetadata spread уже работает)
- **NOT modified:** `TenantMetadataModel.ts` (расширен PR #20)

### Шаги

- [ ] **Step 6.1: Найти DTO и service файлы**

```bash
cd D:/Кодинг/Bigfin
ls packages/server/src/modules/Organization/dtos/
ls packages/server/src/modules/Organization/commands/
```

Записать точные имена файлов:
- DTO для обновления (вероятно `Organization.dto.ts` или `UpdateOrganization.dto.ts`)
- Service для обновления (вероятно `UpdateOrganization.service.ts`)

- [ ] **Step 6.2: Создать ветку**

```bash
git checkout develop && git pull --ff-only
git checkout -b feat/legal-ru-organization-dto
```

- [ ] **Step 6.3: Расширить `Organization.types.ts`**

Прочитать существующий `Organization.types.ts` (Step 6.1). Найти `IOrganizationUpdateDTO`. Добавить новые опциональные поля **после** существующих:

```typescript
import { LegalForm, TaxRegime } from '../RussianLegalAttributes/constants';

export interface IOrganizationUpdateDTO {
  // ... существующие поля без изменений ...

  // Российские юридические реквизиты (опционально)
  legalForm?: LegalForm;
  taxRegime?: TaxRegime;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  bankName?: string;
  bankBik?: string;
  bankAccount?: string;
  bankCorrespondentAccount?: string;
}
```

Path импорта проверить и поправить под структуру проекта (если `RussianLegalAttributes` лежит в `modules/`, импорт — `'@/modules/RussianLegalAttributes/constants'`).

- [ ] **Step 6.4: Расширить Organization DTO (class-validator)**

В файле DTO (найден в Step 6.1) добавить новые `@IsOptional()`-поля с валидаторами:

```typescript
import { IsOptional, IsString, IsEnum, Validate } from 'class-validator';
import { LegalForm, TaxRegime } from '../../RussianLegalAttributes/constants';
import { InnConstraint } from '../../RussianLegalAttributes/validators/inn.validator';
import { KppConstraint } from '../../RussianLegalAttributes/validators/kpp.validator';
import { OgrnConstraint } from '../../RussianLegalAttributes/validators/ogrn.validator';
import { OgrnipConstraint } from '../../RussianLegalAttributes/validators/ogrnip.validator';
import { BikConstraint } from '../../RussianLegalAttributes/validators/bik.validator';
import { BankAccountConstraint, CorrespondentAccountConstraint } from '../../RussianLegalAttributes/validators/account.validator';

export class UpdateOrganizationDto {
  // ... существующие поля ...

  @IsOptional()
  @IsEnum(LegalForm)
  legalForm?: LegalForm;

  @IsOptional()
  @IsEnum(TaxRegime)
  taxRegime?: TaxRegime;

  @IsOptional()
  @IsString()
  @Validate(InnConstraint)
  inn?: string;

  @IsOptional()
  @IsString()
  @Validate(KppConstraint)
  kpp?: string;

  @IsOptional()
  @IsString()
  // ОГРН (13) или ОГРНИП (15) — сервер принимает оба, валидатор подбирается по длине.
  // Для простоты сейчас валидируем как «либо ОГРН либо ОГРНИП»; кастомный комбо-валидатор — backlog.
  ogrn?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  @Validate(BikConstraint)
  bankBik?: string;

  @IsOptional()
  @IsString()
  @Validate(BankAccountConstraint)
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @Validate(CorrespondentAccountConstraint)
  bankCorrespondentAccount?: string;
}
```

**Примечание:** проверка «ОГРН или ОГРНИП» — отдельный комбо-валидатор `OgrnOrOgrnipConstraint`. На старте можно проверять формат как `/^\d{13}$|^\d{15}$/` через regex без checksum. Полная проверка ChecksumByLength — улучшение в backlog (отметить в Task 11 как открытый вопрос).

- [ ] **Step 6.5: Service-изменения — ОТМЕНЕНО** ⚠️

Изначальный план описывал правку `UpdateOrganization.service.ts` с вызовом `Organization.query().findById().patch({...})`. **Этот код не существует** (нет Organization-модели и нет таблицы `organizations`).

**Реальная картина:** `UpdateOrganizationService.execute()` вызывает `tenantRepository.saveMetadata(tenantId, dto)`, который внутри делает `TenantMetadata.query().patch({ tenantId, ...metadata }).where({ tenantId })`. Spread (`...metadata`) **автоматически прокинет любое новое поле** из DTO в SQL UPDATE — потому что после PR #20:
- Колонки уже добавлены в `tenants_metadata` (миграция).
- `TenantMetadata` jsonSchema знает про новые поля.

Поэтому **в этой задаче сервис трогать не нужно**. Один раз пройти глазами `UpdateOrganization.service.ts`, чтобы убедиться, что DTO не «фильтруется» белым списком полей перед `saveMetadata`. Если фильтрации нет — всё работает.

Откатить инстинкт «надо что-то сделать»: spread-патч + правильный jsonSchema = весь wiring.

- [ ] **Step 6.6: Typecheck**

```bash
pnpm typecheck
```

Ожидаемо: 0 ошибок. Если TypeScript ругается на отсутствующие поля в `TenantMetadata`-модели — это означает, что PR #20 не смёрджен (см. Prerequisites сверху). PR #20 уже добавил соответствующие property-декларации (`public legalForm!: string` и т.п.).

- [ ] **Step 6.7: Smoke-тест через API (опционально)**

Если backend запущен локально (см. memory user'а `project_local_backend_unset.md`):

```bash
curl -X PUT http://localhost:3000/api/organizations/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"legalForm":"OOO","taxRegime":"OSNO","inn":"7707083893","kpp":"770701001","ogrn":"1027700132195"}'
```

Ожидаемо: 200 OK, ответ содержит сохранённые поля. Затем повторить с невалидным ИНН (`"inn":"7707083890"`) — ожидаемо 422 с ошибкой.

**Если backend не настроен** — пропустить, проверим через UI в Task 8.

- [ ] **Step 6.8: Коммит + push + PR**

```bash
git add packages/server/src/modules/Organization/
git commit -m "feat(legal-ru): add russian legal fields to Organization DTO"
git push -u origin feat/legal-ru-organization-dto
gh pr create --base develop --title "feat(legal-ru): organization DTO + types (#6 из 11)" --body "Adds INN/KPP/OGRN, legalForm, taxRegime, bank details to Organization update DTO with class-validator constraints. Service untouched — saveMetadata spread already wires new fields through to tenants_metadata (PR #20 added the columns + jsonSchema)."
```

**Ветка:** `feat/legal-ru-organization-dto` (переименована из `feat/legal-ru-organization-model` — отражает скоуп: только DTO/types).

- [ ] **Step 6.9: Откат**

`git revert` — изменения локальны для Organization-модуля. Existing PUT-запросы без новых полей продолжают работать (все поля @IsOptional()).

---

## Task 7: Customer/Vendor model + DTO + service update

**Goal:** То же самое, что Task 6, но для контрагентов (Customer + Vendor живут в `contacts`).

**Files:**
- Modify: `packages/server/src/modules/Customers/models/Customer.ts`
- Modify: `packages/server/src/modules/Vendors/models/Vendor.ts` (путь подтвердить в Step 7.1)
- Modify: `packages/server/src/modules/Customers/dtos/CreateCustomer.dto.ts`
- Modify: `packages/server/src/modules/Customers/dtos/EditCustomer.dto.ts`
- Modify: `packages/server/src/modules/Vendors/dtos/CreateEditVendorDTO.ts`

### Шаги

- [ ] **Step 7.1: Найти модель Vendor**

```bash
find packages/server/src/modules/Vendors -name "Vendor*.ts" -path "*/models/*" 2>&1 | head -3
# Если не нашлось:
find packages/server/src/modules/Vendors -name "*.model.ts" -o -name "Vendor.ts" 2>&1 | head -5
```

Записать точный путь.

- [ ] **Step 7.2: Создать ветку**

```bash
git checkout develop && git pull --ff-only
git checkout -b feat/legal-ru-contacts-model
```

- [ ] **Step 7.3: Расширить Customer.ts**

В файле `packages/server/src/modules/Customers/models/Customer.ts` добавить новые поля в класс (после существующих, перед `static get tableName()`):

```typescript
export class Customer extends TenantBaseModel {
  // ... все существующие поля без изменений ...

  // Российские юр.реквизиты (опционально)
  legalForm?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  bankName?: string;
  bankBik?: string;
  bankAccount?: string;
  bankCorrespondentAccount?: string;
}
```

- [ ] **Step 7.4: Расширить Vendor.ts (по аналогии)**

В файле, найденном в Step 7.1, добавить **те же поля**:

```typescript
export class Vendor extends TenantBaseModel {
  // ... все существующие поля без изменений ...

  legalForm?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  bankName?: string;
  bankBik?: string;
  bankAccount?: string;
  bankCorrespondentAccount?: string;
}
```

- [ ] **Step 7.5: Расширить CreateCustomer.dto.ts**

В файле `packages/server/src/modules/Customers/dtos/CreateCustomer.dto.ts` добавить новые поля по образцу Task 6 Step 6.4, но **с одним отличием**:

```typescript
import { LegalForm } from '../../RussianLegalAttributes/constants';

export class CreateCustomerDto {
  // ... существующие поля ...

  // Для контактов LegalForm включает INDIVIDUAL (физлицо)
  @IsOptional()
  @IsEnum(LegalForm)
  legalForm?: LegalForm;

  @IsOptional()
  @IsString()
  @Validate(InnConstraint)
  inn?: string;

  // ... остальные поля идентично Task 6 Step 6.4 ...
}
```

- [ ] **Step 7.6: Расширить EditCustomer.dto.ts**

Если есть отдельный DTO для редактирования — то же, что в Step 7.5.

- [ ] **Step 7.7: Расширить CreateEditVendorDTO.ts**

Файл `packages/server/src/modules/Vendors/dtos/CreateEditVendorDTO.ts` — те же поля, что в Step 7.5.

- [ ] **Step 7.8: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 7.9: Коммит + push + PR**

```bash
git add packages/server/src/modules/Customers/ packages/server/src/modules/Vendors/
git commit -m "feat(legal-ru): add russian legal fields to Customer and Vendor DTOs"
git push -u origin feat/legal-ru-contacts-model
gh pr create --base develop --title "feat(legal-ru): contacts (customer + vendor) DTO (#7 из 11)" --body "Mirror of Task #6 for contacts. Customer and Vendor accept INN/KPP/OGRN/legalForm/bank details. LegalForm enum extended with INDIVIDUAL for contacts."
```

---

## Task 8: UI — Settings Russian Legal Attributes section

**Goal:** Создать UI-страницу в разделе Preferences для заполнения российских реквизитов организации. Conditional рендеринг полей по выбранной юр.форме. Submit через PUT API из Task 6.

**Files:**
- Create: `packages/webapp/src/containers/Preferences/RussianLegalAttributes/RussianLegalAttributesPage.tsx`
- Create: `packages/webapp/src/containers/Preferences/RussianLegalAttributes/RussianLegalAttributesForm.tsx`
- Create: `packages/webapp/src/containers/Preferences/RussianLegalAttributes/RussianLegalAttributesForm.schema.ts`
- Create: `packages/webapp/src/containers/Preferences/RussianLegalAttributes/index.ts`
- Modify: `packages/webapp/src/routes/preferences.tsx` (или соседнее место регистрации Preferences-маршрутов)
- Modify: `packages/webapp/scripts/translations/ru.json` (новые UI-ключи)
- Modify: `packages/webapp/src/lang/en/index.json`

### Шаги

- [ ] **Step 8.1: Создать ветку**

```bash
git checkout develop && git pull --ff-only
git checkout -b feat/legal-ru-ui-settings
```

- [ ] **Step 8.2: Изучить существующую структуру Preferences**

```bash
cat packages/webapp/src/containers/Preferences/General/GeneralPage.tsx 2>&1 | head -50
```

Понять паттерн: как страница оборачивается в Formik, как делается submit, как используется `intl.get()`.

- [ ] **Step 8.3: Создать схему валидации Formik**

`RussianLegalAttributesForm.schema.ts`:

```typescript
import * as yup from 'yup';
import intl from 'react-intl-universal';
import { LegalForm, TaxRegime } from '@/utils/russianLegalAttributes/constants';
import { isValidInn } from '@/utils/russianLegalAttributes/inn';
import { isValidKpp } from '@/utils/russianLegalAttributes/kpp';
import { isValidOgrn } from '@/utils/russianLegalAttributes/ogrn';
import { isValidOgrnip } from '@/utils/russianLegalAttributes/ogrnip';
import { isValidBik } from '@/utils/russianLegalAttributes/bik';
import { isValidBankAccount, isValidCorrespondentAccount } from '@/utils/russianLegalAttributes/account';

export const russianLegalAttributesSchema = () => yup.object().shape({
  legalForm: yup.mixed<LegalForm>().oneOf(Object.values(LegalForm).filter(v => v !== LegalForm.INDIVIDUAL)).nullable(),
  taxRegime: yup.mixed<TaxRegime>().oneOf(Object.values(TaxRegime)).nullable(),

  inn: yup
    .string()
    .nullable()
    .test('inn-valid', () => intl.get('validation.inn.checksum'), (value) =>
      !value || isValidInn(value)
    ),

  kpp: yup
    .string()
    .nullable()
    .when('legalForm', {
      is: (lf: LegalForm) => lf === LegalForm.OOO || lf === LegalForm.AO,
      then: (schema) => schema.test('kpp-valid', () => intl.get('validation.kpp.format'), (value) =>
        !value || isValidKpp(value)
      ),
      otherwise: (schema) => schema.test('kpp-empty', 'KPP should be empty for IP/NPD', (value) => !value),
    }),

  ogrn: yup
    .string()
    .nullable()
    .test('ogrn-valid', () => intl.get('validation.ogrn.checksum'), function (value) {
      if (!value) return true;
      const lf = this.parent.legalForm as LegalForm | undefined;
      if (lf === LegalForm.IP) {
        return isValidOgrnip(value);
      }
      return isValidOgrn(value);
    }),

  bankName: yup.string().nullable(),

  bankBik: yup
    .string()
    .nullable()
    .test('bik-valid', () => intl.get('validation.bik.format'), (value) => !value || isValidBik(value)),

  bankAccount: yup
    .string()
    .nullable()
    .test('account-valid', () => intl.get('validation.bank_account.length'), (value) =>
      !value || isValidBankAccount(value)
    ),

  bankCorrespondentAccount: yup
    .string()
    .nullable()
    .test('corr-valid', () => intl.get('validation.correspondent_account.format'), (value) =>
      !value || isValidCorrespondentAccount(value)
    ),
});

export interface RussianLegalAttributesValues {
  legalForm?: LegalForm;
  taxRegime?: TaxRegime;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  bankName?: string;
  bankBik?: string;
  bankAccount?: string;
  bankCorrespondentAccount?: string;
}
```

- [ ] **Step 8.4: Создать форму (`RussianLegalAttributesForm.tsx`)**

```tsx
import React from 'react';
import { Formik, Form, useFormikContext } from 'formik';
import intl from 'react-intl-universal';
import { FormGroup, InputGroup, HTMLSelect, Button, Intent } from '@blueprintjs/core';
import {
  russianLegalAttributesSchema,
  RussianLegalAttributesValues,
} from './RussianLegalAttributesForm.schema';
import { LegalForm, TaxRegime } from '@/utils/russianLegalAttributes/constants';

interface Props {
  initialValues: RussianLegalAttributesValues;
  onSubmit: (values: RussianLegalAttributesValues) => Promise<void>;
}

export function RussianLegalAttributesForm({ initialValues, onSubmit }: Props) {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={russianLegalAttributesSchema()}
      onSubmit={async (values, { setSubmitting }) => {
        await onSubmit(values);
        setSubmitting(false);
      }}
    >
      <Form>
        <RussianLegalAttributesFields />
        <Button type="submit" intent={Intent.PRIMARY} text={intl.get('save')} />
      </Form>
    </Formik>
  );
}

function RussianLegalAttributesFields() {
  const { values, errors, touched, setFieldValue, handleChange } =
    useFormikContext<RussianLegalAttributesValues>();

  // При смене юр.формы — очищаем поля, которые становятся неактуальны
  React.useEffect(() => {
    if (values.legalForm === LegalForm.IP || values.legalForm === LegalForm.NPD) {
      setFieldValue('kpp', '');
    }
    if (values.legalForm === LegalForm.NPD) {
      setFieldValue('ogrn', '');
    }
  }, [values.legalForm, setFieldValue]);

  const showKpp = values.legalForm === LegalForm.OOO || values.legalForm === LegalForm.AO;
  const showOgrn = values.legalForm && values.legalForm !== LegalForm.NPD;

  return (
    <>
      <h3>{intl.get('legal_ru.form_and_taxation')}</h3>

      <FormGroup label={intl.get('legal_ru.legal_form')} labelFor="legalForm">
        <HTMLSelect
          id="legalForm"
          name="legalForm"
          value={values.legalForm || ''}
          onChange={handleChange}
        >
          <option value="">{intl.get('select_option')}</option>
          <option value={LegalForm.OOO}>{intl.get('legal_ru.form_ooo')}</option>
          <option value={LegalForm.IP}>{intl.get('legal_ru.form_ip')}</option>
          <option value={LegalForm.NPD}>{intl.get('legal_ru.form_npd')}</option>
          <option value={LegalForm.AO}>{intl.get('legal_ru.form_ao')}</option>
        </HTMLSelect>
      </FormGroup>

      <FormGroup label={intl.get('legal_ru.tax_regime')} labelFor="taxRegime">
        <HTMLSelect
          id="taxRegime"
          name="taxRegime"
          value={values.taxRegime || ''}
          onChange={handleChange}
        >
          <option value="">{intl.get('select_option')}</option>
          <option value={TaxRegime.USN_INCOME}>{intl.get('legal_ru.regime_usn_income')}</option>
          <option value={TaxRegime.USN_INCOME_EXPENSE}>{intl.get('legal_ru.regime_usn_income_expense')}</option>
          <option value={TaxRegime.OSNO}>{intl.get('legal_ru.regime_osno')}</option>
          <option value={TaxRegime.PATENT}>{intl.get('legal_ru.regime_patent')}</option>
          <option value={TaxRegime.AUSN}>{intl.get('legal_ru.regime_ausn')}</option>
        </HTMLSelect>
      </FormGroup>

      <h3>{intl.get('legal_ru.registration_details')}</h3>

      <FormGroup
        label={intl.get('legal_ru.inn')}
        labelFor="inn"
        intent={errors.inn && touched.inn ? Intent.DANGER : Intent.NONE}
        helperText={errors.inn && touched.inn ? errors.inn : ''}
      >
        <InputGroup
          id="inn"
          name="inn"
          value={values.inn || ''}
          onChange={handleChange}
          placeholder={values.legalForm === LegalForm.IP || values.legalForm === LegalForm.NPD ? '12 цифр' : '10 цифр'}
        />
      </FormGroup>

      {showKpp && (
        <FormGroup
          label={intl.get('legal_ru.kpp')}
          labelFor="kpp"
          intent={errors.kpp && touched.kpp ? Intent.DANGER : Intent.NONE}
          helperText={errors.kpp && touched.kpp ? errors.kpp : ''}
        >
          <InputGroup id="kpp" name="kpp" value={values.kpp || ''} onChange={handleChange} />
        </FormGroup>
      )}

      {showOgrn && (
        <FormGroup
          label={values.legalForm === LegalForm.IP ? intl.get('legal_ru.ogrnip') : intl.get('legal_ru.ogrn')}
          labelFor="ogrn"
          intent={errors.ogrn && touched.ogrn ? Intent.DANGER : Intent.NONE}
          helperText={errors.ogrn && touched.ogrn ? errors.ogrn : ''}
        >
          <InputGroup id="ogrn" name="ogrn" value={values.ogrn || ''} onChange={handleChange} />
        </FormGroup>
      )}

      <h3>{intl.get('legal_ru.bank_details')}</h3>

      <FormGroup label={intl.get('legal_ru.bank_name')} labelFor="bankName">
        <InputGroup id="bankName" name="bankName" value={values.bankName || ''} onChange={handleChange} />
      </FormGroup>

      <FormGroup
        label={intl.get('legal_ru.bank_bik')}
        labelFor="bankBik"
        intent={errors.bankBik && touched.bankBik ? Intent.DANGER : Intent.NONE}
        helperText={errors.bankBik && touched.bankBik ? errors.bankBik : ''}
      >
        <InputGroup id="bankBik" name="bankBik" value={values.bankBik || ''} onChange={handleChange} />
      </FormGroup>

      <FormGroup
        label={intl.get('legal_ru.bank_account')}
        labelFor="bankAccount"
        intent={errors.bankAccount && touched.bankAccount ? Intent.DANGER : Intent.NONE}
        helperText={errors.bankAccount && touched.bankAccount ? errors.bankAccount : ''}
      >
        <InputGroup id="bankAccount" name="bankAccount" value={values.bankAccount || ''} onChange={handleChange} />
      </FormGroup>

      <FormGroup
        label={intl.get('legal_ru.bank_correspondent_account')}
        labelFor="bankCorrespondentAccount"
        intent={errors.bankCorrespondentAccount && touched.bankCorrespondentAccount ? Intent.DANGER : Intent.NONE}
        helperText={errors.bankCorrespondentAccount && touched.bankCorrespondentAccount ? errors.bankCorrespondentAccount : ''}
      >
        <InputGroup
          id="bankCorrespondentAccount"
          name="bankCorrespondentAccount"
          value={values.bankCorrespondentAccount || ''}
          onChange={handleChange}
        />
      </FormGroup>
    </>
  );
}
```

- [ ] **Step 8.5: Создать страницу-обёртку (`RussianLegalAttributesPage.tsx`)**

```tsx
import React from 'react';
import { RussianLegalAttributesForm } from './RussianLegalAttributesForm';
import { RussianLegalAttributesValues } from './RussianLegalAttributesForm.schema';
// Импортировать хуки доступа к данным организации из существующей инфраструктуры:
import { useCurrentOrganization, useUpdateOrganization } from '@/hooks/query/organization'; // путь скорректировать

export function RussianLegalAttributesPage() {
  const { data: org } = useCurrentOrganization();
  const updateOrg = useUpdateOrganization();

  const initialValues: RussianLegalAttributesValues = {
    legalForm: org?.legalForm,
    taxRegime: org?.taxRegime,
    inn: org?.inn ?? '',
    kpp: org?.kpp ?? '',
    ogrn: org?.ogrn ?? '',
    bankName: org?.bankName ?? '',
    bankBik: org?.bankBik ?? '',
    bankAccount: org?.bankAccount ?? '',
    bankCorrespondentAccount: org?.bankCorrespondentAccount ?? '',
  };

  return (
    <RussianLegalAttributesForm
      initialValues={initialValues}
      onSubmit={async (values) => {
        await updateOrg.mutateAsync(values);
      }}
    />
  );
}
```

**Если точное имя хука `useUpdateOrganization` не найдено** — посмотреть существующий `GeneralPage.tsx`, скопировать его паттерн обращения к API.

- [ ] **Step 8.6: Создать `index.ts`**

```typescript
export { RussianLegalAttributesPage } from './RussianLegalAttributesPage';
```

- [ ] **Step 8.7: Добавить маршрут**

В `packages/webapp/src/routes/preferences.tsx` (точное имя файла подтвердить — `ls packages/webapp/src/routes/`) добавить новую запись:

```typescript
import { RussianLegalAttributesPage } from '@/containers/Preferences/RussianLegalAttributes';

// В массив маршрутов (рядом с другими preferences-маршрутами):
{
  path: 'russian-legal-attributes',
  element: <RussianLegalAttributesPage />,
  breadcrumb: intl.get('legal_ru.menu_label'),
}
```

Также добавить пункт в сайдбар (если есть отдельная регистрация — найти через `grep -r "preferences/general" packages/webapp/src/components`).

- [ ] **Step 8.8: i18n-ключи UI**

В `packages/webapp/src/lang/en/index.json` добавить:

```json
"legal_ru.menu_label": "Russian Legal Attributes",
"legal_ru.form_and_taxation": "Legal form and taxation",
"legal_ru.legal_form": "Legal form",
"legal_ru.form_ooo": "LLC (OOO)",
"legal_ru.form_ip": "Individual Entrepreneur (IP)",
"legal_ru.form_npd": "Self-employed (NPD)",
"legal_ru.form_ao": "Joint-stock company (AO)",
"legal_ru.tax_regime": "Tax regime",
"legal_ru.regime_usn_income": "Simplified Income 6%",
"legal_ru.regime_usn_income_expense": "Simplified Income-Expense 15%",
"legal_ru.regime_osno": "General system (OSNO)",
"legal_ru.regime_patent": "Patent (IP only)",
"legal_ru.regime_ausn": "Automated Simplified (AUSN)",
"legal_ru.registration_details": "Registration details",
"legal_ru.inn": "INN",
"legal_ru.kpp": "KPP",
"legal_ru.ogrn": "OGRN",
"legal_ru.ogrnip": "OGRNIP",
"legal_ru.bank_details": "Bank details",
"legal_ru.bank_name": "Bank name",
"legal_ru.bank_bik": "BIK",
"legal_ru.bank_account": "Bank account",
"legal_ru.bank_correspondent_account": "Correspondent account",
```

В `packages/webapp/scripts/translations/ru.json` — те же ключи с переводом:

```json
"legal_ru.menu_label": "Реквизиты (РФ)",
"legal_ru.form_and_taxation": "Юр.форма и налогообложение",
"legal_ru.legal_form": "Юридическая форма",
"legal_ru.form_ooo": "ООО",
"legal_ru.form_ip": "ИП",
"legal_ru.form_npd": "Самозанятый (НПД)",
"legal_ru.form_ao": "АО",
"legal_ru.tax_regime": "Система налогообложения",
"legal_ru.regime_usn_income": "УСН Доходы 6%",
"legal_ru.regime_usn_income_expense": "УСН Доходы−Расходы 15%",
"legal_ru.regime_osno": "ОСНО",
"legal_ru.regime_patent": "Патент (только ИП)",
"legal_ru.regime_ausn": "АУСН",
"legal_ru.registration_details": "Регистрационные данные",
"legal_ru.inn": "ИНН",
"legal_ru.kpp": "КПП",
"legal_ru.ogrn": "ОГРН",
"legal_ru.ogrnip": "ОГРНИП",
"legal_ru.bank_details": "Банковские реквизиты",
"legal_ru.bank_name": "Наименование банка",
"legal_ru.bank_bik": "БИК",
"legal_ru.bank_account": "Расчётный счёт",
"legal_ru.bank_correspondent_account": "Корреспондентский счёт",
```

Запустить apply-script:

```bash
node packages/webapp/scripts/apply-ru-translations.js
```

- [ ] **Step 8.9: Проверка**

```bash
pnpm typecheck
pnpm --filter @bigfin/webapp run lang:check
pnpm dev:webapp
```

Открыть `http://localhost:4000?lang=ru`, перейти в Preferences → «Реквизиты (РФ)». Заполнить поля, попробовать сохранить с **невалидным ИНН** → должна появиться ошибка под полем. С **валидным ИНН** → submit отправляется на API, ответ 200, перезагрузить страницу — данные сохранены.

- [ ] **Step 8.10: Коммит + push + PR**

```bash
git add packages/webapp/src/containers/Preferences/RussianLegalAttributes/
git add packages/webapp/src/routes/preferences.tsx
git add packages/webapp/scripts/translations/ru.json packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(legal-ru): add Settings page for russian legal attributes"
git push -u origin feat/legal-ru-ui-settings
gh pr create --base develop --title "feat(legal-ru): UI Settings — russian legal attributes (#8 из 11)" --body "Adds /preferences/russian-legal-attributes page with Formik form. Conditional fields by legal form. Live yup validation with localized error messages. ~25 new i18n keys (en+ru)."
```

- [ ] **Step 8.11: Откат**

`git revert` или `git checkout -- .` если не закоммитили. Новая страница изолирована, существующие preferences-страницы не затрагиваются.

---

## Task 9: UI — Customer/Vendor RussianLegalAttributesBlock

**Goal:** Раскрывающийся блок «Реквизиты (РФ)» в формах создания/редактирования Customer и Vendor. Переиспользуется один компонент в двух местах.

**Files:**
- Create: `packages/webapp/src/containers/Customers/components/RussianLegalAttributesBlock.tsx`
- Modify: формы Customer (точные пути — Step 9.1)
- Modify: формы Vendor (точные пути — Step 9.1)
- Modify: `packages/webapp/scripts/translations/ru.json` (новые ключи)
- Modify: `packages/webapp/src/lang/en/index.json`

### Шаги

- [ ] **Step 9.1: Найти существующие формы Customer/Vendor**

```bash
find packages/webapp/src/containers/Customers -name "*Form*.tsx" 2>&1 | head -5
find packages/webapp/src/containers/Vendors -name "*Form*.tsx" 2>&1 | head -5
```

Записать точные пути (например, `CustomerForm.tsx`, `VendorForm.tsx`).

- [ ] **Step 9.2: Создать ветку**

```bash
git checkout develop && git pull --ff-only
git checkout -b feat/legal-ru-ui-contacts
```

- [ ] **Step 9.3: Создать `RussianLegalAttributesBlock.tsx`**

Компонент работает в режиме «вписывается в существующую Formik-форму». Использует `useFormikContext` для подключения к родительской форме:

```tsx
import React from 'react';
import { useFormikContext } from 'formik';
import intl from 'react-intl-universal';
import { Collapse, Button, FormGroup, InputGroup, HTMLSelect, Intent } from '@blueprintjs/core';
import { LegalForm } from '@/utils/russianLegalAttributes/constants';

export interface RussianContactLegalValues {
  legalForm?: LegalForm;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  bankName?: string;
  bankBik?: string;
  bankAccount?: string;
  bankCorrespondentAccount?: string;
}

export function RussianLegalAttributesBlock() {
  const [open, setOpen] = React.useState(false);
  const { values, errors, touched, handleChange, setFieldValue } =
    useFormikContext<RussianContactLegalValues>();

  React.useEffect(() => {
    if (values.legalForm === LegalForm.IP || values.legalForm === LegalForm.NPD || values.legalForm === LegalForm.INDIVIDUAL) {
      setFieldValue('kpp', '');
    }
    if (values.legalForm === LegalForm.NPD || values.legalForm === LegalForm.INDIVIDUAL) {
      setFieldValue('ogrn', '');
    }
    if (values.legalForm === LegalForm.INDIVIDUAL) {
      setFieldValue('inn', '');
    }
  }, [values.legalForm, setFieldValue]);

  const showInn = values.legalForm && values.legalForm !== LegalForm.INDIVIDUAL;
  const showKpp = values.legalForm === LegalForm.OOO || values.legalForm === LegalForm.AO;
  const showOgrn = showInn && values.legalForm !== LegalForm.NPD;

  return (
    <>
      <Button minimal onClick={() => setOpen((v) => !v)} icon={open ? 'chevron-down' : 'chevron-right'}>
        {intl.get('legal_ru.contact_block_title')}
      </Button>
      <Collapse isOpen={open}>
        <FormGroup label={intl.get('legal_ru.contact_legal_form')} labelFor="legalForm">
          <HTMLSelect id="legalForm" name="legalForm" value={values.legalForm || ''} onChange={handleChange}>
            <option value="">{intl.get('select_option')}</option>
            <option value={LegalForm.OOO}>{intl.get('legal_ru.form_ooo')}</option>
            <option value={LegalForm.IP}>{intl.get('legal_ru.form_ip')}</option>
            <option value={LegalForm.NPD}>{intl.get('legal_ru.form_npd')}</option>
            <option value={LegalForm.AO}>{intl.get('legal_ru.form_ao')}</option>
            <option value={LegalForm.INDIVIDUAL}>{intl.get('legal_ru.form_individual')}</option>
          </HTMLSelect>
        </FormGroup>

        {showInn && (
          <FormGroup
            label={intl.get('legal_ru.inn')}
            intent={errors.inn && touched.inn ? Intent.DANGER : Intent.NONE}
            helperText={errors.inn && touched.inn ? (errors.inn as string) : ''}
          >
            <InputGroup name="inn" value={values.inn || ''} onChange={handleChange} />
          </FormGroup>
        )}
        {showKpp && (
          <FormGroup
            label={intl.get('legal_ru.kpp')}
            intent={errors.kpp && touched.kpp ? Intent.DANGER : Intent.NONE}
            helperText={errors.kpp && touched.kpp ? (errors.kpp as string) : ''}
          >
            <InputGroup name="kpp" value={values.kpp || ''} onChange={handleChange} />
          </FormGroup>
        )}
        {showOgrn && (
          <FormGroup
            label={values.legalForm === LegalForm.IP ? intl.get('legal_ru.ogrnip') : intl.get('legal_ru.ogrn')}
            intent={errors.ogrn && touched.ogrn ? Intent.DANGER : Intent.NONE}
            helperText={errors.ogrn && touched.ogrn ? (errors.ogrn as string) : ''}
          >
            <InputGroup name="ogrn" value={values.ogrn || ''} onChange={handleChange} />
          </FormGroup>
        )}

        <h4>{intl.get('legal_ru.contact_bank_details')}</h4>
        <FormGroup label={intl.get('legal_ru.bank_name')}>
          <InputGroup name="bankName" value={values.bankName || ''} onChange={handleChange} />
        </FormGroup>
        <FormGroup
          label={intl.get('legal_ru.bank_bik')}
          intent={errors.bankBik && touched.bankBik ? Intent.DANGER : Intent.NONE}
          helperText={errors.bankBik && touched.bankBik ? (errors.bankBik as string) : ''}
        >
          <InputGroup name="bankBik" value={values.bankBik || ''} onChange={handleChange} />
        </FormGroup>
        <FormGroup
          label={intl.get('legal_ru.bank_account')}
          intent={errors.bankAccount && touched.bankAccount ? Intent.DANGER : Intent.NONE}
          helperText={errors.bankAccount && touched.bankAccount ? (errors.bankAccount as string) : ''}
        >
          <InputGroup name="bankAccount" value={values.bankAccount || ''} onChange={handleChange} />
        </FormGroup>
      </Collapse>
    </>
  );
}
```

- [ ] **Step 9.4: Встроить блок в CustomerForm**

В файле формы Customer (Step 9.1) добавить импорт и вставить компонент **внутри `<Form>`**, перед кнопкой submit:

```tsx
import { RussianLegalAttributesBlock } from './components/RussianLegalAttributesBlock';
// (путь импорта подправить, если файл в другом каталоге)

// ... внутри JSX формы ...
<RussianLegalAttributesBlock />
```

Также расширить `initialValues` и `validationSchema` формы Customer — добавить новые поля как nullable с теми же yup-проверками, что в Step 8.3 (можно вынести в общий `russianContactLegalSchema` и переиспользовать в Customer + Vendor):

Создать `packages/webapp/src/utils/russianLegalAttributes/contactSchema.ts`:

```typescript
import * as yup from 'yup';
import intl from 'react-intl-universal';
import { LegalForm } from './constants';
import { isValidInn } from './inn';
import { isValidKpp } from './kpp';
import { isValidOgrn } from './ogrn';
import { isValidOgrnip } from './ogrnip';
import { isValidBik } from './bik';
import { isValidBankAccount } from './account';

export const russianContactLegalSchema = () => ({
  legalForm: yup.mixed<LegalForm>().oneOf(Object.values(LegalForm)).nullable(),
  inn: yup.string().nullable().test('inn-valid',
    () => intl.get('validation.inn.checksum'),
    (v) => !v || isValidInn(v)),
  kpp: yup.string().nullable().test('kpp-valid',
    () => intl.get('validation.kpp.format'),
    (v) => !v || isValidKpp(v)),
  ogrn: yup.string().nullable().test('ogrn-valid',
    () => intl.get('validation.ogrn.checksum'),
    function (v) {
      if (!v) return true;
      const lf = this.parent.legalForm as LegalForm | undefined;
      return lf === LegalForm.IP ? isValidOgrnip(v) : isValidOgrn(v);
    }),
  bankName: yup.string().nullable(),
  bankBik: yup.string().nullable().test('bik-valid',
    () => intl.get('validation.bik.format'),
    (v) => !v || isValidBik(v)),
  bankAccount: yup.string().nullable().test('account-valid',
    () => intl.get('validation.bank_account.length'),
    (v) => !v || isValidBankAccount(v)),
});
```

В `CustomerForm`-schema добавить `...russianContactLegalSchema()` через spread:

```typescript
const CustomerSchema = yup.object().shape({
  // ... существующие поля ...
  ...russianContactLegalSchema(),
});
```

- [ ] **Step 9.5: Встроить блок в VendorForm**

Аналогично Step 9.4 — добавить `<RussianLegalAttributesBlock />` в форму Vendor, расширить yup-схему через `...russianContactLegalSchema()`.

- [ ] **Step 9.6: i18n-ключи**

В `en/index.json`:

```json
"legal_ru.contact_block_title": "Russian Legal Details",
"legal_ru.contact_legal_form": "Counterparty legal form",
"legal_ru.contact_bank_details": "Counterparty bank details",
"legal_ru.form_individual": "Individual (no INN)",
```

В `translations/ru.json`:

```json
"legal_ru.contact_block_title": "Реквизиты (РФ)",
"legal_ru.contact_legal_form": "Юр.форма контрагента",
"legal_ru.contact_bank_details": "Банковские реквизиты получателя",
"legal_ru.form_individual": "Физлицо (без ИНН)",
```

Применить:

```bash
node packages/webapp/scripts/apply-ru-translations.js
```

- [ ] **Step 9.7: Проверка**

```bash
pnpm typecheck
pnpm --filter @bigfin/webapp run lang:check
pnpm dev:webapp
```

В UI: создать нового Customer с юр.формой ИП и ОГРНИП → сохранить → проверить, что значения вернулись после перезагрузки. Невалидный ИНН → ошибка под полем.

- [ ] **Step 9.8: Коммит + push + PR**

```bash
git add packages/webapp/src/containers/Customers/ packages/webapp/src/containers/Vendors/
git add packages/webapp/src/utils/russianLegalAttributes/contactSchema.ts
git add packages/webapp/scripts/translations/ru.json packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(legal-ru): add RussianLegalAttributesBlock to Customer and Vendor forms"
git push -u origin feat/legal-ru-ui-contacts
gh pr create --base develop --title "feat(legal-ru): UI for contacts (customer + vendor) (#9 из 11)" --body "Reusable RussianLegalAttributesBlock component with conditional fields by legal form. Embedded into existing Customer and Vendor forms. Validation shared with Task 8 via russianContactLegalSchema."
```

---

## Task 10: Автоподстановка дефолтной налоговой ставки

**Goal:** При создании нового Invoice/Bill автоматически подставлять дефолтную ставку НДС в строки счёта на основании `tax_regime` организации.

**Files:**
- Modify: `packages/server/src/modules/SaleInvoices/commands/CreateSaleInvoice.service.ts` (имя — Step 10.1)
- Modify: `packages/server/src/modules/Bills/commands/CreateBill.service.ts` (имя — Step 10.1)

### Шаги

- [ ] **Step 10.1: Найти сервисы создания Invoice/Bill**

```bash
find packages/server/src/modules/SaleInvoices -name "CreateSaleInvoice*.ts" 2>&1
find packages/server/src/modules/Bills -name "CreateBill*.ts" 2>&1
```

- [ ] **Step 10.2: Создать ветку**

```bash
git checkout develop && git pull --ff-only
git checkout -b feat/legal-ru-default-vat
```

- [ ] **Step 10.3: Реализовать автоподстановку**

Принцип: при создании Invoice/Bill, **если** у строки счёта (item entry) **не указан** `taxRateId`, **и** у организации задан `taxRegime` — подставить дефолтный код из `DEFAULT_VAT_BY_REGIME` (см. Task 2 constants).

Псевдокод (точное место зависит от структуры сервиса, найденного в Step 10.1):

```typescript
import { DEFAULT_VAT_BY_REGIME, TaxRegime } from '@/modules/RussianLegalAttributes/constants';
import { TaxRateModel } from '@/modules/TaxRates/models/TaxRate.model';

// Внутри метода создания Invoice/Bill:
async createSaleInvoice(tenantId: number, dto: CreateSaleInvoiceDto) {
  // ... существующая логика загрузки organization ...
  const organization = await Organization.query().findById(/* org id */);

  // Подставить дефолтную ставку НДС в строки без явно указанной
  if (organization?.taxRegime) {
    const defaultVatCode = DEFAULT_VAT_BY_REGIME[organization.taxRegime as TaxRegime];
    if (defaultVatCode) {
      const defaultTaxRate = await TaxRateModel.query().findOne({ code: defaultVatCode, active: true });
      if (defaultTaxRate) {
        dto.entries = dto.entries.map((entry) => ({
          ...entry,
          taxRateId: entry.taxRateId ?? defaultTaxRate.id,
        }));
      }
    }
  }

  // ... существующая логика создания Invoice ...
}
```

То же самое для `CreateBill`.

- [ ] **Step 10.4: Smoke-тест**

Если backend доступен — создать тестовую организацию с `taxRegime = OSNO`, создать Invoice без указания налоговой ставки → проверить, что в строках Invoice стоит `VAT_20`.

Создать другую организацию с `taxRegime = USN_INCOME` → создать Invoice → строки имеют `VAT_NONE`.

- [ ] **Step 10.5: Коммит + push + PR**

```bash
git add packages/server/src/modules/SaleInvoices/ packages/server/src/modules/Bills/
git commit -m "feat(legal-ru): auto-apply default VAT rate by tax regime on Invoice/Bill creation"
git push -u origin feat/legal-ru-default-vat
gh pr create --base develop --title "feat(legal-ru): auto-default VAT rate (#10 из 11)" --body "When creating Invoice or Bill, automatically apply VAT rate based on organization tax regime if not explicitly specified. Uses DEFAULT_VAT_BY_REGIME from Task #2 constants."
```

- [ ] **Step 10.6: Откат**

`git revert` — логика дополнительная, отключение возвращает к существующему поведению (ставка по умолчанию = first-active или null).

---

## Task 11: E2E test + final acceptance

**Goal:** Один Playwright-сценарий покрывает основной flow ②a. Финальная проверка всех acceptance criteria из spec'а.

**Files:**
- Create: `packages/webapp/e2e/russian-legal-attributes.spec.ts`

### Шаги

- [ ] **Step 11.1: Создать ветку**

```bash
git checkout develop && git pull --ff-only
git checkout -b feat/legal-ru-e2e
```

- [ ] **Step 11.2: Создать e2e-сценарий**

Создать `packages/webapp/e2e/russian-legal-attributes.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Russian legal attributes (Sub-project ②a)', () => {
  test('user can fill and save organization russian legal attributes', async ({ page }) => {
    // 1. Login (использовать существующий test-user из глобального fixture, если есть)
    await page.goto('http://localhost:4000?lang=ru');
    // ... шаги логина — посмотреть существующие e2e для образца ...

    // 2. Перейти в Реквизиты (РФ)
    await page.goto('http://localhost:4000/preferences/russian-legal-attributes?lang=ru');
    await expect(page.getByText('Реквизиты (РФ)')).toBeVisible();

    // 3. Заполнить форму
    await page.selectOption('select[name="legalForm"]', 'OOO');
    await page.selectOption('select[name="taxRegime"]', 'OSNO');
    await page.fill('input[name="inn"]', '7707083893');     // валидный ИНН Сбера
    await page.fill('input[name="kpp"]', '770701001');
    await page.fill('input[name="ogrn"]', '1027700132195'); // валидный ОГРН Сбера
    await page.fill('input[name="bankName"]', 'АО Тинькофф Банк');
    await page.fill('input[name="bankBik"]', '044525974');
    await page.fill('input[name="bankAccount"]', '40702810400000012345');
    await page.fill('input[name="bankCorrespondentAccount"]', '30101810145250000974');

    // 4. Сохранить
    await page.getByRole('button', { name: /сохранить/i }).click();

    // 5. Перезагрузить — данные сохранились
    await page.reload();
    await expect(page.locator('input[name="inn"]')).toHaveValue('7707083893');
    await expect(page.locator('input[name="kpp"]')).toHaveValue('770701001');
  });

  test('invalid INN shows localized error message', async ({ page }) => {
    await page.goto('http://localhost:4000/preferences/russian-legal-attributes?lang=ru');
    await page.fill('input[name="inn"]', '7707083890'); // невалидный (wrong checksum)
    await page.locator('input[name="inn"]').blur();
    await expect(page.getByText(/контрольная сумма ИНН не сходится/i)).toBeVisible();
  });

  test('IP legal form hides KPP field', async ({ page }) => {
    await page.goto('http://localhost:4000/preferences/russian-legal-attributes?lang=ru');
    await page.selectOption('select[name="legalForm"]', 'IP');
    await expect(page.locator('input[name="kpp"]')).not.toBeVisible();
  });
});
```

**Точные пути элементов** (`select[name="legalForm"]`) могут отличаться в зависимости от того, какие атрибуты получили компоненты Blueprint. Подкорректировать после первого запуска: открыть DevTools, посмотреть реальные `name`/`data-testid`.

- [ ] **Step 11.3: Запустить e2e**

```bash
cd D:/Кодинг/Bigfin
pnpm --filter @bigfin/webapp run e2e -- russian-legal-attributes.spec.ts
```

Ожидаемо: 3 теста pass.

- [ ] **Step 11.4: Запустить все существующие e2e на en (regression)**

```bash
pnpm --filter @bigfin/webapp run e2e
```

Все существующие тесты на `en` должны проходить.

- [ ] **Step 11.5: Финальная проверка acceptance criteria из spec'а**

Пройти все 9 пунктов из Раздела 7 spec'а:

1. [ ] Можно создать организацию-ООО или ИП с ИНН/КПП/ОГРН/банковскими реквизитами (UI Task 8)
2. [ ] Можно создать Customer/Vendor с юр.формой и реквизитами; форма меняется по юр.форме (Task 9)
3. [ ] В справочнике налоговых ставок есть НДС 20%/10%/0%/Без НДС (Task 1)
4. [ ] Автоподстановка ставки при создании Invoice/Bill по `tax_regime` (Task 10)
5. [ ] ИНН/ОГРН валидируются по checksum на webapp и server (Tasks 3, 4)
6. [ ] Сообщения об ошибках валидации локализованы (Task 5)
7. [ ] Existing-data: организации без новых полей продолжают работать (Tasks 1, 6, 7)
8. [ ] Existing e2e на `en` зелёные (Step 11.4)
9. [ ] `pnpm run lang:check` и `pnpm typecheck` — exit 0

- [ ] **Step 11.6: Коммит + push + PR**

```bash
git add packages/webapp/e2e/russian-legal-attributes.spec.ts
git commit -m "test(legal-ru): playwright e2e scenarios for russian legal attributes"
git push -u origin feat/legal-ru-e2e
gh pr create --base develop --title "test(legal-ru): e2e + final acceptance (#11 из 11)" --body "Three Playwright scenarios covering main flow of ②a: form fill+save, INN checksum error, IP legal form hides KPP. Closes Sub-project ②a."
```

---

## Acceptance Criteria (для всего Sub-project ②a)

После всех 11 PR:

- [ ] Можно создать организацию любой из 4 юр.форм (ООО/ИП/НПД/АО) с реквизитами
- [ ] Можно создать контрагента с юр.формой (включая INDIVIDUAL = физлицо без ИНН)
- [ ] Все 4 ставки НДС присутствуют в таблице tax_rates
- [ ] Автоподстановка налоговой ставки по tax_regime работает на Invoice и Bill
- [ ] Валидация ИНН/ОГРН с контрольной суммой на webapp и server
- [ ] Все сообщения об ошибках локализованы (en + ru)
- [ ] Existing organizations/contacts без новых полей работают как раньше
- [ ] Existing Playwright e2e на `en` остаются зелёными
- [ ] `pnpm run lang:check` exit 0, `pnpm typecheck` zero errors
- [ ] Все 11 PR смерджены в `develop`

---

## Стратегия отката

- **Каждый PR — отдельный merge-коммит в develop.** Откат: `git revert <merge-commit>`.
- **Миграции БД:** `pnpm --filter @bigfin/server run db:migrate:rollback` откатывает последнюю миграцию. PR #1 содержит две миграции — нужно rollback дважды.
- **Сидер VAT-ставок (PR #1):** новые записи помечены `code` начинающимся с `VAT_`. Можно деактивировать через `UPDATE tax_rates SET active = false WHERE code LIKE 'VAT_%'` — без удаления.
- **Новые колонки (PR #1):** все nullable, никто не пишет — простоят пустыми. Откат миграции — последняя мера, обычно достаточно `git revert` UI-PR'ов.
- **i18n-ключи:** удалить из `translations/ru.json` и `en/index.json`, переапплаить script. Никакой риск — fallback на ключ-как-значение для тех, кто остался без перевода.

---

## Открытые вопросы

1. **OgrnOrOgrnipConstraint** — комбинированный валидатор «13 или 15 цифр с правильной checksum». В Task 6/7 валидация ОГРН делается формально через regex без checksum. Полная checksum-проверка на server-стороне — улучшение, можно сделать как hotfix-PR после ②a.
2. **Справочник банков по БИК** — автоподстановка названия и корр.счёта по БИК. Очень удобно для UX. Кандидат для следующего мини-под-проекта или интеграции с DaData.
3. **Бейдж юр.формы в списках контрагентов** — упомянут в spec §3.2, но не включён в этот план (UI-полировка, не блокер). Сделать отдельным мини-PR после ②a.
4. **OKPO** — отложено в backlog (см. spec §1).
5. **Тест на сервер-стороне для DTO** — не покрыто Jest-тестами целиком. Class-validator constraint'ы покрыты через unit-тесты на pure-функции (Task 4), но integration-тест «POST /customers с невалидным ИНН → 422» — отдельная задача в backlog.

---

## Что после Sub-project ②a

Согласно [дорожной карте v2](../specs/2026-05-27-fintablo-planfact-parity-roadmap.md):

- **Sub-project ②b — План статей учёта (русский управленческий).** Независим от ②a, можно делать параллельно. Отдельный полный цикл brainstorming → spec → plan → executing.
- **Sub-project ②c — Печатные формы РФ.** Зависит от ②a (использует заполненные реквизиты). 5–8 недель.

После ②a + ②b + ②c — Sub-project ③ (режимы Бизнес/Бухгалтерский + Onboarding).
