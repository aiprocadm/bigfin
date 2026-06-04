# D-редизайн (Фазы 0+1+2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Установить Tailwind 4 + Storybook 8 + shadcn/ui рядом с существующим BlueprintJS-приложением, собрать дизайн-систему v1 (15 компонентов в Storybook), и заменить страницы Login/Register/ForgotPassword на Bold Fintech-версии без поломки существующих экранов.

**Architecture:** Старая и новая дизайн-системы сосуществуют в одном webapp-пакете: BP-компоненты остаются в существующих файлах, shadcn-компоненты — в новой папке `src/components/ui/`. Граница проходит по файлам, не feature-флагам. Tailwind `content`-глоб ограничен только новыми папками, чтобы не генерировать стили для BP-областей. Storybook запускается без бэкенда — он живёт отдельно от приложения. Пилот Login работает pre-auth, поэтому проверяется визуально в браузере без Docker.

**Tech Stack:**
- Tailwind 4 + `@tailwindcss/vite`
- shadcn/ui + Radix UI primitives
- lucide-react (иконки)
- react-hook-form + zod (только в новых auth-страницах)
- Storybook 8 + Vite
- sonner (toasts)
- class-variance-authority, clsx, tailwind-merge

**Spec:** `docs/superpowers/specs/2026-05-25-redesign-design.md`

**Окружение исполнителя:**
- Windows + fnm, Node 18.16.1 (`nvm use 18.16.1` перед каждой командой `pnpm`/`node`)
- pnpm + lerna monorepo
- Локальный бэкенд НЕ настроен — это не блокер: Login — pre-auth экран, проверяется визуально без бэкенда
- `shared/` пакеты должны быть собраны до запуска `pnpm typecheck`

---

## File Structure

### Создаваемые файлы

**Phase 0 — инфраструктура:**
- `packages/webapp/tailwind.config.ts` — Tailwind 4 конфиг (token-источник правды)
- `packages/webapp/src/styles/globals.css` — Tailwind directives + импорт tokens.css
- `packages/webapp/src/styles/tokens.css` — CSS-переменные бренда (`:root` + `.dark`)
- `packages/webapp/src/lib/cn.ts` — `cn()` утилита (clsx + tailwind-merge)
- `packages/webapp/components.json` — shadcn CLI конфиг
- `packages/webapp/.storybook/main.ts` — Storybook конфиг
- `packages/webapp/.storybook/preview.tsx` — Storybook preview (импорт globals.css, dark-фон)

**Phase 1 — DS компоненты (`packages/webapp/src/components/ui/`):**
- shadcn (CLI-генерируемые, мы их тюним): `button.tsx`, `input.tsx`, `label.tsx`, `form.tsx`, `card.tsx`, `checkbox.tsx`, `separator.tsx`, `alert.tsx`, `sonner.tsx`, `skeleton.tsx`, `tooltip.tsx`
- Каждому соответствует `.stories.tsx`
- Кастомные: `Logo.tsx`, `Spinner.tsx`, `Link.tsx`, `AuthLayout.tsx` + stories
- `colors.mdx`, `typography.mdx`, `tokens.mdx` (Storybook docs-страницы)
- `README.md` — гайд по использованию и миграции

**Phase 2 — пилот auth (`packages/webapp/src/components/auth/`):**
- `schemas.ts` — zod-схемы для трёх форм
- `__tests__/schemas.test.ts` — unit-тесты схем
- `LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx`

### Модифицируемые файлы

- `packages/webapp/package.json` — новые зависимости
- `packages/webapp/vite.config.ts` — `@tailwindcss/vite` плагин
- `packages/webapp/src/index.tsx` — импорт `./styles/globals.css`
- `packages/webapp/src/containers/Authentication/Authentication.tsx` (или routing) — подмена auth-роутов на новые компоненты
- `.gitignore` — добавить `storybook-static/`, `.storybook-cache/`

### Удаляемые файлы (в конце Phase 2)

- `packages/webapp/src/containers/Authentication/Login.tsx`
- `packages/webapp/src/containers/Authentication/LoginForm.tsx`
- `packages/webapp/src/containers/Authentication/Register.tsx`
- `packages/webapp/src/containers/Authentication/RegisterForm.tsx`
- `packages/webapp/src/containers/Authentication/SendResetPassword.tsx`
- `packages/webapp/src/containers/Authentication/SendResetPasswordForm.tsx`
- `packages/webapp/src/containers/Authentication/ResetPassword.tsx` (если используется только в забытом-пароль флоу)
- `packages/webapp/src/containers/Authentication/ResetPasswordForm.tsx`

**НЕ удаляем:** `EmailConfirmation.tsx`, `InviteAccept*.tsx`, `withAuthentication*.tsx`, `AuthMetaBoot.tsx`, `AuthInsider.tsx` — это связано с другими флоу или с инфраструктурой авторизации. Их миграция — в отдельном под-проекте D-Phase-3.

---

# Phase 0 — Подготовка инфраструктуры

**Длительность:** 1-2 недели
**Цель:** Tailwind 4 + Storybook 8 + shadcn CLI установлены и работают, существующие экраны визуально не изменились.

---

## Task 0.1: Baseline — зафиксировать текущее состояние

**Files:** (read-only baseline)

- [ ] **Step 1: Запомнить текущее состояние app**

В bash/PowerShell:
```bash
nvm use 18.16.1
cd packages/webapp
pnpm dev
```
Открыть `http://localhost:4000`. Дойти до страницы `/auth/login` (если работает). Сделать скриншот в `docs/superpowers/plans/baselines/before-2026-05-25-login.png` (или просто запомнить визуально).

- [ ] **Step 2: Проверить typecheck baseline**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/utils build
pnpm --filter @bigfin/webapp typecheck
```
Expected: PASS (0 ошибок). Если ошибки уже есть — зафиксировать их количество.

- [ ] **Step 3: Проверить lang baseline**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/webapp lang:check
```
Expected: exit code 0.

- [ ] **Step 4: Закоммитить baseline-документ**

Создать `docs/superpowers/plans/baselines/2026-05-25-baseline.md` с текстом:
```markdown
# Baseline before D-redesign

- Date: 2026-05-25
- Branch: <git branch>
- pnpm dev: works on localhost:4000
- /auth/login: <screenshot or text description>
- pnpm typecheck: 0 errors
- pnpm lang:check: exit 0
```

```bash
cd D:/Кодинг/Bigfin
git add docs/  # если docs внутри git, иначе пропустить
git status
```

Если `docs/` лежит вне git-репо — закоммитить baseline отдельно прямо в файл, без git. (В этом проекте docs/ вне git.)

---

## Task 0.2: Установить Tailwind 4 + утилиты

**Files:**
- Modify: `packages/webapp/package.json`

- [ ] **Step 1: Установить зависимости**

```bash
nvm use 18.16.1
cd D:/Кодинг/Bigfin
pnpm --filter @bigfin/webapp add -D tailwindcss@^4.0.0 @tailwindcss/vite@^4.0.0
pnpm --filter @bigfin/webapp add clsx@^2.1.1 tailwind-merge@^2.5.0 class-variance-authority@^0.7.0 tailwindcss-animate@^1.0.7 lucide-react@^0.460.0
```

Expected: установка проходит, `package.json` обновлён.

**Если `pnpm install` падает** (это есть в памяти как известная проблема): попробовать `pnpm install --shamefully-hoist` или удалить `node_modules` + `pnpm install` целиком.

- [ ] **Step 2: Проверить, что webapp ещё запускается**

```bash
pnpm --filter @bigfin/webapp dev
```
Expected: dev-сервер на `localhost:4000`, страницы открываются как раньше.

- [ ] **Step 3: Закоммитить установку**

```bash
git add packages/webapp/package.json pnpm-lock.yaml
git commit -m "chore(webapp): install Tailwind 4 + shadcn utilities"
```

---

## Task 0.3: Создать `globals.css` + `tokens.css`

**Files:**
- Create: `packages/webapp/src/styles/globals.css`
- Create: `packages/webapp/src/styles/tokens.css`

- [ ] **Step 1: Создать `tokens.css`**

Создать `packages/webapp/src/styles/tokens.css`:
```css
/* Bigfin brand tokens v1 — Bold Fintech */

:root {
  /* Dark theme (primary) */
  --color-background: 10 14 26;        /* #0A0E1A */
  --color-surface: 19 24 43;           /* #13182B */
  --color-surface-elevated: 31 37 65;  /* #1F2541 */
  --color-border: 42 50 88;            /* #2A3258 */

  --color-text-primary: 255 255 255;
  --color-text-secondary: 124 137 171; /* #7C89AB */
  --color-text-muted: 90 100 128;      /* #5A6480 */

  --color-accent: 255 211 0;           /* #FFD300 */
  --color-accent-hover: 255 184 0;     /* #FFB800 */
  --color-accent-fg: 10 14 26;         /* text on yellow */

  --color-success: 91 186 111;         /* #5BBA6F */
  --color-danger: 248 113 113;         /* #F87171 */
  --color-warning: 249 168 37;         /* #F9A825 */
  --color-info: 59 130 246;            /* #3B82F6 */

  --radius: 0.5rem; /* 8px — default for shadcn */
}

/* Light theme — best effort, не primary */
.light {
  --color-background: 250 250 247;     /* #FAFAF7 */
  --color-surface: 255 255 255;
  --color-surface-elevated: 245 244 241;
  --color-border: 230 228 220;

  --color-text-primary: 10 14 26;
  --color-text-secondary: 90 100 128;
  --color-text-muted: 170 170 170;

  --color-accent: 229 168 0;           /* #E5A800 — затемнённый для светлой */
  --color-accent-hover: 200 145 0;
  --color-accent-fg: 255 255 255;
}
```

