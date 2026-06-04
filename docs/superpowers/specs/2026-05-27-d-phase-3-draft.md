# Спецификация под-проекта: Редизайн D — Phase 3 (черновик)

**Дата:** 2026-05-27
**Тип документа:** Spec под-проекта (продолжение редизайна после auth-пилота)
**Статус:** Draft → черновик, ожидает brainstorming-сессии и review основателя
**Длительность:** оценка — 4-6 недель (детализируется после brainstorming)
**Место в roadmap:** Продолжение спеки [2026-05-25 redesign-design](2026-05-25-redesign-design.md). Phase 0 (инфраструктура), Phase 1 (DS v1 в Storybook), Phase 2 (auth-пилот) — выполнены или в финальном Acceptance. Phase 3 — миграция остальных пользовательских поверхностей на Bold Fintech-DS.

---

## 1. Контекст

Phase 0+1+2 закрыли минимальный путь: Tailwind 4 + Storybook 8 + DS v1 + пилот auth (Login/Register/ForgotPassword) на Bold Fintech. Пользователь, открывающий продукт впервые, видит новую идентичность. Но как только он входит — он попадает в старый BlueprintJS-интерфейс «корпоративный SaaS 2018»: серый sidebar, плотные таблицы, дашборд из исходной кодовой базы. Когнитивный разрыв между «вход» и «продуктом» = подрыв новой идентичности.

Phase 3 — про то, чтобы этот разрыв закрыть. Не «переделать всё», а **продлить Bold Fintech от auth вглубь продукта по двум магистралям**:
- **Auth-флоу длиной более одной страницы:** ResetPassword, EmailConfirmation, RegisterVerify, InviteAccept. План Phase 2 прямо оставил их в списке «НЕ удаляем» как D-Phase-3.
- **Глобальная оболочка приложения:** Sidebar + Topbar + BodyContent skeleton — то, что пользователь видит первым после входа и на каждой странице. Это самый высокий ROI/m² экрана.

Содержимое внутренних страниц (Dashboard widgets, формы контрагентов, отчёты) — **не в Phase 3**, это отдельные под-проекты основной roadmap.

---

## 2. Цели (в порядке приоритета)

1. **Сшить «вход» и «продукт».** Сразу после успешного логина пользователь не должен видеть резкого визуального переключения. Sidebar + Topbar должны быть в той же эстетике, что AuthLayout.
2. **Завершить миграцию auth-флоу.** Сейчас 6+ страниц auth работают: 3 на Bold Fintech (Phase 2) и 4-5 на BlueprintJS (наследие). Это разнородность, которая будет всплывать в письмах пользователей («интерфейс выглядит сломанным»). Phase 3 закрывает этот хвост.
3. **Расширить DS v2.** Phase 1 дала 15 компонентов под формы. Для shell нужны: `Sidebar`, `SidebarItem`, `Topbar`, `Avatar`, `Dropdown`, `Tabs`, `Badge`, `Breadcrumb`. Storybook становится богаче, следующие под-проекты получают готовые блоки.
4. **Удалить технический долг.** После Phase 3 можно удалить часть `containers/Authentication/` (legacy auth-страницы), часть BlueprintJS sidebar/topbar-обвязки. Это уменьшает поверхность кода на ~30% в auth-области.

## Не-цели

- **Миграция внутренних страниц.** Dashboard widgets, формы счетов/контрагентов, отчёты — остаются на BlueprintJS. Их миграция — в основной roadmap по модулям.
- **Финальный брендбук.** Bold Fintech дозревает по 12 экранов; брендбук — после.
- **Удаление BlueprintJS целиком.** Только в области, которую трогает Phase 3.
- **Полированная светлая тема.** Dark — primary, light — best effort, как в Phase 1.
- **Мобильное приложение.** Sub-project ⑬ основного roadmap.
- **Изменения в `packages/server/`.** Только frontend.

---

## 3. Скоуп

### Входит

#### 3.1. Остальные auth-флоу на Bold Fintech

