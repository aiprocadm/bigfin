# D-redesign Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Завершить миграцию auth-флоу на Bold Fintech (3 оставшиеся страницы: EmailConfirmation, RegisterVerify, InviteAccept) и обернуть всю авторизованную часть приложения в новую визуальную shell (Sidebar + Topbar в стиле Bold Fintech), не трогая содержимое внутренних BlueprintJS-страниц.

**Architecture:** Старая и новая дизайн-системы продолжают сосуществовать в одном webapp-пакете — граница по файлам. Новые auth-страницы используют `AuthLayout` + zod + RHF (паттерн Phase 2/2c). Новый shell (`DashboardShell`) — это **визуальная обёртка** над существующим `DashboardPrivatePages`: Sidebar/Topbar отрисованы Bold Fintech-токенами, но рендерят внутри **те же BP-страницы как есть**, переиспользуя существующие хуки (`useMainSidebarMenu`, state notifications, search). Поведение и навигация не меняются — только обвязка.

**Tech Stack:**
- shadcn/ui + Radix UI primitives (Avatar, DropdownMenu, Tabs, Badge, Breadcrumb)
- Tailwind 4 токены из `tokens.css` (existing)
- react-hook-form + zod (схемы в `components/auth/schemas.ts`)
- vitest (юнит-тесты схем)
- Storybook 8 (визуальная проверка каждого нового компонента)
- existing hooks: `useAuthSignUpVerify`, `useAuthSignUpVerifyResendMail`, `useAuthUserVerifyEmail`, `useAuthActions().setLogout`, `useInviteMetaByToken`, `useAuthInviteAccept`, `useMainSidebarMenu`

**Spec:** [`docs/superpowers/specs/2026-05-27-d-phase-3-draft.md`](../specs/2026-05-27-d-phase-3-draft.md)

**Окружение исполнителя:**
- Windows + fnm, Node 18.16.1 (`nvm use 18.16.1` перед каждой командой `pnpm`/`node`)
- pnpm + lerna monorepo, никаких `npm`/`yarn`
- Локальный бэкенд не настроен — это блокер для финальной визуальной проверки flow `register → verify email → email_confirmation`. Workaround: проверять в Storybook через `console.log`-обработчики; конечную интеграцию валидирует основатель в staging-окружении.
- Тесты схем — vitest (`pnpm --filter @bigfin/webapp test:run`). Typecheck — `pnpm typecheck` (все 3 пакета).

---

## Решения, зафиксированные для этого плана

Эти решения закрывают 6 открытых вопросов из раздела 7 спеки. Любое можно пересмотреть — план тогда корректируется в соответствующем Block.

| # | Вопрос | Решение | Обоснование |
|---|---|---|---|
| 1 | Где живёт юридический текст Privacy/Terms (3.3 спеки)? | **Исключаем 3.3 из Phase 3.** Placeholder-страницы из PR #15 остаются как есть. Реальный контент придёт из Sub-project ②a `russian-legal-attributes`. | Эта работа уже стартовала отдельно (см. план `2026-05-27-russian-legal-attributes-plan.md`). Дублирование тут только запутает. |
| 2 | Sidebar — горизонтальный или вертикальный? | **Вертикальный**, слева, ширина ≈240px (expanded) / ≈64px (mini). На мобиле — drawer/sheet, выезжающий слева. | Подтверждено основателем. Стандарт для finance/SaaS, минимально ломает текущий layout (тоже вертикальный). |
| 3 | Состав Topbar? | **Полный набор**: глобальный поиск, уведомления (bell), quick-actions (+), help (?), переключатель организации, аватар + меню профиля. | Подтверждено основателем (отметил все опции + «подумай ещё»). Quick-actions и help добавлены сверху как стандарт SaaS и потому что dogfounding-флоу основателя — повседневное создание счетов/контрагентов. |
| 4 | Порядок миграции auth-флоу? | `EmailConfirmationPage` → `RegisterVerifyPage` → `InviteAcceptPage`. ResetPassword уже сделан в Phase 2c. | От простого (одно действие, нет формы) к сложному (форма с 5 полями + provider context). |
| 5 | Какие `.scss` удаляем? | В конце Block D: `packages/webapp/src/style/pages/Authentication/Auth.scss` (единственный там) — после визуального подтверждения, что новые auth-страницы не зависят от его глобальных классов. | Других SCSS в `style/pages/Authentication/` нет (проверено). Sidebar.scss трогаем только если новый Sidebar полностью заменил его (Block C). |
| 6 | MSW в Storybook для auth-страниц? | **НЕ устанавливаем.** В Storybook auth-страницы рендерятся с заглушками-хендлерами (action: `console.log`). Реальная сетевая проверка — в браузере на staging. | Текущий Storybook полностью offline (так в Phase 1). MSW добавляет зависимость и сложность ради 3 экранов — не стоит. Если в будущем понадобится — отдельный sub-project. |

---

## File Structure

### Создаваемые файлы

**Block A — auth pages:**
- `packages/webapp/src/components/auth/EmailConfirmationPage.tsx`
- `packages/webapp/src/components/auth/EmailConfirmationPage.stories.tsx`
- `packages/webapp/src/components/auth/RegisterVerifyPage.tsx`
- `packages/webapp/src/components/auth/RegisterVerifyPage.stories.tsx`
- `packages/webapp/src/components/auth/InviteAcceptPage.tsx`
- `packages/webapp/src/components/auth/InviteAcceptPage.stories.tsx`

**Block B — DS v2 примитивы:**
- `packages/webapp/src/components/ui/avatar.tsx` + `avatar.stories.tsx` (shadcn)
- `packages/webapp/src/components/ui/dropdown-menu.tsx` + `dropdown-menu.stories.tsx` (shadcn)
- `packages/webapp/src/components/ui/tabs.tsx` + `tabs.stories.tsx` (shadcn)
- `packages/webapp/src/components/ui/badge.tsx` + `badge.stories.tsx` (shadcn)
- `packages/webapp/src/components/ui/breadcrumb.tsx` + `breadcrumb.stories.tsx` (shadcn)
- `packages/webapp/src/components/ui/Sidebar.tsx` + `Sidebar.stories.tsx` (custom)
- `packages/webapp/src/components/ui/SidebarItem.tsx` (custom, в том же файле что Sidebar — TBD по размеру)
- `packages/webapp/src/components/ui/Topbar.tsx` + `Topbar.stories.tsx` (custom)

**Block C — shell:**
- `packages/webapp/src/components/dashboard/DashboardShell.tsx`
- `packages/webapp/src/components/dashboard/DashboardShell.stories.tsx`

### Модифицируемые файлы

- `packages/webapp/src/components/auth/schemas.ts` — добавить `inviteAcceptSchema`
- `packages/webapp/src/components/auth/__tests__/schemas.test.ts` — добавить тесты для `inviteAcceptSchema`
- `packages/webapp/src/routes/authentication.tsx` — заменить `InviteAccept` (legacy) на новую страницу
- `packages/webapp/src/components/App.tsx` — заменить `RegisterVerify` и `EmailConfirmation` (legacy lazy imports) на новые
- `packages/webapp/src/containers/Authentication/Authentication.tsx` — потенциально убрать `AuthMetaBootProvider` и `Auth.scss` import после миграции (см. Task D.2)
- `packages/webapp/src/components/Dashboard/PrivatePages.tsx` — обернуть в `DashboardShell` (точный путь модификации в Task C.2)

### Удаляемые файлы (Block D, после визуального подтверждения)

- `packages/webapp/src/containers/Authentication/EmailConfirmation.tsx`
- `packages/webapp/src/containers/Authentication/RegisterVerify.tsx`
- `packages/webapp/src/containers/Authentication/InviteAccept.tsx`
- `packages/webapp/src/containers/Authentication/InviteAcceptForm.tsx`
- `packages/webapp/src/containers/Authentication/InviteAcceptFormContent.tsx`
- `packages/webapp/src/containers/Authentication/InviteAcceptProvider.tsx`
- `packages/webapp/src/style/pages/Authentication/Auth.scss` (только если не используется новой shell)

### НЕ удаляем (по спеке)

- `withAuthentication.tsx`, `withAuthenticationActions.tsx`, `AuthMetaBoot.tsx`, `AuthInsider.tsx` — инфраструктурные HOC'и
- `AuthenticationPage.tsx`, `Authentication.tsx` — обёртка auth-роутов (Authentication.tsx может быть упрощена в Block D, но не удалена)
- Никаких файлов в `packages/server/**` — Phase 3 только frontend

### Стратегия PR/веток

Phase 3 разбита на **3 PR** для управляемого ревью:

1. **PR Phase 3a**: Block A (3 auth-страницы + удаление легаси) — ветка `feat/d-redesign-phase-3a-auth-tail`
2. **PR Phase 3b**: Block B (8 DS v2 примитивов в Storybook, без интеграции в app) — ветка `feat/d-redesign-phase-3b-ds-v2-shell-components`
3. **PR Phase 3c**: Block C (DashboardShell, wire в App.tsx) + Block D (final cleanup) — ветка `feat/d-redesign-phase-3c-shell-integration`

Каждый PR проходит typecheck + lang-check + tests + визуальный smoke перед мерджем.

---

# Block A — Завершение миграции auth-флоу

**Цель блока:** Перевести 3 оставшиеся легаси-страницы (`EmailConfirmation`, `RegisterVerify`, `InviteAccept`) на Bold Fintech-DS с `AuthLayout`. После этого ВЕСЬ auth-флоу единообразен.

**Ветка/PR:** `feat/d-redesign-phase-3a-auth-tail`

**Финальный acceptance блока:**
- 3 новые страницы в `components/auth/` + stories
- Routes в `App.tsx` и `routes/authentication.tsx` указывают на новые компоненты
- Старые файлы удалены
- `pnpm typecheck` exit 0
- `pnpm --filter @bigfin/webapp test:run` exit 0 (включая 3+ новых теста для `inviteAcceptSchema`)
- Storybook: 3 новые страницы открываются и рендерят `AuthLayout` корректно

