# План реализации: Полная русификация Bigfin (Sub-project ①)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Завершить полную русскую локализацию интерфейса Bigfin (frontend + server) с правильной терминологией управленческого учёта.

**Architecture:** Расширяем существующую i18n-инфраструктуру (`react-intl-universal` на frontend, `nestjs-i18n` на server). Английский остаётся как fallback. Перевод выполняется атомарно по модулям. Каждый PR — один логический модуль, проверяемый и откатываемый независимо.

**Tech Stack:**
- Node 18.16.1, pnpm (см. `.claude/CLAUDE.md`)
- Frontend: React 18 + Vite + `react-intl-universal` v2.4.7 + `@blueprintjs/core`
- Backend: NestJS + `nestjs-i18n` v10.4.9 + Knex.js + PostgreSQL
- Validation: yup v0.28
- Даты: `moment` v2.24+ (встроенная русская локаль)
- Числа/валюта: `accounting` v0.4 + `js-money`

**Связанные документы:**
- Спека: [`docs/superpowers/specs/2026-05-21-russian-localization-design.md`](../specs/2026-05-21-russian-localization-design.md)
- Дорожная карта: [`docs/superpowers/specs/2026-05-22-fintablo-parity-roadmap.md`](../specs/2026-05-22-fintablo-parity-roadmap.md)
- Предыдущая версия плана (без учёта реального состояния): [`docs/superpowers/plans/2026-05-21-russian-localization-plan.md`](2026-05-21-russian-localization-plan.md)

---

## Важное про текущее состояние

