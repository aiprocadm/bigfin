# Русификация, Этап 0 «Фундамент» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Разблокировать русский язык на сервере и сделать его языком по умолчанию для интерфейса и новых организаций.

**Architecture:** Язык организации хранится в `tenants_metadata` (system-схема) и валидируется DTO через `@IsIn(ACCEPTED_LOCALES)`; язык интерфейса определяется в `AppIntlLoader.tsx` (URL `?lang=` → cookie `locale` → localStorage `lang` → дефолт) и синхронизируется с языком организации через cookie в `DashboardBoot.tsx`. Меняем: список разрешённых локалей сервера (+`ru`), дефолтную локаль фронта (`en`→`ru`), дефолт языка в мастере создания организации, и добавляем «Русский» в пикер языков организации.

**Tech Stack:** NestJS 10 + class-validator (server), React 18 + react-intl-universal (webapp), Jest (server tests), pnpm + Node 18.16.1.

**Спека:** `docs/superpowers/specs/2026-06-11-full-russification-design.md` (этап 0 из 5; этапы 1–4 получат собственные планы).

---

## Контекст для исполнителя (прочитать перед стартом)

- **Node 18.16.1 обязателен**: перед любыми командами `fnm use 18.16.1` (или `nvm use 18.16.1`). Только `pnpm`, не npm/yarn. **Не запускать `pnpm install`**.
- Рабочая ветка: `fix/bigfin-branding` (там уже лежит спека и незакоммиченный ребрендинг — он фиксируется в Task 1).
- В сервере **два** файла с константой `ACCEPTED_LOCALES` (дубликат). DTO импортирует из `Organization.constants.ts`, но правим **оба**, чтобы дубликат не разошёлся.
- Пикер языков организации (`getLanguages()`) сейчас содержит только English — арабского в нём уже нет, поэтому пункт спеки «убрать арабский из пикера» выполняется самим фактом Task 3 (станет «Русский» + «English»). `SUPPORTED_LOCALES` в `AppIntlLoader.tsx` — это НЕ пикер, а список допустимых локалей интерфейса; `ar` там **оставляем**, чтобы не сломать пользователей с уже выбранным арабским.
- После правки lang-файлов всегда: `node packages/webapp/scripts/lang-check.js`.

---

### Task 1: Зафиксировать ребрендинг отдельным коммитом

Незакоммиченные изменения (38 файлов, BigFin → Bigfin) не относятся к русификации — фиксируем их отдельно, чтобы дальше работать с чистым деревом.

**Files:**
- Modify: ничего нового — только `git add -u` уже изменённых файлов.

- [ ] **Step 1: Проверить, что в дереве только ребрендинг**