---

### Task A.1: Расширить schemas — добавить inviteAcceptSchema + тесты

**Files:**
- Modify: `packages/webapp/src/components/auth/schemas.ts`
- Modify: `packages/webapp/src/components/auth/__tests__/schemas.test.ts`

**Зачем:** Форма InviteAccept имеет 5 полей с межполевой валидацией. Без zod-схемы страница в Task A.4 будет полна inline-валидации.

- [ ] **Step 1: Прочитать существующий schemas.ts**

Цель — увидеть текущий стиль (z.object, .refine для cross-field, тип через z.infer). Не править ничего до прочтения.

Run: `cat packages/webapp/src/components/auth/schemas.ts`

- [ ] **Step 2: Написать упавший тест для inviteAcceptSchema**

В файле `packages/webapp/src/components/auth/__tests__/schemas.test.ts` добавить в конец:

```typescript
describe('inviteAcceptSchema', () => {
  const validInput = {
    firstName: 'Иван',
    lastName: 'Петров',
    password: 'longenough10',
    confirmPassword: 'longenough10',
  };

  it('accepts valid input', () => {
    expect(inviteAcceptSchema.safeParse(validInput).success).toBe(true);
  });

  it('rejects when password < 10 chars', () => {
    const r = inviteAcceptSchema.safeParse({
      ...validInput,
      password: 'short',
      confirmPassword: 'short',
    });
    expect(r.success).toBe(false);
  });

  it('rejects when passwords mismatch', () => {
    const r = inviteAcceptSchema.safeParse({
      ...validInput,
      confirmPassword: 'differentpass',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path[0] === 'confirmPassword');
      expect(issue?.message).toBe('Пароли не совпадают');
    }
  });

  it('rejects when firstName is empty', () => {
    expect(
      inviteAcceptSchema.safeParse({ ...validInput, firstName: '' }).success,
    ).toBe(false);
  });

  it('rejects when lastName is empty', () => {
    expect(
      inviteAcceptSchema.safeParse({ ...validInput, lastName: '' }).success,
    ).toBe(false);
  });
});
```

Также **расширить импорт в начале файла теста** — заменить:
```typescript
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas';
```
на:
```typescript
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  inviteAcceptSchema,
} from '../schemas';
```

