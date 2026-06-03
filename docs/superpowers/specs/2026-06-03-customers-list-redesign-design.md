# Редизайн списков (пилот «Клиенты») — Design

**Goal:** Расширить D-редизайн с auth-страниц/оболочки на **внутренние экраны**, начав с одного типового списка — **«Клиенты»**. Собрать переиспользуемый набор UI-примитивов списка (таблица, шапка, тулбар, пагинация, пустое состояние) в стиле shadcn/Bold Fintech и обкатать их на списке клиентов. Результат — **шаблон**, который потом дёшево тиражируется на остальные ~20 списков (Поставщики, Товары, Счета и т.д.).

**Тип работы:** только фронтенд (плюс одна additive-регистрация фиче-флага на сервере). Без правок бизнес-логики, без миграций БД, без SDK-регена, без новых npm-зависимостей.

**Контекст:** в `packages/webapp/src/containers` **810 файлов** импортируют BlueprintJS — это десятки легаси-экранов. Мигрировать всё разом нельзя; применяем **Strangler Fig**: новый shadcn-UI сосуществует со старым Blueprint пофайлово, новый код включается за feature-флагом, старый удаляется только по достижении паритета. Так же был обкатан auth (Фаза 2) и оболочка DashboardShell (Фаза 3).

**Связанные документы:**
- Базовый редизайн (Фазы 0–2): [2026-05-25-redesign-design.md](2026-05-25-redesign-design.md)
- Мастер-план: [../plans/2026-05-31-consolidated-master-plan.md](../plans/2026-05-31-consolidated-master-plan.md)

---

## 1. Принятые решения (с обоснованием)

| # | Решение | Обоснование |
|---|---|---|
| 1 | **Пилот — список «Клиенты»** (`CustomersLanding`) | Самый чистый типовой список: таблица + тулбар + вкладки-виды + пустое состояние, без форм в той же папке. Шаблон переносится на Поставщиков/Товары/Счета. |
| 2 | **Подход B — новые примитивы в `components/ui/`** | Strangler Fig: не трогаем общий легаси `DataTable` (его используют все списки — менять его = риск для всех сразу). Новые компоненты дают чистый переиспользуемый шаблон. |
| 3 | **Тема — светлый контент в тёмной оболочке** | Меню/шапка/auth остаются тёмными (бренд Bold Fintech), область данных — светлая для читаемости плотных финансовых таблиц (как у Fintablo/ПланФакт/1С). Реализуется обёрткой `.bigfin-ui .light` — тема `.light` уже есть в `tokens.css`. |
| 4 | **Объём — ядро за фиче-флагом** | Старый список остаётся живым; новый включается флагом `customers_list_v2` (default off) до паритета. Никаких потерянных функций в проде. |
| 5 | **Движок таблицы — существующий `react-table` v7** | Уже стоит в зависимостях (на нём построен легаси `DataTable`). Не вводим `@tanstack/react-table` v8 → не запускаем `pnpm install` (известная проблема на Windows). «shadcn-стиль» — это Tailwind-оформление, а не конкретная версия библиотеки. |

---

## 2. Область

**В объёме (ядро пилота):**
- Список клиентов с серверной пагинацией и сортировкой.
- Глобальный поиск по списку.
- Выделение строк (чекбоксы) + массовое удаление.
- Кнопка «+ Новый клиент».
- Действия по строке: открыть (drawer), изменить, удалить.
- Пустое состояние.
- Светлая тема контента.

**Вне объёма (отложено до паритета, добавляется позже теми же примитивами):**
- Сохранённые виды (`DashboardActionViewsList`).
- Продвинутый фильтр (`AdvancedFilterPopover`).
- Печать/экспорт PDF, импорт.
- Переключатель «неактивные», изменение высоты строк, сохранение ширин колонок.

**Не трогаем:** легаси `components/Datatable/*`, старые `CustomersLanding/*`, прочие 19 списков, бэкенд-логику клиентов, миграции, SDK.

---

## 3. Архитектура

### 3.1. Новые переиспользуемые примитивы (`packages/webapp/src/components/ui/`)

Все — на CSS-токенах бренда, со Storybook-историями (визуальная приёмка без бэкенда). Каждый рендерится внутри `.bigfin-ui` (скоуп-класс новой DS).