- [ ] **Step 2: Создать `globals.css`**

Создать `packages/webapp/src/styles/globals.css`:
```css
@import './tokens.css';
@import 'tailwindcss';

@theme {
  --color-background: rgb(var(--color-background));
  --color-surface: rgb(var(--color-surface));
  --color-surface-elevated: rgb(var(--color-surface-elevated));
  --color-border: rgb(var(--color-border));

  --color-text-primary: rgb(var(--color-text-primary));
  --color-text-secondary: rgb(var(--color-text-secondary));
  --color-text-muted: rgb(var(--color-text-muted));

  --color-accent: rgb(var(--color-accent));
  --color-accent-hover: rgb(var(--color-accent-hover));
  --color-accent-fg: rgb(var(--color-accent-fg));

  --color-success: rgb(var(--color-success));
  --color-danger: rgb(var(--color-danger));
  --color-warning: rgb(var(--color-warning));
  --color-info: rgb(var(--color-info));

  --radius-default: var(--radius);

  --font-sans: 'Inter Variable', system-ui, sans-serif;
}

/* Scope наших стилей — только для элементов внутри .bigfin-ui */
.bigfin-ui {
  font-family: var(--font-sans);
  color: var(--color-text-primary);
  background-color: var(--color-background);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 3: Закоммитить**

```bash
git add packages/webapp/src/styles/
git commit -m "feat(webapp): add Tailwind 4 globals + brand tokens v1"
```

---

## Task 0.4: Подключить `@tailwindcss/vite` в `vite.config.ts`

**Files:**
- Modify: `packages/webapp/vite.config.ts`

- [ ] **Step 1: Прочитать текущий конфиг**

```bash
cat packages/webapp/vite.config.ts
```

- [ ] **Step 2: Добавить tailwind-плагин**

В `packages/webapp/vite.config.ts`:

В начало файла добавить импорт:
```ts
import tailwindcss from '@tailwindcss/vite';
```

В массив `plugins` добавить ПЕРВЫМ:
```ts
const plugins: PluginOption[] = [
  tailwindcss(),
  react(),
  legacy({
    targets: ['defaults', 'not IE 11'],
    additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
  }),
];
```

- [ ] **Step 3: Запустить dev — проверить, что Tailwind не сломал ничего**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/webapp dev
```
Expected: dev на `localhost:4000`. Открыть существующие страницы — они ВЫГЛЯДЯТ КАК РАНЬШЕ. **Это критический критерий — никаких visual regressions.**

Если что-то поехало — откатить через `git revert HEAD` или вручную убрать плагин.

- [ ] **Step 4: Закоммитить**

```bash
git add packages/webapp/vite.config.ts
git commit -m "chore(webapp): wire @tailwindcss/vite plugin"
```

---

## Task 0.5: Импортировать `globals.css` в точке входа

**Files:**
- Modify: `packages/webapp/src/index.tsx`

- [ ] **Step 1: Найти точку входа**

```bash
head -20 packages/webapp/src/index.tsx
```
Expected: видно `import React from 'react'`, рендер.

- [ ] **Step 2: Добавить импорт `globals.css`**

В `packages/webapp/src/index.tsx`, в самом начале импортов (но ПОСЛЕ существующего `import './style/...'` если есть — чтобы Tailwind не перебивал старые SCSS):

```ts
// Существующие импорты остаются как есть
// Добавить В КОНЕЦ блока импортов CSS:
import './styles/globals.css';
```

**Важно:** наш `globals.css` идёт ПОСЛЕДНИМ среди CSS-импортов, чтобы Tailwind `@theme` директивы корректно работали. Но Tailwind стили активируются только для элементов с классом `.bigfin-ui` (см. `globals.css`) — это защищает старые экраны от изменений.

- [ ] **Step 3: Перезапустить dev, визуально проверить — старые экраны не поехали**

```bash
pnpm --filter @bigfin/webapp dev
```
Открыть существующие страницы. Expected: визуально как раньше.

- [ ] **Step 4: Закоммитить**

```bash
git add packages/webapp/src/index.tsx
git commit -m "feat(webapp): import Tailwind globals (scoped to .bigfin-ui)"
```

---

## Task 0.6: Создать `cn.ts` утилиту

**Files:**
- Create: `packages/webapp/src/lib/cn.ts`

- [ ] **Step 1: Создать `cn.ts`**

Создать `packages/webapp/src/lib/cn.ts`:
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes intelligently. Used by all shadcn components.
 *
 * Example:
 *   cn('px-2 py-1', condition && 'bg-accent', 'px-4')
 *   // → 'py-1 bg-accent px-4' (px-2 overridden by px-4)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Проверить typecheck**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/utils build
pnpm --filter @bigfin/webapp typecheck
```
Expected: 0 ошибок.

- [ ] **Step 3: Закоммитить**

```bash
git add packages/webapp/src/lib/cn.ts
git commit -m "feat(webapp): add cn() utility for Tailwind class merging"
```

---

## Task 0.7: Инициализировать shadcn CLI

**Files:**
- Create: `packages/webapp/components.json`

- [ ] **Step 1: Запустить shadcn init**

```bash
nvm use 18.16.1
cd D:/Кодинг/Bigfin/packages/webapp
pnpm dlx shadcn@latest init
```

На вопросы CLI отвечать так:
- Which style? → `New York` (более плотный, подходит Bold Fintech)
- Which color? → `Zinc` (наш zinc-base палитра)
- Where is your global CSS? → `src/styles/globals.css`
- CSS variables for colors? → `Yes`
- Where is your tailwind config? → (если v4, файла нет — пропустить или указать `tailwind.config.ts`)
- Import alias for components? → `@/components`
- Import alias for utils? → `@/lib/cn`
- Are you using React Server Components? → `No`

- [ ] **Step 2: Проверить, что `components.json` создан**

```bash
cat components.json
```
Expected: JSON с настройками выше.

- [ ] **Step 3: Удалить любые автогенерированные конфликты**

Если shadcn создал `src/lib/utils.ts` параллельно с нашим `src/lib/cn.ts` — оставить наш `cn.ts`, удалить `utils.ts`. Если shadcn перезаписал `globals.css` — восстановить нашу версию из git.

```bash
git status
# Если есть лишние файлы — удалить
# Если globals.css перезаписан:
git checkout packages/webapp/src/styles/globals.css
```

- [ ] **Step 4: Закоммитить components.json**

```bash
git add packages/webapp/components.json
git commit -m "chore(webapp): initialize shadcn CLI"
```

---

## Task 0.8: Smoke-test shadcn add (с откатом)

**Files:** (тестовая установка, откатывается)

- [ ] **Step 1: Установить тестовый компонент**

```bash
nvm use 18.16.1
cd D:/Кодинг/Bigfin/packages/webapp
pnpm dlx shadcn@latest add button
```
Expected: файл `src/components/ui/button.tsx` создан.

- [ ] **Step 2: Прочитать его**

```bash
cat src/components/ui/button.tsx
```
Expected: React-компонент с `Button` и `buttonVariants` из cva, импорт `cn` из `@/lib/cn`.

- [ ] **Step 3: Проверить typecheck**

```bash
pnpm --filter @bigfin/utils build
pnpm --filter @bigfin/webapp typecheck
```
Expected: 0 ошибок. Если ошибка про импорт `@/lib/cn` — поправить `components.json` (`utils` alias).

- [ ] **Step 4: Откатить тестовый файл**

Этот компонент мы пере-добавим в Phase 1 (Task 1.4) уже с финальными стилями. Сейчас просто убираем.

```bash
rm src/components/ui/button.tsx
git status
# button.tsx удалён, components.json остался
```

- [ ] **Step 5: НЕ коммитить** (нет изменений после удаления)

---

## Task 0.9: Установить Storybook 8

**Files:**
- Create: `packages/webapp/.storybook/main.ts`
- Create: `packages/webapp/.storybook/preview.tsx`
- Modify: `packages/webapp/package.json`

- [ ] **Step 1: Запустить Storybook init**

```bash
nvm use 18.16.1
cd D:/Кодинг/Bigfin/packages/webapp
pnpm dlx storybook@latest init --type react_vite
```

CLI поставит зависимости и создаст `.storybook/`, `src/stories/` (с примерами).

- [ ] **Step 2: Удалить пример-сториз**

```bash
rm -rf src/stories
```
Examples от Storybook нам не нужны — будем писать свои.

- [ ] **Step 3: Заменить `.storybook/main.ts`**

Заменить содержимое `packages/webapp/.storybook/main.ts`:
```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../src/components/ui/**/*.stories.@(ts|tsx|mdx)',
    '../src/components/ui/**/*.mdx',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
};

