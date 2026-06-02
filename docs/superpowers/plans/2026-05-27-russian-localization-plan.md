# План реализации: Полная русификация Bigfin (Sub-project ①) — v3

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Закончить полную русскую локализацию Bigfin (frontend + server). На 2026-05-27 фундамент готов, частично переведены модули; этот план фокусируется **только на оставшейся работе**.

**Architecture:** Расширяем существующую i18n-инфраструктуру (`react-intl-universal` на frontend, `nestjs-i18n` на server). Английский остаётся как fallback. Перевод выполняется атомарно по модулям. Каждый коммит — один логический модуль, проверяемый и откатываемый независимо.

**Tech Stack:**
- Node 18.16.1 через fnm (см. `.claude/CLAUDE.md`); глобально на машине стоит Node 24
- Frontend: React 18 + Vite + `react-intl-universal` v2.4.7 + `@blueprintjs/core`
- Backend: NestJS + `nestjs-i18n` v10.4.9 + Knex.js + PostgreSQL
- Validation: yup v0.28
- Имя пакета webapp: **`@bigfin/webapp`**

**Связанные документы:**
- Спека: [`docs/superpowers/specs/2026-05-21-russian-localization-design.md`](../specs/2026-05-21-russian-localization-design.md)
- Дорожная карта v2: [`docs/superpowers/specs/2026-05-27-fintablo-planfact-parity-roadmap.md`](../specs/2026-05-27-fintablo-planfact-parity-roadmap.md)
- Предыдущий план (v2 от 22 мая): [`docs/superpowers/plans/2026-05-22-russian-localization-plan.md`](2026-05-22-russian-localization-plan.md) — содержит **детальные шаги по модулям**, на которые ссылается этот документ
- Первый план (v1 от 21 мая): [`docs/superpowers/plans/2026-05-21-russian-localization-plan.md`](2026-05-21-russian-localization-plan.md) — историческая версия

---

## ✅ Статус исполнения: ПОЧТИ ЗАВЕРШЁН

**Обновление от 2026-05-27 (вечер):** При фактическом аудите git-истории и PR-логов выяснилось, что **Sub-project ① уже почти полностью на `develop`** через серию мерджей PR #1, #4, #5, #6, #7 (последний — 2026-05-25). Также редизайн фаз 1 и 2 уже смерджен (PR #11, #12, #13 — 2026-05-25/26).

| Task v3 | Статус | PR |
|---|---|---|
| Task А-prime (apply переводов) | ✅ Готово | #6 `feat/i18n-ru-frontend-routes` |
| Task Ж (server i18n) | ✅ Готово | #5 `feat/i18n-ru-server` + #7 `feat/i18n-ru-server-batch2` |
| Task З (демо-данные) | ❌ N/A | В кодовой базе **нет демо-сидера** для модификации. Core seeds сидят только инфраструктуру (accounts/settings/roles/permissions/tax_rates). Альтернативная задача (перевод `_SampleData.ts` для CSV-импорта) — в открытых вопросах ниже. |
| Task И (финальная приёмка) | 🟡 Осталось | Визуальная проверка на `?lang=ru`, опц. e2e |

**Что делать дальше:** запустить Task И — финальную приёмку, и закрыть Sub-project ① переходом к Sub-project ② (российская юр.специфика) из [дорожной карты v2](../specs/2026-05-27-fintablo-planfact-parity-roadmap.md).

---

## ⚡ Главная находка аудита 27 мая

**В проекте уже есть готовый workflow перевода**, отличающийся от описанного в планах v1/v2:

- `packages/webapp/scripts/translations/ru.json` — **source-of-truth для переводов** (2401 ключ, ~99.3% покрытия от 2417 английских)
- `packages/webapp/scripts/apply-ru-translations.js` — apply-скрипт: читает `translations/ru.json`, переписывает `lang/ru/index.json`, fallback на английский для непереведённых ключей
- **Прямая правка `lang/ru/index.json` — НЕ нужна.** Любые правки там будут затёрты при следующем запуске apply-скрипта.

**Что это значит для плана:** Модульные переводы (Tasks Б-Е из старой версии этого плана) **уже подготовлены в `translations/ru.json`**, но apply-скрипт ещё не запускался для применения всех 2401 переводов. То есть после редизайна работа сводится к одной команде + проверке оставшихся ~16 непереведённых ключей.

---

## Зачем v3 (что изменилось с 22 мая)

Между v2 (22 мая) и v3 (27 мая) была проделана значительная работа. v3 — это **дельта-документ**: он не повторяет 16 модульных PR из v2, а описывает только то, что осталось, и фиксирует изменения окружения.

### Изменения окружения

| Что | Было (v2) | Стало (v3) |
|---|---|---|
| Имя пакета webapp | (n/a) | **`@bigfin/webapp`** |
| Команда фильтрации pnpm | (n/a) | `pnpm --filter @bigfin/webapp ...` |
| Версия webapp | (n/a) | `0.10.2` |
| Кол-во ключей в `lang/en/index.json` | 2390 | **2417** (+27) |
| Workflow перевода | Прямая правка `lang/ru/index.json` | `translations/ru.json` + apply-скрипт |
| Готовых переводов | 40/2390 (1.7%) | **2401/2417 (99.3%)** в `translations/ru.json` |
| Применено к `lang/ru/index.json` | 40 | требуется запуск apply-скрипта |