| Существующий файл | Новое имя | Что делает |
|---|---|---|
| `containers/Authentication/ResetPassword.tsx` + `ResetPasswordForm.tsx` | `components/auth/ResetPasswordPage.tsx` | Форма «новый пароль + повтор», валидация совпадения и длины (10+). Использует `AuthLayout`. |
| `containers/Authentication/EmailConfirmation.tsx` | `components/auth/EmailConfirmationPage.tsx` | Финальный экран «email подтверждён, заходите». |
| `containers/Authentication/RegisterVerify.tsx` | `components/auth/RegisterVerifyPage.tsx` | Ожидание клика по ссылке из письма после регистрации. |
| `containers/Authentication/InviteAccept.tsx` + `InviteAcceptForm.tsx` | `components/auth/InviteAcceptPage.tsx` | Принятие приглашения в организацию (для multi-tenancy). |

Каждая страница:
- Использует `AuthLayout` (hero слева, контент + footer справа).
- Forms — `react-hook-form` + `zod` (схемы в `components/auth/schemas.ts`).
- Стилистика — те же `bigfin-ui`, `text-text-primary`, `bg-surface`-токены.
- API-вызовы — через существующие `useAuth*`-хуки из `hooks/query/authentication`.

#### 3.2. Глобальный shell

| Компонент | Где живёт | Заменяет |
|---|---|---|
| `components/ui/Sidebar.tsx` + `SidebarItem.tsx` | DS v2 | BlueprintJS-сайдбар из текущего dashboard layout |
| `components/ui/Topbar.tsx` | DS v2 | Текущий topbar с поиском/уведомлениями/аватаром |
| `components/dashboard/DashboardShell.tsx` | Контейнер | Текущая обёртка `DashboardPrivatePages` |
| `components/ui/Avatar.tsx` + `Dropdown.tsx` + `Tabs.tsx` + `Badge.tsx` + `Breadcrumb.tsx` | DS v2 | По мере необходимости в shell |

После Phase 3:
- Sidebar + Topbar — Bold Fintech (dark surface, акцент жёлтый на active item).
- **Внутри основной content-области — старые BP-страницы рендерятся как раньше**. Bold Fintech-shell их обрамляет, не подменяет.
- Это даёт визуальную связность без массовой миграции страниц.

#### 3.3. Заглушки → настоящий контент

`PrivacyPage` и `TermsPage` (созданы в финальном Phase 2 как placeholder) получают полноценный текст из юридического шаблона (или из Sub-project ②a russian-legal-attributes, если она это покроет). **Открытый вопрос:** где будет жить юридический текст — в JSON-локалях, в .mdx, или в отдельной CMS? Решается в brainstorming.

### Не входит

- Миграция самих widgets дашборда (kpi-карточки, графики). Это содержимое, не shell.
- Реструктуризация навигации (порядок пунктов sidebar, новые разделы). Phase 3 — визуальная замена 1-в-1, не перепроектирование IA.
- Удаление `withAuthentication.tsx`, `AuthMetaBoot.tsx`, `AuthInsider.tsx` — это инфраструктурные HOC'и, не страницы. Они продолжают жить под капотом, могут быть рефакторнуты отдельно как технический долг.

---

## 4. Архитектура решения

### 4.1. Принципы (наследуются из Phase 2)

- Старая и новая DS сосуществуют. Граница — по файлам.
- Tailwind `content`-глоб расширяется на новые папки (`components/auth/**`, `components/dashboard/**`, `components/ui/**` — уже есть).
- BlueprintJS не удаляется принудительно: пункты sidebar, ведущие на старые страницы (Dashboard, Customers, …), их и открывают.
- React-router v5, `Switch` first-match — новые auth-роуты заменяют старые в `routes/authentication.tsx`. Shell — в `App.tsx`, обёртка `path='/'` → `DashboardPrivatePages`.

### 4.2. Поведение shell