export default config;
```

- [ ] **Step 4: Заменить `.storybook/preview.tsx`**

Заменить содержимое `packages/webapp/.storybook/preview.tsx`:
```tsx
import type { Preview } from '@storybook/react';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'bigfin-dark',
      values: [
        { name: 'bigfin-dark', value: '#0A0E1A' },
        { name: 'bigfin-light', value: '#FAFAF7' },
      ],
    },
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="bigfin-ui" style={{ padding: '2rem', minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

- [ ] **Step 5: Запустить Storybook**

```bash
pnpm --filter @bigfin/webapp storybook
```
Expected: открывается `http://localhost:6006`, левая панель пустая (мы удалили примеры), фон тёмный.

- [ ] **Step 6: Закоммитить Storybook setup**

```bash
git add packages/webapp/.storybook packages/webapp/package.json pnpm-lock.yaml
git rm -r --cached packages/webapp/src/stories 2>/dev/null || true
git commit -m "feat(webapp): set up Storybook 8 with Bigfin dark theme"
```

- [ ] **Step 7: Добавить в `.gitignore`**

В `packages/webapp/.gitignore` (или корневой `.gitignore`) добавить:
```
storybook-static/
.storybook-cache/
```

```bash
git add .gitignore
git commit -m "chore: ignore Storybook build artifacts"
```

---

## Task 0.10: Phase 0 Acceptance — финальная проверка

**Files:** (read-only verification)

- [ ] **Step 1: Сборка `shared/` + typecheck**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/utils build
pnpm --filter @bigfin/webapp typecheck
```
Expected: 0 ошибок.

- [ ] **Step 2: `pnpm dev` работает**

```bash
pnpm --filter @bigfin/webapp dev
```
Expected: `localhost:4000` открывается, существующие страницы выглядят как в baseline.

- [ ] **Step 3: `pnpm storybook` работает**

```bash
pnpm --filter @bigfin/webapp storybook
```
Expected: `localhost:6006` открывается, тёмный фон, sidebar пустой (готов к Phase 1).

- [ ] **Step 4: `pnpm lang:check` работает**

```bash
pnpm --filter @bigfin/webapp lang:check
```
Expected: exit 0.

- [ ] **Step 5: Зафиксировать Phase 0 завершение**

```bash
git log --oneline -10  # видно ~7 новых коммитов от Phase 0
git tag phase-0-done
```

**Critical checkpoint:** если любая из проверок упала — НЕ переходить к Phase 1. Откатить проблемный коммит, разобраться.

---

# Phase 1 — Бренд v1 + DS v1 в Storybook

**Длительность:** 3-4 недели
**Цель:** в Storybook 11 shadcn-компонентов + 4 кастомных + 3 docs-страницы. Каждый компонент тёмная тема, жёлтый акцент, Inter Variable.

---

## Task 1.1: Зафиксировать цветовую палитру в Storybook (Colors page)

**Files:**
- Create: `packages/webapp/src/components/ui/colors.mdx`

- [ ] **Step 1: Создать `colors.mdx`**

Создать `packages/webapp/src/components/ui/colors.mdx`:
```mdx
import { Meta } from '@storybook/blocks';

<Meta title="Brand/Colors" />

# Цветовая палитра Bigfin v1

**Направление:** Bold Fintech (Тинькофф / Revolut). Тёмная тема — primary, светлая — best effort.

## Тёмная тема

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 16 }}>

  <Swatch hex="#0A0E1A" name="background" usage="Фон страницы" />
  <Swatch hex="#13182B" name="surface" usage="Карточки, модалки" />
  <Swatch hex="#1F2541" name="surface-elevated" usage="Поля ввода, hover" />
  <Swatch hex="#2A3258" name="border" usage="Границы полей" />

  <Swatch hex="#FFFFFF" name="text-primary" usage="Основной текст" />
  <Swatch hex="#7C89AB" name="text-secondary" usage="Подписи, плейсхолдеры" />
  <Swatch hex="#5A6480" name="text-muted" usage="Disabled, мета" />

  <Swatch hex="#FFD300" name="accent" usage="Primary-кнопки, лого" />
  <Swatch hex="#FFB800" name="accent-hover" usage="Hover на acceptанте" />

  <Swatch hex="#5BBA6F" name="success" usage="Поступления, успех" />
  <Swatch hex="#F87171" name="danger" usage="Ошибки, расходы" />
  <Swatch hex="#F9A825" name="warning" usage="Предупреждения" />
  <Swatch hex="#3B82F6" name="info" usage="Инфо-сообщения" />

</div>

export const Swatch = ({ hex, name, usage }) => (
  <div style={{ background: '#13182B', padding: 16, borderRadius: 8, border: '1px solid #2A3258' }}>
    <div style={{ width: '100%', height: 60, background: hex, borderRadius: 4, marginBottom: 8 }} />
    <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: 13 }}>{name}</div>
    <div style={{ color: '#7C89AB', fontSize: 11, fontFamily: 'monospace' }}>{hex}</div>
    <div style={{ color: '#7C89AB', fontSize: 12, marginTop: 4 }}>{usage}</div>
  </div>
);
```

- [ ] **Step 2: Проверить, что страница открывается**

Открыть `http://localhost:6006`, в sidebar найти `Brand → Colors`. Expected: видна страница со swatches.

- [ ] **Step 3: Закоммитить**

```bash
git add packages/webapp/src/components/ui/colors.mdx
git commit -m "docs(ui): add Brand/Colors Storybook page"
```

---

## Task 1.2: Typography page

**Files:**
- Create: `packages/webapp/src/components/ui/typography.mdx`

- [ ] **Step 1: Установить Inter Variable**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/webapp add @fontsource-variable/inter@^5.0.0
```

- [ ] **Step 2: Импортировать шрифт в `globals.css`**

В НАЧАЛО `packages/webapp/src/styles/globals.css` добавить:
```css
@import '@fontsource-variable/inter';
```
(Перед `@import './tokens.css';`)

- [ ] **Step 3: Создать `typography.mdx`**

Создать `packages/webapp/src/components/ui/typography.mdx`:
```mdx
import { Meta } from '@storybook/blocks';

<Meta title="Brand/Typography" />

# Типографика Bigfin v1

**Один шрифт:** Inter Variable (open source, отличная кириллица).
**Numeric:** все денежные значения используют `font-variant-numeric: tabular-nums` (встроено в `.bigfin-ui`).

## Шкала размеров

<Sample className="text-4xl">Заголовок text-4xl (36px)</Sample>
<Sample className="text-3xl">Заголовок text-3xl (30px) — h1 формы</Sample>
<Sample className="text-2xl">Заголовок text-2xl (24px) — h2 секции</Sample>
<Sample className="text-xl">Заголовок text-xl (20px) — h3 карточки</Sample>
<Sample className="text-lg">Текст text-lg (18px)</Sample>
<Sample className="text-base">Текст text-base (16px) — дефолт</Sample>
<Sample className="text-sm">Текст text-sm (14px) — мелкий</Sample>
<Sample className="text-xs">Текст text-xs (12px) — подписи</Sample>

## Веса

<Sample className="text-base font-normal">Inter Variable — Regular 400</Sample>
<Sample className="text-base font-medium">Inter Variable — Medium 500</Sample>
<Sample className="text-base font-semibold">Inter Variable — Semibold 600</Sample>
<Sample className="text-base font-bold">Inter Variable — Bold 700</Sample>

## Числа (tabular)

<div style={{ fontVariantNumeric: 'tabular-nums', color: '#fff', fontSize: 24, padding: 16, background: '#13182B', borderRadius: 8 }}>
  1 234 567,89 ₽<br/>
  0 123 456,78 ₽<br/>
  9 999 999,99 ₽
</div>

export const Sample = ({ className, children }) => (
  <div className={className} style={{ color: '#fff', marginBottom: 12, fontFamily: 'Inter Variable, sans-serif' }}>{children}</div>
);
```

- [ ] **Step 4: Проверить в Storybook**

Открыть `Brand → Typography` в Storybook. Expected: видны размеры и веса Inter.

- [ ] **Step 5: Закоммитить**

```bash
git add packages/webapp/src/styles/globals.css packages/webapp/src/components/ui/typography.mdx packages/webapp/package.json pnpm-lock.yaml
git commit -m "feat(ui): add Inter Variable + Typography Storybook page"
```

---

## Task 1.3: Component — Button (с кастомизацией под Bold Fintech)

**Files:**
- Create: `packages/webapp/src/components/ui/button.tsx` (через shadcn CLI)
- Create: `packages/webapp/src/components/ui/button.stories.tsx`

- [ ] **Step 1: Добавить через shadcn CLI**

```bash
nvm use 18.16.1
cd D:/Кодинг/Bigfin/packages/webapp
pnpm dlx shadcn@latest add button
```

- [ ] **Step 2: Заменить содержимое `src/components/ui/button.tsx`**

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
        secondary: 'bg-surface-elevated text-text-primary border border-border hover:bg-surface',
        ghost: 'text-text-primary hover:bg-surface-elevated',
        link: 'text-accent underline-offset-4 hover:underline',
        destructive: 'bg-danger text-white hover:bg-danger/90',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
```

- [ ] **Step 3: Создать stories**

Создать `packages/webapp/src/components/ui/button.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ArrowRight } from 'lucide-react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: 'Войти', variant: 'primary' },
};

export const Secondary: Story = {
  args: { children: 'Отмена', variant: 'secondary' },
};

export const Ghost: Story = {
  args: { children: 'Подробнее', variant: 'ghost' },
};

export const LinkStyle: Story = {
  args: { children: 'Забыли пароль?', variant: 'link' },
};

export const Destructive: Story = {
  args: { children: 'Удалить', variant: 'destructive' },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const WithIcon: Story = {
  args: { children: <>Войти <ArrowRight className="h-4 w-4" /></> },
};

export const Disabled: Story = {
  args: { children: 'Disabled', disabled: true },
};

export const Loading: Story = {
  args: { children: 'Загрузка...', disabled: true },
};
```

- [ ] **Step 4: Проверить в Storybook**