### Уже выполнено

| Task v2 | Статус 27 мая | Доказательство |
|---|---|---|
| Task 0 Audit | Не нужен — план v3 содержит свежий аудит | — |
| Task 1 Foundation | ✅ Готово | `SUPPORTED_LOCALES` содержит `ru`, `lang/ru/locale.tsx` переведён, `lang-check.js` работает |
| Task 2 RUB Currency | ✅ Готово (нужна верификация preset) | `RUB` в `currencies.tsx` и `Currencies.constants.ts`, `accountingFormat.ts` подключён в `AppIntlLoader` |
| Tasks 3-13 Модульные переводы | 🟡 Частично | 2417 ключей, переведено приблизительно 30-40% (требует точного подсчёта в Task А) |
| Task 14 Server i18n | 🟡 Частично | Папка `i18n/ru/` создана со всеми 30 файлами, часть переведена (`invoice.json` — да; `balance_sheet.json` — нет) |
| Task 15 Хардкод в routes | ✅ Готово | grep на `breadcrumb: 'X'` / `pageTitle: 'X'` в `routes/dashboard.tsx` пуст |
| Task 16 Демо-данные на русском | ❌ Не делалось | Не проверялось напрямую, считаем что требует работы |

### Что осталось

1. **Применить готовые переводы к webapp** (Task А-prime — буквально одна команда).
2. **Добраться до 100% перевода webapp**: найти ~16 непереведённых ключей, перевести и переприменить (Task А-prime, шаги 4-5).
3. **Закончить перевод server i18n** по файлам, которые ещё в основном английские (Task Ж).
4. **Демо-данные на русском** (Task З).
5. **Финальный smoke-test и приёмка** (Task И).

⚠ **Tasks Б-Е из ранних версий этого плана упразднены** — модульный перевод не нужен, потому что 2401 ключ уже переведён в `translations/ru.json`.

---

## File Structure Overview

**Создаём:** ничего нового (все файлы инфраструктуры созданы в v2).

**Модифицируем:**
- `packages/webapp/src/lang/ru/index.json` — постепенный перевод по модулям
- `packages/webapp/src/lang/en/index.json` — добавление новых ключей при необходимости (если найдётся новый хардкод)
- Различные `containers/<Module>/**/*.tsx` — замена хардкода на `intl.get()` (точечно, если найдём)
- `packages/server/src/i18n/ru/*.json` — постепенный перевод по файлам
- Файл сидера демо-данных — определяется в Task З

**Не трогаем (выполнено или не в скоупе):**
- `packages/webapp/src/lang/ru/locale.tsx`
- `packages/webapp/src/components/AppIntlLoader.tsx`
- `packages/webapp/src/utils/accountingFormat.ts`
- `packages/webapp/scripts/lang-check.js`
- `packages/webapp/src/constants/currencies.tsx`
- `packages/server/src/modules/Currencies/Currencies.constants.ts`
- `packages/webapp/src/routes/dashboard.tsx`
- `lang/ar/`, `lang/es/`, `lang/sv/` — мёртвый код

---

## Конвенция работы для всех задач

**Корень всех команд:**

```bash
cd D:/Кодинг/Bigfin

# Версия Node (см. .claude/CLAUDE.md):
node --version   # должно быть v18.16.1 (через fnm)
pnpm --version   # 9.x согласно проекту; на машине может быть 10.x — не критично для большинства команд
```