- [ ] **Step 3: Запустить тест и убедиться, что упал**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/webapp test:run -- schemas.test.ts
```

Expected: 5 failures с `inviteAcceptSchema is not exported from '../schemas'` или similar.

- [ ] **Step 4: Реализовать inviteAcceptSchema**

В `packages/webapp/src/components/auth/schemas.ts` добавить в конец (перед `export type` секцией):

```typescript
export const inviteAcceptSchema = z
  .object({
    firstName: z.string().min(1, 'Введите имя'),
    lastName: z.string().min(1, 'Введите фамилию'),
    password: z.string().min(10, 'Пароль должен быть не короче 10 символов'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });
```

Также добавить тип в конец файла:
```typescript
export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;
```

- [ ] **Step 5: Запустить тест и убедиться, что прошёл**

```bash
pnpm --filter @bigfin/webapp test:run -- schemas.test.ts
```

Expected: все тесты passing (включая 5 новых для `inviteAcceptSchema`).

- [ ] **Step 6: Запустить typecheck**

```bash
pnpm typecheck
```

Expected: 0 ошибок.

- [ ] **Step 7: Коммит**

```bash
git add packages/webapp/src/components/auth/schemas.ts packages/webapp/src/components/auth/__tests__/schemas.test.ts
git commit -m "feat(auth): add inviteAcceptSchema with cross-field validation"
```

---

### Task A.2: EmailConfirmationPage — страница «email подтверждён» с состояниями

**Files:**
- Create: `packages/webapp/src/components/auth/EmailConfirmationPage.tsx`
- Create: `packages/webapp/src/components/auth/EmailConfirmationPage.stories.tsx`

**Контекст:** Текущий `containers/Authentication/EmailConfirmation.tsx` — компонент без UI (`return null`), который дёргает `useAuthSignUpVerify` и редиректит. Новая страница должна показать пользователю что происходит: spinner → success/error, с CTA.

- [ ] **Step 1: Прочитать референс ResetPasswordPage и старый EmailConfirmation**

Цель — увидеть паттерн mode-state-machine ('idle' | 'success' | 'token-expired') и хук `useAuthSignUpVerify`.

Run:
```bash
cat packages/webapp/src/components/auth/ResetPasswordPage.tsx
cat packages/webapp/src/containers/Authentication/EmailConfirmation.tsx
```

- [ ] **Step 2: Создать EmailConfirmationPage.tsx**

Записать файл `packages/webapp/src/components/auth/EmailConfirmationPage.tsx`:

```typescript
import { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/ui/Link';
import { Spinner } from '@/components/ui/Spinner';
// Legacy JS hook (// @ts-nocheck) — мы передаём { token, email } и получаем mutation.
import { useAuthSignUpVerify } from '@/hooks/query';

type Mode = 'verifying' | 'success' | 'invalid-link' | 'failed';

type SignupVerifyVars = { token: string; email: string };
type SignupVerifyMutation = {
  mutateAsync: (vars: SignupVerifyVars) => Promise<unknown>;
};

const REDIRECT_AFTER_SUCCESS_MS = 2000;

export const EmailConfirmationPage = () => {
  const history = useHistory();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const token = params.get('token');
  const email = params.get('email');

  const { mutateAsync: verifyEmail } =
    useAuthSignUpVerify() as unknown as SignupVerifyMutation;

  const [mode, setMode] = useState<Mode>(
    token && email ? 'verifying' : 'invalid-link',
  );

  // Run verification once on mount when params are present.
  useEffect(() => {
    if (mode !== 'verifying' || !token || !email) return;
    verifyEmail({ token, email })
      .then(() => setMode('success'))
      .catch(() => setMode('failed'));
  }, [mode, token, email, verifyEmail]);

  // Auto-redirect to /auth/login after success.
  useEffect(() => {
    if (mode !== 'success') return;
    const id = setTimeout(
      () => history.push('/auth/login'),
      REDIRECT_AFTER_SUCCESS_MS,
    );
    return () => clearTimeout(id);
  }, [mode, history]);

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">
            Подтверждение email
          </h1>
        </div>

        {mode === 'verifying' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Spinner size="md" />
            <p className="text-text-secondary">Подтверждаем ваш email...</p>
          </div>
        )}

        {mode === 'success' && (
          <>
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Email подтверждён. Перенаправляем ко входу...
              </AlertDescription>
            </Alert>
            <Button type="button" onClick={() => history.push('/auth/login')}>
              Войти в Bigfin
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {(mode === 'failed' || mode === 'invalid-link') && (
          <>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {mode === 'invalid-link'
                  ? 'Ссылка повреждена. Проверьте, что вы открыли её целиком.'
                  : 'Не удалось подтвердить email. Возможно, ссылка устарела.'}
              </AlertDescription>
            </Alert>
            <Button type="button" onClick={() => history.push('/auth/login')}>
              Перейти ко входу
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}

        <p className="mt-2 text-center text-sm text-text-secondary">
          <Link to="/auth/login" variant="muted">
            ← Вернуться к входу
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};
```

- [ ] **Step 3: Создать stories**

Записать файл `packages/webapp/src/components/auth/EmailConfirmationPage.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Route } from 'react-router-dom';

import { EmailConfirmationPage } from './EmailConfirmationPage';

const meta = {
  title: 'Auth/EmailConfirmationPage',
  component: EmailConfirmationPage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story, ctx) => (
      <MemoryRouter
        initialEntries={[ctx.args.__url ?? '/auth/email_confirmation']}
      >
        <Route path="/auth/email_confirmation">
          <Story />
        </Route>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof EmailConfirmationPage>;

export default meta;
type Story = StoryObj<typeof meta>;

// NOTE: Storybook не делает реальный network call — в каждом сториз состояние
// зависит только от URL-параметров (token/email есть → verifying, нет → invalid-link).

export const InvalidLink: Story = {
  args: { __url: '/auth/email_confirmation' } as never,
};

export const Verifying: Story = {
  args: {
    __url: '/auth/email_confirmation?token=demo&email=test@bigfin.ru',
  } as never,
};
```

- [ ] **Step 4: Запустить Storybook и проверить визуально**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/webapp storybook
```

Открыть `http://localhost:6006/?path=/story/auth-emailconfirmationpage--invalid-link` и убедиться:
- `InvalidLink` показывает alert с текстом «Ссылка повреждена...» и кнопку «Перейти ко входу».
- `Verifying` показывает spinner с текстом «Подтверждаем ваш email...» (после нескольких секунд может показать failed — это OK для Storybook без бэкенда).

Остановить Storybook (Ctrl+C).

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 ошибок.

- [ ] **Step 6: Коммит**

```bash
git add packages/webapp/src/components/auth/EmailConfirmationPage.tsx packages/webapp/src/components/auth/EmailConfirmationPage.stories.tsx
git commit -m "feat(auth): add EmailConfirmationPage on Bold Fintech DS"
```

---

### Task A.3: RegisterVerifyPage — экран «проверьте email»

**Files:**
- Create: `packages/webapp/src/components/auth/RegisterVerifyPage.tsx`
- Create: `packages/webapp/src/components/auth/RegisterVerifyPage.stories.tsx`

**Контекст:** Текущий `containers/Authentication/RegisterVerify.tsx` показывает «We sent an email to {emailAddress}» с двумя кнопками (Resend, Sign out). Новая версия — тот же поток, но в `AuthLayout`-эстетике и на русском.

- [ ] **Step 1: Прочитать референс старого RegisterVerify**

Run: `cat packages/webapp/src/containers/Authentication/RegisterVerify.tsx`

Запомнить хуки: `useAuthActions().setLogout`, `useAuthUserVerifyEmail`, `useAuthSignUpVerifyResendMail`.

- [ ] **Step 2: Создать RegisterVerifyPage.tsx**

Записать файл `packages/webapp/src/components/auth/RegisterVerifyPage.tsx`:

```typescript
import { useState } from 'react';
import { CheckCircle2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster } from '@/components/ui/sonner';
// Legacy JS hooks (// @ts-nocheck) — типы здесь сужаем вручную.
import { useAuthActions, useAuthUserVerifyEmail } from '@/hooks/state';
import { useAuthSignUpVerifyResendMail } from '@/hooks/query';

type ResendMutation = { mutateAsync: () => Promise<unknown>; isLoading: boolean };

export const RegisterVerifyPage = () => {
  const { setLogout } = useAuthActions() as { setLogout: () => void };
  const emailAddress = useAuthUserVerifyEmail() as string | null;
  const { mutateAsync: resend, isLoading } =
    useAuthSignUpVerifyResendMail() as unknown as ResendMutation;
  const [justResent, setJustResent] = useState(false);

  const handleResend = async () => {
    try {
      await resend();
      setJustResent(true);
      toast.success('Письмо отправлено повторно — проверьте почту.');
    } catch {
      toast.error('Не удалось отправить письмо. Попробуйте ещё раз.');
    }
  };

  return (
    <AuthLayout>
      <Toaster />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent"
            aria-hidden
          >
            <Mail className="h-6 w-6" />
          </span>
          <h1 className="text-3xl font-semibold text-text-primary">
            Подтвердите ваш email
          </h1>
          <p className="text-text-secondary">
            Мы отправили письмо на{' '}
            <strong className="text-text-primary">
              {emailAddress ?? 'ваш email'}
            </strong>
            . Откройте его и перейдите по ссылке, чтобы начать пользоваться
            Bigfin.
          </p>
        </div>

        {justResent && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Письмо отправлено повторно. Если не пришло за минуту — проверьте
              папку «Спам».
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          <Button type="button" onClick={handleResend} disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner size="sm" />
                Отправляем...
              </>
            ) : (
              'Отправить письмо ещё раз'
            )}
          </Button>

          <Button type="button" variant="outline" onClick={setLogout}>
            Это не мой email — выйти
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};
```

- [ ] **Step 3: Создать stories**

Записать файл `packages/webapp/src/components/auth/RegisterVerifyPage.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

import { RegisterVerifyPage } from './RegisterVerifyPage';

const meta = {
  title: 'Auth/RegisterVerifyPage',
  component: RegisterVerifyPage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof RegisterVerifyPage>;

export default meta;
type Story = StoryObj<typeof meta>;

// NOTE: useAuth* хуки в Storybook возвращают undefined/null —
// email отрендерится как «ваш email», кнопка resend будет no-op.
// Это нормально для визуальной проверки layout/стилей.
export const Default: Story = {};
```

- [ ] **Step 4: Визуальная проверка в Storybook**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/webapp storybook
```

Открыть `http://localhost:6006/?path=/story/auth-registerverifypage--default` и убедиться:
- Иконка `Mail` в жёлтом круге сверху.
- Заголовок «Подтвердите ваш email» по центру.
- Две кнопки: primary «Отправить письмо ещё раз», outline «Это не мой email — выйти».
- Layout — split с hero слева, контент по центру справа.

Остановить Storybook.

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 ошибок.

- [ ] **Step 6: Коммит**

```bash
git add packages/webapp/src/components/auth/RegisterVerifyPage.tsx packages/webapp/src/components/auth/RegisterVerifyPage.stories.tsx
git commit -m "feat(auth): add RegisterVerifyPage on Bold Fintech DS"
```

---

### Task A.4: InviteAcceptPage — форма приёма приглашения

**Files:**
- Create: `packages/webapp/src/components/auth/InviteAcceptPage.tsx`
- Create: `packages/webapp/src/components/auth/InviteAcceptPage.stories.tsx`

**Контекст:** Текущий флоу `InviteAccept` использует `InviteAcceptProvider` (загружает meta по токену) + `InviteAcceptForm` (Formik + BP). Спека требует переписать на RHF+zod, но **сохранить `InviteAcceptProvider`** (он содержит логику загрузки и обработки ошибок токена — не дублируем). Новый компонент = `InviteAcceptProvider` обёртка вокруг новой RHF-формы.

Поля формы (по спеке): firstName, lastName, password, confirmPassword. Поле `email` (invited) и `organizationName` — readonly из `inviteMeta`. Backend API ожидает snake_case (`first_name`, `last_name`, `password`, `organization_name`), маппим в submit handler.

- [ ] **Step 1: Прочитать референсы**

```bash
cat packages/webapp/src/containers/Authentication/InviteAcceptProvider.tsx
cat packages/webapp/src/containers/Authentication/InviteAcceptForm.tsx
cat packages/webapp/src/containers/Authentication/InviteAcceptFormContent.tsx
```

Запомнить:
- `useInviteAcceptContext()` возвращает `{ token, inviteMeta: { email, organizationName } | null, isInviteMetaLoading, inviteAcceptMutate }`.
- API payload: `{ first_name, last_name, password, organization_name }` + token.
- На success: `history.push('/auth/login')` + тост.
- На `INVITE_TOKEN_INVALID`: тост + редирект на login.

- [ ] **Step 2: Создать InviteAcceptPage.tsx**

Записать файл `packages/webapp/src/components/auth/InviteAcceptPage.tsx`:

```typescript
import { useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Link } from '@/components/ui/Link';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster } from '@/components/ui/sonner';
// Сохраняем существующий provider — он несёт логику загрузки meta и обработки 404 токена.
import {
  InviteAcceptProvider,
  useInviteAcceptContext,
} from '@/containers/Authentication/InviteAcceptProvider';

import { inviteAcceptSchema, type InviteAcceptInput } from './schemas';

type InviteAcceptApiPayload = {
  first_name: string;
  last_name: string;
  password: string;
  organization_name: string;
};

type InviteMutateFn = (
  args: [InviteAcceptApiPayload, string],
) => Promise<unknown>;

const InviteAcceptForm = () => {
  const history = useHistory();
  const ctx = useInviteAcceptContext() as {
    token: string;
    inviteMeta: { email: string; organizationName: string } | null;
    isInviteMetaLoading: boolean;
    inviteAcceptMutate: InviteMutateFn;
  };
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<InviteAcceptInput>({
    resolver: zodResolver(inviteAcceptSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    },
  });

  if (ctx.isInviteMetaLoading || !ctx.inviteMeta) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Spinner size="md" />
        <p className="text-text-secondary">Загружаем приглашение...</p>
      </div>
    );
  }

  const onSubmit = async (data: InviteAcceptInput) => {
    try {
      await ctx.inviteAcceptMutate([
        {
          first_name: data.firstName,
          last_name: data.lastName,
          password: data.password,
          organization_name: ctx.inviteMeta!.organizationName,
        },
        ctx.token,
      ]);
      toast.success(
        `Аккаунт создан. Вы приняли приглашение в «${ctx.inviteMeta!.organizationName}».`,
      );
      history.push('/auth/login');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось принять приглашение';
      toast.error(message);
    }
  };

  return (
    <>
      <div>
        <h1 className="text-3xl font-semibold text-text-primary">
          Приглашение в Bigfin
        </h1>
        <p className="mt-1 text-text-secondary">
          Вас пригласили в организацию{' '}
          <strong className="text-text-primary">
            «{ctx.inviteMeta.organizationName}»
          </strong>
          . Заполните данные, чтобы создать аккаунт.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Приглашение отправлено на <strong>{ctx.inviteMeta.email}</strong>.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Имя</FormLabel>
                <FormControl>
                  <Input autoComplete="given-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Фамилия</FormLabel>
                <FormControl>
                  <Input autoComplete="family-name" {...field} />
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
                      autoComplete="new-password"
                      placeholder="Минимум 10 символов"
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-accent"
                      aria-label={
                        showPassword ? 'Скрыть пароль' : 'Показать пароль'
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
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
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Spinner size="sm" />
                Создаём аккаунт...
              </>
            ) : (
              <>
                Принять приглашение
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>

      <p className="mt-2 text-center text-sm text-text-secondary">
        <Link to="/auth/login" variant="muted">
          ← У меня уже есть аккаунт
        </Link>
      </p>
    </>
  );
};

export const InviteAcceptPage = () => {
  const { token } = useParams<{ token: string }>();

  return (
    <AuthLayout>
      <Toaster />
      <div className="flex flex-col gap-6">
        <InviteAcceptProvider token={token}>
          <InviteAcceptForm />
        </InviteAcceptProvider>
      </div>
    </AuthLayout>
  );
};
```

- [ ] **Step 3: Создать stories**

Записать файл `packages/webapp/src/components/auth/InviteAcceptPage.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Route } from 'react-router-dom';

import { InviteAcceptPage } from './InviteAcceptPage';

const meta = {
  title: 'Auth/InviteAcceptPage',
  component: InviteAcceptPage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/auth/invite/demo-token/accept']}>
        <Route path="/auth/invite/:token/accept">
          <Story />
        </Route>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof InviteAcceptPage>;

export default meta;
type Story = StoryObj<typeof meta>;

// NOTE: В Storybook InviteAcceptProvider не сможет загрузить meta (нет backend).
// Ожидаемое поведение — показ Spinner «Загружаем приглашение...» вечно.
// Чтобы протестировать форму, разработчик может временно замокать
// useInviteAcceptContext локально. Полная интеграционная проверка — на staging.
export const LoadingState: Story = {};
```

- [ ] **Step 4: Визуальная проверка в Storybook**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/webapp storybook
```

Открыть story и убедиться: показан Spinner с текстом «Загружаем приглашение...». Это OK — реальный API недоступен в Storybook.

Для проверки формы — временно замокать `useInviteAcceptContext` локально или дождаться интеграции (Task A.5 + staging).

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 ошибок.

- [ ] **Step 6: Коммит**

```bash
git add packages/webapp/src/components/auth/InviteAcceptPage.tsx packages/webapp/src/components/auth/InviteAcceptPage.stories.tsx
git commit -m "feat(auth): add InviteAcceptPage on Bold Fintech DS"
```

---

### Task A.5: Подключить новые auth-страницы в routes + удалить легаси

**Files:**
- Modify: `packages/webapp/src/routes/authentication.tsx` (заменить InviteAccept import)
- Modify: `packages/webapp/src/components/App.tsx` (заменить EmailConfirmation + RegisterVerify imports)
- Delete (только после визуальной проверки): 6 файлов из `containers/Authentication/`

**Зачем:** До этого таска новые компоненты живут параллельно. Этот таск физически переключает приложение на них.

- [ ] **Step 1: Прочитать текущие routes и App.tsx**

```bash
cat packages/webapp/src/routes/authentication.tsx
cat packages/webapp/src/components/App.tsx
```

- [ ] **Step 2: Заменить InviteAccept import в routes/authentication.tsx**

Найти секцию:
```typescript
  {
    path: `${BASE_URL}/invite/:token/accept`,
    component: lazy(() => import('@/containers/Authentication/InviteAccept')),
  },
```

Заменить на:
```typescript
  {
    path: `${BASE_URL}/invite/:token/accept`,
    component: lazy(() =>
      import('@/components/auth/InviteAcceptPage').then((m) => ({
        default: m.InviteAcceptPage,
      })),
    ),
  },
```

Также удалить весь блок EmailConfirmation (он отсюда переехал в App.tsx ещё в легаси):
```typescript
  {
    path: `${BASE_URL}/register/email_confirmation`,
    component: lazy(
      () => import('@/containers/Authentication/EmailConfirmation'),
    ),
  },
```
Заменить на новую страницу:
```typescript
  {
    path: `${BASE_URL}/register/email_confirmation`,
    component: lazy(() =>
      import('@/components/auth/EmailConfirmationPage').then((m) => ({
        default: m.EmailConfirmationPage,
      })),
    ),
  },
```

> Примечание: текущий `App.tsx` тоже ловит `/auth/email_confirmation` ДО того как Switch доходит до `/auth/*` для `AuthenticationPage`. Поэтому правка App.tsx (Step 3) важнее — она сработает первой. Но мы делаем оба, чтобы не оставлять путаницу.

- [ ] **Step 3: Заменить imports в App.tsx**

В `packages/webapp/src/components/App.tsx` заменить:

```typescript
const EmailConfirmation = lazy(
  () => import('@/containers/Authentication/EmailConfirmation'),
);
const RegisterVerify = lazy(
  () => import('@/containers/Authentication/RegisterVerify'),
);
```

на:

```typescript
const EmailConfirmationPage = lazy(() =>
  import('@/components/auth/EmailConfirmationPage').then((m) => ({
    default: m.EmailConfirmationPage,
  })),
);
const RegisterVerifyPage = lazy(() =>
  import('@/components/auth/RegisterVerifyPage').then((m) => ({
    default: m.RegisterVerifyPage,
  })),
);
```

Также в JSX заменить:
```typescript
<Route path={'/auth/register/verify'}>
  <EnsureAuthenticated>
    <EnsureUserEmailNotVerified>
      <RegisterVerify />
    </EnsureUserEmailNotVerified>
  </EnsureAuthenticated>
</Route>

<Route
  path={'/auth/email_confirmation'}
  children={<EmailConfirmation />}
/>
```

на:
```typescript
<Route path={'/auth/register/verify'}>
  <EnsureAuthenticated>
    <EnsureUserEmailNotVerified>
      <RegisterVerifyPage />
    </EnsureUserEmailNotVerified>
  </EnsureAuthenticated>
</Route>

<Route
  path={'/auth/email_confirmation'}
  children={<EmailConfirmationPage />}
/>
```

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 ошибок. Если есть — скорее всего опечатка в import path, исправить и перезапустить.

- [ ] **Step 5: Lang-check (на всякий случай — мы могли случайно тронуть JSON)**

```bash
node packages/webapp/scripts/lang-check.js
```

Expected: 0 missing, 0 extra.

- [ ] **Step 6: Все тесты**

```bash
pnpm --filter @bigfin/webapp test:run
```

Expected: все зелёные.

- [ ] **Step 7: Коммит интеграции (БЕЗ удаления легаси)**

```bash
git add packages/webapp/src/routes/authentication.tsx packages/webapp/src/components/App.tsx
git commit -m "feat(auth): wire EmailConfirmation/RegisterVerify/InviteAccept to new pages"
```

- [ ] **Step 8: STOP — пауза для визуальной проверки основателем**

Прежде чем удалять файлы — по правилу основателя «Не удалять без разрешения»:

1. Развернуть ветку в локальной dev-сборке: `pnpm dev:webapp`.
2. Если есть staging — задеплоить туда и пройти руками: register → проверить экран verify-email → клик по ссылке → email_confirmation → перейти к login. Также — открыть фейковый invite-URL и убедиться что отображается spinner.
3. Дождаться от основателя ОК-сигнала.

**Не переходить к Step 9, пока нет явного «ок, удаляй».**

- [ ] **Step 9: Удалить легаси-файлы**

После явного подтверждения основателя:

```bash
git rm packages/webapp/src/containers/Authentication/EmailConfirmation.tsx
git rm packages/webapp/src/containers/Authentication/RegisterVerify.tsx
git rm packages/webapp/src/containers/Authentication/InviteAccept.tsx
git rm packages/webapp/src/containers/Authentication/InviteAcceptForm.tsx
git rm packages/webapp/src/containers/Authentication/InviteAcceptFormContent.tsx
git rm packages/webapp/src/containers/Authentication/InviteAcceptProvider.tsx
```

⚠️ **СТОП**: `InviteAcceptProvider.tsx` импортируется новой `InviteAcceptPage`! Удалять его НЕЛЬЗЯ — только перенести в `components/auth/` если хочется чистоты. Простой вариант: оставить на месте. Уберём из git rm.

Скорректированный список:
```bash
git rm packages/webapp/src/containers/Authentication/EmailConfirmation.tsx
git rm packages/webapp/src/containers/Authentication/RegisterVerify.tsx
git rm packages/webapp/src/containers/Authentication/InviteAccept.tsx
git rm packages/webapp/src/containers/Authentication/InviteAcceptForm.tsx
git rm packages/webapp/src/containers/Authentication/InviteAcceptFormContent.tsx
```

- [ ] **Step 10: Typecheck + grep — убедиться что ничего не сломалось**

```bash
pnpm typecheck
```

Дополнительно проверить, что ни один файл не импортирует удалённые:
```bash
grep -r "Authentication/EmailConfirmation" packages/webapp/src/ || echo "OK — no refs"
grep -r "Authentication/RegisterVerify" packages/webapp/src/ || echo "OK — no refs"
grep -r "Authentication/InviteAccept'" packages/webapp/src/ || echo "OK — no refs"
grep -r "Authentication/InviteAcceptForm" packages/webapp/src/ || echo "OK — no refs"
```

Если есть refs — починить или вернуть файл.

- [ ] **Step 11: Коммит удаления**

```bash
git commit -m "feat(auth): remove legacy BP-based auth pages (Phase 3 cleanup)"
```

- [ ] **Step 12: Push и открыть PR**

```bash
git push -u origin feat/d-redesign-phase-3a-auth-tail
gh pr create --title "feat(auth): D-redesign Phase 3a — auth tail migration" --body "$(cat <<'EOF'
## Summary
Завершает миграцию auth-флоу на Bold Fintech: EmailConfirmation, RegisterVerify, InviteAccept переписаны на AuthLayout + RHF + zod. Легаси-страницы (5 файлов из containers/Authentication/) удалены.

Часть D-redesign Phase 3, спека: docs/superpowers/specs/2026-05-27-d-phase-3-draft.md

## Test plan
- [ ] pnpm typecheck — 0 ошибок
- [ ] pnpm --filter @bigfin/webapp test:run — 5 новых тестов inviteAcceptSchema прошли
- [ ] Визуальная проверка в Storybook: 3 новые stories открываются
- [ ] Локально пройти register-флоу до email_confirmation (если бэкенд доступен)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Block B — DS v2 для shell (8 примитивов в Storybook)

**Цель блока:** Установить shadcn-компоненты `avatar`, `dropdown-menu`, `tabs`, `badge`, `breadcrumb` через CLI, написать кастомные `Sidebar`/`SidebarItem`/`Topbar`, для каждого — story с минимум 1 вариантом. **Без интеграции в реальный app** — только Storybook. Это позволяет ревьюить дизайн в изоляции и параллелить работу с Block C.

**Ветка/PR:** `feat/d-redesign-phase-3b-ds-v2-shell-components`

**Финальный acceptance блока:**
- 8 новых файлов в `components/ui/` + stories
- Все stories открываются в Storybook без ошибок
- `pnpm typecheck` exit 0
- НЕТ изменений в `App.tsx`, `routes/`, легаси-коде (это будет Block C)

---

### Task B.1: Установить shadcn компоненты через CLI (avatar, dropdown-menu, tabs, badge, breadcrumb)

**Files:**
- Create: `packages/webapp/src/components/ui/avatar.tsx`
- Create: `packages/webapp/src/components/ui/dropdown-menu.tsx`
- Create: `packages/webapp/src/components/ui/tabs.tsx`
- Create: `packages/webapp/src/components/ui/badge.tsx`
- Create: `packages/webapp/src/components/ui/breadcrumb.tsx`
- Modify: `packages/webapp/package.json` (deps от shadcn CLI)

**Зачем:** Phase 1 уже настроил shadcn CLI (`components.json` в репо). Достаточно `dlx shadcn-ui add` для генерации. CLI добавит radix-deps в package.json автоматически.

- [ ] **Step 1: Проверить components.json**

```bash
cat packages/webapp/components.json
```

Убедиться что есть и указан `style: default` (или то, что использовалось в Phase 1).

- [ ] **Step 2: Установить avatar через shadcn CLI**

```bash
nvm use 18.16.1
cd packages/webapp
pnpm dlx shadcn-ui@latest add avatar
cd ../..
```

Если CLI спрашивает override — отказаться (`No`). Если файла нет — CLI создаст.

- [ ] **Step 3: Установить остальные 4 компонента**

```bash
cd packages/webapp
pnpm dlx shadcn-ui@latest add dropdown-menu
pnpm dlx shadcn-ui@latest add tabs
pnpm dlx shadcn-ui@latest add badge
pnpm dlx shadcn-ui@latest add breadcrumb
cd ../..
```

- [ ] **Step 4: Typecheck (CLI мог обновить package.json + lockfile)**

```bash
pnpm install   # обновит deps от shadcn (radix-ui packages)
pnpm typecheck
```

Expected: 0 ошибок. Если есть проблемы с radix-импортами — проверить, что lockfile обновился.

> Важно по CLAUDE.md: основатель просил «не запускать pnpm install без явного запроса» из-за проблем с bcrypt на Windows. В этом таске install необходим (новые deps). Если упадёт — обходный путь: вручную добавить нужные `@radix-ui/react-avatar`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tabs` в `packages/webapp/package.json` и `pnpm install --filter @bigfin/webapp`.

- [ ] **Step 5: Коммит**

```bash
git add packages/webapp/src/components/ui/avatar.tsx packages/webapp/src/components/ui/dropdown-menu.tsx packages/webapp/src/components/ui/tabs.tsx packages/webapp/src/components/ui/badge.tsx packages/webapp/src/components/ui/breadcrumb.tsx packages/webapp/package.json pnpm-lock.yaml
git commit -m "feat(ui): add shadcn avatar/dropdown-menu/tabs/badge/breadcrumb primitives"
```

---

### Task B.2: Создать stories для avatar/dropdown-menu/tabs/badge/breadcrumb

**Files:**
- Create: `packages/webapp/src/components/ui/avatar.stories.tsx`
- Create: `packages/webapp/src/components/ui/dropdown-menu.stories.tsx`
- Create: `packages/webapp/src/components/ui/tabs.stories.tsx`
- Create: `packages/webapp/src/components/ui/badge.stories.tsx`
- Create: `packages/webapp/src/components/ui/breadcrumb.stories.tsx`

**Зачем:** По правилам Phase 1 каждый компонент имеет story. Это и документация, и регрессионная проверка.

- [ ] **Step 1: Прочитать существующую story как образец**

```bash
cat packages/webapp/src/components/ui/button.stories.tsx
cat packages/webapp/src/components/ui/card.stories.tsx
```

- [ ] **Step 2: avatar.stories.tsx**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://avatars.githubusercontent.com/u/124599?v=4" />
      <AvatarFallback>ИП</AvatarFallback>
    </Avatar>
  ),
};

export const FallbackOnly: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>ИП</AvatarFallback>
    </Avatar>
  ),
};
```

- [ ] **Step 3: dropdown-menu.stories.tsx**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Button } from './button';

const meta = {
  title: 'UI/DropdownMenu',
  component: DropdownMenu,
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Открыть меню</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Профиль</DropdownMenuItem>
        <DropdownMenuItem>Настройки</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Выйти</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
```

- [ ] **Step 4: tabs.stories.tsx**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="accounts" className="w-96">
      <TabsList>
        <TabsTrigger value="accounts">Счета</TabsTrigger>
        <TabsTrigger value="contacts">Контрагенты</TabsTrigger>
        <TabsTrigger value="reports">Отчёты</TabsTrigger>
      </TabsList>
      <TabsContent value="accounts" className="mt-4">
        Список счетов вашей организации.
      </TabsContent>
      <TabsContent value="contacts" className="mt-4">
        Контрагенты — клиенты и поставщики.
      </TabsContent>
      <TabsContent value="reports" className="mt-4">
        Финансовые отчёты.
      </TabsContent>
    </Tabs>
  ),
};
```

- [ ] **Step 5: badge.stories.tsx**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: 'Активна' } };
export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Черновик' },
};
export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Просрочен' },
};
export const Outline: Story = {
  args: { variant: 'outline', children: 'В обработке' },
};
```

- [ ] **Step 6: breadcrumb.stories.tsx**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb';

const meta = {
  title: 'UI/Breadcrumb',
  component: Breadcrumb,
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Дашборд</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Контрагенты</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>ООО «Ромашка»</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};
```

- [ ] **Step 7: Запустить Storybook и проверить все 5 stories**

```bash
nvm use 18.16.1
pnpm --filter @bigfin/webapp storybook
```

Открыть каждую story, убедиться что рендерится без ошибок в консоли.

- [ ] **Step 8: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 9: Коммит**

```bash
git add packages/webapp/src/components/ui/avatar.stories.tsx packages/webapp/src/components/ui/dropdown-menu.stories.tsx packages/webapp/src/components/ui/tabs.stories.tsx packages/webapp/src/components/ui/badge.stories.tsx packages/webapp/src/components/ui/breadcrumb.stories.tsx
git commit -m "feat(ui): add stories for avatar/dropdown-menu/tabs/badge/breadcrumb"
```

---

### Task B.3: Sidebar + SidebarItem (custom, Bold Fintech)

**Files:**
- Create: `packages/webapp/src/components/ui/Sidebar.tsx`
- Create: `packages/webapp/src/components/ui/Sidebar.stories.tsx`

**Зачем:** Главный визуальный элемент новой shell. Тут — только presentational компонент, без интеграции с реальным меню (это Task C.3).

**Контракт:**
- `Sidebar` — контейнер. Props: `items: SidebarItem[]`, `activeHref?: string`, `mini?: boolean` (collapsed mode).
- `SidebarItem` — внутренний рендер-помощник. Props: `{ href, label, icon, active }`. Тип `link` (Phase 3 не поддерживает overlay/dialog — для них перерисуем кнопками-заглушками, реальное wiring в Task C.3).
- Ширина: 240px expanded, 64px mini. CSS-токены: `bg-background` для фона, `text-text-primary`/`text-text-secondary` для текста, `bg-accent/10` для active highlight.

- [ ] **Step 1: Создать Sidebar.tsx**

```typescript
import * as React from 'react';
import { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface SidebarItemData {
  href: string;
  label: string;
  icon?: LucideIcon;
  active?: boolean;
}

interface SidebarProps {
  items: SidebarItemData[];
  activeHref?: string;
  mini?: boolean;
  onItemClick?: (item: SidebarItemData) => void;
  className?: string;
}

export const Sidebar = ({
  items,
  activeHref,
  mini = false,
  onItemClick,
  className,
}: SidebarProps) => {
  return (
    <nav
      aria-label="Главное меню"
      className={cn(
        'flex h-full flex-col gap-1 border-r border-border bg-background py-4 transition-[width] duration-200',
        mini ? 'w-16' : 'w-60',
        className,
      )}
    >
      {items.map((item) => (
        <SidebarItem
          key={item.href}
          item={item}
          active={item.href === activeHref || item.active}
          mini={mini}
          onClick={onItemClick}
        />
      ))}
    </nav>
  );
};

interface SidebarItemProps {
  item: SidebarItemData;
  active?: boolean;
  mini?: boolean;
  onClick?: (item: SidebarItemData) => void;
}

const SidebarItem = ({ item, active, mini, onClick }: SidebarItemProps) => {
  const Icon = item.icon;
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.(item);
  };

  return (
    <a
      href={item.href}
      onClick={handleClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'mx-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-accent/10 text-accent'
          : 'text-text-secondary hover:bg-surface hover:text-text-primary',
        mini && 'justify-center',
      )}
      title={mini ? item.label : undefined}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
      {!mini && <span className="truncate">{item.label}</span>}
    </a>
  );
};
```

- [ ] **Step 2: Создать Sidebar.stories.tsx**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import {
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';

import { Sidebar, type SidebarItemData } from './Sidebar';

const meta = {
  title: 'UI/Sidebar',
  component: Sidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', display: 'flex' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const DEMO_ITEMS: SidebarItemData[] = [
  { href: '/', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/contacts', label: 'Контрагенты', icon: Users },
  { href: '/accounts', label: 'Счета', icon: CreditCard },
  { href: '/financial-reports', label: 'Отчёты', icon: BarChart3 },
  { href: '/invoices', label: 'Документы', icon: FileText },
  { href: '/preferences', label: 'Настройки', icon: Settings },
];

export const Expanded: Story = {
  args: { items: DEMO_ITEMS, activeHref: '/' },
};

export const Mini: Story = {
  args: { items: DEMO_ITEMS, activeHref: '/', mini: true },
};

export const WithActiveDeep: Story = {
  args: { items: DEMO_ITEMS, activeHref: '/financial-reports' },
};
```

- [ ] **Step 3: Визуальная проверка**

```bash
pnpm --filter @bigfin/webapp storybook
```

Проверить:
- `Expanded` — 240px вертикальный sidebar, активный пункт «Дашборд» подсвечен жёлтым (accent).
- `Mini` — 64px, видны только иконки, по hover — tooltip с label.
- `WithActiveDeep` — активна «Отчёты».

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5: Коммит**

```bash
git add packages/webapp/src/components/ui/Sidebar.tsx packages/webapp/src/components/ui/Sidebar.stories.tsx
git commit -m "feat(ui): add Sidebar + SidebarItem (Bold Fintech vertical)"
```

---

### Task B.4: Topbar (custom, Bold Fintech)

**Files:**
- Create: `packages/webapp/src/components/ui/Topbar.tsx`
- Create: `packages/webapp/src/components/ui/Topbar.stories.tsx`

**Зачем:** Верхняя панель приложения. По решению — содержит: search, notifications, quick-actions, help, org-switcher, avatar.

**Контракт:**
- Presentational. Никакой логики данных — всё через props/slots.
- Слоты: `searchSlot`, `quickActionsSlot`, `notificationsSlot`, `helpSlot`, `orgSwitcherSlot`, `avatarSlot` (опциональные React-узлы).
- Высота: 56px (`h-14`). Фон: `bg-background`. Граница: `border-b border-border`.

- [ ] **Step 1: Создать Topbar.tsx**

```typescript
import * as React from 'react';

import { cn } from '@/lib/cn';

interface TopbarProps {
  searchSlot?: React.ReactNode;
  quickActionsSlot?: React.ReactNode;
  notificationsSlot?: React.ReactNode;
  helpSlot?: React.ReactNode;
  orgSwitcherSlot?: React.ReactNode;
  avatarSlot?: React.ReactNode;
  className?: string;
}

export const Topbar = ({
  searchSlot,
  quickActionsSlot,
  notificationsSlot,
  helpSlot,
  orgSwitcherSlot,
  avatarSlot,
  className,
}: TopbarProps) => {
  return (
    <header
      className={cn(
        'flex h-14 items-center gap-2 border-b border-border bg-background px-4',
        className,
      )}
    >
      <div className="flex flex-1 items-center">
        {searchSlot && <div className="max-w-md flex-1">{searchSlot}</div>}
      </div>
      <div className="flex items-center gap-1">
        {quickActionsSlot}
        {helpSlot}
        {notificationsSlot}
        {orgSwitcherSlot}
        {avatarSlot}
      </div>
    </header>
  );
};
```

- [ ] **Step 2: Создать Topbar.stories.tsx**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Bell, HelpCircle, Plus, Search } from 'lucide-react';

import { Avatar, AvatarFallback } from './avatar';
import { Badge } from './badge';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Input } from './input';
import { Topbar } from './Topbar';

const meta = {
  title: 'UI/Topbar',
  component: Topbar,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', background: 'var(--color-surface)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Topbar>;

export default meta;
type Story = StoryObj<typeof meta>;

const IconButton = ({
  icon: Icon,
  label,
  badge,
}: {
  icon: typeof Bell;
  label: string;
  badge?: string;
}) => (
  <Button variant="ghost" size="icon" aria-label={label} className="relative">
    <Icon className="h-4 w-4" />
    {badge && (
      <Badge
        variant="destructive"
        className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]"
      >
        {badge}
      </Badge>
    )}
  </Button>
);

export const Full: Story = {
  args: {
    searchSlot: (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input placeholder="Поиск по контрагентам, счетам..." className="pl-9" />
      </div>
    ),
    quickActionsSlot: (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Быстрое создание">
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Создать счёт</DropdownMenuItem>
          <DropdownMenuItem>Создать контрагента</DropdownMenuItem>
          <DropdownMenuItem>Создать сделку</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    helpSlot: <IconButton icon={HelpCircle} label="Помощь" />,
    notificationsSlot: <IconButton icon={Bell} label="Уведомления" badge="3" />,
    orgSwitcherSlot: (
      <Button variant="outline" size="sm">
        ООО «Ромашка»
      </Button>
    ),
    avatarSlot: (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="ml-2 outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full">
            <Avatar>
              <AvatarFallback>ИП</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Профиль</DropdownMenuItem>
          <DropdownMenuItem>Настройки</DropdownMenuItem>
          <DropdownMenuItem>Выйти</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
};

export const MinimalNoSearch: Story = {
  args: {
    notificationsSlot: <IconButton icon={Bell} label="Уведомления" />,
    avatarSlot: (
      <Avatar>
        <AvatarFallback>ИП</AvatarFallback>
      </Avatar>
    ),
  },
};
```

- [ ] **Step 3: Визуальная проверка**

```bash
pnpm --filter @bigfin/webapp storybook
```

Проверить:
- `Full` — все слоты заполнены, видны: поиск слева, справа — quick-actions (Plus), help (?), bell с badge «3», org-switcher, avatar.
- `MinimalNoSearch` — только bell и avatar справа.

Открыть DevTools, проверить что нет console-ошибок (radix-warnings типа «missing accessible name» — поправить если есть).

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5: Коммит**

```bash
git add packages/webapp/src/components/ui/Topbar.tsx packages/webapp/src/components/ui/Topbar.stories.tsx
git commit -m "feat(ui): add Topbar with slot-based composition"
```

---

### Task B.5: Push ветки Block B и открыть PR

- [ ] **Step 1: Push**

```bash
git push -u origin feat/d-redesign-phase-3b-ds-v2-shell-components
```

- [ ] **Step 2: Открыть PR**

```bash
gh pr create --title "feat(ui): D-redesign Phase 3b — DS v2 shell primitives" --body "$(cat <<'EOF'
## Summary
Добавляет 7 новых DS v2 компонентов для будущей global shell:
- shadcn: avatar, dropdown-menu, tabs, badge, breadcrumb
- custom: Sidebar (+ SidebarItem), Topbar

Все компоненты — только в Storybook, без интеграции в app. Это будет в Phase 3c.

Часть D-redesign Phase 3, спека: docs/superpowers/specs/2026-05-27-d-phase-3-draft.md

## Test plan
- [ ] pnpm typecheck — 0 ошибок
- [ ] Storybook: 7 новых stories открываются без console-ошибок
- [ ] Storybook: Sidebar — Expanded/Mini/WithActiveDeep варианты
- [ ] Storybook: Topbar — Full/MinimalNoSearch варианты

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Block C — Глобальная shell в реальном app

**Цель блока:** Связать `Sidebar`/`Topbar` из Block B с реальным меню (`useMainSidebarMenu`) и состоянием (notifications/auth/etc), создать `DashboardShell`, обернуть `DashboardPrivatePages` в shell. Внутри shell — старые BP-страницы рендерятся как есть.

**Ветка/PR:** `feat/d-redesign-phase-3c-shell-integration` (создавать ПОСЛЕ мерджа Phase 3a и 3b)

**Финальный acceptance блока:**
- Новая визуальная shell вокруг всего авторизованного app
- Старые BP-страницы рендерятся внутри без визуальных артефактов
- Навигация через новый Sidebar работает (клик → route change)
- `pnpm typecheck` exit 0
- Тесты — все зелёные
- Локальная визуальная проверка: после логина — новые Sidebar/Topbar, контент BP-страниц на месте

---

### Task C.1: DashboardShell — контейнер layout

**Files:**
- Create: `packages/webapp/src/components/dashboard/DashboardShell.tsx`
- Create: `packages/webapp/src/components/dashboard/DashboardShell.stories.tsx`

**Контракт:**
- Props: `sidebar: ReactNode`, `topbar: ReactNode`, `children: ReactNode`.
- Layout: grid 60px topbar + (sidebar + main).
- Класс на root: `bigfin-ui` (как в AuthLayout — это активирует Bold Fintech tokens).

- [ ] **Step 1: Создать DashboardShell.tsx**

```typescript
import * as React from 'react';

import { cn } from '@/lib/cn';

interface DashboardShellProps {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const DashboardShell = ({
  sidebar,
  topbar,
  children,
  className,
}: DashboardShellProps) => {
  return (
    <div className={cn('bigfin-ui flex h-screen flex-col', className)}>
      {topbar}
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex h-full shrink-0">{sidebar}</aside>
        <main className="flex-1 overflow-auto bg-surface">{children}</main>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Создать DashboardShell.stories.tsx**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import {
  BarChart3,
  Bell,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Users,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Sidebar } from '../ui/Sidebar';
import { Topbar } from '../ui/Topbar';
import { DashboardShell } from './DashboardShell';

const meta = {
  title: 'Dashboard/DashboardShell',
  component: DashboardShell,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DashboardShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    sidebar: (
      <Sidebar
        items={[
          { href: '/', label: 'Дашборд', icon: LayoutDashboard },
          { href: '/contacts', label: 'Контрагенты', icon: Users },
          { href: '/accounts', label: 'Счета', icon: CreditCard },
          { href: '/financial-reports', label: 'Отчёты', icon: BarChart3 },
          { href: '/preferences', label: 'Настройки', icon: Settings },
        ]}
        activeHref="/"
      />
    ),
    topbar: (
      <Topbar
        searchSlot={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input placeholder="Поиск..." className="pl-9" />
          </div>
        }
        quickActionsSlot={
          <Button variant="ghost" size="icon" aria-label="Создать">
            <Plus className="h-4 w-4" />
          </Button>
        }
        helpSlot={
          <Button variant="ghost" size="icon" aria-label="Помощь">
            <HelpCircle className="h-4 w-4" />
          </Button>
        }
        notificationsSlot={
          <Button variant="ghost" size="icon" aria-label="Уведомления">
            <Bell className="h-4 w-4" />
          </Button>
        }
        avatarSlot={
          <Avatar>
            <AvatarFallback>ИП</AvatarFallback>
          </Avatar>
        }
      />
    ),
    children: (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          Здесь будет рендериться BlueprintJS-страница
        </h1>
        <p className="mt-2 text-text-secondary">
          В реальном app сюда попадает контент DashboardPrivatePages — старые
          таблицы, формы, виджеты. Phase 3 их не трогает.
        </p>
      </div>
    ),
  },
};
```

- [ ] **Step 3: Визуальная проверка**

```bash
pnpm --filter @bigfin/webapp storybook
```

Проверить story `Default`:
- Topbar сверху по всей ширине.
- Sidebar слева, активный «Дашборд» подсвечен.
- Main-зона справа с фоном `bg-surface` и контентом.
- Прокрутка main работает (если контент большой).

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5: Коммит**

```bash
git add packages/webapp/src/components/dashboard/DashboardShell.tsx packages/webapp/src/components/dashboard/DashboardShell.stories.tsx
git commit -m "feat(shell): add DashboardShell layout container"
```

---

### Task C.2: Wire DashboardShell в Dashboard.tsx → обернуть main layout

**Files:**
- Create: `packages/webapp/src/components/dashboard/ConnectedSidebar.tsx`
- Create: `packages/webapp/src/components/dashboard/ConnectedTopbar.tsx`
- Modify: `packages/webapp/src/components/Dashboard/Dashboard.tsx`
- Modify: `packages/webapp/src/constants/sidebarMenu.tsx` (если нужен mapping иконок — см. Step 4)

**Зачем:** Без этого таска новая shell видна только в Storybook. Этот таск делает её видимой в реальном app.

**Контекст (важно):** текущая структура такова:
- `Dashboard.tsx` рендерит `<DashboardSplitPane><Sidebar /><DashboardContent /></DashboardSplitPane>` — то есть **Sidebar и контент** на одном уровне внутри split-pane.
- `DashboardContent.tsx` внутри рендерит `<DashboardTopbar />` + `<DashboardContentRoutes />` — то есть **топбар per-страничный**, а не глобальный. Он содержит контекстные кнопки текущей страницы (фильтры, сохранить, экспорт и т.п.).

Стратегия Phase 3: **добавляем глобальный Topbar СВЕРХУ** через DashboardShell, **сохраняем DashboardTopbar** как контекстный ActionsBar под ним. Старый `<Sidebar />` (легаси) заменяется на ConnectedSidebar.

- [ ] **Step 1: Создать ConnectedSidebar.tsx**

`packages/webapp/src/components/dashboard/ConnectedSidebar.tsx`:

```typescript
// @ts-nocheck — useMainSidebarMenu и interfaces — легаси JS без типов
import { useHistory, useLocation } from 'react-router-dom';

import { Sidebar, type SidebarItemData } from '@/components/ui/Sidebar';
import { useMainSidebarMenu } from '@/containers/Dashboard/Sidebar/hooks';
import { ISidebarMenuItemType } from '@/containers/Dashboard/Sidebar/interfaces';

export const ConnectedSidebar = () => {
  const legacyMenu = useMainSidebarMenu();
  const location = useLocation();
  const history = useHistory();

  // Преобразуем легаси-меню в формат SidebarItemData.
  // В Phase 3 поддерживаем только Link-тип. Overlay/Dialog/Group в
  // легаси-меню — рендерим как ссылки на их item.href (если есть) или
  // фильтруем (если href нет). Поддержка submenu — в следующем sub-project.
  const items: SidebarItemData[] = (legacyMenu || [])
    .filter((item) => item.type === ISidebarMenuItemType.Link && item.href)
    .map((item) => ({
      href: item.href,
      label: item.label,
      // icon не пробрасываем — иконки в легаси-меню это BP-icons (strings),
      // не совместимы с LucideIcon prop. Текстовое sidebar без иконок —
      // приемлемо для Phase 3. Mapping BP→Lucide — отдельный sub-project.
    }));

  return (
    <Sidebar
      items={items}
      activeHref={location.pathname}
      onItemClick={(item) => history.push(item.href)}
    />
  );
};
```

- [ ] **Step 2: Создать ConnectedTopbar.tsx**

`packages/webapp/src/components/dashboard/ConnectedTopbar.tsx`:

```typescript
// @ts-nocheck — хуки в @/hooks/state не типизированы
import { Bell, HelpCircle, Plus, Search } from 'lucide-react';
import { useHistory } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Topbar } from '@/components/ui/Topbar';
import { useAuthActions } from '@/hooks/state';
import { useAuthenticatedAccount } from '@/hooks/query';
import { firstLettersArgs } from '@/utils';

export const ConnectedTopbar = () => {
  const history = useHistory();
  const { setLogout } = useAuthActions();
  const { data: user } = useAuthenticatedAccount();

  const initials = user
    ? firstLettersArgs(user.first_name, user.last_name)
    : '??';

  return (
    <Topbar
      searchSlot={
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Поиск по контрагентам, счетам..."
            className="pl-9"
          />
        </div>
      }
      quickActionsSlot={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Быстрое создание">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* TODO Phase 4: подключить к реальным dialog actions */}
            <DropdownMenuItem disabled>Создать счёт (TBD)</DropdownMenuItem>
            <DropdownMenuItem disabled>Создать контрагента (TBD)</DropdownMenuItem>
            <DropdownMenuItem disabled>Создать сделку (TBD)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      helpSlot={
        <Button variant="ghost" size="icon" aria-label="Помощь">
          <HelpCircle className="h-4 w-4" />
        </Button>
      }
      notificationsSlot={
        <Button variant="ghost" size="icon" aria-label="Уведомления">
          <Bell className="h-4 w-4" />
        </Button>
      }
      avatarSlot={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Меню профиля"
              className="ml-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => history.push('/preferences')}
            >
              Настройки
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLogout()}>
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
};
```

> **Что НЕ подключено и почему:**
> - Search — заглушка-инпут без onChange. Глобальный поиск в текущем коде — это `DashboardUniversalSearch` (вызывается через хоткеи). Полная интеграция — отдельный sub-project.
> - Уведомления — кнопка без dropdown'а пока. Notifications-state в текущем коде не очевиден. Sub-project «Notifications» переподключит.
> - Quick-actions — disabled пункты. Реальный proxy к `openDialog('invoice-form')` и т.д. — следующий sub-project.
> - Org-switcher — НЕ добавлен в Topbar, потому что в dogfooding у основателя одна организация. Если позже понадобится — добавить отдельным слотом.

- [ ] **Step 3: Модифицировать Dashboard.tsx**

В `packages/webapp/src/components/Dashboard/Dashboard.tsx`:

Удалить импорты, которые больше не нужны:
```typescript
// Удалить:
import { Sidebar } from '@/containers/Dashboard/Sidebar/Sidebar';
import DashboardSplitPane from '@/components/Dashboard/DashboardSplitePane';
```

Добавить новые импорты:
```typescript
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ConnectedSidebar } from '@/components/dashboard/ConnectedSidebar';
import { ConnectedTopbar } from '@/components/dashboard/ConnectedTopbar';
```

Заменить функцию `DashboardPreferences`:
```typescript
function DashboardPreferences() {
  return (
    <DashboardShell
      sidebar={<ConnectedSidebar />}
      topbar={<ConnectedTopbar />}
    >
      <PreferencesPage />
    </DashboardShell>
  );
}
```

Заменить функцию `DashboardAnyPage`:
```typescript
function DashboardAnyPage() {
  return (
    <DashboardShell
      sidebar={<ConnectedSidebar />}
      topbar={<ConnectedTopbar />}
    >
      <DashboardContent />
    </DashboardShell>
  );
}
```

> Важно: `<DashboardContent />` внутри `DashboardShell` всё ещё рендерит свой `<DashboardTopbar />` сверху (контекстный ActionsBar). Это **намеренно** — он остаётся как per-страничный action-bar под глобальным Topbar. Если визуально окажется слишком жирно (2 бара друг под другом) — Task C.3 (полировка) разберёт.

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 ошибок. Если есть — скорее всего сломан import (DashboardSplitPane убран, но где-то ещё используется) — найти grep'ом и оставить только если действительно нужен.

- [ ] **Step 5: Локальный visual smoke**

```bash
pnpm dev:webapp
```

⚠️ Без локального backend'а полная проверка невозможна (см. CLAUDE.md «Local backend unset»). Открыть `localhost:<port>`, попытаться залогиниться. Если попадаем в dashboard:
- [ ] Sidebar слева — новый Bold Fintech вертикальный, со списком пунктов меню без иконок.
- [ ] Topbar сверху — новый, с search/quick/help/bell/avatar.
- [ ] Под глобальным Topbar — старый DashboardTopbar (action-bar) с контекстными кнопками страницы.
- [ ] Основной BP-контент рендерится в main-area.
- [ ] Клик по пункту sidebar → переход работает.

Если backend недоступен — задеплоить ветку в staging и проверить там.

- [ ] **Step 6: Коммит**

```bash
git add packages/webapp/src/components/dashboard/ConnectedSidebar.tsx packages/webapp/src/components/dashboard/ConnectedTopbar.tsx packages/webapp/src/components/Dashboard/Dashboard.tsx
git commit -m "feat(shell): wire DashboardShell into Dashboard.tsx with ConnectedSidebar/Topbar"
```

---

### Task C.3: Визуальная полировка — выловить top 5 worst offenders

**Files:** none upfront — добавляются по ходу

**Зачем:** Спека в разделе «Риски» прямо предупреждает: «Старые BP-страницы внутри новой shell могут "торчать": разные radius'ы, разные цвета фона.» Этот таск — выделенное время на полировку.

- [ ] **Step 1: Записать 5 worst offenders**

Открыть основные BP-страницы (Dashboard, Accounts, Contacts, Reports, Settings) в новой shell. Записать в комментарии 5 главных визуальных проблем — например:
- BP-tables имеют border-radius=0, новая shell — 8px → диссонанс
- Body-background BP-страниц белый, новая main-area тёмно-серая
- BP-buttons на старых страницах синего intent, новые — жёлтый accent

- [ ] **Step 2: Принять решения по каждой**

Возможные варианты для каждой проблемы:
- (А) Игнорируем — приемлемо для Phase 3.
- (B) Точечный CSS-override в `globals.css`.
- (C) Откладываем в backlog следующего sub-project'а (migration of page X).

Записать решения в `docs/superpowers/notes/2026-05-29-d-phase-3-polish-notes.md`.

- [ ] **Step 3: Реализовать выбранные правки**

Если решено (B) для какой-то проблемы — добавить CSS-override.

Пример: если все BP-страницы должны иметь dark background внутри новой shell, добавить в `globals.css`:
```css
.bigfin-ui .bp4-dark, .bigfin-ui [class*="bp4-"] {
  /* минимальные подстройки */
}
```

Размер этих правок — оценочно 20-50 строк CSS. Если оказалось больше — стоп, обсудить с основателем (это уже не «полировка», а «миграция»).

- [ ] **Step 4: Коммит**

```bash
git add packages/webapp/src/styles/globals.css docs/superpowers/notes/2026-05-29-d-phase-3-polish-notes.md
git commit -m "fix(shell): polish BP/Bold Fintech visual boundary"
```

---

# Block D — Final cleanup

**Цель блока:** После того как новая shell работает в app — удалить ту часть легаси, которую новая shell заменяет. Не больше, не меньше.

---

### Task D.1: Решить судьбу Auth.scss и Authentication.tsx обвязки

**Files:**
- Modify (или delete): `packages/webapp/src/containers/Authentication/Authentication.tsx`
- Modify (или delete): `packages/webapp/src/style/pages/Authentication/Auth.scss`

**Зачем:** Текущий `Authentication.tsx` импортирует `Auth.scss` для легаси-страниц (комментарий в коде это явно говорит). После Phase 3 легаси-страниц нет — обвязка может быть упрощена или удалена.

- [ ] **Step 1: Прочитать `Authentication.tsx` и проверить, нужен ли он**

```bash
cat packages/webapp/src/containers/Authentication/Authentication.tsx
grep -r "from.*Authentication/Authentication" packages/webapp/src/ | head -10
```

Этот компонент — обёртка для `AuthenticationRoutes` через `BodyClassName` + `Suspense` + `AuthMetaBootProvider` + `Auth.scss`. После Phase 3:
- `BodyClassName='authentication'` — нужно? (проверить, использует ли его кто-то).
- `Auth.scss` — нужно? Содержит ли стили, на которые опираются новые auth-страницы?

- [ ] **Step 2: Аудит Auth.scss**

```bash
cat packages/webapp/src/style/pages/Authentication/Auth.scss
```

Прочитать каждое правило. Скорее всего там — стили для `AuthInsiderCard`, `AuthContainer` (старые BP-обёртки), которые мы НЕ используем в новых страницах. Если так — Auth.scss можно удалить.

⚠️ **Гард**: `AuthInsider.tsx` спека сохраняет («инфраструктурные HOC»). Если AuthInsider использует классы из Auth.scss — нельзя удалять SCSS без удаления AuthInsider. Проверить grep:
```bash
grep -E "(authInsider|auth-insider|authContainer)" packages/webapp/src/style/pages/Authentication/Auth.scss
```

- [ ] **Step 3: Решение и коммит**

Если решено удалить Auth.scss — STOP, спросить основателя (правило «не удалять без разрешения»).

Если оставляем — добавить комментарий в `Authentication.tsx`:
```typescript
/**
 * После Phase 3 эта обвязка остаётся для:
 * - AuthMetaBootProvider (нужен для cases вне новых auth-страниц)
 * - Auth.scss (стили для AuthInsider, если он ещё нужен)
 *
 * Если в будущем AuthInsider тоже мигрирует — можно упростить до Suspense.
 */
```

```bash
git add packages/webapp/src/containers/Authentication/Authentication.tsx
git commit -m "docs(auth): explain remaining Authentication.tsx scope after Phase 3"
```

---

### Task D.2: Финальный acceptance — все критерии спеки

**Files:** none — это smoke и regression

- [ ] **Step 1: Typecheck всего**

```bash
pnpm typecheck
```

Expected: 0 ошибок во всех 3 пакетах.

- [ ] **Step 2: Все тесты**

```bash
pnpm --filter @bigfin/webapp test:run
pnpm --filter @bigfin/server test
```

Expected: все зелёные. Если что-то упало в server — это не связано с Phase 3 (frontend-only), но investigate перед мерджем.

- [ ] **Step 3: Lang-check (на случай если RU-строки в новых страницах попали в JSON)**

```bash
node packages/webapp/scripts/lang-check.js
```

Expected: 0 missing, 0 extra. (Новые страницы используют хардкод-RU — то же, что Phase 2/2c. Если решено мигрировать на intl.get — это отдельный sub-project.)

- [ ] **Step 4: Storybook — все новые stories открываются**

```bash
pnpm --filter @bigfin/webapp storybook
```

Чек-лист stories (10 новых из Phase 3):
- Auth/EmailConfirmationPage (InvalidLink, Verifying)
- Auth/RegisterVerifyPage (Default)
- Auth/InviteAcceptPage (LoadingState)
- UI/Avatar (WithImage, FallbackOnly)
- UI/DropdownMenu (Default)
- UI/Tabs (Default)
- UI/Badge (Default, Secondary, Destructive, Outline)
- UI/Breadcrumb (Default)
- UI/Sidebar (Expanded, Mini, WithActiveDeep)
- UI/Topbar (Full, MinimalNoSearch)
- Dashboard/DashboardShell (Default)

- [ ] **Step 5: Визуальный smoke в реальном app**

```bash
pnpm dev:webapp
```

Чек-лист:
- [ ] Открыть `/auth/login` → новая страница (Phase 2)
- [ ] Открыть `/auth/email_confirmation` без params → новая страница, alert «Ссылка повреждена»
- [ ] Если есть backend → пройти full register → verify email → email_confirmation. Должно быть единообразно.
- [ ] Залогиниться → попасть в dashboard → видно новую shell (Sidebar+Topbar Bold Fintech), внутри — старые BP-страницы.
- [ ] Кликнуть пункт sidebar → переход работает, активный пункт подсвечивается.
- [ ] Mobile view (resize окно <768px) → sidebar превращается в drawer (если реализовано в Task C.2) или скрывается с гамбургером.

- [ ] **Step 6: Push и открыть финальный PR**

```bash
git push -u origin feat/d-redesign-phase-3c-shell-integration
gh pr create --title "feat(shell): D-redesign Phase 3c — DashboardShell integration" --body "$(cat <<'EOF'
## Summary
Подключает Bold Fintech-shell (Sidebar + Topbar) ко всему авторизованному app. Старые BP-страницы рендерятся внутри новой shell без изменений.

Завершает D-redesign Phase 3 (Phase 3a и 3b уже смержены).

Спека: docs/superpowers/specs/2026-05-27-d-phase-3-draft.md

## Test plan
- [ ] pnpm typecheck — 0 ошибок
- [ ] pnpm --filter @bigfin/webapp test:run — все зелёные
- [ ] node packages/webapp/scripts/lang-check.js — 0 missing/extra
- [ ] Storybook: DashboardShell/Default рендерится корректно
- [ ] Визуальная проверка локально: login → dashboard, новая shell, старые BP-страницы внутри
- [ ] Mobile (resize <768px): sidebar collapses

## Что НЕ входит в этот PR
- Миграция содержимого BP-страниц (внутренних таблиц/форм)
- Privacy/Terms полный текст (придёт из Sub-②a russian-legal-attributes)
- Удаление BlueprintJS целиком — только auth/shell зоны

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Acceptance Criteria (полный чек-лист из спеки)

После мерджа всех 3 PR (3a, 3b, 3c) должны выполняться все критерии из раздела 5 спеки:

- [ ] Все 3 оставшиеся legacy auth-страницы (`EmailConfirmation`, `RegisterVerify`, `InviteAccept`) переведены на `AuthLayout` + DS v2. Открываются по тем же URL. **(Block A)**
- [ ] Sidebar + Topbar — Bold Fintech, занимают свои позиции, рендерят BP-страницы внутри без визуальных артефактов. **(Block C)**
- [ ] `pnpm typecheck` — 0 ошибок. **(Task D.2 Step 1)**
- [ ] `pnpm --filter @bigfin/webapp test:run` — все тесты зелёные (5 новых для `inviteAcceptSchema`). **(Task A.1, D.2 Step 2)**
- [ ] Storybook — все новые компоненты с `Default` + минимум 1 вариативной story. **(Tasks B.1-B.4, C.1, D.2 Step 4)**
- [ ] Файлы `containers/Authentication/EmailConfirmation.tsx`, `RegisterVerify.tsx`, `InviteAccept.tsx`, `InviteAcceptForm.tsx`, `InviteAcceptFormContent.tsx` — удалены. **(Task A.5 Step 9)**
- [ ] Визуальная проверка: вход с свежим аккаунтом → подтверждение email → вход в продукт — нет визуальных переключений. **(Task D.2 Step 5)**
- [ ] `lang-check.js` — 0 missing, 0 extra (если в ходе работы трогали JSON-локали). **(Task D.2 Step 3)**

---

## Что осталось за рамками Phase 3 (для следующих sub-projects)

Эти задачи **намеренно** не входят:

- **Privacy/Terms финальный контент** — Sub-project ②a `russian-legal-attributes`
- **Миграция содержимого внутренних BP-страниц** (Dashboard widgets, формы счетов/контрагентов, отчёты) — отдельные sub-projects по модулям
- **Удаление BlueprintJS** в зонах, которые Phase 3 не трогает
- **Полированная светлая тема** — dark остаётся primary
- **Мобильное приложение** — Sub-project ⑬
- **Удаление `AuthInsider.tsx`, `AuthMetaBoot.tsx`, `withAuthentication.tsx`** — инфраструктурные HOC'и
- **Реструктуризация sidebar IA** (порядок пунктов, новые разделы) — Phase 3 это визуальная замена 1-в-1, не редизайн IA
- **Storybook MSW** — пока offline-only
- **Sidebar Overlay submenu** — текущий легаси-Sidebar поддерживает overlay/dialog типы пунктов; новый — только links. Поддержка overlay в новом Sidebar — отдельный sub-project, если основатель решит, что overlay-submenu нужны

---

## Связанные документы

- [Phase 3 spec (черновик)](../specs/2026-05-27-d-phase-3-draft.md) — спецификация под-проекта
- [Phase 0/1/2 spec](../specs/2026-05-25-redesign-design.md) — родительская спека редизайна
- [Phase 0/1/2 plan](2026-05-25-redesign-plan.md) — родительский план
- [Russian Legal Attributes spec](../specs/2026-05-27-russian-legal-attributes-design.md) — параллельный sub-project (sources Privacy/Terms)
- [Roadmap](../specs/2026-05-27-fintablo-planfact-parity-roadmap.md) — общая дорожная карта