Открыть Storybook, найти `Components → Button`. Expected: видны все варианты в тёмной теме, primary — жёлтый.

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter @bigfin/utils build && pnpm --filter @bigfin/webapp typecheck
```
Expected: 0 ошибок.

- [ ] **Step 6: Закоммитить**

```bash
git add packages/webapp/src/components/ui/button.tsx packages/webapp/src/components/ui/button.stories.tsx
git commit -m "feat(ui): Button component (Bold Fintech variants)"
```

---

## Task 1.4: Component — Input

**Files:**
- Create: `packages/webapp/src/components/ui/input.tsx`
- Create: `packages/webapp/src/components/ui/input.stories.tsx`

- [ ] **Step 1: Добавить через shadcn**

```bash
pnpm dlx shadcn@latest add input
```

- [ ] **Step 2: Заменить содержимое `input.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
```

- [ ] **Step 3: Создать stories**

Создать `packages/webapp/src/components/ui/input.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: 'name@company.ru' } };
export const Email: Story = { args: { type: 'email', placeholder: 'Email' } };
export const Password: Story = { args: { type: 'password', placeholder: '••••••••' } };
export const Disabled: Story = { args: { placeholder: 'Disabled', disabled: true } };
export const WithValue: Story = { args: { defaultValue: 'pre-filled' } };
```

- [ ] **Step 4: Storybook visual check + typecheck + commit**

```bash
pnpm --filter @bigfin/utils build && pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/ui/input.tsx packages/webapp/src/components/ui/input.stories.tsx
git commit -m "feat(ui): Input component"
```

---

## Task 1.5: Component — Label

- [ ] **Step 1: Добавить через shadcn**

```bash
pnpm dlx shadcn@latest add label
```

- [ ] **Step 2: Кастомизировать `label.tsx`**

Заменить содержимое:
```tsx
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const labelVariants = cva(
  'text-sm font-medium leading-none text-text-secondary peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;
```

- [ ] **Step 3: Stories**

Создать `label.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './label';
import { Input } from './input';

const meta: Meta<typeof Label> = { title: 'Components/Label', component: Label, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-2 w-72">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="name@company.ru" />
    </div>
  ),
};
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/ui/label.tsx packages/webapp/src/components/ui/label.stories.tsx
git commit -m "feat(ui): Label component"
```

---

## Task 1.6: Component — Form (RHF + zod wrappers)

**Files:**
- Create: `packages/webapp/src/components/ui/form.tsx`
- Create: `packages/webapp/src/components/ui/form.stories.tsx`

- [ ] **Step 1: Установить RHF + zod**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/webapp add react-hook-form@^7.53.0 @hookform/resolvers@^3.9.0 zod@^3.23.0
```

- [ ] **Step 2: Добавить shadcn form**

```bash
pnpm dlx shadcn@latest add form
```

Это создаст `form.tsx` с обёртками `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `FormDescription`.

- [ ] **Step 3: Проверить, что цвета корректные**

Открыть `src/components/ui/form.tsx`. Найти `FormMessage` — там должно быть `text-destructive` или похожее. Если используются shadcn-классы, не совпадающие с нашими токенами — заменить:
- `text-destructive` → `text-danger`
- `text-muted-foreground` → `text-text-muted`

- [ ] **Step 4: Stories — простая форма Login**

Создать `form.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './form';
import { Input } from './input';
import { Button } from './button';

const schema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
});

const meta: Meta = { title: 'Components/Form', tags: ['autodocs'] };
export default meta;

export const LoginExample: StoryObj = {
  render: () => {
    const form = useForm<z.infer<typeof schema>>({
      resolver: zodResolver(schema),
      defaultValues: { email: '', password: '' },
    });
    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((d) => alert(JSON.stringify(d)))}
          className="flex flex-col gap-4 w-80"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="name@company.ru" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Пароль</FormLabel>
                <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Войти</Button>
        </form>
      </Form>
    );
  },
};
```

- [ ] **Step 5: Проверить в Storybook + typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/ui/form.tsx packages/webapp/src/components/ui/form.stories.tsx packages/webapp/package.json pnpm-lock.yaml
git commit -m "feat(ui): Form (react-hook-form + zod wrappers)"
```

---

## Task 1.7: Component — Card

- [ ] **Step 1: Добавить через shadcn**

```bash
pnpm dlx shadcn@latest add card
```

- [ ] **Step 2: Заменить `card.tsx` под наши токены**

```tsx
import * as React from 'react';
import { cn } from '@/lib/cn';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl border border-border bg-surface text-text-primary shadow-sm', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-text-secondary', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';
```

- [ ] **Step 3: Stories**

`card.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';

const meta: Meta = { title: 'Components/Card', tags: ['autodocs'] };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Войдите в Bigfin</CardTitle>
        <CardDescription>Управляйте финансами бизнеса</CardDescription>
      </CardHeader>
      <CardContent>Контент карточки</CardContent>
      <CardFooter><Button>Действие</Button></CardFooter>
    </Card>
  ),
};
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/ui/card.tsx packages/webapp/src/components/ui/card.stories.tsx
git commit -m "feat(ui): Card component"
```

---

## Task 1.8: Component — Checkbox

- [ ] **Step 1**

```bash
pnpm dlx shadcn@latest add checkbox
```

- [ ] **Step 2: Кастомизировать `checkbox.tsx`**

```tsx
import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-sm border border-border bg-surface-elevated',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-accent data-[state=checked]:text-accent-fg data-[state=checked]:border-accent',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3 w-3" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
```

- [ ] **Step 3: Stories**

`checkbox.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './checkbox';
import { Label } from './label';

const meta: Meta<typeof Checkbox> = { title: 'Components/Checkbox', component: Checkbox, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = { args: {} };
export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="remember" />
      <Label htmlFor="remember">Запомнить меня</Label>
    </div>
  ),
};
export const Checked: Story = { args: { defaultChecked: true } };
export const Disabled: Story = { args: { disabled: true } };
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/ui/checkbox.tsx packages/webapp/src/components/ui/checkbox.stories.tsx
git commit -m "feat(ui): Checkbox component"
```

---

## Task 1.9: Component — Separator

- [ ] **Step 1**

```bash
pnpm dlx shadcn@latest add separator
```

- [ ] **Step 2: Кастомизировать `separator.tsx`**

```tsx
import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@/lib/cn';

export const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className,
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;
```

- [ ] **Step 3: Stories**

`separator.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from './separator';

const meta: Meta<typeof Separator> = { title: 'Components/Separator', component: Separator, tags: ['autodocs'] };
export default meta;

export const WithText: StoryObj = {
  render: () => (
    <div className="flex items-center gap-3 w-80">
      <Separator className="flex-1" />
      <span className="text-sm text-text-secondary">или</span>
      <Separator className="flex-1" />
    </div>
  ),
};
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/ui/separator.tsx packages/webapp/src/components/ui/separator.stories.tsx
git commit -m "feat(ui): Separator component"
```

---

## Task 1.10: Component — Alert

- [ ] **Step 1**

```bash
pnpm dlx shadcn@latest add alert
```

- [ ] **Step 2: Кастомизировать `alert.tsx`**

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11',
  {
    variants: {
      variant: {
        default: 'bg-surface border-border text-text-primary',
        destructive: 'border-danger/50 text-danger bg-danger/10 [&>svg]:text-danger',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
  ),
);
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
  ),
);
AlertDescription.displayName = 'AlertDescription';
```

- [ ] **Step 3: Stories**

`alert.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './alert';

const meta: Meta = { title: 'Components/Alert', tags: ['autodocs'] };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <Alert className="w-96">
      <AlertTitle>Внимание</AlertTitle>
      <AlertDescription>Это информационное сообщение.</AlertDescription>
    </Alert>
  ),
};
export const Destructive: StoryObj = {
  render: () => (
    <Alert variant="destructive" className="w-96">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Ошибка входа</AlertTitle>
      <AlertDescription>Неверный email или пароль.</AlertDescription>
    </Alert>
  ),
};
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/ui/alert.tsx packages/webapp/src/components/ui/alert.stories.tsx
git commit -m "feat(ui): Alert component"
```

---

## Task 1.11: Component — Sonner (Toast)

- [ ] **Step 1: Установить sonner + добавить через shadcn**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/webapp add sonner@^1.5.0
pnpm dlx shadcn@latest add sonner
```

- [ ] **Step 2: Кастомизировать `sonner.tsx`**

Заменить:
```tsx
import { Toaster as SonnerToaster } from 'sonner';

export const Toaster = (props: React.ComponentProps<typeof SonnerToaster>) => (
  <SonnerToaster
    position="top-right"
    toastOptions={{
      className: 'rounded-lg border border-border bg-surface text-text-primary shadow-lg',
      style: {
        fontFamily: 'var(--font-sans)',
      },
    }}
    {...props}
  />
);
```

- [ ] **Step 3: Stories**

`sonner.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { toast } from 'sonner';
import { Toaster } from './sonner';
import { Button } from './button';

const meta: Meta = { title: 'Components/Toast (Sonner)', tags: ['autodocs'] };
export default meta;

export const Examples: StoryObj = {
  render: () => (
    <>
      <Toaster />
      <div className="flex gap-3">
        <Button onClick={() => toast.success('Успех!')}>Success</Button>
        <Button variant="destructive" onClick={() => toast.error('Ошибка сети')}>Error</Button>
        <Button variant="secondary" onClick={() => toast.info('Информация')}>Info</Button>
      </div>
    </>
  ),
};
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/ui/sonner.tsx packages/webapp/src/components/ui/sonner.stories.tsx packages/webapp/package.json pnpm-lock.yaml
git commit -m "feat(ui): Toast component (sonner)"
```

---

## Task 1.12: Component — Skeleton

- [ ] **Step 1**

```bash
pnpm dlx shadcn@latest add skeleton
```

- [ ] **Step 2: Кастомизировать**

```tsx
import { cn } from '@/lib/cn';

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('animate-pulse rounded-md bg-surface-elevated', className)} {...props} />
);
```

- [ ] **Step 3: Stories**

`skeleton.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './skeleton';

const meta: Meta<typeof Skeleton> = { title: 'Components/Skeleton', component: Skeleton, tags: ['autodocs'] };
export default meta;

export const FormPlaceholder: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-3 w-80">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  ),
};
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/ui/skeleton.tsx packages/webapp/src/components/ui/skeleton.stories.tsx
git commit -m "feat(ui): Skeleton component"
```