```
┌─────────────────────────────────────────────────────────────────┐
│  Topbar (Bold Fintech)            [search] [bell] [avatar▾]     │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  Sidebar     │     Content area                                 │
│  (Bold       │     ───────────────                              │
│   Fintech)   │     Здесь BP-страница рендерится как раньше.    │
│              │     Не трогаем её стили, только обрамление.     │
│   • Дашборд  │                                                  │
│   • Сделки   │                                                  │
│   • Отчёты   │                                                  │
│   • Настройки│                                                  │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

Sidebar/Topbar — `position: fixed`, content-area — внутри `bigfin-ui` контейнера, но дочерние BP-компоненты используют свой собственный SCSS (как сейчас).

### 4.3. Структура папок (новое)

```
src/components/
├── ui/                                  (Phase 1 + Phase 3 — расширение DS)
│   ├── Sidebar.tsx + .stories.tsx
│   ├── SidebarItem.tsx + .stories.tsx
│   ├── Topbar.tsx + .stories.tsx
│   ├── Avatar.tsx + .stories.tsx
│   ├── Dropdown.tsx + .stories.tsx
│   ├── Tabs.tsx + .stories.tsx
│   ├── Badge.tsx + .stories.tsx
│   ├── Breadcrumb.tsx + .stories.tsx
│   └── ... (Phase 1 components)
├── auth/                                (Phase 2 + Phase 3 — продолжение)
│   ├── ResetPasswordPage.tsx + .stories.tsx
│   ├── EmailConfirmationPage.tsx + .stories.tsx
│   ├── RegisterVerifyPage.tsx + .stories.tsx
│   ├── InviteAcceptPage.tsx + .stories.tsx
│   └── ... (Phase 2 pages, schemas)
└── dashboard/                            (Phase 3 — новый)
    ├── DashboardShell.tsx
    └── DashboardShell.stories.tsx