Run: `git status --short`
Expected: только `M`/`RM`/`R` строки (index.html, BigfinLoading, lang/*.json, PaperTemplate'ы и т.п.) + untracked `.agents/`, `.codex/`, `AGENTS.md`. Если видишь что-то неожиданное (правки, не похожие на переименование бренда) — остановись и спроси пользователя.

- [ ] **Step 2: Закоммитить только отслеживаемые изменения (untracked не трогаем)**

```bash
git add -u
git commit -m "chore(branding): rename BigFin -> Bigfin across webapp

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Убедиться, что дерево чистое (кроме untracked)**

Run: `git status --short`
Expected: остались только `?? .agents/`, `?? .codex/`, `?? AGENTS.md`.

---

### Task 2: Сервер — разрешить язык `ru` для организаций (TDD)

**Files:**
- Test (create): `packages/server/src/modules/Organization/dtos/Organization.dto.spec.ts`
- Modify: `packages/server/src/modules/Organization/Organization.constants.ts:29`
- Modify: `packages/server/src/modules/Organization/Organization/constants.ts:32`

- [ ] **Step 1: Написать падающий тест**

Создать `packages/server/src/modules/Organization/dtos/Organization.dto.spec.ts`:

```ts
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BuildOrganizationDto, UpdateOrganizationDto } from './Organization.dto';
import { ACCEPTED_LOCALES } from '../Organization.constants';
import { ACCEPTED_LOCALES as ACCEPTED_LOCALES_DUPLICATE } from '../Organization/constants';

const validRussianOrg = {
  name: 'ООО «Ромашка»',
  location: 'RU',
  baseCurrency: 'RUB',
  timezone: 'Europe/Moscow',
  fiscalYear: 'january',
  language: 'ru',
};

describe('Organization DTO — язык организации', () => {
  it('принимает language=ru при создании организации', async () => {
    const dto = plainToInstance(BuildOrganizationDto, validRussianOrg);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('принимает language=ru при обновлении организации', async () => {
    const dto = plainToInstance(UpdateOrganizationDto, { language: 'ru' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('отклоняет неизвестный язык', async () => {
    const dto = plainToInstance(BuildOrganizationDto, {
      ...validRussianOrg,
      language: 'xx',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('дубликат константы не расходится с основной', () => {
    expect(ACCEPTED_LOCALES_DUPLICATE).toEqual(ACCEPTED_LOCALES);
    expect(ACCEPTED_LOCALES).toContain('ru');
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/Organization/dtos`
Expected: FAIL — «принимает language=ru при создании» падает с `Expected length: 0, Received length: 1` (нарушение `@IsIn`), «дубликат константы…» падает на `toContain('ru')`.

- [ ] **Step 3: Минимальная правка — добавить `ru` в обе константы**

В `packages/server/src/modules/Organization/Organization.constants.ts` (строка 29):

```ts
export const ACCEPTED_LOCALES = ['en', 'ru', 'ar'];
```

В `packages/server/src/modules/Organization/Organization/constants.ts` (строка 32) — та же замена:

```ts
export const ACCEPTED_LOCALES = ['en', 'ru', 'ar'];
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/Organization/dtos`
Expected: PASS, 4 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Organization/dtos/Organization.dto.spec.ts packages/server/src/modules/Organization/Organization.constants.ts packages/server/src/modules/Organization/Organization/constants.ts
git commit -m "feat(server): accept ru locale for organizations (russification stage 0)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Веб — добавить «Русский» в пикер языков организации

Пикер используется в трёх местах (мастер настройки, Настройки → Общие, создание workspace) — все берут опции из одной функции `getLanguages()`.

**Files:**
- Modify: `packages/webapp/src/constants/languagesOptions.tsx`
- Modify: `packages/webapp/src/lang/en/index.json` (рядом с ключом `"english"`, ~строка 1492)
- Modify: `packages/webapp/src/lang/ru/index.json` (рядом с ключом `"english"`, ~строка 1492)

- [ ] **Step 1: Добавить ключ перевода `russian` парно в en и ru**

В `packages/webapp/src/lang/en/index.json` рядом с `"english": "English",` добавить:

```json
  "russian": "Русский",
```

В `packages/webapp/src/lang/ru/index.json` рядом с `"english": "English",` добавить:

```json
  "russian": "Русский",
```

(Названия языков пишутся на самом языке — так же, как `"english": "English"` и `"arabic": "العربية"` в обоих словарях. Это осознанное брендинговое исключение.)

- [ ] **Step 2: Проверить парность лангов**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: `✅ OK: парность ключей en↔ru соблюдена.` (ключей станет 2876 и там, и там)

- [ ] **Step 3: Добавить «Русский» первым пунктом пикера**

Заменить содержимое `packages/webapp/src/constants/languagesOptions.tsx`:

```tsx
// @ts-nocheck
import intl from 'react-intl-universal';

export const getLanguages = () => [
  { name: intl.get('russian'), value: 'ru' },
  { name: intl.get('english'), value: 'en' },
];
```

- [ ] **Step 4: Проверка типов**

Run: `pnpm typecheck`
Expected: без новых ошибок (файл под `@ts-nocheck`, но проверка обязательна как smoke-тест).

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/constants/languagesOptions.tsx packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(webapp): add Russian to organization language picker (russification stage 0)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Веб — русский по умолчанию для интерфейса и новых организаций

**Files:**
- Modify: `packages/webapp/src/components/AppIntlLoader.tsx:33`
- Modify: `packages/webapp/src/containers/Setup/SetupOrganizationPage.tsx:21`

- [ ] **Step 1: Дефолтная локаль интерфейса `en` → `ru`**

В `packages/webapp/src/components/AppIntlLoader.tsx`, функция `getCurrentLocal()` (строки 32–34), заменить:

```js
  if (!find(SUPPORTED_LOCALES, { value: currentLocale })) {
    currentLocale = 'en';
  }
```

на:

```js
  if (!find(SUPPORTED_LOCALES, { value: currentLocale })) {
    currentLocale = 'ru';
  }
```

(`SUPPORTED_LOCALES` не трогаем — `ar` остаётся допустимой локалью для уже выбравших её.)

- [ ] **Step 2: Дефолтный язык новой организации `en` → `ru`**

В `packages/webapp/src/containers/Setup/SetupOrganizationPage.tsx`, объект `defaultValues` (строка 21), заменить:

```js
  language: 'en',
```

на:

```js
  language: 'ru',
```

(Функция `getLocaleAwareDefaults()` ниже по файлу остаётся как есть — она дополнительно предзаполняет валюту RUB для русскоязычного интерфейса.)

- [ ] **Step 3: Проверка типов**

Run: `pnpm typecheck`
Expected: без новых ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/components/AppIntlLoader.tsx packages/webapp/src/containers/Setup/SetupOrganizationPage.tsx
git commit -m "feat(webapp): default UI locale and new organization language to ru (russification stage 0)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Приёмка на локальном стеке (скриншоты для основателя)

Запуск стека — по скиллу `run-bigfin` (MariaDB+Redis в Docker, API :3000, webapp :4000, тестовый аккаунт `founder@bigfin.local`).

**Files:** только проверка, правок нет.

- [ ] **Step 1: Запустить локальный стек** (скилл `run-bigfin`)

- [ ] **Step 2: Чистый браузер → русский по умолчанию**

В приватном окне (без localStorage/cookie) открыть `http://localhost:4000`.
Expected: страница входа на русском без `?lang=ru` в адресе. Скриншот.

- [ ] **Step 3: Главный тест блокера — организация на русском**

Зарегистрировать нового пользователя → мастер настройки организации.
Expected: поле «Язык» предзаполнено «Русский», валюта RUB; отправка формы проходит **без ошибки валидации** (раньше сервер отклонял `language: 'ru'`). Скриншот мастера и первого экрана после.

- [ ] **Step 4: Существующая организация основателя → русский**

Войти под `founder@bigfin.local` → Настройки → Общие → Язык: «Русский» → Сохранить.
Expected: сохранение успешно, приложение перезагружается на русском; в пикере видны «Русский» и «English». Скриншот.

- [ ] **Step 5: Финальные проверки**

Run: `pnpm typecheck && node packages/webapp/scripts/lang-check.js && pnpm --filter @bigfin/server test -- src/modules/Organization/dtos`
Expected: всё зелёное.

- [ ] **Step 6: Показать скриншоты основателю и дождаться подтверждения**

Откат всего этапа, если что-то пошло не так: `git log --oneline` → `git revert <хэши коммитов этапа>` (4 коммита: ребрендинг не трогать, откатываются только Task 2–4).

---

## Что осознанно НЕ входит в этот план

- Захардкоженный английский в вебе, серверные ошибки, письма, PDF — этапы 1–4, каждый со своим планом после завершения предыдущего.
- Удаление файлов локалей `ar/es/sv` — не удаляем без отдельного решения.
- `pnpm install`, миграции БД — не требуются (поле `language` в `tenants_metadata` уже существует).