---

## Task 1.13: Component — Tooltip

- [ ] **Step 1**

```bash
pnpm dlx shadcn@latest add tooltip
```

- [ ] **Step 2: Кастомизировать `tooltip.tsx`**

```tsx
import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/cn';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md bg-surface-elevated border border-border px-3 py-1.5 text-xs text-text-primary shadow-md',
      'animate-in fade-in-0 zoom-in-95',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
```

- [ ] **Step 3: Stories**

`tooltip.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { Button } from './button';

const meta: Meta = { title: 'Components/Tooltip', tags: ['autodocs'] };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild><Button variant="secondary">Hover me</Button></TooltipTrigger>
        <TooltipContent>Подсказка</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/ui/tooltip.tsx packages/webapp/src/components/ui/tooltip.stories.tsx
git commit -m "feat(ui): Tooltip component"
```

---

## Task 1.14: Custom — Logo

**Files:**
- Create: `packages/webapp/src/components/ui/Logo.tsx`
- Create: `packages/webapp/src/components/ui/Logo.stories.tsx`

- [ ] **Step 1: Создать `Logo.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/cn';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showMark?: boolean;
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-5xl',
};

export const Logo = ({ size = 'md', showMark = false, className, ...props }: LogoProps) => (
  <div className={cn('inline-flex items-center gap-2 font-bold tracking-tight', sizeClasses[size], className)} {...props}>
    {showMark && (
      <span className="inline-block w-[1em] h-[1em] bg-accent rounded-sm" aria-hidden />
    )}
    <span className="text-text-primary">
      Big<span className="text-accent">fin</span>
    </span>
  </div>
);
```

- [ ] **Step 2: Stories**

`Logo.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Logo } from './Logo';

const meta: Meta<typeof Logo> = { title: 'Brand/Logo', component: Logo, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Logo>;

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 items-start">
      <Logo size="sm" />
      <Logo size="md" />
      <Logo size="lg" />
      <Logo size="xl" />
    </div>
  ),
};

export const WithMark: Story = { args: { showMark: true, size: 'lg' } };
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/ui/Logo.tsx packages/webapp/src/components/ui/Logo.stories.tsx
git commit -m "feat(ui): Logo component (Bigfin wordmark v1)"
```

---

## Task 1.15: Custom — Spinner

- [ ] **Step 1: Создать `Spinner.tsx`**

```tsx
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SpinnerProps extends React.HTMLAttributes<SVGElement> {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' };

export const Spinner = ({ size = 'md', className, ...props }: SpinnerProps) => (
  <Loader2 className={cn('animate-spin text-current', sizeClasses[size], className)} {...props} />
);
```

- [ ] **Step 2: Stories**

`Spinner.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './Spinner';
import { Button } from './button';

const meta: Meta<typeof Spinner> = { title: 'Components/Spinner', component: Spinner, tags: ['autodocs'] };
export default meta;

export const Default: StoryObj = { render: () => <Spinner /> };
export const InsideButton: StoryObj = {
  render: () => (
    <Button disabled>
      <Spinner size="sm" />
      Загрузка...
    </Button>
  ),
};
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/ui/Spinner.tsx packages/webapp/src/components/ui/Spinner.stories.tsx
git commit -m "feat(ui): Spinner component"
```

---

## Task 1.16: Custom — Link

- [ ] **Step 1: Создать `Link.tsx`**

```tsx
import * as React from 'react';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';
import { cn } from '@/lib/cn';

type LinkProps = RouterLinkProps & {
  variant?: 'default' | 'muted';
};

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <RouterLink
      ref={ref}
      className={cn(
        'underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:rounded-sm',
        variant === 'default' && 'text-accent hover:underline',
        variant === 'muted' && 'text-text-secondary hover:text-text-primary',
        className,
      )}
      {...props}
    />
  ),
);
Link.displayName = 'Link';
```

- [ ] **Step 2: Stories**

`Link.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { Link } from './Link';

const meta: Meta<typeof Link> = {
  title: 'Components/Link',
  component: Link,
  tags: ['autodocs'],
  decorators: [(Story) => <MemoryRouter>{Story()}</MemoryRouter>],
};
export default meta;
type Story = StoryObj<typeof Link>;

export const Default: Story = { args: { to: '/auth/register', children: 'Зарегистрируйтесь' } };
export const Muted: Story = { args: { to: '/auth/forgot-password', children: 'Забыли пароль?', variant: 'muted' } };
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/ui/Link.tsx packages/webapp/src/components/ui/Link.stories.tsx
git commit -m "feat(ui): Link component (react-router wrapper)"
```

---

## Task 1.17: Custom — AuthLayout

- [ ] **Step 1: Создать `AuthLayout.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/cn';
import { Logo } from './Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const AuthLayout = ({ children, className }: AuthLayoutProps) => (
  <div className={cn('bigfin-ui min-h-screen flex flex-col md:flex-row', className)}>
    {/* Brand panel — left, hidden on mobile */}
    <aside
      className="hidden md:flex md:w-1/2 bg-background relative overflow-hidden items-center justify-center p-12"
      aria-hidden
    >
      <div className="relative z-10 flex flex-col items-center text-center gap-3">
        <Logo size="xl" showMark />
        <p className="text-text-secondary text-base max-w-xs">
          Управляй деньгами как профи.
        </p>
      </div>
      {/* Decorative pattern — radial gradient */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at 30% 50%, rgba(255,211,0,0.15) 0%, transparent 50%)',
        }}
      />
    </aside>

    {/* Form panel — right (or full on mobile) */}
    <main className="flex-1 bg-surface flex items-center justify-center p-6 md:p-12">
      {/* Mobile-only logo */}
      <div className="md:hidden absolute top-6 left-6">
        <Logo size="md" />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </main>
  </div>
);
```

- [ ] **Step 2: Stories**

`AuthLayout.stories.tsx`:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { AuthLayout } from './AuthLayout';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

