# Implementation Plan: Русская локализация и терминологическая адаптация Bigfin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить полную русскую локаль в Bigfin (frontend + server) с правильной терминологией управленческого учёта, форматами дат/чисел, рублём как валютой по умолчанию для русской аудитории.

**Architecture:** Расширяем существующую i18n-инфраструктуру Bigfin (`react-intl-universal` на frontend, `nestjs-i18n` на server). Создаём `lang/ru/` и `i18n/ru/` папки. Английский остаётся как fallback. Перевод выполняем атомарно по модулям (16 PR). Каждый PR — один логический модуль, проверяемый и откатываемый независимо.

**Tech Stack:**
- Node 18.16.1, pnpm 9.x (из `.claude/CLAUDE.md`)
- Frontend: React 18 + Vite + `react-intl-universal` v2.4.7 + `@blueprintjs/core`
- Backend: NestJS + `nestjs-i18n` v10.4.9 + Knex.js + PostgreSQL
- Validation: yup v0.28 с кастомным `locale.tsx`
- Даты: `moment` v2.24+ (имеет встроенную русскую локаль)
- Числа/валюта: `accounting` v0.4 + `js-money` (RUB уже есть в `js-money`)

**Спека:** [`docs/superpowers/specs/2026-05-21-russian-localization-design.md`](../specs/2026-05-21-russian-localization-design.md)

---

## File Structure Overview

**Создаём (новые файлы):**
- `packages/webapp/src/lang/ru/index.json` — ~2400 переводов UI
- `packages/webapp/src/lang/ru/locale.tsx` — yup-валидация на русском
- `packages/webapp/src/utils/accountingFormat.ts` — настройка форматов чисел/валют
- `packages/webapp/scripts/lang-check.js` — валидатор парности ключей
- `packages/server/src/i18n/ru/*.json` — ~30 серверных JSON

**Модифицируем:**
- `packages/webapp/src/components/AppIntlLoader.tsx` — добавить `ru` в `SUPPORTED_LOCALES`
- `packages/webapp/src/constants/currencies.tsx` — добавить RUB
- `packages/webapp/src/containers/Setup/SetupOrganizationForm.tsx` — дефолт RUB при `lang=ru`
- `packages/webapp/src/routes/dashboard.tsx` — хардкод-breadcrumbs/pageTitles
- `packages/server/src/modules/Currencies/Currencies.constants.ts` — добавить RUB в `InitialCurrencies`
- `packages/webapp/package.json` — добавить script `lang:check`

**НЕ трогаем (за пределами скоупа):**
- `lang/ar/`, `lang/es/`, `lang/sv/` — мёртвый код, оставляем
- `lang/en/authentication.tsx` — мёртвый код (verified в спеке)
- Любые миграции БД, новые модели, новые формы
- **`@bigfin/email-components`** — workspace dep в package.json, но папки `packages/email-components/` нет в проекте (verified). Email-шаблоны переводятся, если/когда пакет появится — это отдельный спец.

---

## Конвенция работы для всех PR

**В корне всех команд (одинаково):**
```bash
cd D:/Кодинг/Bigfin
# Использовать Node 18.16.1 (если есть nvm/fnm)
node --version  # должно быть v18.16.1
pnpm --version  # должно быть 9.x
```

**Перед коммитом каждого PR:**
- `pnpm typecheck` — без ошибок
- `pnpm run lang:check` (после Task 1) — exit 0
- Запустить `pnpm dev:webapp`, проверить визуально в браузере
- Никаких новых ошибок в DevTools Console

**Format коммита (Conventional Commits, репо использует commitlint):**
```
feat(i18n): <description>
```

Все коммиты делаем в `D:/Кодинг/Bigfin/` репозитории (там `git`). Spec и план лежат в `D:/Кодинг/Bigfin/docs/` — не коммитятся (не в git).

---

## Task 1: Step 0 / PR #1 — Инфраструктура локали `ru`

**Goal:** Добавить русский язык в список поддерживаемых, создать заглушку JSON, перевести yup-валидацию, добавить скрипт проверки парности ключей. После этого PR при переключении на `ru` сайт работает: даты по-русски, UI-строки английские (намеренно — настоящий перевод в PR3+).

**Files:**
- Create: `packages/webapp/src/lang/ru/index.json` (копия en)
- Create: `packages/webapp/src/lang/ru/locale.tsx` (yup на русском)
- Create: `packages/webapp/scripts/lang-check.js`
- Modify: `packages/webapp/src/components/AppIntlLoader.tsx`
- Modify: `packages/webapp/package.json` (добавить script)

### Шаги

- [ ] **Step 1.1: Создать ветку**

```bash
cd D:/Кодинг/Bigfin
git checkout develop
git pull
git checkout -b feat/i18n-ru-foundation
```

- [ ] **Step 1.2: Создать заглушку `lang/ru/index.json` (копия en)**

```bash
cp packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
```

Сейчас содержимое русского JSON — английские строки. Это намеренно. Через `react-intl-universal` UI отрисует английский текст, потому что значения ключей — английские. Постепенно мы будем переводить ключ за ключом в следующих PR.

- [ ] **Step 1.3: Создать `lang/ru/locale.tsx` с переводом yup-сообщений**

Создать файл `packages/webapp/src/lang/ru/locale.tsx` с содержимым:

```typescript
// @ts-nocheck
import printValue from '../printValue';

export const locale = {
  mixed: {
    default: '${path} имеет неверное значение',
    required: '${path} — обязательное поле',
    oneOf: '${path} должно быть одним из: ${values}',
    notOneOf: '${path} не должно быть одним из: ${values}',
    notType: ({ path, type, value, originalValue }) => {
      let isCast = originalValue != null && originalValue !== value;
      let msg =
        `${path} должно быть типа \`${type}\`, ` +
        `но получено: \`${printValue(value, true)}\`` +
        (isCast
          ? ` (приведено из значения \`${printValue(originalValue, true)}\`).`
          : '.');

      if (value === null) {
        msg += `\n Если "null" — это пустое значение, пометьте схему как \`.nullable()\``;
      }

      return msg;
    },
    defined: '${path} должно быть определено',
  },
  string: {
    length: '${path} должно содержать ровно ${length} символов',
    min: '${path} должно содержать не менее ${min} символов',
    max: '${path} должно содержать не более ${max} символов',
    matches: '${path} должно соответствовать шаблону: "${regex}"',
    email: '${path} должно быть корректным email-адресом',
    url: '${path} должно быть корректным URL',
    trim: '${path} не должно содержать пробелов в начале и конце',
    lowercase: '${path} должно быть в нижнем регистре',
    uppercase: '${path} должно быть в верхнем регистре',
  },
  number: {
    min: '${path} должно быть больше или равно ${min}',
    max: '${path} должно быть меньше или равно ${max}',
    lessThan: '${path} должно быть меньше ${less}',
    moreThan: '${path} должно быть больше ${more}',
    notEqual: '${path} не должно быть равно ${notEqual}',
    positive: '${path} должно быть положительным числом',
    negative: '${path} должно быть отрицательным числом',
    integer: '${path} должно быть целым числом',
  },
  date: {
    min: '${path} должно быть позже ${min}',
    max: '${path} должно быть раньше ${max}',
  },
  boolean: {},
  object: {
    noUnknown:
      '${path} не должно содержать ключей, не указанных в схеме объекта',
  },
  array: {
    min: '${path} должно содержать не менее ${min} элементов',
    max: '${path} должно содержать не более ${max} элементов',
  },
};
```

- [ ] **Step 1.4: Модифицировать `AppIntlLoader.tsx` — добавить `ru` в `SUPPORTED_LOCALES`**

Прочитайте файл `packages/webapp/src/components/AppIntlLoader.tsx`. Найдите строки 16-19:

```typescript
const SUPPORTED_LOCALES = [
  { name: 'English', value: 'en' },
  { name: 'العربية', value: 'ar' },
];
```

Замените на:

```typescript
const SUPPORTED_LOCALES = [
  { name: 'English', value: 'en' },
  { name: 'Русский', value: 'ru' },
  { name: 'العربية', value: 'ar' },
];
```

**Объяснение:** `react-intl-universal` сравнивает `currentLocale` со списком `SUPPORTED_LOCALES`. Если совпадение есть — динамически импортирует `lang/${currentLocale}/index.json`. Без этого изменения переключение на `ru` не сработает (упадёт на проверку `find(SUPPORTED_LOCALES, ...)` и вернёт `en`).

**Примечание про `transformMomentLocale`:** в файле есть функция:
```typescript
function transformMomentLocale(currentLocale) {
  return currentLocale === 'ar' ? 'ar-ly' : currentLocale;
}
```
Её менять не нужно — `moment` уже понимает `'ru'` напрямую (есть встроенная локаль `ru`).

- [ ] **Step 1.5: Создать скрипт `lang-check.js`**

Создать файл `packages/webapp/scripts/lang-check.js`:

```javascript
#!/usr/bin/env node
/**
 * Сравнивает ключи между lang/en/index.json и lang/ru/index.json.
 * Выводит missing keys (есть в en, нет в ru) и extra keys (есть в ru, нет в en).
 * Завершается с exit 1 если есть missing keys.
 */
const fs = require('fs');
const path = require('path');

const LANG_DIR = path.join(__dirname, '..', 'src', 'lang');
const en = JSON.parse(fs.readFileSync(path.join(LANG_DIR, 'en', 'index.json'), 'utf8'));
const ru = JSON.parse(fs.readFileSync(path.join(LANG_DIR, 'ru', 'index.json'), 'utf8'));

const enKeys = new Set(Object.keys(en));
const ruKeys = new Set(Object.keys(ru));

const missing = [...enKeys].filter((k) => !ruKeys.has(k));
const extra = [...ruKeys].filter((k) => !enKeys.has(k));

console.log(`English keys: ${enKeys.size}`);
console.log(`Russian keys: ${ruKeys.size}`);
console.log(`Missing in ru (есть в en): ${missing.length}`);
console.log(`Extra in ru (нет в en): ${extra.length}`);

if (missing.length > 0) {
  console.log('\nMissing keys (показано до 20):');
  missing.slice(0, 20).forEach((k) => console.log(`  - ${k}`));
}
if (extra.length > 0) {
  console.log('\nExtra keys (показано до 20):');
  extra.slice(0, 20).forEach((k) => console.log(`  + ${k}`));
}

if (missing.length > 0) {
  process.exit(1);
}
```

- [ ] **Step 1.6: Добавить script `lang:check` в `package.json` webapp**

В файле `packages/webapp/package.json` в секции `"scripts"` добавить строку:

```json
"lang:check": "node scripts/lang-check.js",
```

(можно вставить рядом с другими типа `"typecheck"`).

- [ ] **Step 1.7: Проверить — typecheck**

```bash
cd D:/Кодинг/Bigfin
pnpm typecheck
```

Ожидаем: 0 ошибок. Если ошибки — скорее всего проблема с `locale.tsx` (синтаксис или импорт `printValue`). Проверьте файл `D:/Кодинг/Bigfin/packages/webapp/src/lang/en/locale.tsx` как образец импорта.

- [ ] **Step 1.8: Проверить — lang:check**

```bash
cd D:/Кодинг/Bigfin
pnpm --filter @bigfin/webapp run lang:check
```

Ожидаем вывод:
```
English keys: ~2392
Russian keys: ~2392
Missing in ru (есть в en): 0
Extra in ru (нет в en): 0
```

Exit code: 0.

- [ ] **Step 1.9: Проверить визуально в браузере**

```bash
cd D:/Кодинг/Bigfin
pnpm dev:webapp
```

Открыть `http://localhost:4000?lang=ru` в браузере.

