# Тираж редизайна списков: «Поставщики» + общий движок — Design

**Goal:** Перенести шаблон редизайна списков с пилота «Клиенты» на следующий список — **«Поставщики»** — и при этом **вынести общий движок списка** (переиспользуемый «движок» + тонкие «адаптеры» под каждый список), чтобы дальнейший тираж на ~16 оставшихся списков стоил минимум кода. Новый список «Поставщики» включается за собственным фиче-флагом `vendors_list_v2` (default off), легаси не трогаем.

**Тип работы:** только фронтенд (плюс одна additive-регистрация фиче-флага на сервере). Без правок бизнес-логики, без миграций БД, без SDK-регена, без новых npm-зависимостей.

**Контекст:** пилот «Клиенты» (PR #43) собрал 5 презентационных UI-примитивов в `components/ui/` (`data-table`, `data-table-pagination`, `page-header`, `list-toolbar`, `empty-state`) и обкатал их на `CustomersLandingV2` за флагом `customers_list_v2`. Этот флаг **по умолчанию выключен** → в проде `/customers` рендерит легаси-список, а Customers V2 ещё не «живой». Применяем **Strangler Fig**: новый UI сосуществует со старым Blueprint пофайлово, включается флагом, легаси удаляется только по достижении паритета.

**Связанные документы:**
- Пилот «Клиенты» (design): [2026-06-03-customers-list-redesign-design.md](2026-06-03-customers-list-redesign-design.md)
- Пилот «Клиенты» (plan): [../plans/2026-06-03-customers-list-redesign-plan.md](../plans/2026-06-03-customers-list-redesign-plan.md) — см. follow-up §3 «Тиражирование шаблона»
- Мастер-план: [../plans/2026-05-31-consolidated-master-plan.md](../plans/2026-05-31-consolidated-master-plan.md)

---

## 1. Принятые решения (с обоснованием)

| # | Решение | Обоснование |
|---|---|---|
| 1 | **Следующий список — «Поставщики»** (`VendorsLanding`) | Наивысший паритет с «Клиентами»: тот же хук-формат `{ vendors, pagination }`, те же поля (`display_name`, `company_name`, `closing_balance`, `currency_code`, `active`), уже есть `useBulkDeleteVendorsDialog`, drawer `VENDOR_DETAILS`, алерт `vendor-delete`, `transformVendorsStateToQuery`. Единственное отличие поля — телефон `work_phone` (у клиентов `personal_phone`). |
| 2 | **Подход B — сначала вынести общий движок**, потом адаптеры | Выбор основателя. Из пилота извлекается переиспользуемый движок (`ListView` + `useListController` + общие форматтеры); «Клиенты V2» переводятся на него (доказательство абстракции), «Поставщики V2» — тонкий адаптер. Так тираж на следующие списки становится дешёвым, а дублирование вёрстки/состояния устраняется на втором же примере (правило трёх соблюдено: пилот + 2 реальных потребителя). |
| 3 | **Рефактор «Клиентов V2» безопасен** | `customers_list_v2` default off → Customers V2 **не в проде**. Рефактор флагнутого-выключенного кода не виден пользователю; проверяем тестами + Storybook до любого включения. Легаси `CustomersList` не трогаем. |
| 4 | **Флаг — пер-список `vendors_list_v2`** (не общий `lists_redesign`) | Выбор основателя. Гранулярная выкатка: можно включить только «Поставщиков», пожить с ними (dogfooding), потом следующий. Не связывает уже отгруженных «Клиентов» с новым флагом. Согласуется с пилотом. |
| 5 | **Объём — точная копия пилота** | Выбор основателя. Клиентский поиск по загруженной странице, переиспользование существующих drawer/массового удаления/алертов, без серверного поиска/фильтров/экспорта/сохранённых видов. Эти функции — отдельным срезом сразу по всем спискам. |
| 6 | **Движок таблицы — существующий `react-table` v7** | Уже в зависимостях (на нём и легаси, и пилотный `ui/data-table`). Не вводим новых библиотек → не запускаем `pnpm install` (известная проблема на Windows + bcrypt). |

---

## 2. Область

**В объёме:**
- Общий движок списка (`ListView` + `useListController` + общие форматтеры) с юнит-тестами чистых функций.
- Рефактор `CustomersLandingV2` на общий движок (без изменения видимого поведения; за флагом off).
- Новый список «Поставщики V2» на общем движке: серверная пагинация и сортировка, клиентский поиск по странице, выделение строк + массовое удаление, кнопка «+ Новый поставщик», действия по строке (открыть drawer / изменить / удалить), пустое состояние, светлая тема контента.
- Фиче-флаг `vendors_list_v2` (сервер, default off) + переключатель маршрута `/vendors`.
- 8 новых `vendors.*` i18n-ключей (EN+RU).

**Вне объёма (отложено, добавляется позже теми же примитивами):**
- Серверный поиск (сейчас клиентский по загруженной странице).
- Продвинутый фильтр, сохранённые виды, печать/экспорт PDF, импорт, переключатель «неактивные», сохранение ширин колонок.
- Колонка «Заметка» (`note`) из легаси-таблицы поставщиков — пилотный набор колонок её не содержит; при желании добавляется отдельно.
- Тираж на Товары/Счета/прочие списки — отдельными срезами.

**Не трогаем:** легаси `components/Datatable/*`, легаси `Vendors/VendorsLanding/*` (кроме одной строки маршрута), легаси `Customers/CustomersLanding/*`, прочие списки, бэкенд-логику поставщиков, миграции, SDK. Удалений нет.

---

## 3. Архитектура

### 3.1. Общий движок (`packages/webapp/src/components/ui/list-view/`)

Энтити-независимый, переиспользуемый всеми списками. Состоит из презентационного компонента, хука состояния и чистых функций.

| Файл | Ответственность | Ключевые элементы |
|---|---|---|
| `list-view.tsx` | **Презентация** всего экрана из существующих `ui/`-примитивов: `PageHeader` + `ListToolbar` + `DataTable` + `DataTablePagination` + `EmptyState`. Ничего не знает о клиентах/поставщиках. | props: `title`, `primaryAction {label,onClick}`, `columns`, `data`, `getRowId`, `loading`, `search`, `onSearchChange`, `searchPlaceholder`, `selectedIds`, `onSelectionChange`, `bulkDelete {label,onClick(ids)}`, `pageIndex`, `pageSize`, `pageCount`, `total`, `onPageChange`, `onPageSizeChange`, `onSortChange`, `onRowClick`, `emptyState {icon,title,description,action}` |
| `use-list-controller.ts` | **Состояние** списка: `pageIndex`, `pageSize`, `sortBy`, `search`, `selected`. Строит серверный `query` через инъекцию `transform`. Сбрасывает страницу при смене размера. | `useListController({ transform, searchFields })` → `{ query, pageIndex, pageSize, sortBy, search, selected, setPageIndex, setPageSize, setSortBy, setSearch, setSelected, applySearch(rows) }` |
| `filter-rows.ts` (+ `.spec.ts`) | **Чистая функция** клиентского поиска по странице: фильтрует строки по подстроке в перечисленных полях (case-insensitive, trim). | `filterRows(rows, search, fields)` — TDD |
| `list-format.ts` (+ `.spec.ts`) | **Чистые функции** форматирования, общие для всех списков: денежный формат `ru-RU` (пустое/нечисловое → 0, валюта по умолчанию RUB), признак отрицательного баланса, маппинг `active`→статус. | `formatBalance(amount, currencyCode?)`, `isNegativeBalance(amount)`, `activeStatus(active)` — TDD |
| `list-view.stories.tsx` | Storybook-история движка на мок-данных (визуальная приёмка без бэкенда), внутри `.bigfin-ui light`. | — |

**Граница ответственности:** движок **не** ходит за данными и **не** знает HOC-инъекций (`withDrawerActions`/`withAlertActions`) — это остаётся в адаптерах. `ListView` чисто презентационный; вся тестируемая логика вынесена в `filter-rows.ts` и `list-format.ts`.

### 3.2. Адаптеры (тонкие, по одному на список)

Адаптер — это страница, которая вызывает свой хук данных и HOC-действия, собирает колонки и обработчики, и рендерит `<ListView>`.

**Рефактор: `Customers/CustomersLandingV2/`** (за флагом off → безопасно)
- `CustomersListV2.tsx` — переписать на `useListController` + `<ListView>` (было: ручные `useState` + ручная вёрстка примитивов). Поведение не меняется.
- `columns.tsx` — перевести форматтеры на общий `list-format.ts` (статус-бейдж, баланс).
- `format.ts` — оставить как тонкий ре-экспорт из `list-format.ts` (без удаления; `format.spec.ts` остаётся зелёным).

**Новый: `Vendors/VendorsLandingV2/`**
- `columns.tsx` — `useVendorsColumns({ onView, onEdit, onDelete })`: `display_name` (Название) · `company_name` (Компания) · `work_phone` (Телефон, header `phone_number`) · баланс (`closing_balance`/`currency_code`, header `receivable_balance`, минус — красным) · статус (`Badge`, ключи `vendors.status.*`) · действия (`DropdownMenu`: `view_details` / `edit_vendor` / `delete_vendor`).
- `VendorsListV2.tsx` — адаптер: `useVendors(query,{keepPreviousData})` → `{ vendors, pagination }`; `useListController({ transform: transformVendorsStateToQuery, searchFields: ['display_name','company_name','work_phone'] })`; `useBulkDeleteVendorsDialog().openBulkDeleteDialog(ids)`; обработчики строки:
  - открыть: `openDrawer(DRAWERS.VENDOR_DETAILS, { vendorId: id })`
  - изменить: `history.push('/vendors/' + id + '/edit')` (шаблонная строка `/vendors/:id/edit`)
  - удалить: `openAlert('vendor-delete', { contactId: id })`
  - новый: `history.push('/vendors/new')`

  Композиция HOC — `compose(withDrawerActions, withAlertActions)` (как в `CustomersListV2`). Корень — `.bigfin-ui light`.
- `VendorsListSwitch.tsx` — `useFeatureCan().featureCan('vendors_list_v2') ? <VendorsListV2/> : <VendorsList/>` (легаси `../VendorsLanding/VendorsList`).

### 3.3. Механизм темы (без изменений)

Корень страницы — `<div className="bigfin-ui light">…</div>`: `.bigfin-ui` — скоуп новой DS, `.light` — светлые токены. Тёмная оболочка (`:root`) не затрагивается. Как в пилоте.

---

## 4. Поток данных (Поставщики)

```
useListController({ transform: transformVendorsStateToQuery, searchFields })
        │  → query { pageIndex, pageSize, sortBy, inactive_mode:false }
        ▼
useVendors(query, { keepPreviousData })  →  { vendors, pagination }
        │  applySearch(vendors)  (клиентский поиск по странице, filterRows)
        ▼
VendorsListV2 (адаптер: columns + обработчики)
        ▼
ui/list-view/ListView  →  ui/data-table (react-table v7, презентация)
        ├─ клик по строке → openDrawer(VENDOR_DETAILS, { vendorId })
        ├─ действия строки → /vendors/:id/edit, openAlert('vendor-delete', { contactId })
        └─ выделение → ListToolbar → useBulkDeleteVendorsDialog().openBulkDeleteDialog(ids)
```

Сервер отдаёт данные постранично; пагинация/сортировка — серверные (`manualSortBy`/`manualPagination` уже в `ui/data-table`). Поиск — клиентский по текущей странице (как в пилоте).

---

## 5. Фиче-флаг и выкатка

- Новый флаг **`vendors_list_v2`** (string-ключ, default **off**), регистрируется как management-флаги:
  - `packages/server/src/common/types/Features.ts` — `VENDORS_LIST_V2 = 'vendors_list_v2'` в enum `Features` (после `CUSTOMERS_LIST_V2`).
  - `packages/server/src/modules/Features/FeaturesConfigure.ts` — `{ name: Features.VENDORS_LIST_V2, defaultValue: false }`.
- Попадает в dashboard-meta → читается на фронте `useFeatureCan().featureCan('vendors_list_v2')`.
- В маршруте `/vendors` (`routes/dashboard.tsx`, ~стр. 659): ленивый импорт переводится с `VendorsLanding/VendorsList` на `VendorsLandingV2/VendorsListSwitch`. Переключатель — тонкая обёртка; старый код нетронут.
- Достигнув паритета и пройдя приёмку — флаг включается; затем (отдельным шагом, с разрешения) удаляется легаси.

---

## 6. Структура файлов

**Создать:**
- `components/ui/list-view/list-view.tsx` (+ `list-view.stories.tsx`)
- `components/ui/list-view/use-list-controller.ts`
- `components/ui/list-view/filter-rows.ts` (+ `filter-rows.spec.ts`)
- `components/ui/list-view/list-format.ts` (+ `list-format.spec.ts`)
- `containers/Vendors/VendorsLandingV2/columns.tsx`
- `containers/Vendors/VendorsLandingV2/VendorsListV2.tsx`
- `containers/Vendors/VendorsLandingV2/VendorsListSwitch.tsx`

**Изменить:**
- `containers/Customers/CustomersLandingV2/CustomersListV2.tsx` — перевод на `ListView` + `useListController`.
- `containers/Customers/CustomersLandingV2/columns.tsx` — общие форматтеры.
- `containers/Customers/CustomersLandingV2/format.ts` — тонкий ре-экспорт из `list-format.ts` (без удаления).
- `routes/dashboard.tsx` (~стр. 659) — маршрут `/vendors` → `VendorsListSwitch`.
- `packages/server/src/common/types/Features.ts` — добавить `VENDORS_LIST_V2`.
- `packages/server/src/modules/Features/FeaturesConfigure.ts` — зарегистрировать флаг (default off).
- `src/lang/en/index.json` + `src/lang/ru/index.json` — 8 новых `vendors.*` ключей (парно).

**Удалить:** ничего (Strangler Fig).

---

## 7. i18n

**Переиспользуем существующие ключи** (добавлять не нужно): `display_name`, `company_name`, `phone_number`, `receivable_balance`, `view_details`, `vendors`, `new_vendor`, `edit_vendor`, `delete_vendor`.

**Новые ключи (8, парно EN+RU)** — точные параллели `customers.*`:

| Ключ | EN | RU |
|---|---|---|
| `vendors.col.status` | Status | Статус |
| `vendors.status.active` | Active | Активен |
| `vendors.status.inactive` | Inactive | Неактивен |
| `vendors.row_actions` | Actions | Действия |
| `vendors.search_placeholder` | Search this page… | Поиск по странице… |
| `vendors.empty.title` | No vendors yet | Пока нет поставщиков |
| `vendors.empty.description` | Add your first vendor to get started. | Добавьте первого поставщика, чтобы начать. |
| `vendors.list.bulk_delete` | Delete selected | Удалить выбранные |

После правок — `node packages/webapp/scripts/lang-check.js` (строгая парность EN↔RU). Бренд везде — только `Bigfin`.

---

## 8. Тестирование и проверка (без бэкенда)

- **Vitest (TDD)** — `filter-rows.spec.ts` (клиентский поиск: подстрока, регистр, trim, пустой запрос) и `list-format.spec.ts` (баланс ru-RU, отрицательный, fallback на RUB, нечисловой вход; статус active/inactive). Тесты пишутся до реализации.
- **Customers `format.spec.ts`** — остаётся зелёным после ре-экспорта (регрессия общих форматтеров).
- **Storybook** — история `ListView` на мок-данных; проверка, что Customers V2 и Vendors V2 рендерятся в светлой теме.
- **Типы** — `pnpm --filter @bigfin/webapp typecheck` + `pnpm --filter @bigfin/server typecheck` (оба 0 ошибок).
- **Парность langs** — `pnpm --filter @bigfin/webapp lang:check` (exit 0).
- **Флаги off** — оба флага (`customers_list_v2`, `vendors_list_v2`) default off → маршруты `/customers` и `/vendors` рендерят легаси-списки; прод-поведение не меняется.
- Бэкенд/миграции/SDK не затронуты (кроме additive-регистрации флага) → серверные тесты не ломаются.

---

## 9. Риски и совместимость

- **Рефактор Customers V2:** код за флагом off, не в проде → нет пользовательского риска; страхуем тестами + Storybook + typecheck.
- **Изоляция стилей:** новый UI только внутри `.bigfin-ui` — Tailwind не «протекает» в Blueprint-области.
- **Сосуществование таблиц:** временно живут и легаси `DataTable`, и `ui/data-table`. Норма для Strangler Fig.
- **Без новых зависимостей:** переиспользуем `react-table` v7 → lockfile/`pnpm install` не трогаем.
- **Поля поставщика:** баланс `closing_balance`/`currency_code`, телефон `work_phone`. Если в API имена иные — правка в `columns.tsx` (1 место).
- **Маленькие шаги:** движок (чистые функции с тестами → ListView/контроллер) → рефактор Customers → адаптер Vendors → флаг/маршрут → приёмка. Каждый шаг проверяем и откатываем независимо.

---

## 10. Открытые вопросы

1. **Заголовок баланса для поставщиков:** легаси использует `receivable_balance` («Дебиторская задолженность»), что для поставщика семантически = кредиторская. Предложение: в этом срезе сохранить `receivable_balance` ради паритета с пилотом и легаси; корректный термин — отдельным срезом по всем спискам.
2. **Имя `new`-маршрута:** предполагается `/vendors/new` (как `/customers/new`). Подтвердить при реализации; если иное — правка в одном месте адаптера.
3. **Расположение движка:** `components/ui/list-view/` (рядом с примитивами). Альтернатива — `components/list-view/`. Предложение: `components/ui/list-view/` для единства с пилотными примитивами.