const meta: Meta = {
  title: 'Layouts/AuthLayout',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const Default: StoryObj = {
  render: () => (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Войдите в Bigfin</h1>
          <p className="text-text-secondary mt-1">Управляйте финансами бизнеса</p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="name@company.ru" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
          <Button>Войти</Button>
        </div>
      </div>
    </AuthLayout>
  ),
};
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/ui/AuthLayout.tsx packages/webapp/src/components/ui/AuthLayout.stories.tsx
git commit -m "feat(ui): AuthLayout (two-column responsive)"
```

---

## Task 1.18: Написать README для components/ui/

**Files:**
- Create: `packages/webapp/src/components/ui/README.md`

- [ ] **Step 1: Создать README**

```markdown
# Bigfin Design System v1

Папка `components/ui/` — это новая дизайн-система Bigfin на Tailwind 4 + shadcn/ui + Radix.
Существует **рядом** с BlueprintJS-компонентами из `containers/`. Граница проходит по файлам, не feature-флагам.

## Как использовать

Любой новый экран использует ТОЛЬКО компоненты из `ui/`:

\`\`\`tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
\`\`\`

Один файл компонента использует ЛИБО `@/components/ui/*`, ЛИБО Blueprint — **никогда оба сразу**.

## Как добавить новый shadcn-компонент

\`\`\`bash
pnpm dlx shadcn@latest add <name>
\`\`\`

После генерации:
1. Открыть файл, заменить цвета на наши токены (`bg-surface`, `text-text-primary`, `bg-accent` и т.д.).
2. Заменить `text-muted-foreground` → `text-text-muted`, `text-destructive` → `text-danger`.
3. Написать `.stories.tsx` со всеми вариантами и состояниями.
4. Закоммитить (один компонент = один коммит).

## Как мигрировать существующий BP-экран

1. Создать новый файл в `components/<feature>/` (или модифицировать существующий).
2. Заменить все Blueprint-импорты на `@/components/ui/*`.
3. Заменить классы на Tailwind.
4. Обернуть корневой `<div>` в `className="bigfin-ui"` (если ещё не обёрнут родителем).
5. Закоммитить один PR на экран.

## Токены

Все цвета и шрифты — в `src/styles/tokens.css`. Не пиши `#FFD300` — пиши `text-accent`.

## Список компонентов v1

shadcn: `button`, `input`, `label`, `form`, `card`, `checkbox`, `separator`, `alert`, `sonner`, `skeleton`, `tooltip`
Custom: `Logo`, `Spinner`, `Link`, `AuthLayout`

## Что НЕ входит в v1

`Dialog`, `Tabs`, `Select`, `Combobox`, `DropdownMenu`, `Popover`, `Avatar`, `Badge`, `Calendar`, `DatePicker`, `Sheet`, `Drawer`, `Command`, `Table`, `Accordion`, `RadioGroup`, `Switch`, `Slider`, `Progress`, `AlertDialog` — добавляются по мере необходимости в следующих под-проектах.
```

- [ ] **Step 2: Закоммитить**

```bash
git add packages/webapp/src/components/ui/README.md
git commit -m "docs(ui): add Design System README"
```

---

## Task 1.19: Phase 1 Acceptance

- [ ] **Step 1: Открыть Storybook, пройти по всем разделам**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/webapp storybook
```

Проверить:
- [ ] `Brand → Colors` — все swatches на месте, цвета правильные
- [ ] `Brand → Typography` — все размеры Inter Variable видны, кириллица работает
- [ ] `Brand → Logo` — все размеры + WithMark
- [ ] `Components → Button` — все 5 вариантов, 4 размера, with-icon, disabled
- [ ] `Components → Input` — default, password, email, disabled
- [ ] `Components → Label` — корректная связь с Input
- [ ] `Components → Form` — `LoginExample` валидируется, по нажатию Войти показывает данные
- [ ] `Components → Card` — двусоставная карточка, header/content/footer
- [ ] `Components → Checkbox` — default, with-label, checked, disabled
- [ ] `Components → Separator` — горизонтальный с текстом «или»
- [ ] `Components → Alert` — default + destructive с иконкой
- [ ] `Components → Toast` — клики по кнопкам показывают toast
- [ ] `Components → Skeleton` — анимируется (pulse)
- [ ] `Components → Tooltip` — hover показывает tooltip
- [ ] `Components → Spinner` — анимируется
- [ ] `Components → Link` — кликабельный
- [ ] `Layouts → AuthLayout` — две колонки на десктоп, одна на мобильном

- [ ] **Step 2: Финальный typecheck**

```bash
pnpm --filter @bigfin/utils build
pnpm --filter @bigfin/webapp typecheck
```
Expected: 0 ошибок.

- [ ] **Step 3: Зафиксировать тэг**

```bash
git tag phase-1-done
git log --oneline phase-0-done..phase-1-done  # видно все коммиты Phase 1
```

**Critical checkpoint:** если хоть один компонент не работает в Storybook — НЕ переходить к Phase 2.

---

# Phase 2 — Пилот Login / Register / ForgotPassword

**Длительность:** 2-3 недели
**Цель:** при заходе на `localhost:4000/auth/login` виден Bold Fintech Login. Старые auth-страницы удалены.

---

## Task 2.1: Документировать существующий auth-флоу

**Files:** (read-only investigation)

- [ ] **Step 1: Найти существующий роутинг auth**

```bash
grep -rn "auth/login\|AuthenticationPage\|Login\b" packages/webapp/src/routes/ packages/webapp/src/containers/Authentication/ --include="*.tsx" --include="*.ts" | head -30
```

- [ ] **Step 2: Зафиксировать карту auth**

Создать `docs/superpowers/plans/baselines/2026-05-25-auth-map.md`:
```markdown
# Карта auth-флоу на baseline

## Роуты
<list with paths from grep>

## Файлы для удаления (в Task 2.7)
- packages/webapp/src/containers/Authentication/Login.tsx
- packages/webapp/src/containers/Authentication/LoginForm.tsx
- packages/webapp/src/containers/Authentication/Register.tsx
- packages/webapp/src/containers/Authentication/RegisterForm.tsx
- packages/webapp/src/containers/Authentication/SendResetPassword.tsx
- packages/webapp/src/containers/Authentication/SendResetPasswordForm.tsx
- packages/webapp/src/containers/Authentication/ResetPassword.tsx
- packages/webapp/src/containers/Authentication/ResetPasswordForm.tsx

## НЕ удалять
- AuthContainer.tsx, AuthenticationPage.tsx, AuthInsider.tsx, AuthMetaBoot.tsx — wrapper-инфраструктура
- EmailConfirmation.tsx, InviteAccept*.tsx — другие auth-флоу
- withAuthentication.tsx, withAuthenticationActions.tsx, utils.tsx — общая инфраструктура

## API hooks для submit
<какие mutate-функции используют существующие формы для login/register/forgot — записать сюда>
```

- [ ] **Step 3: Прочитать существующий `LoginForm.tsx`**

```bash
cat packages/webapp/src/containers/Authentication/LoginForm.tsx
```

Из этого извлечь:
- Какой mutation hook используется (например, `useAuthLogin`)
- Какие поля формы
- Куда идёт redirect после успеха

Записать в `auth-map.md` под секцией «API hooks для submit».

- [ ] **Step 4: Закоммитить документ** (если docs в git, иначе просто оставить файл)

---

## Task 2.2.0: Подключить vitest как тест-раннер (pre-step для 2.2)

**Зачем:** Task 2.2 требует vitest, но в webapp нет ни одного работающего тест-раннера (`pnpm test` сейчас падает — `scripts/test.js` отсутствует). Подключаем vitest как родное решение для Vite-проекта.

**Files:**
- Modify: `packages/webapp/vite.config.mts` (добавить `test` поле)
- Modify: `packages/webapp/package.json` (новые devDeps + замена `"test"` скрипта)
- Modify: `packages/webapp/tsconfig.json` (типы для jest-dom)
- Create: `packages/webapp/src/test-setup.ts`

- [ ] **Step 1: Установить devDeps**

```bash
nvm use 18.16.1
cd D:/Кодинг/Bigfin
pnpm --filter @bigfin/webapp add -D vitest@^2.1.0 jsdom@^25.0.0 @testing-library/jest-dom@^6.6.0
```

Версии выбраны под Node 18 + React 18.

- [ ] **Step 2: Создать setup-файл**

`packages/webapp/src/test-setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Добавить `test` поле в `vite.config.mts`**

В начало файла:
```ts
/// <reference types="vitest" />
```

В возвращаемый объект `defineConfig`, рядом с `build`:
```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test-setup.ts'],
  include: ['src/**/*.{test,spec}.{ts,tsx}'],
  css: false,
},
```

`globals: true` нужен, потому что в проекте уже есть 9 `*.spec.ts` файлов в `MoneyInputGroup/utils/__tests__/`, написанных в jest-стиле (`describe`/`it`/`expect` без импорта). Включение globals оживляет их (74 теста), не требуя массовой правки.

- [ ] **Step 4: Поменять test-скрипт в `package.json`**

Заменить `"test": "node scripts/test.js"` на:
```json
"test": "vitest",
"test:run": "vitest run",
```

- [ ] **Step 5: Добавить типы jest-dom в `tsconfig.json`**

В `compilerOptions` добавить:
```json
"types": ["vitest/globals", "@testing-library/jest-dom"]
```

- [ ] **Step 6: Smoke-test**

Создать `packages/webapp/src/__tests__/sanity.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vitest sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

```bash
pnpm --filter @bigfin/webapp test:run
```
Expected: `1 passed`, exit 0.

- [ ] **Step 7: Удалить sanity-тест**

```bash
rm packages/webapp/src/__tests__/sanity.test.ts
```

- [ ] **Step 8: Typecheck должен остаться зелёным**

```bash
pnpm --filter @bigfin/utils build
pnpm --filter @bigfin/webapp typecheck
```

- [ ] **Step 9: Закоммитить**

```bash
git add packages/webapp/package.json packages/webapp/vite.config.mts packages/webapp/tsconfig.json packages/webapp/src/test-setup.ts pnpm-lock.yaml
git commit -m "chore(webapp): set up vitest as test runner"
```

**Откат:** один коммит. `git revert <hash>` возвращает к состоянию без тест-раннера.

---

## Task 2.2: zod-схемы для auth-форм + unit-тесты

**Files:**
- Create: `packages/webapp/src/components/auth/schemas.ts`
- Create: `packages/webapp/src/components/auth/__tests__/schemas.test.ts`

- [ ] **Step 1: Написать failing test первым**

Создать `packages/webapp/src/components/auth/__tests__/schemas.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, forgotPasswordSchema } from '../schemas';

describe('loginSchema', () => {
  it('accepts valid email + password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.ru', password: 'password' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    const r = loginSchema.safeParse({ email: 'not-an-email', password: 'password' });
    expect(r.success).toBe(false);
  });

  it('rejects empty password', () => {
    const r = loginSchema.safeParse({ email: 'a@b.ru', password: '' });
    expect(r.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts valid name + email + 10-char password + matching confirm', () => {
    const r = registerSchema.safeParse({
      name: 'Иван',
      email: 'a@b.ru',
      password: 'password12',
      confirmPassword: 'password12',
      agreedToTerms: true,
    });
    expect(r.success).toBe(true);
  });

  it('rejects mismatching confirm password', () => {
    const r = registerSchema.safeParse({
      name: 'Иван',
      email: 'a@b.ru',
      password: 'password12',
      confirmPassword: 'different12',
      agreedToTerms: true,
    });
    expect(r.success).toBe(false);
  });

  it('rejects when terms not agreed', () => {
    const r = registerSchema.safeParse({
      name: 'Иван',
      email: 'a@b.ru',
      password: 'password12',
      confirmPassword: 'password12',
      agreedToTerms: false,
    });
    expect(r.success).toBe(false);
  });

  it('rejects password shorter than 10 chars', () => {
    const r = registerSchema.safeParse({
      name: 'Иван',
      email: 'a@b.ru',
      password: 'pass1',
      confirmPassword: 'pass1',
      agreedToTerms: true,
    });
    expect(r.success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.ru' }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить — должно упасть (schemas не существуют)**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/webapp test -- schemas.test
```
Expected: FAIL with "Cannot find module '../schemas'".

- [ ] **Step 3: Создать `schemas.ts`**

```ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    name: z.string().min(1, 'Введите имя'),
    email: z.string().email('Введите корректный email'),
    password: z.string().min(10, 'Пароль должен быть не короче 10 символов'),
    confirmPassword: z.string(),
    agreedToTerms: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })
  .refine((data) => data.agreedToTerms === true, {
    message: 'Необходимо согласие с условиями',
    path: ['agreedToTerms'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Введите корректный email'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
```

- [ ] **Step 4: Запустить тесты — должны пройти**

```bash
pnpm --filter @bigfin/webapp test -- schemas.test
```
Expected: PASS (все тесты).

- [ ] **Step 5: Закоммитить**

```bash
git add packages/webapp/src/components/auth/
git commit -m "feat(auth): zod schemas for Login/Register/ForgotPassword + tests"
```

---

## Task 2.3: LoginPage

**Files:**
- Create: `packages/webapp/src/components/auth/LoginPage.tsx`