Если `node --version` показывает Node 24 — переключиться через `fnm use 18.16.1` (см. `MEMORY.md` user'а, раздел dev_environment).

**Перед коммитом каждой модульной задачи:**

```bash
cd D:/Кодинг/Bigfin
pnpm typecheck                                              # 0 ошибок
pnpm --filter @bigfin/webapp run lang:check                 # exit 0, 0 missing/extra
pnpm dev:webapp                                             # визуальная проверка на ?lang=ru
```

**Никаких новых ошибок в DevTools Console.**

**Формат коммита:**

```
feat(i18n): translate <module> module to Russian
```

Все коммиты делаем в репозитории Bigfin. Spec и план — вне git (в `D:/Кодинг/Bigfin/docs/`).

---

## Task А-prime: Применить готовые переводы webapp ⚡

**Goal:** Применить 2401 готовый перевод из `translations/ru.json` к `lang/ru/index.json` через существующий apply-скрипт. Дотянуть до 100% покрытия (~16 непереведённых ключей).

**Files:**
- Modify: `packages/webapp/src/lang/ru/index.json` (через apply-скрипт, не вручную)
- Modify (если найдём непереведённые): `packages/webapp/scripts/translations/ru.json`

⏸ **Предусловие:** Выполнять ТОЛЬКО после мерджа редизайн-ветки в `develop`. Сейчас (ветка `feat/d-redesign-phase-2b-auth-wiring`) — НЕ запускать.

### Шаги

- [ ] **Step А-prime.1: Переключиться на develop и создать ветку для русификации**

```bash
cd D:/Кодинг/Bigfin
nvm use 18.16.1                                      # переключиться на правильную Node
git checkout develop
git pull                                              # получить последние изменения (включая мердж редизайна)
git checkout -b feat/i18n-ru-apply-translations
```

**Объяснение простыми словами:** мы уходим с ветки редизайна на основную ветку `develop`, забираем все последние изменения, и создаём новую ветку именно для русификации. Так редизайн и русификация остаются независимыми коммитами.

- [ ] **Step А-prime.2: Посмотреть текущее состояние `translations/ru.json`**

```bash
cat packages/webapp/scripts/translations/ru.json | head -5
node -e "const t = require('./packages/webapp/scripts/translations/ru.json'); const keys = Object.keys(t).filter(k => !k.startsWith('_')); console.log('Translation keys:', keys.length);"
```

Ожидаемо: ~2401 ключ (или больше, если за время редизайна были добавлены новые).

- [ ] **Step А-prime.3: Запустить apply-скрипт**

```bash
cd D:/Кодинг/Bigfin
node packages/webapp/scripts/apply-ru-translations.js
```

Ожидаемый вывод:
```
✅ Wrote .../lang/ru/index.json
   Keys total: 2417 (en has 2417)
   Translated (from ru.json): 2401
   Fallback to English (no ru translation yet): 16
   Values containing Cyrillic: 2401

✅ Sanity verification passed.
```

**Что произошло:** скрипт прочитал `translations/ru.json`, перебрал все ключи из `en/index.json`, для каждого вставил русский перевод (если есть) или английский fallback. Файл `lang/ru/index.json` теперь содержит 2401 русских перевода и 16 английских заглушек.

- [ ] **Step А-prime.4: Найти 16 непереведённых ключей**

```bash
node -e "
const en = require('./packages/webapp/src/lang/en/index.json');
const ru = require('./packages/webapp/src/lang/ru/index.json');
const untranslated = Object.keys(en).filter(k => en[k] === ru[k]);
console.log('Untranslated keys:', untranslated.length);
untranslated.forEach(k => console.log('  ' + k + ' => ' + en[k]));
"
```

Вывод покажет ~16 ключей, для которых русский = английский (значит fallback). Для каждого решить:
- **Перевести**: добавить в `translations/ru.json` (по алфавиту, рядом с похожими ключами).
- **Оставить английским**: бренд-нейм, технический термин, корректный для обеих локалей.

- [ ] **Step А-prime.5: Если что-то добавили в translations/ru.json — переприменить**

```bash
node packages/webapp/scripts/apply-ru-translations.js
```

Вывод должен показать меньшее число `Fallback to English` (в идеале 0 или близко к 0 — те ключи, которые осознанно оставили английскими).

- [ ] **Step А-prime.6: Проверка качества**

```bash
pnpm typecheck                                              # 0 ошибок TypeScript
pnpm --filter @bigfin/webapp run lang:check                 # exit 0
```

Запустить визуально:
```bash
pnpm dev:webapp
```

Открыть `http://localhost:4000?lang=ru` и пройти 10 главных страниц:
- [ ] Login, Register
- [ ] Dashboard / Главная
- [ ] Клиенты, Поставщики
- [ ] Товары/Услуги
- [ ] Счёт (Invoice) — создание
- [ ] Счёт от поставщика (Bill) — создание
- [ ] Отчёт «Прибыль и Убытки»
- [ ] Отчёт «Баланс»
- [ ] Отчёт «ДДС»
- [ ] Настройки

Всё должно быть на русском. Если где-то английская строка — это либо `intl.get()` с непереведённым ключом (см. Step А-prime.4), либо **хардкод-строка в JSX**, не использующая i18n. Хардкоды зафиксировать списком.

- [ ] **Step А-prime.7: Обратная совместимость**

Открыть `http://localhost:4000?lang=en` — всё на английском, как раньше. Никаких регрессий.

- [ ] **Step А-prime.8: Коммит**

```bash
cd D:/Кодинг/Bigfin
git add packages/webapp/src/lang/ru/index.json
# Если добавляли переводы в translations/ru.json — тоже:
git add packages/webapp/scripts/translations/ru.json
git status
git commit -m "feat(i18n): apply ru translations from translations/ru.json"
```

**Откат:** `git revert HEAD` — `lang/ru/index.json` вернётся в предыдущее состояние, fallback на en сработает автоматически.

- [ ] **Step А-prime.9: (опционально) Зафиксировать хардкоды отдельной задачей**

Если в Step А-prime.6 нашли английский хардкод в JSX — создать отдельный коммит на их замену через `intl.get()`. Это **другой коммит**, не смешивается с применением переводов.

---

## ~~Task А: Аудит прогресса перевода webapp~~ (УПРАЗДНЕНО)

> **Этот раздел сохранён как историческая часть документа.** Task А-prime выше делает работу за один шаг через существующий apply-скрипт. Audit-progress.js больше не нужен — реальный аудит провёл скрипт `apply-ru-translations.js` (показывает `Translated: N` и `Fallback: N`).

**Goal:** Узнать точно, какие модули `lang/ru/index.json` ещё содержат английский текст, чтобы определить порядок Tasks Б-Е.

**Files:** только чтение.

### Шаги

- [ ] **Step А.1: Создать audit-скрипт `audit-progress.js`**

В директории `packages/webapp/scripts/` создать вспомогательный (не коммитим) файл `audit-progress.js`:

```javascript
#!/usr/bin/env node
/**
 * Считает прогресс перевода lang/ru/index.json по префиксам ключей.
 * Префиксы группируются по модулям (например, "invoice.*" → модуль Sales).
 */
const fs = require('fs');
const path = require('path');

const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'lang', 'en', 'index.json'), 'utf8'));
const ru = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'lang', 'ru', 'index.json'), 'utf8'));

// Группировка префиксов по «модулям» из плана v2.
const MODULES = {
  Authentication: /^(email_or_phone|password|login|sign_in|sign_up|reset_password|forgot|welcome_to_|register_a_new)/i,
  Navigation:     /^(sidebar|breadcrumb|menu)\./i,
  Dashboard:      /^(dashboard|kpi)\./i,
  Customers:      /^(customer|customers)\./i,
  Vendors:        /^(vendor|vendors)\./i,
  Items:          /^(item|items|category|categories)\./i,
  Invoices:       /^(invoice|invoices)\./i,
  Estimates:      /^(estimate|estimates)\./i,
  Receipts:       /^(receipt|receipts|payment_receive)\./i,
  CreditNotes:    /^credit_note/i,
  Bills:          /^(bill|bills|bill_payment)\./i,
  Expenses:       /^(expense|expenses)\./i,
  VendorCredits:  /^vendor_credit/i,
  Banking:        /^(bank|banking|reconcil)/i,
  Reports:        /^(cash_flow_statement|profit_loss|balance_sheet|trial_balance|general_ledger|journal)\./i,
  Settings:       /^(preferences|settings|role|user|branch|currency)/i,
  Inventory:      /^(warehouse|inventory_adjustment|import|export)/i,
};

const stats = {};
for (const [name] of Object.entries(MODULES)) {
  stats[name] = { total: 0, translated: 0 };
}
stats._other = { total: 0, translated: 0 };

for (const key of Object.keys(en)) {
  const isTranslated = en[key] !== ru[key];
  let matched = false;
  for (const [name, re] of Object.entries(MODULES)) {
    if (re.test(key)) {
      stats[name].total++;
      if (isTranslated) stats[name].translated++;
      matched = true;
      break;
    }
  }
  if (!matched) {
    stats._other.total++;
    if (isTranslated) stats._other.translated++;
  }
}

console.log('Прогресс перевода по модулям:');
console.log('-'.repeat(60));
for (const [name, { total, translated }] of Object.entries(stats)) {
  const pct = total > 0 ? Math.round((translated / total) * 100) : 0;
  console.log(`  ${name.padEnd(20)} ${translated.toString().padStart(4)} / ${total.toString().padStart(4)}  (${pct}%)`);
}
console.log('-'.repeat(60));
const totalAll = Object.values(stats).reduce((a, b) => a + b.total, 0);
const translatedAll = Object.values(stats).reduce((a, b) => a + b.translated, 0);
console.log(`  ИТОГО:               ${translatedAll} / ${totalAll}  (${Math.round((translatedAll/totalAll)*100)}%)`);
```

- [ ] **Step А.2: Запустить аудит**

```bash
cd D:/Кодинг/Bigfin
node packages/webapp/scripts/audit-progress.js
```

Ожидаемый вывод:

```
Прогресс перевода по модулям:
------------------------------------------------------------
  Authentication       NN /  MM  (XX%)
  Navigation           NN /  MM  (XX%)
  Dashboard            ...
  ...
------------------------------------------------------------
  ИТОГО:                NNN / 2417  (~XX%)
```

- [ ] **Step А.3: Зафиксировать порядок работы**

По результатам Step А.2 выбрать 3-5 модулей с наименьшим процентом перевода **и наибольшей критичностью** (см. таблицу критичности в [плане v2](2026-05-22-russian-localization-plan.md#tasks-3-13)).

**Приоритеты критичности** (из спеки и v2):
- ВЫСОКАЯ: Navigation, Sales, Bills, Reports
- СРЕДНЯЯ: Dashboard, Customers/Vendors, Banking, Settings
- НИЗКАЯ: Authentication, Items, Inventory

Записать итоговый порядок в заметках. Это даёт конкретный список модулей для Tasks Б-Е.

- [ ] **Step А.4: Удалить audit-скрипт**

`audit-progress.js` — вспомогательный, не нужен в репозитории:

```bash
rm packages/webapp/scripts/audit-progress.js
```

Если предпочитаете оставить его в репозитории как утилиту разработки — это тоже валидный выбор; тогда добавьте npm-script `"audit:i18n": "node scripts/audit-progress.js"` в `package.json` и сделайте отдельный коммит `chore(i18n): add translation progress audit script`.

- [ ] **Step А.5: Откат**

Task А — только чтение и временный файл. Откат тривиален: удалить `audit-progress.js` если создавали.

---

## ~~Tasks Б-Е: Перевод оставшихся модулей webapp~~ (УПРАЗДНЕНО)

> **Этот раздел сохранён как историческая часть документа.** Task А-prime выше применяет 2401 готовый перевод за одну команду. Модульный перевод не нужен.

**Goal:** Закончить перевод модулей, определённых в Step А.3.

### Структура каждой задачи

Каждый модуль = одна задача = один коммит. **Полные пошаговые инструкции для модульного перевода даны в плане v2** — в этом плане v3 повторять их нет смысла, потому что они не изменились. Открывайте раздел соответствующего модуля в [плане v2](2026-05-22-russian-localization-plan.md#tasks-3-13-перевод-по-модулям-общий-шаблон) и следуйте его шагам со следующей поправкой:

> Использовать команду `pnpm --filter @bigfin/webapp ...`.

### Список задач (заполняется по Step А.3)

После аудита Step А.3 у вас есть упорядоченный список модулей. Запишите его сюда **прямо в этом файле** (просто отредактируйте) и затем выполняйте задачи сверху вниз. Образец заполнения:

```
- [ ] Task Б: Модуль Navigation         (критичность: ВЫСОКАЯ, ~50 ключей)
- [ ] Task В: Модуль Sales              (критичность: ВЫСОКАЯ, ~400 ключей)
- [ ] Task Г: Модуль Bills              (критичность: ВЫСОКАЯ, ~350 ключей)
- [ ] Task Д: Модуль Reports            (критичность: КРИТИЧЕСКАЯ, ~300 ключей)
- [ ] Task Е: Модуль Customers/Vendors  (критичность: СРЕДНЯЯ, ~200 ключей)
```

**Для деталей** (какие префиксы ключей принадлежат модулю, какие файлы `containers/<Module>/**/*.tsx` искать на хардкод, какие термины применять) **открывайте соответствующий раздел в [плане v2 (22 мая)](2026-05-22-russian-localization-plan.md#tasks-3-13-перевод-по-модулям-общий-шаблон)**. План v2 содержит:

- Task 4 — Navigation
- Task 5 — Dashboard
- Task 6 — Customers/Vendors
- Task 7 — Items
- Task 8 — Sales (Invoices/Estimates/Receipts/Credit Notes)
- Task 9 — Bills/Expenses
- Task 10 — Banking
- Task 11 — Reports (КРИТИЧНО для терминологии)
- Task 12 — Settings
- Task 13 — Warehouses / Misc

Если в Step А.3 какой-то модуль уже на 100% — его в список **не включать**, пропускать.

**Шаблон task'и (для каждой Б-Е):**

- [ ] **Task <X>: Модуль `<ИмяМодуля>`**

  1. Создать ветку: `git checkout -b feat/i18n-ru-<module-slug>` (например, `feat/i18n-ru-sales`).
  2. Открыть раздел соответствующего модуля в [плане v2](2026-05-22-russian-localization-plan.md) — следовать его шагам.
  3. Использовать `pnpm --filter @bigfin/webapp`.
  4. После работы:
     - `pnpm typecheck` → 0 ошибок
     - `pnpm --filter @bigfin/webapp run lang:check` → exit 0
     - Визуальная проверка в браузере: `pnpm dev:webapp` → `http://localhost:4000?lang=ru` → пройти страницы модуля.
  5. Коммит: `git commit -m "feat(i18n): translate <module> module to Russian"`.
  6. Откат при проблемах: `git revert <hash>` или `git checkout -- packages/webapp/src/lang/ru/index.json`.

После каждой задачи:
1. `pnpm typecheck` — 0 ошибок
2. `pnpm --filter @bigfin/webapp run lang:check` — 0 missing/extra
3. Визуальная проверка на `?lang=ru` — никаких регрессий
4. Коммит: `feat(i18n): translate <module> module to Russian`

### Откат для каждой задачи

```bash
cd D:/Кодинг/Bigfin
git log --oneline -n 5                 # найти хэш коммита
git revert <commit-hash>               # откатить
```

Если плохая строка обнаружена на проде — можно удалить ключ в `lang/ru/index.json` (fallback на en сработает автоматически) и закоммитить hotfix.

---

## Task Ж: Завершить server i18n

**Goal:** Перевести оставшиеся JSON-файлы в `packages/server/src/i18n/ru/`.

**Files:**
- Modify: `packages/server/src/i18n/ru/*.json` (точный список — см. Step Ж.1)

### Шаги

- [ ] **Step Ж.1: Определить, какие файлы ещё английские**

```bash
cd D:/Кодинг/Bigfin
for f in packages/server/src/i18n/en/*.json; do
  name=$(basename "$f")
  if cmp -s "$f" "packages/server/src/i18n/ru/$name"; then
    echo "ENGLISH (not translated): $name"
  fi
done
```

Файлы, для которых `cmp` показывает идентичность с `en/` — ещё не переведены. Записать их список.

Альтернатива (если `cmp` не работает в окружении):

```bash
for f in packages/server/src/i18n/en/*.json; do
  name=$(basename "$f")
  diff_lines=$(diff "$f" "packages/server/src/i18n/ru/$name" 2>/dev/null | wc -l)
  if [ "$diff_lines" -eq 0 ]; then
    echo "ENGLISH: $name"
  fi
done
```

- [ ] **Step Ж.2: Создать ветку**

```bash
cd D:/Кодинг/Bigfin
git checkout -b feat/i18n-ru-server-finish
```

- [ ] **Step Ж.3: Перевести файлы в порядке приоритета**

Приоритет (по влиянию на пользователя):

1. **`balance_sheet.json`** — заголовки колонок баланса (виден на главном отчёте). Терминология из спеки: ассеты → «Активы», current asset → «Оборотные активы», cash and cash equivalents → «Денежные средства и эквиваленты», accounts receivable → «Дебиторская задолженность», inventory → «Запасы», liabilities → «Обязательства», equity → «Капитал», net income → «Чистая прибыль».
2. **`cash_flow_statement.json`** — заголовки ДДС.
3. **`profit_loss_sheet.json`** — заголовки ОПиУ. Использовать «Прибыль и Убытки» вместо «Отчёт о финансовых результатах» (см. таблицу терминологии в [спеке](../specs/2026-05-21-russian-localization-design.md#32-ключевые-терминологические-решения)).
4. **`trial_balance_sheet.json`** — Оборотно-сальдовая ведомость (ОСВ).
5. **`general_ledger.json`** (если есть) — Общая книга / Главная книга.
6. Остальные операционные файлы (ошибки валидации): `bill.json`, `expense.json`, `customer.json`, `vendor_credit.json` и т.д.

Для каждого файла:
- Открыть `packages/server/src/i18n/ru/<file>.json`
- Заменить английские значения на русские, ключи оставить как есть
- Сохранить, проверить что JSON валиден (любая IDE подсветит ошибку, или: `node -e "JSON.parse(require('fs').readFileSync('packages/server/src/i18n/ru/<file>.json'))"`)

**Важно:** Если в файле есть форматные параметры в значениях (например, `"required": "{{field}} is required"`) — оставлять `{{field}}` без изменений, переводить только обрамляющий текст.

- [ ] **Step Ж.4: Проверить JSON-валидность всех файлов**

```bash
cd D:/Кодинг/Bigfin
for f in packages/server/src/i18n/ru/*.json; do
  node -e "try { JSON.parse(require('fs').readFileSync('$f', 'utf8')); console.log('OK: $f'); } catch(e) { console.error('FAIL: $f -', e.message); process.exit(1); }"
done
```

Все файлы должны вывести `OK`. Если хоть один FAIL — найти и исправить синтаксическую ошибку.

- [ ] **Step Ж.5: Проверить через запуск сервера**

```bash
cd D:/Кодинг/Bigfin
pnpm dev:server
```

В другом терминале:

```bash
curl -H "Accept-Language: ru" http://localhost:3000/api/health
```

Сервер должен запуститься без падений. Затем сделать заведомо невалидный запрос (например, создать счёт без обязательного поля) — в ответе ошибки должны быть на русском.

**Если локальный backend не настроен** (см. `MEMORY.md` user'а — `project_local_backend_unset.md`): пропустить Step Ж.5, ограничиться Step Ж.4. Проверка реального ответа через API будет на следующем dogfooding-цикле.

- [ ] **Step Ж.6: Коммит**

```bash
cd D:/Кодинг/Bigfin
git add packages/server/src/i18n/ru/
git status
git commit -m "feat(i18n): translate remaining server i18n files to Russian"
```

- [ ] **Step Ж.7: Откат**

```bash
git revert HEAD       # после коммита
# или до коммита:
git checkout -- packages/server/src/i18n/ru/
```

Каждое изменение строки в JSON независимо — fallback на en автоматический. Если конкретный ключ показывает английский на проде — это не блокер.

---

## ~~Task З: Русские демо-данные~~ (N/A в текущей кодовой базе)

> **Закрыто 2026-05-27.** При аудите выяснилось, что в проекте **отсутствует демо-сидер** для модификации. `packages/server/src/database/tenant/seeds/core/` содержит только инфраструктурные сидеры (accounts/settings/items_settings/roles/permissions/credit_settings/tax_rates), нет сидера контрагентов/товаров/расходов.
>
> **Найдено в проекте:** `packages/server/src/modules/{Customers,Vendors,Accounts,TaxRates}/_SampleData.ts` — но это **другая задача**: данные для CSV-образца при импорте (не сидинг при создании организации). Сейчас они англоязычные (Currency: LYD). Перевод этих файлов на русские образцы (ООО «Ромашка», ИП Иванов, Currency: RUB) — переносится в **открытые вопросы плана v3** (см. §«Открытые вопросы» ниже) и/или в Sub-project ② (российская юр.специфика).
>
> Шаги ниже сохранены как историческая часть документа.

**Goal:** При создании демо-организации сидеть русских контрагентов, товары, расходы вместо английских.

**Files:**
- Modify: один или несколько файлов сидера (точный путь определяется в Step З.1)

### Шаги

- [ ] **Step З.1: Найти сидер демо-данных**

```bash
cd D:/Кодинг/Bigfin
grep -rln -E "(DEMO|SAMPLE|demo|sample).*(Customer|Vendor|Item)" packages/server/src --include='*.ts' 2>&1 | head -10

# Альтернативный поиск:
find packages/server/src -type f -name "*.ts" -exec grep -l "ООО\|Romashka\|sample customer\|demo data\|seedTenant\|initialTenant" {} \; 2>&1 | head -10
```

Часто такие сидеры лежат в `packages/server/src/services/Tenants/` или `packages/server/src/modules/Tenants/`. Найти основной сидер.

- [ ] **Step З.2: Создать ветку**

```bash
git checkout -b feat/i18n-ru-seed-data
```

- [ ] **Step З.3: Добавить русские варианты данных**

В найденном файле создать рядом с английским списком русский. **Не удалять английский** — он остаётся для англоязычной локали.

Пример (адаптировать под фактическую структуру найденного файла):

```typescript
const DEMO_CUSTOMERS_EN = [/* существующее */];

const DEMO_CUSTOMERS_RU = [
  { displayName: 'ООО "Ромашка"',     email: 'info@romashka.ru',  currencyCode: 'RUB' },
  { displayName: 'ИП Иванов И.И.',    email: 'ivanov@example.ru', currencyCode: 'RUB' },
  { displayName: 'ООО "Лютик-Плюс"',  email: 'contact@lutik.ru',  currencyCode: 'RUB' },
];

const DEMO_VENDORS_RU = [
  { displayName: 'ООО "ОфисМаркет"', email: 'sales@office.ru',  currencyCode: 'RUB' },
  { displayName: 'ООО "АренДА"',     email: 'arenda@example.ru', currencyCode: 'RUB' },
];

const DEMO_ITEMS_RU = [
  { name: 'Консалтинговые услуги', type: 'service', sellPrice: 5000 },
  { name: 'Веб-разработка',         type: 'service', sellPrice: 100000 },
  { name: 'Подписка на сервис',     type: 'service', sellPrice: 990 },
];

const DEMO_EXPENSES_RU = [
  { description: 'Аренда офиса',        amount: 80000 },
  { description: 'Налоги (УСН)',         amount: 25000 },
  { description: 'Интернет и связь',     amount: 3500 },
];
```

И добавить функцию выбора по локали:

```typescript
export function getDemoCustomers(locale: string) {
  return locale === 'ru' ? DEMO_CUSTOMERS_RU : DEMO_CUSTOMERS_EN;
}
// аналогично для остальных
```

Заменить **точки использования** старых констант на вызов новых функций. Точные точки использования зависят от структуры сидера — найти через grep по имени константы.

- [ ] **Step З.4: Проверить**

```bash
pnpm typecheck
```

Если есть локальный backend и можно запустить сидер:

```bash
pnpm tenants:seed:latest   # точная команда зависит от проекта; см. package.json scripts
```

После сидинга — в UI открыть страницу клиентов: должны быть ООО «Ромашка», ИП Иванов и т.д.

**Если локальный backend не настроен:** ограничиться `typecheck`, реальную проверку отложить до dogfooding-цикла.

- [ ] **Step З.5: Коммит**

```bash
git add packages/server/src/<files-modified>
git commit -m "feat(i18n): add Russian demo data for new organizations"
```

- [ ] **Step З.6: Откат**

```bash
git revert HEAD
```

Существующие организации не затрагиваются — изменения влияют только на **новые** демо-организации, создаваемые после применения коммита.

---

## Task И: Финальная приёмка

**Goal:** Подтвердить, что все acceptance criteria из спеки выполнены.

**Files:** только чтение.

### Шаги

- [ ] **Step И.1: `lang:check` exit 0**

```bash
cd D:/Кодинг/Bigfin
pnpm --filter @bigfin/webapp run lang:check
```

Ожидаемо: `Missing: 0`, `Extra: 0`, exit 0.

- [ ] **Step И.2: `typecheck` без ошибок**

```bash
pnpm typecheck
```

Ожидаемо: 0 ошибок.

- [ ] **Step И.3: Запустить аудит прогресса (если оставили в репо)**

```bash
node packages/webapp/scripts/audit-progress.js
```

(Если удалили в Step А.4 — пропустить или восстановить из git history). Ожидаемо: ИТОГО ≥ 95% переведено. Если меньше — определить непокрытые префиксы и добавить мини-задачу «дочистить».

- [ ] **Step И.4: Визуальная приёмка на `?lang=ru`**

```bash
pnpm dev:webapp
```

Открыть `http://localhost:4000?lang=ru` и пройти чек-лист:

- [ ] Главная (Dashboard) — на русском
- [ ] Сайдбар и навигация — на русском
- [ ] Клиенты, Поставщики — на русском
- [ ] Товары/Услуги — на русском
- [ ] Создание счёта (Invoice) — на русском
- [ ] Создание счёта от поставщика (Bill) — на русском
- [ ] Платёжный календарь / Банк — на русском
- [ ] Отчёты — заголовки «ДДС», «Прибыль и Убытки», «Баланс», «ОСВ»
- [ ] Настройки — на русском
- [ ] Даты в формате `21.05.2026` или `21 мая 2026`
- [ ] Суммы в формате `1 234,56 ₽`
- [ ] Нет ошибок в DevTools Console (особенно `intl.get() missing key`)

- [ ] **Step И.5: Обратная совместимость на `?lang=en`**

```
http://localhost:4000?lang=en
```

Пройти те же экраны: всё работает, тексты английские, даты в формате `May 21, 2026`, суммы в формате `$1,234.56`.

- [ ] **Step И.6: e2e на en (если есть)**

```bash
pnpm e2e
# или
pnpm playwright test
```

Все существующие e2e-тесты на `en` должны пройти. Если какой-то падает — это регрессия от русификации (вряд ли, но проверить).

**Если e2e не настроен** или падает не из-за i18n (известный изначальный failing) — зафиксировать в комментарии PR/коммита.

- [ ] **Step И.7: Финальный коммит «закрытие Sub-project ①»**

После того как всё чисто:

```bash
cd D:/Кодинг/Bigfin
git checkout develop
git pull   # если есть remote
```

Подтвердить состояние: спе́ка ⑤ из спеки полностью покрыта.

---

## Acceptance Criteria (для всего Sub-project ①)

Согласно [спеке](../specs/2026-05-21-russian-localization-design.md#10-acceptance-criteria-для-всего-проекта):

- [ ] В переключателе языка есть `Русский` (выполнено в фундаменте)
- [ ] При переключении на `ru` все UI-строки на русском (кроме намеренных исключений)
- [ ] Даты в формате `21.05.2026` или `21 мая 2026` (выполнено в фундаменте)
- [ ] Числа в формате `1 234,56` (выполнено в фундаменте)
- [ ] Валюта `RUB ₽` доступна, можно сделать дефолтной (выполнено в фундаменте)
- [ ] Демо-данные новой организации — на русском (Task З)
- [ ] Финансовые отчёты называются `ДДС`, `Прибыль и Убытки`, `Баланс` (часть в webapp, часть в server — Tasks Б-Е, Ж)
- [ ] Серверные ошибки валидации возвращаются на русском (Task Ж)
- [ ] Email-шаблоны на русском — **OUT OF SCOPE** для v3 (пакет `email-components` отсутствует в проекте, перенесено в backlog Sub-project ②)
- [ ] Скрипт `pnpm run lang:check` проходит с exit code 0 (выполнено в фундаменте)
- [ ] Существующие Playwright e2e тесты на `en` проходят (Step И.6)
- [ ] Нет регрессий в существующей функциональности (Step И.4-И.5)

---

## Стратегия отката

**Каждая задача — один коммит** — откат через `git revert <hash>`.

**Нет миграций БД** — даже после релиза каждый коммит безопасно откатывается.

**Языковой переключатель остаётся всегда** — если что-то ломается на `ru`, пользователь переключается на `en` и продолжает работать.

**Плохая строка перевода** → удалить ключ в `lang/ru/index.json` или `i18n/ru/<file>.json`, fallback на en сработает автоматически. Можно делать live-патчем.

---

## Открытые вопросы

Эти вопросы не блокируют Sub-project ①, но фиксируются здесь:

1. **Email-шаблоны** — пакет `@bigfin/email-components` в репозитории отсутствует. Если/когда появится — отдельный мини-под-проект.
2. **PDF-шаблоны** — какие из них показываются клиенту и должны быть переведены? Часть `paper.*` ключей в `invoice.json` уже переведена. Проверить покрытие в Step И.4.
3. **Спорные термины** ("Bill" → "Счёт от поставщика", "Payment Receive" → "Получение платежа") — фиксируем нынешний выбор, корректируем после первых пользователей. Терминологические правки — мгновенные (JSON-файлы).
4. **`_SampleData.ts` — русские образцы для CSV-импорта** (Task З-альт). Файлы `packages/server/src/modules/{Customers,Vendors,Accounts,TaxRates}/_SampleData.ts` сейчас англоязычные (Currency: LYD, имена «Nicolette Schamberger» и т.д.). Перевести их на русские образцы (ООО «Ромашка», ИП Иванов, Currency: RUB) — отдельная мини-задача, не блокер Sub-project ①. Логически относится к Sub-project ② (российская юр.специфика), потому что меняет не только язык, но и валюту/формат данных.

---

## Что после Sub-project ①

Согласно [дорожной карте v2](../specs/2026-05-27-fintablo-planfact-parity-roadmap.md):

- Следующий sub-project: **② Российская юридическая специфика** (ИНН/КПП/ОГРН, банковские реквизиты, УПД, российские ставки НДС). Отдельный полный цикл brainstorming → spec → plan → executing.