| Файл | Ответственность | Ключевые props |
|---|---|---|
| `data-table.tsx` | Презентационная таблица на `react-table` v7: сортируемые заголовки, чекбокс-выделение, скелетон загрузки, клик по строке, слот пустого состояния. Серверные сортировка/пагинация (`manualSortBy`, `manualPagination`). | `columns`, `data`, `loading`, `pageCount`, `onPaginationChange`, `onSortChange`, `onRowClick`, `enableSelection`, `onSelectionChange`, `emptyState` |
| `data-table-pagination.tsx` | Нижняя панель: «1–N из M», переключение страниц/размера. | `pageIndex`, `pageSize`, `pageCount`, `total`, `onChange` |
| `page-header.tsx` | Шапка страницы: заголовок + основное действие справа. | `title`, `action?` |
| `list-toolbar.tsx` | Панель действий: поиск + слот для будущих фильтров/вкладок + панель массовых действий, когда есть выделение. | `search`, `onSearchChange`, `selectedCount`, `bulkActions?`, `children?` |
| `empty-state.tsx` | Пустое состояние: иконка + заголовок + подсказка + действие. | `title`, `description?`, `action?`, `icon?` |

**Переиспользуем существующие `ui/`:** `button`, `input`, `checkbox`, `badge` (статус Активен/Архив), `dropdown-menu` (меню действий строки ⋯), `skeleton` (загрузка), `tabs` (на будущее — вкладки-виды).

### 3.2. Механизм темы

Корневой контейнер новой страницы: `<div className="bigfin-ui light">…</div>`.
- `.bigfin-ui` — скоуп новой DS (скоуп-сброс вместо Tailwind preflight; защищает Blueprint-области).
- `.light` — переопределяет CSS-переменные токенов на светлые значения. Все утилиты (`bg-background`, `text-text-secondary`, `bg-surface`, `border-border`) ссылаются на переменные → автоматически светлеют. Тёмная оболочка (`:root`) не затрагивается.

### 3.3. Пилотная обвязка (`packages/webapp/src/containers/Customers/`)

Новые файлы (старые `CustomersLanding/*` не трогаем). Стиль — как `BudgetsPage` (функциональный компонент, react-query хуки, `intl.get`, Tailwind; без `@ts-nocheck`, без Redux-HOC/`compose`).

- `CustomersLandingV2/CustomersListV2.tsx` — страница: данные из `useCustomers(query)`, массовое удаление через `useBulkDeleteCustomers` + `useValidateBulkDeleteCustomers`; состояние сортировки/страницы/поиска — локальное (`useState`); композиция новых примитивов. Корень — `.bigfin-ui light`.
- `CustomersLandingV2/columns.tsx` — определения колонок и рендереры ячеек: Название, Email, Телефон, Баланс (формат `ru-RU`, минус — красным), Статус (`badge`), действия (`dropdown-menu`).
- `CustomersLandingV2/format.ts` + `format.spec.ts` — чистые функции форматирования (баланс, статус) с Vitest-тестами.
- `CustomersLandingV2/CustomersListV2.stories.tsx` — Storybook с мок-данными (визуальная приёмка).

**Переиспользуем существующее:** хуки данных (`@/hooks/query/customers`), открытие карточки клиента (`openDrawer(DRAWERS.CUSTOMER_DETAILS)`), переход на создание/редактирование (`/customers/new`, `/customers/:id/edit`), алерты удаления.

---

## 4. Поток данных

```
useCustomers({ pageIndex, pageSize, sortBy, search })  →  { customers, pagination }
        │
        ▼
CustomersListV2 (локальное состояние таблицы)
        │  columns.tsx (рендер ячеек)
        ▼
ui/data-table (react-table v7, презентация)
        ├─ клик по строке → openDrawer(CUSTOMER_DETAILS)
        ├─ действия строки → /customers/:id/edit, alert('customer-delete')
        └─ выделение → list-toolbar → useBulkDeleteCustomers
```

Сервер отдаёт данные постранично (как сейчас), поэтому `manualPagination`/`manualSortBy` — пагинация и сортировка уходят в запрос, не считаются на клиенте.

---

## 5. Фиче-флаг и выкатка