- [ ] **Step 1: Создать `LoginPage.tsx`**

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { AuthLayout } from '@/components/ui/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toaster } from '@/components/ui/sonner';
import { Spinner } from '@/components/ui/Spinner';
import { Link } from '@/components/ui/Link';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { loginSchema, type LoginInput } from './schemas';

// ВАЖНО: имя hook и тип ответа надо подтвердить из существующего LoginForm.tsx
// и заменить placeholder на реальный hook. До этого UI работает в режиме демонстрации.
// import { useAuthLogin } from '@/hooks/useAuthLogin';

export const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    try {
      // TODO в Task 2.6: подключить реальный hook useAuthLogin
      // const result = await useAuthLogin.mutateAsync(data);
      console.info('Login submit (demo):', data);
      toast.success('Форма отправлена (демо-режим, hook не подключён)');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Сетевая ошибка';
      if (message.includes('credentials') || message.includes('401')) {
        setServerError('Неверный email или пароль');
      } else {
        toast.error(`Сетевая ошибка: ${message}`);
      }
    }
  };

  return (
    <AuthLayout>
      <Toaster />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Войдите в Bigfin</h1>
          <p className="text-text-secondary mt-1">Управляйте финансами бизнеса</p>
        </div>

        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="name@company.ru" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пароль</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                        aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="remember"
                      />
                    </FormControl>
                    <Label htmlFor="remember" className="cursor-pointer">Запомнить меня</Label>
                  </FormItem>
                )}
              />
              <Link to="/auth/forgot-password" variant="muted" className="text-sm">
                Забыли пароль?
              </Link>
            </div>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Spinner size="sm" /> : null}
              {form.formState.isSubmitting ? 'Входим...' : 'Войти'}
              {!form.formState.isSubmitting && <ArrowRight className="h-4 w-4" />}
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-text-muted">или</span>
              <Separator className="flex-1" />
            </div>

            <Button variant="secondary" type="button" disabled>
              Войти через Google (скоро)
            </Button>

            <p className="text-sm text-text-secondary text-center mt-2">
              Нет аккаунта? <Link to="/auth/register">Зарегистрируйтесь</Link>
            </p>
          </form>
        </Form>
      </div>
    </AuthLayout>
  );
};
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @bigfin/utils build && pnpm --filter @bigfin/webapp typecheck
```
Expected: 0 ошибок.

- [ ] **Step 3: Закоммитить**

```bash
git add packages/webapp/src/components/auth/LoginPage.tsx
git commit -m "feat(auth): LoginPage with new design (demo-mode, hook not yet wired)"
```

---

## Task 2.4: RegisterPage

**Files:**
- Create: `packages/webapp/src/components/auth/RegisterPage.tsx`

- [ ] **Step 1: Создать**

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { AuthLayout } from '@/components/ui/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toaster } from '@/components/ui/sonner';
import { Spinner } from '@/components/ui/Spinner';
import { Link } from '@/components/ui/Link';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { registerSchema, type RegisterInput } from './schemas';

export const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', agreedToTerms: false },
  });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    try {
      // TODO Task 2.6: подключить hook useAuthRegister
      console.info('Register submit (demo):', data);
      toast.success('Форма отправлена (демо-режим)');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Сетевая ошибка';
      setServerError(message);
    }
  };

  return (
    <AuthLayout>
      <Toaster />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Создайте аккаунт</h1>
          <p className="text-text-secondary mt-1">Бесплатно. Без карты.</p>
        </div>

        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя</FormLabel>
                  <FormControl><Input autoComplete="name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" autoComplete="email" placeholder="name@company.ru" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пароль</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                        aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Подтвердите пароль</FormLabel>
                  <FormControl>
                    <Input type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agreedToTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} id="terms" />
                  </FormControl>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="terms" className="cursor-pointer">
                      Я согласен с <Link to="/terms">условиями оферты</Link>
                    </Label>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner size="sm" />}
              Зарегистрироваться
            </Button>

            <p className="text-sm text-text-secondary text-center">
              Уже есть аккаунт? <Link to="/auth/login">Войдите</Link>
            </p>
          </form>
        </Form>
      </div>
    </AuthLayout>
  );
};
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/auth/RegisterPage.tsx
git commit -m "feat(auth): RegisterPage with new design"
```

---

## Task 2.5: ForgotPasswordPage

- [ ] **Step 1: Создать**

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { AuthLayout } from '@/components/ui/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toaster } from '@/components/ui/sonner';
import { Spinner } from '@/components/ui/Spinner';
import { Link } from '@/components/ui/Link';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { forgotPasswordSchema, type ForgotPasswordInput } from './schemas';

export const ForgotPasswordPage = () => {
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      // TODO Task 2.6: подключить hook useAuthForgotPassword
      console.info('ForgotPassword submit (demo):', data);
      setSent(true);
    } catch (err) {
      toast.error('Сетевая ошибка');
    }
  };

  return (
    <AuthLayout>
      <Toaster />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Сброс пароля</h1>
          <p className="text-text-secondary mt-1">Введите email, и мы отправим ссылку.</p>
        </div>

        {sent ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Письмо отправлено. Проверьте почту.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" autoComplete="email" placeholder="name@company.ru" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Spinner size="sm" />}
                Отправить ссылку
              </Button>
            </form>
          </Form>
        )}

        <p className="text-sm text-text-secondary text-center">
          <Link to="/auth/login" variant="muted">← Вернуться к входу</Link>
        </p>
      </div>
    </AuthLayout>
  );
};
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @bigfin/webapp typecheck
git add packages/webapp/src/components/auth/ForgotPasswordPage.tsx
git commit -m "feat(auth): ForgotPasswordPage with new design"
```

---

## Task 2.6: Подключить реальные API-hooks

**Files:**
- Modify: `packages/webapp/src/components/auth/LoginPage.tsx`
- Modify: `packages/webapp/src/components/auth/RegisterPage.tsx`
- Modify: `packages/webapp/src/components/auth/ForgotPasswordPage.tsx`

- [ ] **Step 1: Найти существующие mutation-hooks**

Из Task 2.1 в `auth-map.md` записано имя hooks. Например `useAuthLogin`, `useAuthRegister`, `useAuthSendResetPassword`.

```bash
grep -rn "useAuthLogin\|useAuthRegister\|useAuthSendResetPassword\|useAuthForgotPassword" packages/webapp/src/hooks/ --include="*.ts" --include="*.tsx" | head -20
```

- [ ] **Step 2: Подключить в LoginPage**

В `LoginPage.tsx` убрать `// TODO` и заменить демо-`onSubmit` на:
```tsx
import { useAuthLogin } from '@/hooks/...'; // путь из шага 1

const { mutateAsync: login } = useAuthLogin();

const onSubmit = async (data: LoginInput) => {
  setServerError(null);
  try {
    await login(data);
    // редирект происходит внутри hook'a или через router
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка входа';
    if (err && typeof err === 'object' && 'response' in err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 401 || status === 403) {
        setServerError('Неверный email или пароль');
        return;
      }
    }
    toast.error(`Сетевая ошибка: ${message}`);
  }
};
```

- [ ] **Step 3: Аналогично для RegisterPage и ForgotPasswordPage**

Использовать соответствующие hooks из `auth-map.md`. В случае сомнений — оставить демо-режим, описать вопрос в issue.

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @bigfin/utils build && pnpm --filter @bigfin/webapp typecheck
```

- [ ] **Step 5: Закоммитить**

```bash
git add packages/webapp/src/components/auth/
git commit -m "feat(auth): wire real API hooks into new auth pages"
```

---

## Task 2.7: Подменить роуты на новые компоненты

**Files:**
- Modify: routing-файл (точное имя — из Task 2.1)

- [ ] **Step 1: Найти routing-конфиг**

Из `auth-map.md` известно, где лежит routing (вероятно `packages/webapp/src/routes/index.tsx` или `containers/Authentication/AuthenticationPage.tsx`).

```bash
grep -rn "path=.*login\|path=.*register\|path=.*reset" packages/webapp/src/ --include="*.tsx" --include="*.ts"
```

- [ ] **Step 2: Заменить компоненты в route-таблице**

В routing-файле найти роуты `/auth/login`, `/auth/register`, и заменить:
```tsx
// Старое:
import Login from 'containers/Authentication/Login';
import Register from 'containers/Authentication/Register';
import SendResetPassword from 'containers/Authentication/SendResetPassword';

<Route path="/auth/login" component={Login} />
<Route path="/auth/register" component={Register} />
<Route path="/auth/send-reset-password" component={SendResetPassword} />

// Новое:
import { LoginPage } from '@/components/auth/LoginPage';
import { RegisterPage } from '@/components/auth/RegisterPage';
import { ForgotPasswordPage } from '@/components/auth/ForgotPasswordPage';

<Route path="/auth/login" component={LoginPage} />
<Route path="/auth/register" component={RegisterPage} />
<Route path="/auth/forgot-password" component={ForgotPasswordPage} />
{/* Сохраняем старый путь для совместимости */}
<Route path="/auth/send-reset-password" component={ForgotPasswordPage} />
```

- [ ] **Step 3: Запустить dev — визуально проверить**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/webapp dev
```

Открыть в браузере:
- `http://localhost:4000/auth/login` — видно новый Bold Fintech Login
- `http://localhost:4000/auth/register` — Register
- `http://localhost:4000/auth/forgot-password` — Forgot password

Проверить:
- Левая брендовая панель видна на десктоп
- На мобильном (DevTools, viewport 375px) — одна колонка с лого сверху
- Поля валидируются (пустой email → красное сообщение под полем после blur)
- Show/hide password работает
- Заполненная форма отправляется (Network показывает запрос на /api/auth/login)

- [ ] **Step 4: Закоммитить**