**Аудит на 2026-05-22 показал:** значительная часть фундамента (PR #1 и PR #2 из спеки) уже выполнена. Этот план учитывает это и фокусируется на оставшейся работе.

| Что | Статус | Источник |
|---|---|---|
| `SUPPORTED_LOCALES` содержит `'ru'` | ✅ Готово | `AppIntlLoader.tsx:17-21` |
| `lang/ru/locale.tsx` (yup) переведён | ✅ Готово | файл существует, полный перевод |
| `scripts/lang-check.js` создан | ✅ Готово | файл существует, работает |
| `lang-check` script в `package.json` | ✅ Готово | `package.json:141` |
| `utils/accountingFormat.ts` создан | ✅ Готово | файл существует, вызывается из `AppIntlLoader` |
| `RUB` в `constants/currencies.tsx` | ✅ Готово | `currencies.tsx:9` |
| `RUB` в `InitialCurrencies` (server) | ✅ Готово | `Currencies.constants.ts:5` |
| `lang/ru/index.json` структурно идентичен `en` | ✅ Готово | 2390 ключей, 0 missing |
| Переведено ключей UI | 🟡 40 из 2390 (1.7%) | посчитано |
| `OrganizationSetupForm` preset RUB для RU | ❓ Неизвестно | надо проверить |
| `russian_ruble` ключ в обоих JSON | ❓ Возможно | надо проверить |
| Server `i18n/ru/` папка | ❌ Не создана | проверено |
| Hardcoded строки в routes | ❌ Не заменены | known issue |
| RU demo-данные в seed | ❌ Не созданы | known issue |

**Что это значит для плана:**
- Task 0 (Audit) проверяет всё перечисленное.
- Tasks 1-2 редуцированы до верификации + завершения оставшихся мелочей.
- Основная работа — Tasks 3-13 (модульные переводы) и Task 14 (server i18n).

---

## File Structure Overview

**Создаём (новые файлы):**
- `packages/server/src/i18n/ru/*.json` — ~30 серверных JSON

**Модифицируем:**
- `packages/webapp/src/lang/ru/index.json` — постепенный перевод по модулям
- `packages/webapp/src/lang/en/index.json` — добавление новых ключей при замене хардкода
- `packages/webapp/src/routes/dashboard.tsx` — хардкод breadcrumbs (Task 15)
- Различные `containers/<Module>/**/*.tsx` — замена хардкода на `intl.get()` (Task 15)
- Файл сидера демо-данных — определить в Task 16

**Уже сделано, не трогаем:**
- `packages/webapp/src/lang/ru/locale.tsx` (yup)
- `packages/webapp/src/components/AppIntlLoader.tsx`
- `packages/webapp/src/utils/accountingFormat.ts`
- `packages/webapp/scripts/lang-check.js`
- `packages/webapp/src/constants/currencies.tsx`
- `packages/server/src/modules/Currencies/Currencies.constants.ts`

**Не в скоупе (отдельные sub-projects):**
- `lang/ar/`, `lang/es/`, `lang/sv/` — мёртвый код, оставляем
- Российская юр.специфика (ИНН/КПП/ОГРН) — это sub-project ②
- Бизнес/Бухг режим, onboarding — это sub-project ③
- Графический ребрендинг — отдельный sub-project

---

## Конвенция работы для всех PR

**В корне всех команд:**

```bash
# Текущая директория для всех команд:
cd D:/Кодинг/Bigfin

# Версия Node (см. .claude/CLAUDE.md):
node --version   # должно быть v18.16.1 (через fnm/nvm)
pnpm --version   # должно быть 9.x
```

**Перед коммитом каждого PR:**
- `pnpm typecheck` — без ошибок
- `pnpm --filter @bigfin/webapp run lang:check` — exit 0
- Запустить `pnpm dev:webapp`, проверить визуально в браузере на `?lang=ru`
- Никаких новых ошибок в DevTools Console

**Формат коммита** (если репозиторий использует Conventional Commits):
```
feat(i18n): <описание>
```

Все коммиты делаем в репозитории Bigfin. Spec и план лежат в `D:/Кодинг/Bigfin/docs/` — они вне git и не коммитятся.

---

## Task 0: Pre-flight audit

**Goal:** Точно подтвердить текущее состояние кода и узнать, что осталось доделать в фундаменте (PR1+PR2).

**Files:** только чтение.

### Шаги

- [ ] **Step 0.1: Проверить версию Node и pnpm**

```bash
cd D:/Кодинг/Bigfin
node --version
pnpm --version
```

Ожидаем: `v18.16.1`, `9.x.x`. Если другая версия Node — переключиться через `nvm use 18.16.1` или `fnm use 18.16.1`.

- [ ] **Step 0.2: Прочитать `AppIntlLoader.tsx` и подтвердить `SUPPORTED_LOCALES`**

Открыть `packages/webapp/src/components/AppIntlLoader.tsx`. Найти константу `SUPPORTED_LOCALES` (строки 17-21).

Ожидаем:
```typescript
const SUPPORTED_LOCALES = [
  { name: 'English', value: 'en' },
  { name: 'Русский', value: 'ru' },
  { name: 'العربية', value: 'ar' },
];
```

Если её нет или нет `'ru'` — добавить (см. Step 1.1).

- [ ] **Step 0.3: Запустить `lang:check` для baseline**

```bash
cd D:/Кодинг/Bigfin
pnpm --filter @bigfin/webapp run lang:check
```

Ожидаем (на момент написания плана):
```
English keys: 2390
Russian keys: 2390
Missing in ru (есть в en, нет в ru): 0
Extra in ru (есть в ru, нет в en): 0
✅ OK: парность ключей en↔ru соблюдена.
```

Exit code: 0.

Если есть missing/extra — зафиксировать список (понадобится в Task 1).

- [ ] **Step 0.4: Подсчитать прогресс перевода**

В PowerShell:

```powershell
$en = Get-Content 'packages\webapp\src\lang\en\index.json' -Raw | ConvertFrom-Json -AsHashtable
$ru = Get-Content 'packages\webapp\src\lang\ru\index.json' -Raw | ConvertFrom-Json -AsHashtable
$same = 0; $different = 0
foreach ($key in $en.Keys) {
  if ($ru[$key] -eq $en[$key]) { $same++ } else { $different++ }
}
Write-Output "Translated: $different of $($en.Keys.Count)"
Write-Output "Untranslated: $same"
```

Ожидаем: ~40 переведено, ~2350 ещё английские.

- [ ] **Step 0.5: Проверить наличие ключа `russian_ruble`**

```bash
grep -c "russian_ruble" packages/webapp/src/lang/en/index.json
grep -c "russian_ruble" packages/webapp/src/lang/ru/index.json
```

Если оба возвращают `1` — ключ есть в обоих файлах. Если в одном `0` — добавим в Task 2.

- [ ] **Step 0.6: Найти `SetupOrganizationForm` и проверить дефолт валюты**

```bash
# Найти файл формы setup'а:
find packages/webapp/src/containers/Setup -name "*Organization*" -type f
```

Открыть найденные файлы, поискать `baseCurrency` и `initialValues`. Зафиксировать:
- Где определяется `initialValues`
- Установлен ли `baseCurrency: 'RUB'` для `ru`-локали

Если **не установлен** — задача для Task 2.

- [ ] **Step 0.7: Подтвердить отсутствие `i18n/ru/` на сервере**

```bash
ls packages/server/src/i18n/
```

Ожидаем: только `en/` (нет `ru/`). Если есть `ru/` — пометить как Task 14 «частично выполнен», проверить содержимое.

- [ ] **Step 0.8: Записать результаты аудита**

Создать (в голове или в файле `audit-results.md` рядом) короткую сводку:
```
✓ SUPPORTED_LOCALES: содержит 'ru'
✓ lang/ru/locale.tsx: переведён
✓ lang/ru/index.json: 40/2390 переведено
✓ scripts/lang-check.js: работает
✓ currencies.tsx: содержит RUB
✓ Currencies.constants.ts InitialCurrencies: содержит RUB
✓/✗ russian_ruble ключ: [есть/нет]
✓/✗ OrganizationSetupForm RUB preset: [есть/нет]
✗ server i18n/ru/: не создан
```

**После Task 0:** перейти к Task 1, пропустив выполненные пункты.

**Откат:** Task 0 — только чтение. Откат не нужен.

---

## Task 1: Завершение инфраструктуры (PR1)

**Goal:** Закрыть оставшиеся пункты из PR1 спеки. Если по аудиту всё готово — этот task пропускается.

**Files:**
- Modify (если нужно): `packages/webapp/src/components/AppIntlLoader.tsx`
- Verify: остальные файлы из PR1 — все уже на месте.

### Шаги

- [ ] **Step 1.1: Если `SUPPORTED_LOCALES` не содержит `'ru'` — добавить**

Если по Step 0.2 был обнаружен пропуск, открыть `packages/webapp/src/components/AppIntlLoader.tsx` и заменить блок `SUPPORTED_LOCALES`:

Было:
```typescript
const SUPPORTED_LOCALES = [
  { name: 'English', value: 'en' },
  { name: 'العربية', value: 'ar' },
];
```

Стало:
```typescript
const SUPPORTED_LOCALES = [
  { name: 'English', value: 'en' },
  { name: 'Русский', value: 'ru' },
  { name: 'العربية', value: 'ar' },
];
```

**Объяснение:** Без `'ru'` в списке функция `getCurrentLocal()` падает на `find()` и возвращает `'en'`. С `'ru'` — `loadLocales(currentLocale)` динамически импортирует `lang/ru/index.json`.

- [ ] **Step 1.2: Если в `lang:check` были missing/extra — синхронизировать структуру**

Если по Step 0.3 были несовпадения ключей, использовать вывод `lang:check` чтобы:
- Для missing: добавить ключи из `lang/en/index.json` в `lang/ru/index.json` (с английским значением как заглушка — переведём в модульном PR).
- Для extra: удалить лишние ключи из `lang/ru/index.json`.

Затем повторить:
```bash
pnpm --filter @bigfin/webapp run lang:check
```

Должно показать: `Missing: 0`, `Extra: 0`.

- [ ] **Step 1.3: Запустить `pnpm typecheck`**

```bash
cd D:/Кодинг/Bigfin
pnpm typecheck
```

Ожидаем: 0 ошибок.

- [ ] **Step 1.4: Запустить webapp и визуально проверить**

```bash
pnpm dev:webapp
```

Открыть `http://localhost:4000?lang=ru`.

Что проверить:
1. ✓ Сайт открывается, не падает с белым экраном.
2. ✓ В DevTools Console нет «Cannot find module ../lang/ru/...».
3. ✓ В UI текст в основном английский (это ожидаемо — 40 ключей переведены).
4. ✓ Даты в формате `21 мая 2026` (а не `May 21, 2026`).
5. ✓ Если есть переключатель языка — «Русский» появляется в списке.

Обратная совместимость: `http://localhost:4000?lang=en` — работает как раньше.

- [ ] **Step 1.5: Создать ветку и закоммитить, если были изменения**

Если Step 1.1 или 1.2 что-то изменили:

```bash
cd D:/Кодинг/Bigfin
git checkout -b feat/i18n-foundation-cleanup
git add packages/webapp/src/components/AppIntlLoader.tsx packages/webapp/src/lang/ru/index.json
git status
git commit -m "feat(i18n): finalize ru locale infrastructure"
```

Если ничего не изменилось — переходим к Task 2 без коммита.

- [ ] **Step 1.6: Откат**

Если изменения сломали что-то:
```bash
git checkout -- .
# или
git checkout develop
git branch -D feat/i18n-foundation-cleanup
```

---

## Task 2: Завершение валюты RUB (PR2)

**Goal:** Дотянуть PR2 до конца. Основная незакрытая часть — установка RUB как preset валюты для русской локали в форме setup.

**Files:**
- Verify: `packages/webapp/src/lang/en/index.json` (ключ `russian_ruble`)
- Verify: `packages/webapp/src/lang/ru/index.json` (ключ `russian_ruble`)
- Modify (вероятно): `packages/webapp/src/containers/Setup/SetupOrganizationPage.tsx` (или соседний)

### Шаги

- [ ] **Step 2.1: Если ключ `russian_ruble` отсутствует — добавить в оба JSON**

Если Step 0.5 показал, что ключа нет:

В `lang/en/index.json` (отсортировано по алфавиту — найти место рядом с `"euro": "Euro"`):
```json
"russian_ruble": "Russian Ruble",
```

В `lang/ru/index.json` (та же позиция):
```json
"russian_ruble": "Российский рубль",
```

- [ ] **Step 2.2: Создать ветку**

```bash
cd D:/Кодинг/Bigfin
git checkout develop
git pull   # если есть remote
git checkout -b feat/i18n-ru-currency-preset
```

- [ ] **Step 2.3: Найти место определения `initialValues` для setup-формы**

```bash
grep -nE "(initialValues|baseCurrency)" packages/webapp/src/containers/Setup/*.tsx packages/webapp/src/containers/Setup/**/*.tsx 2>&1 | head -30
```

Вероятный кандидат — `SetupOrganizationPage.tsx`. Прочитать его и найти место, где задаются дефолтные значения формы (через `Formik initialValues`, `withFormik mapPropsToValues`, или React state).

- [ ] **Step 2.4: Добавить RUB-preset для русской локали**

Стратегия А (предпочтительная — менять initialValues):

В найденном месте определения `initialValues` импортировать `intl`:
```typescript
import intl from 'react-intl-universal';
```

Затем добавить логику определения локали (упрощённая, не падает если `getInitOptions` не возвращает `currentLocale`):

```typescript
const currentLocale =
  intl.getInitOptions?.()?.currentLocale ||
  localStorage.getItem('lang') ||
  'en';

const initialValues = {
  // ... остальные поля как сейчас ...
  baseCurrency: currentLocale === 'ru' ? 'RUB' : '',
  // ...
};
```

Стратегия Б (fallback — если initialValues в родительском компоненте сложно изменить):

В компоненте формы (`SetupOrganizationForm.tsx`) добавить эффект:

```typescript
import { useFormikContext } from 'formik';
import intl from 'react-intl-universal';
import React from 'react';

// внутри функционального компонента:
const { values, setFieldValue } = useFormikContext<any>();

React.useEffect(() => {
  const locale = intl.getInitOptions?.()?.currentLocale || localStorage.getItem('lang');
  if (locale === 'ru' && !values.baseCurrency) {
    setFieldValue('baseCurrency', 'RUB');
  }
}, []);
```

Выбрать стратегию по факту просмотра кода в Step 2.3.

**Важно:** не менять модель данных и не делать миграций. Это чистый UI-дефолт. Если пользователь хочет другую валюту — он выбирает её из выпадающего списка как раньше.

- [ ] **Step 2.5: Запустить typecheck и lang:check**

```bash
cd D:/Кодинг/Bigfin
pnpm typecheck
pnpm --filter @bigfin/webapp run lang:check
```

Ожидаем: 0 ошибок в обоих.

- [ ] **Step 2.6: Визуально проверить**

```bash
pnpm dev:webapp
```

1. Открыть `http://localhost:4000?lang=ru`.
2. Зайти на форму создания организации (`/setup` или эквивалент).
3. В поле «Базовая валюта» — `RUB` (Российский рубль) должен быть предзаполнен.
4. В выпадающем списке всех валют — `RUB - Russian ruble` присутствует.
5. Создать тестовую организацию с RUB (если возможно без боли).
6. В дашборде сумма отображается как `1 234,56 ₽` (а не `1,234.56 RUB`).

Обратная совместимость: `?lang=en` — валюта пустая (как было), пользователь выбирает сам. Дашборд показывает `$1,234.56`.

- [ ] **Step 2.7: Откат-план**

Все изменения локальны:
```bash
git checkout develop
git branch -D feat/i18n-ru-currency-preset
```

Если успели создать тестовую организацию — она остаётся в БД с baseCurrency RUB. Это не критично — можно удалить через UI или оставить как demo.

- [ ] **Step 2.8: Коммит**

```bash
git add packages/webapp/src/lang/en/index.json \
        packages/webapp/src/lang/ru/index.json \
        packages/webapp/src/containers/Setup/
git status
git commit -m "feat(i18n): preset RUB currency for Russian locale in organization setup"
```

- [ ] **Step 2.9: Push (опционально — если есть remote)**

```bash
git push -u origin feat/i18n-ru-currency-preset
# Если используете GitHub:
# gh pr create --title "feat(i18n): preset RUB for ru locale" --body "..."
```

---

## Tasks 3-13: Перевод по модулям (общий шаблон)

> Эти 11 задач имеют **одинаковую структуру**. Полный набор шагов описан в Task 3 (как образец). Для Tasks 4-13 ниже даны только специфика модуля (ключи, файлы, термины). Шаги те же.

### Общий шаблон для модульных PR

```
1. Создать ветку:  feat/i18n-ru-<module>  от develop
2. Найти все ключи модуля в lang/en/index.json (по префиксам)
3. Подобрать русские переводы (использовать таблицу терминологии из спеки + Claude помогает)
4. Заменить значения соответствующих ключей в lang/ru/index.json
5. Найти хардкод-строки в .tsx-файлах модуля (через grep)
6. Заменить хардкод на intl.get('...') + добавить новые ключи в оба JSON
7. Проверить: pnpm typecheck, pnpm --filter @bigfin/webapp run lang:check
8. Проверить визуально на ?lang=ru
9. Коммит:  feat(i18n): translate <module> module to Russian
10. (опционально) push и PR
```

**Размер каждого PR:** примерно 1-3 рабочих дня. После каждого — пауза, dogfooding, проверка.

---

## Task 3: Аутентификация (PR #3)

**Goal:** Перевести экраны входа, регистрации, восстановления пароля.

**Файлы:** `packages/webapp/src/containers/Authentication/**/*.tsx` (для хардкода) + `lang/ru/index.json`

### Шаги

- [ ] **Step 3.1: Создать ветку**

```bash
cd D:/Кодинг/Bigfin
git checkout develop
git checkout -b feat/i18n-ru-authentication
```

- [ ] **Step 3.2: Найти ключи аутентификации**

```bash
grep -nE '"(email|password|login|sign_in|sign_up|reset_password|forgot|welcome|register|create_account|email_or_phone|invalid_email)' packages/webapp/src/lang/en/index.json | head -40
```

Зафиксировать список найденных ключей. Типичные ключи (по спеке и текущему состоянию):

```
email_or_phone_number, password, login, invalid_email_or_phone_number,
required, reset_password, the_user_has_been_suspended_from_admin,
email_and_password_entered_did_not_match, log_in, forgot_my_password,
keep_me_logged_in, dont_have_an_account, sign_up, return_to, sign_in,
enter_the_email_address_associated_with_your_account, create_an_account,
need_bigfin_account, show, hide, an_unexpected_error_occurred,
welcome_to_bigfin, enter_your_personal_information, first_name, last_name,
phone_number, you_email_address_is, you_will_use_this_address_to_sign_in_to_bigfin,
signing_in_or_creating, and, create_account, success, register_a_new_organization
```

(Часть из них уже переведена — лишний раз не вредно.)

- [ ] **Step 3.3: Перевести значения в `lang/ru/index.json`**

Открыть `packages/webapp/src/lang/ru/index.json`. Для каждого ключа из Step 3.2 — заменить английское значение на русское.

Готовый набор переводов (можно использовать как есть):

```json
"email_or_phone_number": "Email или телефон",
"password": "Пароль",
"login": "Вход",
"invalid_email_or_phone_number": "Неверный email или телефон.",
"required": "Обязательно",
"reset_password": "Сбросить пароль",
"the_user_has_been_suspended_from_admin": "Пользователь заблокирован администратором.",
"email_and_password_entered_did_not_match": "Email или пароль не совпадают с нашими записями.",
"name": "Имя",
"log_in": "Войти",
"forgot_my_password": "Забыли пароль?",
"keep_me_logged_in": "Запомнить меня",
"dont_have_an_account": "Ещё нет аккаунта?",
"sign_up": "Регистрация",
"return_to": "Вернуться к",
"sign_in": "Войти",
"enter_the_email_address_associated_with_your_account": "Введите email, привязанный к вашему аккаунту, и мы отправим ссылку для сброса пароля.",
"create_an_account": "Создать аккаунт",
"need_bigfin_account": "Нужен аккаунт Bigfin?",
"show": "Показать",
"hide": "Скрыть",
"an_unexpected_error_occurred": "Произошла непредвиденная ошибка",
"welcome_to_bigfin": "Добро пожаловать в Bigfin",
"enter_your_personal_information": "Введите личную информацию",
"first_name": "Имя",
"last_name": "Фамилия",
"phone_number": "Номер телефона",
"you_email_address_is": "Ваш email",
"you_will_use_this_address_to_sign_in_to_bigfin": "Этот адрес будет использоваться для входа в Bigfin.",
"signing_in_or_creating": "Регистрируясь или входя, вы соглашаетесь с нашими <a>Условиями</a> и <a>Политикой конфиденциальности</a>",
"and": "и",
"create_account": "Создать аккаунт",
"success": "Успех",
"register_a_new_organization": "Зарегистрировать новую организацию."
```

**Особое внимание:**
- `signing_in_or_creating` содержит HTML `<a>` — оставить теги, переводить только текст между ними. `react-intl-universal` обрабатывает HTML через `intl.getHTML()`.
- Ключи `name`, `first_name`, `last_name` — могут встречаться вне аутентификации тоже (контрагенты и т.п.). Перевод подходящий для обоих контекстов.

- [ ] **Step 3.4: Найти хардкод-строки в `containers/Authentication`**

```bash
grep -rnE "['\"]([A-Z][a-z]+ [a-z]| (Sign|Log|Reset|Create|Enter|Welcome))" packages/webapp/src/containers/Authentication 2>&1 | head -30
```

Каждое найденное место — потенциальный хардкод. Открыть файл, проверить:
- Если это пользовательский текст (label, placeholder, заголовок) — заменить на `intl.get('key_name')` и добавить ключ в оба JSON (en + ru).
- Если это код (имя класса, переменная) — оставить.

- [ ] **Step 3.5: Запустить typecheck + lang:check**

```bash
pnpm typecheck
pnpm --filter @bigfin/webapp run lang:check
```

Ожидаем: 0 ошибок в обоих.

- [ ] **Step 3.6: Визуально проверить**

```bash
pnpm dev:webapp
```

В браузере открыть `http://localhost:4000?lang=ru`:
- `/auth/login` — все строки на русском.
- `/auth/register` (если маршрут есть) — на русском.
- `/auth/reset-password` (если есть) — на русском.

DevTools Console — без ошибок `intl.get() missing key`.

- [ ] **Step 3.7: Коммит**

```bash
git add packages/webapp/src/lang/ru/index.json packages/webapp/src/lang/en/index.json packages/webapp/src/containers/Authentication
git status
git commit -m "feat(i18n): translate authentication module to Russian"
```

- [ ] **Step 3.8: Откат**

```bash
git checkout develop
git branch -D feat/i18n-ru-authentication
```

Это безопасно — изменения только в локалях и не задевают логику.

---

## Tasks 4-13: Остальные модули

> Шаги те же, что в Task 3. Ниже — специфика каждого модуля.

### Task 4: Навигация и сайдбар (PR #4)

- **Ветка:** `feat/i18n-ru-navigation`
- **Префиксы ключей:** `sidebar.*`, и ключи с `breadcrumb` (часть в `routes/dashboard.tsx` — это хардкод, его трогаем в Task 15)
- **Хардкод-файлы:** `packages/webapp/src/components/Dashboard/Sidebar/**/*.tsx`, `packages/webapp/src/components/Dashboard/Topbar/**/*.tsx`
- **Термины из спеки:** Organization → Организация, Customer → Клиент, Vendor → Поставщик, Item → Товар или Услуга, Cash Flow → ДДС, Profit & Loss → Прибыль и Убытки, Balance Sheet → Баланс
- **Критичность:** ВЫСОКАЯ (видно везде)
- **Объём:** ~50 строк
- **Особое внимание:** sidebar содержит ссылки на финансовые отчёты — терминология ДОЛЖНА совпадать с тем, что будет в Task 11 (Отчёты).

### Task 5: Дашборд (PR #5)

- **Ветка:** `feat/i18n-ru-dashboard`
- **Префиксы ключей:** `dashboard.*`, виджеты revenue/expenses/profit
- **Хардкод-файлы:** `packages/webapp/src/containers/Dashboard/**/*.tsx`
- **Термины:** Revenue → Выручка, Expenses → Расходы, Net Income → Чистая прибыль, Cash on Hand → Остаток денег
- **Объём:** ~120 строк

### Task 6: Клиенты и Поставщики (PR #6)

- **Ветка:** `feat/i18n-ru-contacts`
- **Префиксы ключей:** `customers.*`, `vendors.*`, `contact.*`
- **Хардкод-файлы:** `packages/webapp/src/containers/Customers/**/*.tsx`, `packages/webapp/src/containers/Vendors/**/*.tsx`
- **Термины:** Customer → Клиент, Vendor → Поставщик, Contact → Контрагент
- **Объём:** ~200 строк
- **⚠ Спорное:** общая страница "Contacts" — переводим как «Контрагенты»

### Task 7: Товары и услуги (PR #7)

- **Ветка:** `feat/i18n-ru-items`
- **Префиксы ключей:** `items.*`, `item.*`, `categories.*`
- **Хардкод-файлы:** `packages/webapp/src/containers/Items/**/*.tsx`
- **Термины:** Item → Товар или Услуга, Inventory Item → Товар (складской), Service Item → Услуга, Category → Категория
- **Объём:** ~150 строк

### Task 8: Продажи (PR #8) ⚠ Критический модуль

- **Ветка:** `feat/i18n-ru-sales`
- **Префиксы ключей:** `invoice.*`, `invoices.*`, `estimate.*`, `receipt.*`, `payment_receive.*`, `credit_note.*`
- **Хардкод-файлы:** `packages/webapp/src/containers/Sales/**/*.tsx`, `packages/webapp/src/containers/PaymentReceives/**/*.tsx`, `packages/webapp/src/containers/CreditNotes/**/*.tsx`
- **Термины:**
  - Invoice → Счёт
  - Estimate → Коммерческое предложение (КП)
  - Receipt → Поступление
  - Payment Receive → Получение платежа
  - Credit Note → Возврат клиенту
- **Критичность:** ВЫСОКАЯ — основной поток работы
- **Объём:** ~400 строк
- **⚠ Спорное:** "Payment Receive" — обсудить терминологию после первого dogfooding'а

### Task 9: Закупки (PR #9)

- **Ветка:** `feat/i18n-ru-purchases`
- **Префиксы ключей:** `bill.*`, `bills.*`, `expenses.*`, `bill_payment.*`, `vendor_credit.*`
- **Хардкод-файлы:** `packages/webapp/src/containers/Bills/**/*.tsx`, `packages/webapp/src/containers/Expenses/**/*.tsx`, `packages/webapp/src/containers/BillPayments/**/*.tsx`, `packages/webapp/src/containers/VendorCredits/**/*.tsx`
- **Термины:**
  - Bill → Счёт от поставщика
  - Bill Payment → Оплата поставщику
  - Expense → Расход
  - Vendor Credit → Возврат поставщику
- **Критичность:** ВЫСОКАЯ
- **Объём:** ~350 строк

### Task 10: Банк (PR #10)

- **Ветка:** `feat/i18n-ru-banking`
- **Префиксы ключей:** `banking.*`, `bank_account.*`, `reconciliation.*`, `transaction.*`
- **Хардкод-файлы:** `packages/webapp/src/containers/CashFlow/**/*.tsx`, `packages/webapp/src/containers/BankingTransactions/**/*.tsx`
- **Термины:**
  - Bank Account → Банковский счёт (или Касса для наличного учёта — по контексту)
  - Transaction → Операция
  - Reconciliation → Сверка
- **Объём:** ~200 строк

### Task 11: Финансовые отчёты (PR #11) ⚠ Критическая терминология

- **Ветка:** `feat/i18n-ru-reports`
- **Префиксы ключей:** `cash_flow_statement.*`, `profit_loss_sheet.*`, `balance_sheet.*`, `trial_balance_sheet.*`, `general_ledger.*`, `journal.*`
- **Хардкод-файлы:** `packages/webapp/src/containers/FinancialStatements/**/*.tsx`
- **Термины (см. таблицу в спеке):**
  - Cash Flow Statement → **ДДС** (Движение денежных средств)
  - Profit & Loss → **Прибыль и Убытки**
  - Balance Sheet → **Баланс**
  - Trial Balance → **Оборотно-сальдовая ведомость** (ОСВ)
  - Journal Entry → **Операция** (не «Проводка» — пугает непрофи)
  - Chart of Accounts → **Статьи учёта**
- **Особое внимание:** заголовки колонок, итоговые строки внутри отчётов часто хардкодом — нужен внимательный grep по `FinancialStatements/`.
- **Объём:** ~300 строк
- **Рекомендация:** перед коммитом этого PR показать переводы пользователю — это **лицо продукта**. Один неудачный термин = плохое впечатление от целого отчёта.

### Task 12: Настройки (PR #12)

- **Ветка:** `feat/i18n-ru-settings`
- **Префиксы ключей:** `preferences.*`, `settings.*`, `roles.*`, `users.*`, `branches.*`, `currencies.*`
- **Хардкод-файлы:** `packages/webapp/src/containers/Preferences/**/*.tsx`
- **Термины:** Branches → Подразделения, Roles → Роли, Users → Пользователи, Currencies → Валюты
- **Объём:** ~250 строк

### Task 13: Склад и прочее (PR #13)

- **Ветка:** `feat/i18n-ru-misc`
- **Префиксы ключей:** `warehouses.*`, `inventory_adjustment.*`, `import.*`, `export.*`, `audit_log.*`, `notification.*`
- **Хардкод-файлы:** `packages/webapp/src/containers/Warehouses/**/*.tsx`, `packages/webapp/src/containers/InventoryAdjutments/**/*.tsx`, `packages/webapp/src/containers/Import/**/*.tsx`, `packages/webapp/src/containers/AuditLogs/**/*.tsx`
- **Термины:** Warehouse → Склад, Inventory Adjustment → Корректировка остатков, Import → Импорт, Audit Log → История изменений
- **Объём:** ~200 строк

**После Task 13:** запустить `pnpm --filter @bigfin/webapp run lang:check`. Если есть остатки непереведённых ключей (которые не попали ни в один модуль) — сделать отдельный mini-PR `feat/i18n-ru-misc-cleanup` для их перевода.

---

## Task 14: Серверная локаль `ru` (PR #14)

**Goal:** Перевести валидационные сообщения, заголовки отчётов и колонок, которые приходят с сервера на русском при `Accept-Language: ru`.

**Files:**
- Create: `packages/server/src/i18n/ru/*.json` (~30 файлов)

### Шаги

- [ ] **Step 14.1: Создать ветку**

```bash
cd D:/Кодинг/Bigfin
git checkout develop
git checkout -b feat/i18n-ru-server
```

- [ ] **Step 14.2: Скопировать структуру `en/` в `ru/`**

PowerShell:
```powershell
Copy-Item -Recurse packages\server\src\i18n\en packages\server\src\i18n\ru
```

Bash:
```bash
cp -r packages/server/src/i18n/en packages/server/src/i18n/ru
```

После этого в `i18n/ru/` есть все ~30 файлов с английским содержимым — это начальная заглушка.

- [ ] **Step 14.3: Перевести содержимое JSON-файлов в порядке приоритета**

Открыть каждый файл `packages/server/src/i18n/ru/<name>.json`, перевести значения на русский. Терминология — из таблицы спеки.

**Приоритет файлов** (по влиянию на пользователя):
1. `balance_sheet.json` — Баланс
2. `cash_flow_statement.json` — ДДС
3. `profit_loss_sheet.json` — Прибыль и Убытки
4. `trial_balance_sheet.json` — Оборотно-сальдовая ведомость
5. `invoice.json`, `bill.json`, `expense.json` — операционные сообщения
6. `customer.json`, `vendor.json`, `item.json` — справочники
7. `account.json`, `manual_journal.json` — учёт
8. Остальные (audit_log, ability, role, transaction_type, и т.д.)

**Структура JSON-файлов** обычно похожа на:
```json
{
  "errors": {
    "invoice_not_found": "Invoice not found",
    "...": "..."
  },
  "labels": {
    "invoice_number": "Invoice number"
  }
}
```

Сохранить вложенную структуру, переводить только строковые значения.

- [ ] **Step 14.4: Проверить, что `nestjs-i18n` загружает новую папку**

Конфигурация в `App.module.ts` обычно выглядит так:
```typescript
I18nModule.forRootAsync({
  useFactory: () => ({
    fallbackLanguage: 'en',
    loaderOptions: {
      path: join(__dirname, '../../i18n/'),
      watch: true,
    },
  }),
  resolvers: [
    new QueryResolver(),
    new HeaderResolver(),
    new CookieResolver(),
    AcceptLanguageResolver,
  ],
});
```

Эта конфигурация **автоматически** загружает все папки в `i18n/`. Никаких изменений в коде не нужно.

**Если в проекте `App.module.ts` не использует `loaderOptions.path` для авто-загрузки** — найти конфигурацию `I18nModule` и добавить путь. Перед изменением — показать файл, согласовать.

- [ ] **Step 14.5: Проверить через API**

В одном терминале:
```bash
cd D:/Кодинг/Bigfin
pnpm dev:server
```

В другом терминале — запрос с заголовком языка:
```bash
curl -H "Accept-Language: ru" http://localhost:3000/api/health
```

(Точный путь зависит от того, какой эндпоинт возвращает локализованные сообщения. Для проверки локализации лучше всего вызвать намеренно невалидный запрос — например, создать счёт без обязательного поля — и проверить, что текст ошибки на русском.)

- [ ] **Step 14.6: Откат**

```bash
git checkout develop
git branch -D feat/i18n-ru-server
# Удалить созданную папку (если откат частичный):
# Remove-Item -Recurse packages\server\src\i18n\ru
```

- [ ] **Step 14.7: Коммит**

```bash
git add packages/server/src/i18n/ru/
git commit -m "feat(i18n): translate server-side messages to Russian"
```

---

## Task 15: Замена хардкод-строк в маршрутах (PR #15)

**Goal:** Найти и заменить все хардкод английские строки в `routes/dashboard.tsx` и других местах, где используются `breadcrumb:`, `pageTitle:` напрямую.

**Files:**
- Modify: `packages/webapp/src/routes/dashboard.tsx`
- Modify: `packages/webapp/src/lang/en/index.json` + `lang/ru/index.json` (новые ключи)
- Possibly: другие файлы `routes/`

### Шаги

- [ ] **Step 15.1: Создать ветку**

```bash
cd D:/Кодинг/Bigfin
git checkout develop
git checkout -b feat/i18n-ru-hardcoded
```

- [ ] **Step 15.2: Найти все хардкод-места**

```bash
# breadcrumb / pageTitle в маршрутах:
grep -nE "(breadcrumb|pageTitle): ['\"]" packages/webapp/src/routes/*.tsx 2>&1
grep -nE "(breadcrumb|pageTitle): ['\"]" packages/webapp/src/routes/**/*.tsx 2>&1

# Хардкод label в Stepper и других компонентах:
grep -nE "label=\{?['\"][A-Z]" packages/webapp/src/containers/Setup/*.tsx 2>&1
grep -rnE "label=\{?['\"][A-Z]" packages/webapp/src/components 2>&1 | head -20
```

Зафиксировать все найденные строки.

- [ ] **Step 15.3: Заменить по одной**

Для каждой найденной хардкод-строки:
1. Придумать ключ (snake_case, например `accounts_import`)
2. Проверить, не существует ли такой ключ уже — `grep -n "\"accounts_import\"" packages/webapp/src/lang/en/index.json`
3. Если **не существует** — добавить в `lang/en/index.json` и `lang/ru/index.json`:
   ```json
   "accounts_import": "Accounts Import",
   ```
   ```json
   "accounts_import": "Импорт статей учёта",
   ```
4. Если **существует** — переиспользовать.
5. Заменить хардкод на `intl.get('accounts_import')`.

- [ ] **Step 15.4: Проверить**

```bash
pnpm typecheck
pnpm --filter @bigfin/webapp run lang:check
pnpm dev:webapp
```

На `?lang=ru` походить по разделам — breadcrumbs должны быть на русском.

- [ ] **Step 15.5: Коммит**

```bash
git add packages/webapp/src/routes/ \
        packages/webapp/src/lang/en/index.json \
        packages/webapp/src/lang/ru/index.json
git status
git commit -m "feat(i18n): replace hardcoded breadcrumbs/pageTitles with intl.get()"
```

- [ ] **Step 15.6: Откат**

```bash
git checkout develop
git branch -D feat/i18n-ru-hardcoded
```

---

## Task 16: Русские демо-данные (PR #16)

**Goal:** При создании демонстрационной организации с локалью `ru` сидить русских контрагентов, товары, расходы.

**Files:**
- Modify: файл сидера демо-данных (определить в Step 16.2)

### Шаги

- [ ] **Step 16.1: Создать ветку**

```bash
cd D:/Кодинг/Bigfin
git checkout develop
git checkout -b feat/i18n-ru-seed
```

- [ ] **Step 16.2: Найти существующий сидер демо-данных**

```bash
grep -rln "demo\|sample\|seed" packages/server/src --include="*.ts" 2>&1 | head -20
```

Или поискать файлы:
```bash
find packages/server/src -name "*Seed*.ts" -o -name "*Demo*.ts" -o -name "*Sample*.ts" 2>&1
```

Найти основной seeder для демо-контрагентов / товаров / расходов. Прочитать его, понять структуру.

- [ ] **Step 16.3: Подобрать русские демо-данные**

Готовые наборы:

```typescript
const DEMO_CUSTOMERS_RU = [
  { displayName: 'ООО "Ромашка"', email: 'info@romashka.ru', currencyCode: 'RUB' },
  { displayName: 'ИП Иванов И.И.', email: 'ivanov@example.ru', currencyCode: 'RUB' },
  { displayName: 'ООО "Лютик-Плюс"', email: 'contact@lutik.ru', currencyCode: 'RUB' },
  { displayName: 'ИП Петрова Е.А.', email: 'petrova@example.ru', currencyCode: 'RUB' },
];

const DEMO_VENDORS_RU = [
  { displayName: 'ООО "ОфисМаркет"', email: 'sales@office.ru', currencyCode: 'RUB' },
  { displayName: 'ООО "АренДА"', email: 'arenda@example.ru', currencyCode: 'RUB' },
  { displayName: 'Билайн (ПАО "ВымпелКом")', email: 'billing@example.ru', currencyCode: 'RUB' },
];

const DEMO_ITEMS_RU = [
  { name: 'Консалтинговые услуги', type: 'service', sellPrice: 5000 },
  { name: 'Веб-разработка', type: 'service', sellPrice: 100000 },
  { name: 'Подписка на сервис', type: 'service', sellPrice: 990 },
  { name: 'Обучение/тренинг', type: 'service', sellPrice: 15000 },
];

const DEMO_EXPENSES_RU = [
  { description: 'Аренда офиса', amount: 80000 },
  { description: 'Налоги (УСН)', amount: 25000 },
  { description: 'Интернет и связь', amount: 3500 },
  { description: 'Реклама и маркетинг', amount: 30000 },
];
```

- [ ] **Step 16.4: Сохранить английские демо-данные как fallback**

В найденном файле:
- Старые демо-данные (английские) — переименовать в `DEMO_CUSTOMERS_EN`, `DEMO_VENDORS_EN`, и т.д.
- Добавить новые RU-наборы (из Step 16.3).
- Добавить функцию выбора:

```typescript
function getDemoCustomers(locale: string): DemoCustomer[] {
  return locale === 'ru' ? DEMO_CUSTOMERS_RU : DEMO_CUSTOMERS_EN;
}
// Аналогично для vendors, items, expenses.
```

- Заменить использование старого массива в сидер-сервисе на вызов `getDemoCustomers(locale)`. Откуда брать `locale` — обычно из контекста создания организации (`Organization.language` или `Organization.locale`).

**Не удалять английские демо-данные** — они нужны для англоязычных организаций.

- [ ] **Step 16.5: Проверить**

Создать новую тестовую организацию с локалью `ru` через UI или CLI.

Через UI:
1. `pnpm dev:server` + `pnpm dev:webapp`
2. Создать новую организацию с `language = ru` и `baseCurrency = RUB`
3. Если в сидере есть генерация демо-данных — после setup'а в контрагентах должны быть ООО "Ромашка" и т.п.

Через CLI (если поддерживается):
```bash
pnpm tenants:seed:latest --locale=ru
```

(Точная команда зависит от сидера — определяется при выполнении.)

- [ ] **Step 16.6: Откат**

```bash
git checkout develop
git branch -D feat/i18n-ru-seed
```

Если уже создана тестовая организация с русскими демо-данными — она остаётся в БД. Можно удалить через UI или оставить как песочницу.

- [ ] **Step 16.7: Коммит**

```bash
git add packages/server/src/modules/<...>
git status
git commit -m "feat(i18n): add Russian demo data for new organizations"
```

---

## Acceptance Criteria (для всего sub-project ①)

После завершения Tasks 0-16:

- [ ] `?lang=ru` показывает все UI-строки на русском (кроме намеренных исключений вроде названий валют из `js-money`).
- [ ] Даты в формате `21 мая 2026` или `21.05.2026`.
- [ ] Числа в формате `1 234,56`.
- [ ] Валюта `₽` доступна, для RU-локали — preset.
- [ ] Демо-данные для новых RU-организаций на русском (ООО, ИП).
- [ ] Финансовые отчёты называются `ДДС`, `Прибыль и Убытки`, `Баланс`, `ОСВ`.
- [ ] Серверные ошибки на русском при `Accept-Language: ru`.
- [ ] `pnpm --filter @bigfin/webapp run lang:check` exit 0.
- [ ] Существующие тесты на `en` проходят (если есть).
- [ ] Регрессий в существующей функциональности нет.

---

## Rollback стратегия (общая)

- **Каждый PR атомарный** — откат через `git revert <commit_hash>` или `git checkout develop && git branch -D <branch>`.
- **Миграций БД нет** — даже после релиза каждый PR можно откатить безболезненно.
- **Языковой переключатель остаётся всегда** — если что-то ломается на `ru`, пользователь переключается на `en` и продолжает работать.
- **Плохой перевод одной строки** → удалить ключ в `lang/ru/index.json` (fallback на en сработает автоматически) или поправить значение. Можно делать live-патчем на проде (это JSON).
- **Регрессия в коде** (хардкод-замена сломала компонент) → `git revert` соответствующий коммит.

---

## Открытые вопросы (фиксируем, проясним по ходу)

1. **Email-шаблоны:** есть ли встроенная i18n-инфраструктура в `@bigfin/email-components`? Будет понятно при попытке перевести (отдельный мини-PR после Task 14).
2. **PDF-шаблоны:** какие из них показываются клиенту и нужны на русском? Это часть sub-project ② (российская юр.специфика), не этого плана.
3. **Спорные термины:** «Bill» → «Счёт от поставщика», «Payment Receive» → «Получение платежа». Решаем по факту первого dogfooding'а — терминология меняется правкой JSON за минуту.

---

## После завершения этого плана

После закрытия Tasks 0-16 и Acceptance Criteria — **переход к следующему sub-project** из дорожной карты:

→ **Sub-project ②: Российская юридическая специфика** (ИНН/КПП/ОГРН, российские ставки НДС, печатные формы). Запуск через новый цикл brainstorming → spec → writing-plans.

Дорожная карта: [`docs/superpowers/specs/2026-05-22-fintablo-parity-roadmap.md`](../specs/2026-05-22-fintablo-parity-roadmap.md).