**Что проверить:**
1. ✓ Сайт открывается, не падает с белым экраном
2. ✓ В DevTools Console нет ошибок "Cannot find module" или "Locale not supported"
3. ✓ В UI текст пока английский (это намеренно — заглушка)
4. ✓ Где есть даты — формат русский (например, `21 мая 2026`, а не `May 21, 2026`)
5. ✓ Если в UI есть переключатель языка — `Русский` появляется в списке

Также проверьте обратную совместимость: открыть `http://localhost:4000?lang=en` — должно работать как раньше.

- [ ] **Step 1.10: Откат-план (на случай если что-то пошло не так)**

Если шаги 1.7-1.9 провалились:
```bash
cd D:/Кодинг/Bigfin
git checkout develop      # вернуться на стабильную ветку
git branch -D feat/i18n-ru-foundation   # удалить сломанную ветку
```

Все изменения откатятся к рабочему состоянию.

- [ ] **Step 1.11: Коммит**

```bash
cd D:/Кодинг/Bigfin
git add packages/webapp/src/lang/ru/ \
        packages/webapp/src/components/AppIntlLoader.tsx \
        packages/webapp/scripts/lang-check.js \
        packages/webapp/package.json
git status   # проверить что добавилось то что нужно
git commit -m "feat(i18n): add ru locale infrastructure with yup translations and lang-check script"
```

- [ ] **Step 1.12: Push и создание PR**

```bash
git push -u origin feat/i18n-ru-foundation
gh pr create --title "feat(i18n): инфраструктура локали ru (#1 из 16)" --body "$(cat <<'EOF'
## Что в PR

- Добавлен \`'ru'\` в \`SUPPORTED_LOCALES\` в \`AppIntlLoader.tsx\`
- Создан \`lang/ru/index.json\` — заглушка (копия en, перевод в следующих PR)
- Создан \`lang/ru/locale.tsx\` — yup-валидация на русском
- Создан скрипт \`scripts/lang-check.js\` — проверка парности ключей en↔ru
- Добавлен npm-script \`lang:check\`

## Что НЕ в PR

- Реальные переводы UI-строк (будут в PR #3-13 по модулям)
- Серверная локаль (PR #14)
- Валюта RUB (PR #2)

## Проверка

- [x] \`pnpm typecheck\` — 0 ошибок
- [x] \`pnpm run lang:check\` — 0 missing, 0 extra
- [x] \`http://localhost:4000?lang=ru\` открывается, даты по-русски
- [x] \`http://localhost:4000?lang=en\` работает как раньше (регрессии нет)

## Откат

\`git revert\` — атомарный, без миграций.

EOF
)"
```

---

## Task 2: Step 0 / PR #2 — Валюта RUB + русские числовые форматы

**Goal:** Добавить рубль как валюту, доступную при создании организации. При русской локали — RUB предзаполнен как дефолт. Числа отображаются в формате `1 234,56 ₽`.

**Files:**
- Modify: `packages/webapp/src/constants/currencies.tsx`
- Modify: `packages/server/src/modules/Currencies/Currencies.constants.ts`
- Modify: `packages/webapp/src/lang/en/index.json` (добавить ключ `russian_ruble`)
- Modify: `packages/webapp/src/lang/ru/index.json` (тот же ключ с переводом)
- Modify: `packages/webapp/src/containers/Setup/SetupOrganizationForm.tsx` (UI-дефолт)
- Create: `packages/webapp/src/utils/accountingFormat.ts`

### Шаги