```bash
git add packages/webapp/src/<routing-file>
git commit -m "feat(routes): use new auth pages for /auth/login, /auth/register, /auth/forgot-password"
```

---

## Task 2.8: Удалить старые auth-файлы

**Files:** (deletions)

- [ ] **Step 1: Удалить файлы из списка**

```bash
cd D:/Кодинг/Bigfin
git rm packages/webapp/src/containers/Authentication/Login.tsx
git rm packages/webapp/src/containers/Authentication/LoginForm.tsx
git rm packages/webapp/src/containers/Authentication/Register.tsx
git rm packages/webapp/src/containers/Authentication/RegisterForm.tsx
git rm packages/webapp/src/containers/Authentication/SendResetPassword.tsx
git rm packages/webapp/src/containers/Authentication/SendResetPasswordForm.tsx
git rm packages/webapp/src/containers/Authentication/ResetPassword.tsx
git rm packages/webapp/src/containers/Authentication/ResetPasswordForm.tsx
```

- [ ] **Step 2: Найти и убрать оставшиеся импорты**

```bash
grep -rn "containers/Authentication/Login\|containers/Authentication/Register\|containers/Authentication/SendResetPassword\|containers/Authentication/ResetPassword" packages/webapp/src/ --include="*.tsx" --include="*.ts"
```
Expected: пусто (или единичные упоминания, которые надо убрать).

Если есть оставшиеся импорты — заменить на новые пути.

- [ ] **Step 3: Финальный typecheck**

```bash
pnpm --filter @bigfin/utils build
pnpm --filter @bigfin/webapp typecheck
```
Expected: 0 ошибок. Если есть ошибки про несуществующие импорты — поправить.

- [ ] **Step 4: Финальный lang:check**

```bash
pnpm --filter @bigfin/webapp lang:check
```
Expected: exit 0. Если упало — добавить недостающие ключи перевода (в новых страницах могут быть hardcoded русские строки, надо их вынести через `react-intl-universal` `intl.get(...)`).

**Замечание:** в текущей версии плана LoginPage/RegisterPage используют hardcoded русские строки. В Phase 2 это допустимо (Bigfin позиционируется RU-first, EN как fallback). Если `lang:check` требует ключи — добавить их по правилам существующего i18n-флоу.

- [ ] **Step 5: Закоммитить удаления**

```bash
git commit -m "feat(auth): remove legacy BlueprintJS auth pages"
```

---

## Task 2.9: Phase 2 Acceptance — финальная визуальная проверка

- [ ] **Step 1: Финальный dev-run**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/utils build
pnpm --filter @bigfin/webapp dev
```

- [ ] **Step 2: Чек-лист по критериям из спеки (раздел 11)**

- [ ] `pnpm storybook` запускается, видны 15 компонентов + 3 docs-страницы (Colors, Typography, Tokens — если последняя есть; иначе только 2)
- [ ] `pnpm dev` запускается, страница `/auth/login` выглядит в Bold Fintech-стиле
- [ ] Страницы `/auth/register` и `/auth/forgot-password` работают
- [ ] Старые auth-файлы удалены (`git status` чистый, `grep` не находит импортов)
- [ ] `pnpm typecheck` возвращает 0 ошибок
- [ ] `pnpm lang:check` возвращает 0
- [ ] Существующие экраны (открыть несколько случайных через старые роуты, например `/customers`) визуально не пострадали — старый BP-стиль на месте
- [ ] `packages/webapp/src/components/ui/README.md` существует и содержит гайд

- [ ] **Step 3: Зафиксировать завершение**

```bash
git tag phase-2-done
git tag d-redesign-done
git log --oneline phase-1-done..phase-2-done
```

- [ ] **Step 4: Visual baseline для будущих миграций**

Сделать скриншот `/auth/login` (новый дизайн) — сохранить в `docs/superpowers/plans/baselines/after-2026-XX-XX-login.png`. Это «эталон» для проверки следующих экранов.

---

## Task 2.10: Создать драфт спеки D-Phase-3

**Files:**
- Create: `docs/superpowers/specs/2026-XX-XX-redesign-phase3-migration-design.md` (draft)

- [ ] **Step 1: Создать драфт**

Создать файл со следующим содержанием:
```markdown
# Спецификация под-проекта: D-Phase-3 — Миграция остальных экранов

**Статус:** Draft (создаётся после завершения D-Phase-2)
**Зависимость:** `2026-05-25-redesign-design.md` (Phase 0+1+2 завершены)

## Контекст

После пилота Login (Phase 2) дизайн-система v1 готова. Этот под-проект — миграция всех остальных экранов с BlueprintJS на shadcn один за другим.

## Принципы

- Один экран = один PR
- Каждый PR обратим (`git revert`)
- Никаких «глобальных миграций Button» — только локально внутри экрана
- Параллельно с основной roadmap (фичи + миграция в одном PR)

## Очередь (из 2026-05-25 раздела 9)

1. Settings (Профиль, Организация, Подписка)
2. Onboarding-wizard
3. Dashboard (требует решённого Docker)
4. Customers / Vendors lists (добавляет компонент Table в DS)
5. Invoice list + Invoice detail
6. Manual Journals, Plan of Accounts
7. Reports (ДДС / ОПиУ / Баланс)

## Прочерчено: что в каждый момент добавляется в DS v(N+1)

- DS v2 (после Settings): + Switch, RadioGroup, Avatar
- DS v3 (после Dashboard): + Tabs, Badge, DropdownMenu, Sheet, Calendar/DatePicker
- DS v4 (после Customers): + Table, Pagination, Command
- ...

## TBD

- Детализация по каждому экрану — заполняется по мере подхода к нему
- Точный порядок дополнительных компонентов DS — корректируется по результату пилота
```

- [ ] **Step 2: (Опционально) закоммитить, если docs в git**

Если `docs/` лежит вне git (что в этом проекте) — просто оставить файл.

---

# Self-Review (выполнен автором плана)

**1. Spec coverage** — каждый раздел спеки имеет соответствующие задачи:

| Раздел спеки | Задачи |
|---|---|
| 1. Контекст и цели | Документирующий header плана |
| 2. Scope/Anti-scope | Документирующий header + Task 2.8 (удаление BP файлов) |
| 3. Архитектура | Task 0.3 (globals/tokens), Task 0.9 (Storybook), File Structure |
| 4. Фазы 0/1/2 | Tasks 0.x, 1.x, 2.x — три отдельные секции |
| 5. Tech stack | Task 0.2 (Tailwind), Task 0.7 (shadcn), Task 0.9 (Storybook), Task 1.6 (RHF+zod), Task 1.11 (sonner) |
| 6. Бренд-токены v1 | Task 0.3, Task 1.1 (colors.mdx), Task 1.2 (Inter Variable) |
| 7. 15 компонентов | Tasks 1.3 — 1.17 (по одному компоненту) |
| 8. Дизайн Login | Task 2.3, AuthLayout в Task 1.17 |
| 9. План миграции | Task 2.10 (создать драфт D-Phase-3) |
| 10. Сосуществование | `.bigfin-ui` scope в Task 0.3, README в Task 1.18 |
| 11. Критерии завершения | Task 2.9 (acceptance checklist) |
| 12. Риски | Учтены: Tailwind v4 → Task 0.4 валидирует, BP regressions → Task 0.1 baseline, RHF↔Formik → README, lang:check → Task 2.9 |
| 13. Что после | Task 2.10 |

**2. Placeholder scan** — TBD/TODO в плане:

- В шаблоне `auth-map.md` (Task 2.1) фраза «`<list with paths from grep>`» — это инструкция к заполнению из реального вывода grep, не placeholder в коде. ОК.
- В Task 2.6 шаге 2 фраза «путь из шага 1» — корректная отсылка к предыдущему шагу той же задачи. ОК.
- В Task 2.3 LoginPage есть `// TODO в Task 2.6: подключить реальный hook` — это сознательный «демо-режим» с явной отсылкой к более поздней задаче, где TODO снимается. ОК.
- В Task 2.10 в драфте D-Phase-3 раздел «TBD» — это сознательное оставление вопросов на будущий под-проект (драфт). ОК.

**3. Type consistency:**

- `cn` импортируется как `import { cn } from '@/lib/cn'` везде. Согласованно.
- `loginSchema`, `LoginInput` определены в Task 2.2, используются в Task 2.3. Согласованно.
- `Logo` импортируется как `import { Logo } from './Logo'` в Task 1.17 (AuthLayout) и `Logo.stories.tsx`. Согласованно.
- `Button` `variant="primary" | "secondary" | "ghost" | "link" | "destructive"` — везде используются именно эти имена. Согласованно.
- `Toaster` импортируется из `@/components/ui/sonner`. Согласованно (на странице используется `<Toaster />` + `toast(...)` из 'sonner').

**4. Ambiguity:**

- В Task 0.7 (shadcn init) при отсутствии файла `tailwind.config.ts` в v4 — указано «пропустить или указать `tailwind.config.ts`», предлагается решение в момент работы. Допустимо.
- В Task 2.7 точное имя routing-файла не указано — это **сознательно**, потому что Task 2.1 находит его через `grep`. План говорит: «routing-файл (точное имя — из Task 2.1)». ОК.

Все проверки пройдены. План готов.

---

# Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-25-redesign-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Я диспатчу свежего sub-агента под каждую задачу, ревью между задачами, быстрая итерация. Хорошо подходит для длинных планов (этот = 30+ задач), потому что каждый sub-агент получает чистый контекст.

**2. Inline Execution** — Выполняю задачи прямо в этой сессии через `superpowers:executing-plans`, с чекпоинтами для ревью каждые несколько задач. Подходит, если хочешь видеть весь поток в одной сессии и реагировать на проблемы по ходу.

Which approach?