- Новый флаг **`customers_list_v2`** (string-ключ, default **off**), регистрируется в серверном реестре как management-флаги (`MGMT_ARTICLES`/`BUDGETS`): `Features` enum + `FeaturesConfigure`. Попадает в dashboard-meta → читается на фронте `useFeatureCan().featureCan('customers_list_v2')`.
- В точке роутинга `/customers`: если флаг включён — рендерим `CustomersListV2`, иначе — текущий `CustomersList`. Переключатель — тонкая обёртка; старый код нетронут.
- Достигнув паритета и пройдя приёмку — флаг включается по умолчанию, затем (отдельным шагом, с разрешения) удаляется легаси.

---

## 6. Структура файлов

**Создать:**
- `components/ui/data-table.tsx` (+ `data-table.stories.tsx`)
- `components/ui/data-table-pagination.tsx`
- `components/ui/page-header.tsx` (+ story)
- `components/ui/list-toolbar.tsx` (+ story)
- `components/ui/empty-state.tsx` (+ story)
- `containers/Customers/CustomersLandingV2/CustomersListV2.tsx`
- `containers/Customers/CustomersLandingV2/columns.tsx`
- `containers/Customers/CustomersLandingV2/format.ts` (+ `format.spec.ts`)
- `containers/Customers/CustomersLandingV2/CustomersListV2.stories.tsx`

**Изменить:**
- Точку роутинга `/customers` — условный рендер new/old по флагу.
- `src/lang/en/index.json` + `src/lang/ru/index.json` — новые ключи (парно).
- Серверный реестр флагов (`Features` + `FeaturesConfigure`) — добавить `customers_list_v2` (default off).

**Удалить:** ничего (Strangler Fig).

---

## 7. i18n

- Все строки экрана — через `intl.get('...')`. Переиспользуем существующие ключи клиентов (`new_customer`, `delete`, статусы и т.д.), где есть.
- Новые ключи (примерные): `customers.search_placeholder`, `customers.empty.title`, `customers.empty.description`, `customers.col.balance`, `customers.col.status`, `customers.status.active`, `customers.status.archived`, `customers.bulk_delete` — добавляются парно в `en` и `ru`.
- После правок — `node packages/webapp/scripts/lang-check.js` (строгая парность EN↔RU).
- Бренд везде — только `Bigfin`.

---

## 8. Тестирование и проверка (без бэкенда)

- **Storybook** — истории для каждого нового `ui/`-примитива и для `CustomersListV2` на мок-данных. Главная визуальная приёмка.
- **Vitest** — юнит-тесты чистых функций `format.ts` (баланс, статус) и, при наличии логики, маппинга колонок.
- **Типы** — `pnpm --filter @bigfin/webapp typecheck`.
- **Парность langs** — `node packages/webapp/scripts/lang-check.js`.
- Бэкенд/миграции/SDK не затронуты (кроме additive-регистрации флага) → серверные тесты не ломаются.
- Флаг `customers_list_v2` остаётся off → прод-поведение не меняется.

---

## 9. Риски и совместимость

- **Изоляция стилей:** новый UI только внутри `.bigfin-ui` — Tailwind не «протекает» в Blueprint-области.
- **Сосуществование таблиц:** временно работают и легаси `DataTable`, и новый `ui/data-table`. Это норма для Strangler Fig; легаси убираем только после паритета.
- **Без новых зависимостей:** переиспользуем `react-table` v7 → не трогаем lockfile/`pnpm install`.
- **Маленькие шаги:** примитивы → колонки/формат (с тестами) → страница → флаг/роутинг → приёмка. Каждый шаг проверяем и откатываем независимо.

---

## 10. Открытые вопросы

1. **Точное имя флага:** `customers_list_v2` vs более общий `lists_redesign` (если хотим один флаг на весь шаблон, а не на каждый список). Предложение: пилот за `customers_list_v2`, при тиражировании ввести общий флаг.
2. **Поиск:** серверный (через `useCustomers({ search })`) или клиентский фильтр по загруженной странице. Предложение: серверный, как у текущего списка.
3. **Карточка/редактирование:** оставляем существующий drawer/маршруты (легаси) или тоже редизайним. Предложение: в этом пилоте переиспользуем существующие — редизайн карточки отдельным срезом.