- [ ] **Step 2.1: Создать ветку (от develop, после мерджа PR #1)**

```bash
cd D:/Кодинг/Bigfin
git checkout develop
git pull
git checkout -b feat/i18n-ru-currency
```

- [ ] **Step 2.2: Добавить ключ `russian_ruble` в `lang/en/index.json` и `lang/ru/index.json`**

В `lang/en/index.json` (обычно ключи отсортированы по алфавиту — найдите место рядом с `"euro": "Euro"`) добавьте:
```json
"russian_ruble": "Russian Ruble",
```

В `lang/ru/index.json` добавьте тот же ключ с переводом:
```json
"russian_ruble": "Российский рубль",
```

- [ ] **Step 2.3: Добавить RUB в `constants/currencies.tsx`**

Изменить `packages/webapp/src/constants/currencies.tsx` строки 6-10:

Было:
```typescript
export const getCurrencies = () => [
  { name: intl.get('us_dollar'), code: 'USD' },
  { name: intl.get('euro'), code: 'EUR' },
  { name: intl.get('libyan_diner'), code: 'LYD' },
];
```

Стало:
```typescript
export const getCurrencies = () => [
  { name: intl.get('us_dollar'), code: 'USD' },
  { name: intl.get('euro'), code: 'EUR' },
  { name: intl.get('russian_ruble'), code: 'RUB' },
  { name: intl.get('libyan_diner'), code: 'LYD' },
];
```

- [ ] **Step 2.4: Добавить RUB в server seed**

В файле `packages/server/src/modules/Currencies/Currencies.constants.ts`:

Было:
```typescript
export const InitialCurrencies = [
  'USD',
  'CAD',
  'EUR',
  'LYD',
  'GBP',
  'CNY',
  'AUD',
  'INR',
];
```

Стало:
```typescript
export const InitialCurrencies = [
  'USD',
  'CAD',
  'EUR',
  'RUB',
  'LYD',
  'GBP',
  'CNY',
  'AUD',
  'INR',
];
```

**Что это делает:** При создании новой организации сервер сидит таблицу `currencies` записями из этого списка. `js-money/lib/currency` имеет RUB готовым — `Currencies['RUB']` вернёт `{ code: 'RUB', name: 'Russian ruble', symbol: '₽' }`. Поэтому никаких дополнительных полей не нужно — код переиспользует существующий сервис `seedCurrencyByCode`.

- [ ] **Step 2.5: Создать helper `accountingFormat.ts`**

Создать файл `packages/webapp/src/utils/accountingFormat.ts`:

```typescript
import accounting from 'accounting';
import intl from 'react-intl-universal';

/**
 * Configures accounting.js global settings based on current locale.
 * Call once after intl.init() completes.
 *
 * For 'ru': thousand separator = space, decimal = comma (1 234,56)
 * For others: keeps accounting.js defaults (1,234.56)
 */
export function configureAccountingForLocale(currentLocale: string): void {
  if (currentLocale === 'ru') {
    accounting.settings.number = {
      precision: 2,
      thousand: ' ',     // non-breaking space (1 234,56)
      decimal: ',',
    };
    accounting.settings.currency = {
      symbol: '₽',        // ₽
      format: '%v %s',          // 1 234,56 ₽
      decimal: ',',
      thousand: ' ',
      precision: 2,
    };
  }
  // Для en и других локалей не трогаем — используются дефолты accounting.js.
}
```

- [ ] **Step 2.6: Подключить helper в `AppIntlLoader.tsx`**

В `packages/webapp/src/components/AppIntlLoader.tsx` после строки с импортами добавить:

```typescript
import { configureAccountingForLocale } from '@/utils/accountingFormat';
```

Затем в функции `useAppLoadLocales` (строки 80-95) после `intl.init(...)`:

Было:
```typescript
React.useEffect(() => {
  loadLocales(currentLocale)
    .then((results) => {
      return intl.init({
        currentLocale,
        locales: {
          [currentLocale]: results,
        },
      });
    })
    .then(() => {
      moment.locale(transformMomentLocale(currentLocale));
      setIsLoading(false);
    });
}, [currentLocale, stopLoading]);
```

Стало (добавили один вызов после `moment.locale(...)`):
```typescript
React.useEffect(() => {
  loadLocales(currentLocale)
    .then((results) => {
      return intl.init({
        currentLocale,
        locales: {
          [currentLocale]: results,
        },
      });
    })
    .then(() => {
      moment.locale(transformMomentLocale(currentLocale));
      configureAccountingForLocale(currentLocale);
      setIsLoading(false);
    });
}, [currentLocale, stopLoading]);
```

- [ ] **Step 2.7: Сделать RUB дефолтом в форме setup при локали `ru`**

Поток инициализации формы (verified):
1. `WizardSetupPage.tsx` → `SetupRightSection` → `SetupWizardContent` → `SetupOrganizationPage` → `SetupOrganizationForm.tsx`
2. `SetupOrganizationPage.tsx` оборачивает форму Formik'ом и передаёт `initialValues`.

Прочитайте `packages/webapp/src/containers/Setup/SetupOrganizationPage.tsx` — найдите `initialValues` (или место передачи через `withFormik` / `<Formik initialValues={...}>`).

Замените initialValues так, чтобы дефолт `baseCurrency` зависел от локали:

```typescript
import intl from 'react-intl-universal';

// Где определяются initialValues (где-то в SetupOrganizationPage.tsx):
const initialValues: SetupOrganizationFormValues = {
  name: '',
  location: '',
  baseCurrency: intl.getInitOptions()?.currentLocale === 'ru' ? 'RUB' : '',
  language: '',
  fiscalYear: '',
  timezone: '',
};
```

**Если `intl.getInitOptions()` возвращает `undefined`** (зависит от версии библиотеки) — fallback на `localStorage.getItem('lang') === 'ru'`:

```typescript
const isRu = (
  (intl.getInitOptions && intl.getInitOptions()?.currentLocale) ||
  localStorage.getItem('lang')
) === 'ru';

const initialValues: SetupOrganizationFormValues = {
  name: '',
  location: '',
  baseCurrency: isRu ? 'RUB' : '',
  language: '',
  fiscalYear: '',
  timezone: '',
};
```

Если в `SetupOrganizationPage.tsx` нет `initialValues` напрямую — поднимитесь по дереву компонентов вверх до места, где они объявлены (возможно, через `withFormik({ mapPropsToValues: ... })`).

**Альтернатива (если поднять initialValues сложно):** добавить `useEffect` в `SetupOrganizationForm.tsx`, который вызывает `setFieldValue('baseCurrency', 'RUB')` если форма пустая и локаль = ru:

```typescript
import { useFormikContext } from 'formik';
import intl from 'react-intl-universal';

// Внутри SetupOrganizationForm:
const { values, setFieldValue } = useFormikContext<SetupOrganizationFormValues>();

React.useEffect(() => {
  const locale = intl.getInitOptions?.()?.currentLocale || localStorage.getItem('lang');
  if (locale === 'ru' && !values.baseCurrency) {
    setFieldValue('baseCurrency', 'RUB');
  }
}, []);
```

Выбрать стратегию по факту просмотра кода.

- [ ] **Step 2.8: Проверить — typecheck + lang:check**

```bash
cd D:/Кодинг/Bigfin
pnpm typecheck
pnpm --filter @bigfin/webapp run lang:check
```

Ожидаем: typecheck 0 ошибок, lang:check 0 missing/extra (потому что добавили ключ в оба JSON).

- [ ] **Step 2.9: Проверить визуально**

```bash
pnpm dev:webapp
```

Сценарий проверки:
1. Открыть `http://localhost:4000?lang=ru`
2. Зайти на форму создания организации (`/setup` или эквивалент)
3. В выпадающем списке валют найти `RUB - Russian ruble` (название из js-money пока не переведено — это нормально, переведётся в модульном PR)
4. Если возможно — создать тестовую организацию с RUB
5. В дашборде сумма отображается как `1 234,56 ₽` (формат «1<пробел>234<запятая>56<пробел>₽»)
6. Обратная совместимость: `?lang=en` — суммы как `$1,234.56`

- [ ] **Step 2.10: Откат-план**

Все изменения локальны и атомарны. Откат:
```bash
git checkout develop
git branch -D feat/i18n-ru-currency
```

Если уже создана тестовая организация — она остаётся в БД с базовой валютой RUB, но это не критично (можно удалить через UI или оставить).

- [ ] **Step 2.11: Коммит**

```bash
git add packages/webapp/src/constants/currencies.tsx \
        packages/webapp/src/utils/accountingFormat.ts \
        packages/webapp/src/components/AppIntlLoader.tsx \
        packages/webapp/src/containers/Setup/SetupOrganizationForm.tsx \
        packages/webapp/src/lang/en/index.json \
        packages/webapp/src/lang/ru/index.json \
        packages/server/src/modules/Currencies/Currencies.constants.ts
git status
git commit -m "feat(i18n): add RUB currency and Russian number formats"
```

- [ ] **Step 2.12: Push и PR**

```bash
git push -u origin feat/i18n-ru-currency
gh pr create --title "feat(i18n): валюта RUB + числовые форматы (#2 из 16)" --body "...(аналогично PR #1)"
```

---

## Tasks 3-13: Перевод по модулям (шаблон)

> **Эти задачи однотипные. Полные шаги — в Task 3 (PR #3 Аутентификация). Для остальных модулей повторите шаги Task 3 с заменой имени модуля и списка ключей.**

### Общий шаблон для модульных PR

Каждый модульный PR следует одинаковому алгоритму:

1. **Создать ветку** `feat/i18n-ru-<module>` от `develop`
2. **Найти все ключи модуля** в `lang/en/index.json`
3. **Сгенерировать русские переводы** (с использованием [таблицы терминологии из спеки](../specs/2026-05-21-russian-localization-design.md#32-ключевые-терминологические-решения))
4. **Заменить значения** соответствующих ключей в `lang/ru/index.json`
5. **Найти хардкод-строки в коде** модуля (grep по `containers/<Module>/**/*.tsx`)
6. **Заменить хардкод на `intl.get('...')`** + при необходимости добавить новые ключи в оба JSON
7. **Проверить:** `pnpm typecheck`, `pnpm run lang:check`, визуально в браузере на `?lang=ru`
8. **Коммит** в формате `feat(i18n): translate <module> module`
9. **Push и PR**

---

## Task 3: PR #3 — Модуль Аутентификация

**Goal:** Перевести экраны входа, регистрации, восстановления пароля.

**Files:**
- Modify: `packages/webapp/src/lang/ru/index.json`
- Modify (если есть хардкод): `packages/webapp/src/containers/Authentication/**/*.tsx`

### Шаги

- [ ] **Step 3.1: Создать ветку**

```bash
cd D:/Кодинг/Bigfin
git checkout develop && git pull
git checkout -b feat/i18n-ru-authentication
```

- [ ] **Step 3.2: Найти ключи аутентификации в `lang/en/index.json`**

Открыть `packages/webapp/src/lang/en/index.json`. Найти ключи, относящиеся к аутентификации. По первичному анализу спеки (строки 1-40 файла) это:

```
email_or_phone_number, password, login, invalid_email_or_phone_number,
required, reset_password, the_user_has_been_suspended_from_admin,
email_and_password_entered_did_not_match, field_name_must_be_number, name,
quick_find, log_in, forgot_my_password, keep_me_logged_in, dont_have_an_account,
sign_up, return_to, sign_in, enter_the_email_address_associated_with_your_account,
create_an_account, need_bigfin_account, show, hide, an_unexpected_error_occurred,
welcome_to_bigfin, enter_your_personal_information, first_name, last_name,
phone_number, you_email_address_is, you_will_use_this_address_to_sign_in_to_bigfin,
signing_in_or_creating, and, create_account, success, register_a_new_organization
```

Используйте grep чтобы найти их по префиксам/паттернам:
```bash
grep -nE '"(email|password|login|sign_in|sign_up|reset_password|forgot)' packages/webapp/src/lang/en/index.json
```

- [ ] **Step 3.3: Перевести ключи аутентификации в `lang/ru/index.json`**

Открыть `packages/webapp/src/lang/ru/index.json` и для каждого найденного ключа заменить английское значение на русское. Список переводов:

```json
{
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
}
```

**ВНИМАНИЕ к ключу `signing_in_or_creating`:** содержит HTML `<a>` — оставить теги на месте, переводить только текст между тегами. `react-intl-universal` обрабатывает HTML через `intl.getHTML()`.

- [ ] **Step 3.4: Найти хардкод-строки в `containers/Authentication`**

```bash
cd D:/Кодинг/Bigfin
grep -rnE "(>[A-Z][a-z]+|'[A-Z][a-z]+ [a-z])" packages/webapp/src/containers/Authentication 2>&1 | head -30
```

Каждое найденное место — потенциальный хардкод. Откройте файл, проверьте: если это пользовательский текст (label, placeholder, заголовок) — замените на `intl.get('key_name')` и добавьте ключ в оба JSON.

- [ ] **Step 3.5: Проверить**

```bash
pnpm typecheck
pnpm --filter @bigfin/webapp run lang:check
pnpm dev:webapp
```

В браузере открыть `http://localhost:4000?lang=ru` → `/auth/login`. Все строки должны быть на русском. Также проверить `/auth/register` и `/auth/reset-password` (если такие маршруты).

- [ ] **Step 3.6: Коммит и PR**

```bash
git add packages/webapp/src/lang/ru/index.json
# + любые модифицированные .tsx файлы аутентификации, если были
git commit -m "feat(i18n): translate authentication module to Russian"
git push -u origin feat/i18n-ru-authentication
gh pr create --title "feat(i18n): аутентификация на русском (#3 из 16)" --body "..."
```

---

## Tasks 4-13: Остальные модули (краткий список)

> Для каждого модуля повторить шаги Task 3, заменив имя модуля и набор ключей. Ключи берутся из `lang/en/index.json` по префиксам и контексту.

### Task 4: PR #4 — Навигация и сайдбар

- **Ветка:** `feat/i18n-ru-navigation`
- **Ключи:** `sidebar.*`, ключи с `breadcrumb` (часть в `routes/dashboard.tsx` — хардкод, его трогаем в Task 15)
- **Файлы для проверки хардкода:** `packages/webapp/src/components/Dashboard/Sidebar/**/*.tsx`, `packages/webapp/src/components/Dashboard/Topbar/**/*.tsx`
- **Терминологические решения из спеки:** Workspace → Организация, Customer → Клиент, Vendor → Поставщик, Item → Товар или Услуга
- **Критичность:** ВЫСОКАЯ — видно на всех страницах
- **Объём:** ~50 строк

### Task 5: PR #5 — Дашборд

- **Ветка:** `feat/i18n-ru-dashboard`
- **Ключи:** `dashboard.*`, ключи с виджетов (revenue, expenses, profit)
- **Файлы:** `packages/webapp/src/containers/Dashboard/**/*.tsx`
- **Терминология:** Revenue → Выручка, Expenses → Расходы, Net Income → Чистая прибыль
- **Объём:** ~120 строк

### Task 6: PR #6 — Клиенты и Поставщики

- **Ветка:** `feat/i18n-ru-contacts`
- **Ключи:** `customers.*`, `vendors.*`, `contact.*`
- **Файлы:** `packages/webapp/src/containers/Customers/**/*.tsx`, `packages/webapp/src/containers/Vendors/**/*.tsx`
- **Терминология:** Customer → Клиент, Vendor → Поставщик
- **Объём:** ~200 строк
- **⚠ Спорное:** "Contact" — общая страница контрагентов. Перевод: "Контрагенты"

### Task 7: PR #7 — Товары и услуги

- **Ветка:** `feat/i18n-ru-items`
- **Ключи:** `items.*`, `item.*`, `categories.*`
- **Файлы:** `packages/webapp/src/containers/Items/**/*.tsx`
- **Терминология:** Item → Товар или Услуга, Inventory Item → Складской товар, Service Item → Услуга
- **Объём:** ~150 строк

### Task 8: PR #8 — Продажи (Счета, КП, Поступления, Возвраты)

- **Ветка:** `feat/i18n-ru-sales`
- **Ключи:** `invoice.*`, `invoices.*`, `estimate.*`, `receipt.*`, `payment_receive.*`, `credit_note.*`
- **Файлы:** `packages/webapp/src/containers/Sales/**/*.tsx`, `packages/webapp/src/containers/PaymentReceives/**/*.tsx`, `packages/webapp/src/containers/CreditNotes/**/*.tsx`
- **Терминология:** Invoice → Счёт, Estimate → Коммерческое предложение (КП), Receipt → Поступление, Credit Note → Возврат клиенту
- **Критичность:** ВЫСОКАЯ — основной поток
- **Объём:** ~400 строк
- **⚠ Спорное:** "Payment Receive" → "Получение платежа" или "Оплата"

### Task 9: PR #9 — Закупки

- **Ветка:** `feat/i18n-ru-purchases`
- **Ключи:** `bill.*`, `bills.*`, `expenses.*`, `bill_payment.*`, `vendor_credit.*`
- **Файлы:** `packages/webapp/src/containers/Bills/**/*.tsx`, `packages/webapp/src/containers/Expenses/**/*.tsx`, `packages/webapp/src/containers/BillPayments/**/*.tsx`, `packages/webapp/src/containers/VendorCredits/**/*.tsx`
- **Терминология:** Bill → Счёт от поставщика, Bill Payment → Оплата поставщику, Expense → Расход, Vendor Credit → Возврат поставщику
- **Критичность:** ВЫСОКАЯ
- **Объём:** ~350 строк

### Task 10: PR #10 — Банк

- **Ветка:** `feat/i18n-ru-banking`
- **Ключи:** `banking.*`, `bank_account.*`, `cash_flow.*` (только UI, отчёт — в Task 11), `reconciliation.*`, `transaction.*`
- **Файлы:** `packages/webapp/src/containers/CashFlow/**/*.tsx` (банковский раздел), `packages/webapp/src/containers/BankingTransactions/**/*.tsx`
- **Терминология:** Bank Account → Банковский счёт / Касса (по контексту), Transaction → Операция, Reconciliation → Сверка
- **Объём:** ~200 строк

### Task 11: PR #11 — Финансовые отчёты ⚠ КРИТИЧЕСКАЯ ТЕРМИНОЛОГИЯ

- **Ветка:** `feat/i18n-ru-reports`
- **Ключи:** `cash_flow_statement.*`, `profit_loss_sheet.*`, `balance_sheet.*`, `trial_balance_sheet.*`, `general_ledger.*`, `journal.*`
- **Файлы:** `packages/webapp/src/containers/FinancialStatements/**/*.tsx`
- **⚠ Терминология (см. таблицу в спеке):**
  - Cash Flow Statement → **ДДС** (Движение денежных средств)
  - Profit & Loss → **Прибыль и Убытки**
  - Balance Sheet → **Баланс**
  - Trial Balance → **Оборотно-сальдовая ведомость** (ОСВ)
  - Journal Entry → **Операция** (не «Проводка»)
  - Chart of Accounts → **Статьи учёта**
- **Особое внимание:** строки внутри отчётов (header колонок, итоговые строки) часто хардкодом — нужен тщательный grep
- **Объём:** ~300 строк
- **Рекомендация:** Этот PR делать после консультации с пользователем по каждому термину — это лицо продукта

### Task 12: PR #12 — Настройки

- **Ветка:** `feat/i18n-ru-settings`
- **Ключи:** `preferences.*`, `settings.*`, `roles.*`, `users.*`, `branches.*`, `currencies.*`
- **Файлы:** `packages/webapp/src/containers/Preferences/**/*.tsx`
- **Терминология:** Branches → Подразделения, Roles → Роли, Users → Пользователи
- **Объём:** ~250 строк

### Task 13: PR #13 — Склад и прочее

- **Ветка:** `feat/i18n-ru-misc`
- **Ключи:** `warehouses.*`, `inventory_adjustment.*`, `import.*`, `export.*`, `audit_log.*`, `notification.*`
- **Файлы:** `packages/webapp/src/containers/Warehouses/**/*.tsx`, `packages/webapp/src/containers/InventoryAdjutments/**/*.tsx`, `packages/webapp/src/containers/Import/**/*.tsx`, `packages/webapp/src/containers/AuditLogs/**/*.tsx`
- **Терминология:** Warehouse → Склад, Inventory Adjustment → Корректировка остатков
- **Объём:** ~200 строк

**После Task 13:** запустить `pnpm run lang:check` — должно показать `Missing in ru: 0`. Если есть остатки — это незатронутые в модулях ключи, добавить отдельным мини-коммитом.

---

## Task 14: PR #14 — Серверная локаль `ru`

**Goal:** Перевести валидационные сообщения, заголовки отчётов и колонок, которые приходят с сервера.

**Files:**
- Create: `packages/server/src/i18n/ru/*.json` (~30 файлов)

### Шаги

- [ ] **Step 14.1: Создать ветку**

```bash
cd D:/Кодинг/Bigfin
git checkout develop && git pull
git checkout -b feat/i18n-ru-server
```

- [ ] **Step 14.2: Скопировать структуру `en/` в `ru/`**

```bash
cp -r packages/server/src/i18n/en packages/server/src/i18n/ru
```

После этого в `ru/` есть все ~30 файлов с английским содержимым. Это заглушка.

- [ ] **Step 14.3: Перевести содержимое по файлам**

Для каждого файла в `i18n/ru/` (`account.json`, `bill.json`, `balance_sheet.json` и т.д.) открыть, перевести значения. Терминология — из таблицы спеки.

**Приоритет файлов** (по влиянию на пользователя):
1. `balance_sheet.json` — Баланс (заголовки колонок)
2. `cash_flow_statement.json` — ДДС
3. `profit_loss_sheet.json` — Прибыль и Убытки
4. `trial_balance_sheet.json` — ОСВ
5. `invoice.json`, `bill.json`, `expense.json` — операционные сообщения об ошибках
6. Остальные — по списку

- [ ] **Step 14.4: Проверить, что `nestjs-i18n` подхватывает `ru/`**

Конфигурация в `App.module.ts` (строки 125-139, прочитано ранее) уже имеет:
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

Это **автоматически** загружает все папки в `i18n/` (в т.ч. новую `ru/`). Никаких изменений в коде не нужно.

- [ ] **Step 14.5: Проверить вручную через API**

```bash
cd D:/Кодинг/Bigfin
pnpm dev:server
```

В другом терминале — запрос с заголовком языка:
```bash
curl -H "Accept-Language: ru" http://localhost:3000/api/health
```

Или через `?lang=ru` query-параметр. Сделать заведомо невалидный запрос (например, создание счёта без поля `name`) — в ответе ошибка должна быть на русском.

- [ ] **Step 14.6: Коммит и PR**

```bash
git add packages/server/src/i18n/ru/
git commit -m "feat(i18n): translate server-side messages to Russian"
git push -u origin feat/i18n-ru-server
gh pr create --title "feat(i18n): серверные сообщения на русском (#14 из 16)" --body "..."
```

---

## Task 15: PR #15 — Замена хардкод-строк в маршрутах

**Goal:** Найти и заменить все хардкод английские строки в `routes/dashboard.tsx` и других местах, где используются `breadcrumb:`, `pageTitle:` напрямую.

**Files:**
- Modify: `packages/webapp/src/routes/dashboard.tsx`
- Modify: `packages/webapp/src/lang/en/index.json` + `lang/ru/index.json` (новые ключи)
- Possibly: другие файлы routes/

### Шаги

- [ ] **Step 15.1: Создать ветку**

```bash
git checkout develop && git pull
git checkout -b feat/i18n-ru-hardcoded
```

- [ ] **Step 15.2: Найти все хардкод-места**

```bash
# breadcrumbs/pageTitles в маршрутах
grep -nE "(breadcrumb|pageTitle): '[A-Z]" packages/webapp/src/routes/*.tsx packages/webapp/src/routes/**/*.tsx

# Хардкод label в Stepper и других компонентах
grep -nE "label=\{'[A-Z]" packages/webapp/src/containers/Setup/*.tsx
grep -rnE "label=\{'[A-Z]" packages/webapp/src/components 2>&1 | head -20

# Общий поиск английских строк в JSX
grep -rnE ">[A-Z][a-z]+ [a-z]+ ?<" packages/webapp/src/containers 2>&1 | head -20
```

**Известные места хардкода (verified):**
- `routes/dashboard.tsx`: строки 14-15, `breadcrumb: 'Accounts Import'`, `pageTitle: 'Accounts Import'`
- `containers/Setup/SetupWizardContent.tsx`: строки 36, 40, 44, 48 — `Stepper.Step label={'Subscription'}`, `label={'Organization'}`, `label={'Initializing'}`, `label={'Congrats'}`

Каждая такая строка — кандидат на замену.

- [ ] **Step 15.3: Заменить по одной**

Для каждой:
1. Придумать ключ (snake_case, например `accounts_import`)
2. Добавить в `lang/en/index.json`: `"accounts_import": "Accounts Import",`
3. Добавить в `lang/ru/index.json`: `"accounts_import": "Импорт статей учёта",`
4. Заменить в routes/dashboard.tsx: `breadcrumb: intl.get('accounts_import'),`

**Если ключ уже существует** в `lang/en/index.json` (например `accounts_import` есть как `intl.get('accounts_import')` где-то ещё) — переиспользовать, не дублировать.

- [ ] **Step 15.4: Проверить**

```bash
pnpm typecheck
pnpm --filter @bigfin/webapp run lang:check
pnpm dev:webapp
```

На `?lang=ru` походить по разделам — breadcrumbs должны быть на русском.

- [ ] **Step 15.5: Коммит и PR**

```bash
git add packages/webapp/src/routes/dashboard.tsx \
        packages/webapp/src/lang/en/index.json \
        packages/webapp/src/lang/ru/index.json
git commit -m "feat(i18n): replace hardcoded breadcrumbs/pageTitles with intl.get()"
git push -u origin feat/i18n-ru-hardcoded
gh pr create --title "feat(i18n): хардкод-строки в маршрутах (#15 из 16)" --body "..."
```

---

## Task 16: PR #16 — Русские демо-данные

**Goal:** При создании демонстрационной организации сидить русских контрагентов, товары, расходы.

**Files:**
- Modify: `packages/server/src/modules/.../<InitialSeeder>.ts` (нужно найти точный путь)

### Шаги

- [ ] **Step 16.1: Создать ветку**

```bash
git checkout develop && git pull
git checkout -b feat/i18n-ru-seed
```

- [ ] **Step 16.2: Найти существующий сидер демо-данных**

```bash
grep -rln "demo\|sample\|seed.*data" packages/server/src --include="*.ts" | head -20
find packages/server/src -name "*Seed*.ts" -o -name "*Demo*.ts" -o -name "*Sample*.ts" 2>&1
```

Найти основной seeder для демо-контрагентов / товаров / расходов.

- [ ] **Step 16.3: Создать русские данные**

Заменить английские демо-имена на русские. Пример:

```typescript
const DEMO_CUSTOMERS = [
  { displayName: 'ООО "Ромашка"', email: 'info@romashka.ru', currencyCode: 'RUB' },
  { displayName: 'ИП Иванов И.И.', email: 'ivanov@example.ru', currencyCode: 'RUB' },
  { displayName: 'ООО "Лютик-Плюс"', email: 'contact@lutik.ru', currencyCode: 'RUB' },
];

const DEMO_VENDORS = [
  { displayName: 'ООО "ОфисМаркет"', email: 'sales@office.ru', currencyCode: 'RUB' },
  { displayName: 'ООО "АренДА"', email: 'arenda@example.ru', currencyCode: 'RUB' },
];

const DEMO_ITEMS = [
  { name: 'Консалтинговые услуги', type: 'service', sellPrice: 5000 },
  { name: 'Веб-разработка', type: 'service', sellPrice: 100000 },
  { name: 'Подписка на сервис', type: 'service', sellPrice: 990 },
];

const DEMO_EXPENSES = [
  { description: 'Аренда офиса', amount: 80000 },
  { description: 'Налоги (УСН)', amount: 25000 },
  { description: 'Интернет и связь', amount: 3500 },
];
```

**Сохранить старые английские демо-данные** под отдельным экспортом (например `DEMO_CUSTOMERS_EN`) — обратная совместимость для англоязычной локали. Логика выбора:

```typescript
function getDemoCustomers(locale: string) {
  return locale === 'ru' ? DEMO_CUSTOMERS_RU : DEMO_CUSTOMERS_EN;
}
```

- [ ] **Step 16.4: Проверить**

Создать новую тестовую организацию с локалью `ru` через UI или CLI:
```bash
pnpm tenants:seed:latest
```

(Точная команда зависит от сидера — может потребоваться флаг `--locale=ru`.)

В UI зайти в контрагенты — должны быть ООО "Ромашка" и т.д.

- [ ] **Step 16.5: Коммит и PR**

```bash
git add packages/server/src/modules/.../<seeder files>
git commit -m "feat(i18n): add Russian demo data for new organizations"
git push -u origin feat/i18n-ru-seed
gh pr create --title "feat(i18n): русские демо-данные (#16 из 16)" --body "..."
```

---

## Acceptance Criteria (для всего проекта)

После завершения всех 16 PR проверить:

- [ ] `?lang=ru` показывает все UI-строки на русском (кроме намеренных исключений)
- [ ] Даты в формате `21 мая 2026` или `21.05.2026`
- [ ] Числа в формате `1 234,56`
- [ ] Валюта `₽` доступна, можно сделать дефолтной
- [ ] Демо-данные на русском (ООО, ИП)
- [ ] Финансовые отчёты названы `ДДС`, `Прибыль и Убытки`, `Баланс`, `ОСВ`
- [ ] Серверные ошибки на русском при `Accept-Language: ru`
- [ ] `pnpm run lang:check` exit 0
- [ ] Существующие Playwright e2e на `en` проходят
- [ ] Регрессий в существующей функциональности нет

---

## Откат стратегии

**Каждый PR атомарный** — откат через `git revert <commit_hash>`.

**Нет миграций БД** в скоупе → даже после релиза каждый PR можно откатить безболезненно.

**Языковой переключатель остаётся всегда** — если что-то ломается на `ru`, пользователь переключается на `en` и продолжает работать.

**Плохая строка перевода** → удалить ключ в `lang/ru/index.json`, fallback на en сработает автоматически. Можно делать live-патчем на проде.

---

## Открытые вопросы для прояснения по ходу

1. **Email-шаблоны:** есть ли встроенная i18n в `@bigfin/email-components`? — выяснится при попытке перевести в Task 14.
2. **PDF-шаблоны:** какие из них показываются клиенту и нужны на русском? — отдельный спец, но в Task 13/14 проверим объём.
3. **Спорные термины** ("Bill" → "Счёт от поставщика", "Payment Receive" → "Оплата") — фиксируем сейчас, итерируем после первых тестов на пользователях.

---

## Что после завершения плана

После 16 PR — переход к следующим под-проектам из общей задачи:
- **③ UX-улучшения для непрофи** (отдельный brainstorming → spec → plan)
- **④ Финальный ребрендинг** (отдельный brainstorming → spec → plan)
- Возможно: **⑤ Российские юр.формы** (ИНН, КПП, ОГРН) — отдельный спец
- Возможно: **⑥ Российские PDF-шаблоны счетов/актов** — отдельный спец