```

### 4.4. Маршрутизация

| Path | До Phase 3 | После Phase 3 |
|---|---|---|
| `/auth/login` | new (Phase 2) | без изменений |
| `/auth/register` | new (Phase 2) | без изменений |
| `/auth/forgot-password` + `/auth/send_reset_password` | new (Phase 2) | без изменений |
| `/auth/reset_password/:token` | legacy BP | new Bold Fintech (`ResetPasswordPage`) |
| `/auth/register/verify` | legacy BP | new Bold Fintech (`RegisterVerifyPage`) |
| `/auth/email_confirmation` | legacy BP | new Bold Fintech (`EmailConfirmationPage`) |
| `/auth/invite/:token/accept` | legacy BP | new Bold Fintech (`InviteAcceptPage`) |
| `/privacy`, `/terms` | placeholder (Phase 2) | finalised content (Phase 3 или Sub-②a) |
| `/` → `DashboardPrivatePages` | BP shell внутри | new Bold Fintech shell, BP-страницы внутри |

---

## 5. Acceptance Criteria

- [ ] Все 4 legacy auth-страницы (`ResetPassword`, `EmailConfirmation`, `RegisterVerify`, `InviteAccept`) переведены на `AuthLayout` + DS v2. Открываются по тем же URL.
- [ ] Sidebar + Topbar — Bold Fintech, занимают свои позиции, рендерят BP-страницы внутри без визуальных артефактов.
- [ ] `pnpm typecheck` — 0 ошибок.
- [ ] `pnpm lang:check` — exit 0, 0 missing, 0 extra (если правим JSON-локали).
- [ ] `pnpm test:run` — все тесты зелёные (новые схемы для ResetPassword покрыты unit-тестами).
- [ ] Storybook — все новые компоненты в DS-сайдбаре с `Default` + минимум 1 вариативной story.
- [ ] Файлы `containers/Authentication/ResetPassword*.tsx`, `EmailConfirmation.tsx`, `RegisterVerify.tsx`, `InviteAccept*.tsx` — удалены.
- [ ] Визуальная проверка: вход с свежим аккаунтом → подтверждение email → вход в продукт — нет визуальных переключений.

---

## 6. Зависимости и риски

### Зависимости

- **Phase 2 должна быть смерджена в `develop`.** Сейчас Phase 2 на ветке `feat/d-redesign-phase-2b-auth-wiring`. Phase 3 стартует только после мерджа (иначе ветка станет огромной, ревью невозможен).
- **Sub-project ①** (русская локализация) — желательно тоже смерджен до Phase 3, иначе хардкод-русский в новых auth-страницах может конфликтовать с i18n-стратегией для shell.
- **Локальный бэкенд** — желателен. Без него визуальная проверка флоу `register/verify → email_confirmation` невозможна. Можно делать в Storybook через mock-API, но это хуже.

### Риски

| Риск | Митигация |
|---|---|
| Sidebar/Topbar — самые перегружены состоянием (notification dropdown, search, switch organization). Их редизайн может растянуться. | Phase 3 делает Sidebar/Topbar **визуально**, не функционально. Все хуки и state — переиспользуем. Только новая разметка + классы. |
| Старые BP-страницы внутри новой shell могут «торчать»: разные radius'ы, разные цвета фона. | Acceptance: визуально вылавливаем 5-7 worst offenders, добавляем точечные стили, без массовой миграции. |
| `InviteAccept` зависит от multi-tenancy-флоу, который основатель не использует в dogfooding. | Низкий приоритет, делаем в самом конце. Если упрёмся в баги — откладываем в отдельную мини-задачу. |
| Расширение Tailwind `content`-глоба может задеть случайные BP-файлы и сгенерировать лишний CSS. | Глоб остаётся ограниченным (`components/ui/**`, `components/auth/**`, `components/dashboard/**`). BP-области не покрываются. |

---

## 7. Открытые вопросы (для brainstorming-сессии)

1. **Где будет жить юридический текст Privacy/Terms?** JSON-локаль, `.mdx`, отдельная CMS, или закодировано в TSX? Влияет на структуру `LegalPlaceholderPage` и на возможность редактирования без деплоя.
2. **Sidebar Bold Fintech — горизонтальный или вертикальный?** Сейчас в исходном интерфейсе — вертикальный. Тинькофф/Revolut использует вертикальный с компактными иконками. Решение влияет на компонент `SidebarItem`.
3. **Topbar — компактный или расширенный?** Search + notifications + avatar минимум; добавлять ли quick-actions, org-switcher на toolbar или прятать в меню?
4. **Migration order auth-флоу.** Какой порядок: ResetPassword первым (потому что флоу из ForgotPassword уже Bold Fintech)? Или InviteAccept последним?
5. **Какой scope удаления BP**? После Phase 3 — какие конкретные `.scss`-файлы из `style/pages/Authentication/` можно удалить? Перечислить точно.
6. **Storybook live-preview бэкенда.** Сейчас Storybook полностью offline. Phase 3 auth-страницы делают сетевые вызовы (`useAuthSendResetPassword` и т.п.) — нужно решить, mock'аем ли мы их в Storybook через MSW, или оставляем эти страницы только «видимыми», без интерактивной отправки.

---

## 8. Следующие шаги после этого черновика

1. **Brainstorming-сессия** с основателем по 6 открытым вопросам выше. ~1-1.5 часа.
2. **Финальная spec** (`2026-05-27-d-phase-3-design.md`) — этот черновик → финальный документ с зафиксированными решениями.
3. **План** (`docs/superpowers/plans/2026-05-28-d-phase-3-plan.md`) — task'и со шагами, аналогично [2026-05-25-redesign-plan.md](../plans/2026-05-25-redesign-plan.md).
4. **Имплементация** в подходе executing-plans или subagent-driven-development.

---

## 9. Связанные документы

- [Spec D Phases 0+1+2](2026-05-25-redesign-design.md) — родительская спека.
- [Plan D Phases 0+1+2](../plans/2026-05-25-redesign-plan.md) — родительский план.
- [Spec Russian Localization](2026-05-21-russian-localization-design.md) — параллельный sub-project.
- [Spec Russian Legal Attributes](2026-05-27-russian-legal-attributes-design.md) — следующий sub-project (②a).
- [Roadmap](2026-05-27-fintablo-planfact-parity-roadmap.md) — общая дорожная карта.
