# Миграция 4 таблиц вкладки «без категории» на примитив `data-table.tsx` (D-redesign, слайс 4) — дизайн

> **Статус:** дизайн на ревью. Реализация — после одобрения основателя; стартует с под-слайса **4a (Pending)**.

## Контекст

Слайс 2 перенёс таблицу «Все транзакции» на новый примитив `components/ui/data-table.tsx` ([PR #116](https://github.com/aiprocadm/bigfin/pull/116)). Слайс 3 добавил в примитив виртуализацию строк и ресайз колонок за опциональными выключенными пропсами ([PR #118](https://github.com/aiprocadm/bigfin/pull/118)). Слайс 4 — применение этих способностей: перенос **4 таблиц вкладки «без категории»** «Денежного потока» на примитив.

Вкладка «без категории» (`AllTransactionsUncategorized.tsx`) переключает 4 под-таблицы по query-параметру `uncategorizedFilter`:

| Под-таблица | Легаси-компонент | Колонок | Взаимодействия | Сложность |
|---|---|---|---|---|
| **pending** | `PendingTransactions/PendingTransactionsTable.tsx` | 6 | нет (только показ) | простейшая |
| **excluded** | `ExcludedTransactions/ExcludedTransactionsTable.tsx` | 5 | мультивыбор + «Восстановить» | простая |
| **recognized** | `RecognizedTransactions/RecognizedTransactionsTable.tsx` | 7 | клик-категоризация + «Категоризировать»/«Исключить» + колонка «Распознано» | сложная |
| **all (uncategorized)** | `UncategorizedTransactions/AccountTransactionsUncategorizedTable.tsx` | 8 | двойной режим (одиночный/мультивыбор), чек-бокс include, статус, «Категоризировать»/«Исключить» | самая сложная |

Все 4 сейчас рендерятся через легаси-обёртку `components/BankAccountDataTable.tsx` (Blueprint `DataTable` + `TableVirtualizedListRows` поверх window-scroller страницы).

## Цель

Перенести 4 таблицы на примитив `components/ui/data-table.tsx` с **включённой виртуализацией** (и ресайзом колонок там, где он был в легаси), сохранив весь набор взаимодействий каждой таблицы. Слой данных (react-query/Redux/контексты) переиспользуется как есть — мигрирует только представление.

## Декомпозиция (по-слайсово, отдельный PR на каждый)

Слайс 4 слишком велик для одной единицы (одна uncategorized-таблица — двойной режим + include-чекбокс). Дроблю по возрастанию сложности:

- **4a — Pending** (этот дизайн детализирует): простейшая, без взаимодействий. Устанавливает паттерн V2 для семейства банковских таблиц с виртуализацией.
- **4b — Excluded**: добавляет мультивыбор + одиночное действие «Восстановить» + проводку персиста ширин колонок. Здесь же выносим общий билдер колонок (date/description/payee/deposit/withdrawal) — дубликат появляется на втором экране (YAGNI: не раньше).
- **4c — Recognized**: клик-категоризация + действия «Категоризировать»/«Исключить» + кастомная колонка «Распознано» (стрелка категория→счёт).
- **4d — Uncategorized**: двойной режим (одиночный клик / мультивыбор по флагу), колонка-чекбокс include, колонка статуса, действия.

Каждый под-слайс = свой план + свой PR. Этот документ задаёт общую стратегию и полный дизайн **4a**; уточнения для 4b–4d — в их планах.

---

## Архитектура (паттерн семейства, как в слайсе 2)

Для каждой таблицы — три части (зеркало слайса 2):

1. **`*DataTableV2.tsx`** — тонкий root-компонент: берёт данные из существующего контекста/хука, собирает колонки, рендерит `<DataTable virtualized .../>`. Оборачивается нужными HOC (`withBankingActions`, `withDrawerActions` и т.п. — теми же, что у легаси-аналога).
2. **`use*ColumnsV2.tsx`** — хук колонок в shape react-table v7 (`id`, `Header`, `accessor`, `align`, `disableSortBy`, `Cell`). Заголовки — через `intl.get(...)` (легаси-хардкод английского НЕ переносим).
3. **Переключение одной строкой** в точке рендера под-таблицы (`AllTransactionsUncategorized.tsx` `switch`-case) — импорт V2 + замена легаси-компонента. Откат = вернуть строку.

Системы фич-флагов в вебаппе нет; механизм — параллельный V2-компонент и переключение строкой (прецедент — `AccountTransactionsDataTableV2`).

### Модель прокрутки (важная развилка)

Легаси виртуализирует против **window-scroller страницы** (`windowScrollerProps.scrollElement = scrollableRef`). Примитив виртуализирует внутри **собственного бокса** (`maxBodyHeight` + `overflow-auto` + внутренний `onScroll`). Слайс 4 переходит на внутренний бокс таблицы: каждая таблица скроллится в своих пределах с липкой шапкой. Это слегка меняет UX прокрутки (таблица, а не вся страница). Согласование общей прокрутки страницы — задача слайса каркаса страницы (вне объёма). `maxBodyHeight` подбираем под вьюпорт (стартовое значение — дефолт примитива 480; финальную высоту калибруем при живом прогоне).

---

## Детальный дизайн под-слайса 4a — Pending

### Файлы

| Файл | Действие | Ответственность |
|---|---|---|
| `PendingTransactions/v2/PendingTransactionsDataTableV2.tsx` | создать | root-обёртка на примитиве |
| `PendingTransactions/v2/usePendingTransactionsColumnsV2.tsx` | создать | колонки под примитив (локализованные заголовки) |
| `PendingTransactions/PendingTransactions.tsx` | правка (1 строка) | переключить рендер на V2 |

(Папка `v2/` рядом с легаси — как `AccountTransactions/v2/`. Легаси-файлы не трогаем — мгновенный откат.)

### Поток данных

`PendingTransactionsDataTableV2` берёт `pendingTransactions`, `isPendingTransactionsLoading` из существующего `usePendingTransactionsContext()` (`PendingTransactionsTableBoot.tsx`) — без изменений в слое данных. Идентификатор строки — та же составная пара, что у слайса 2: `getRowId = (row) => `${row.reference_type}-${row.reference_id}`` (строки банковских транзакций не имеют собственного `id`; сервер использует эту пару как ключ).

### Колонки (6, заголовки локализованы)

| id | accessor | Header (i18n) | align |
|---|---|---|---|
| `date` | `formatted_date` | `intl.get('date')` | left |
| `description` | `description` | `intl.get('description')` *(ключ проверить/добавить)* | left |
| `payee` | `payee` | `intl.get('payee')` *(ключ проверить/добавить)* | left |
| `reference_number` | `reference_no` | `intl.get('reference_no')` | left |
| `deposit` | `formatted_deposit_amount` | `intl.get('banking.label.deposit')` | right |
| `withdrawal` | `formatted_withdrawal_amount` | `intl.get('banking.label.withdrawal')` | right |

Легаси-пропсы `width`/`clickable`/`textOverview`/`money`/`className` примитиву не нужны (это API старого `DataTable`); опускаем. `deposit`/`withdrawal` — `align: 'right'` (примитив сам даёт `tabular-nums` + `whitespace-nowrap`). Если ключей `description`/`payee` нет — добавляются парно EN+RU через скилл `i18n-add-string` (натуральный русский: «Описание», «Контрагент»).

### Рендер

```tsx
<DataTable
  columns={columns}
  data={pendingTransactions || []}
  getRowId={getRowId}
  loading={isPendingTransactionsLoading}
  virtualized
  emptyState={<...intl.get('...no pending...')...>}
/>
```

Без `enableSelection`, без `onRowClick`, без действий — паритет с легаси Pending (там их нет). `emptyState` — локализованная замена легаси-строки `'There is no pending transactions...'` (ключ проверить/добавить).

### Переключение

В `PendingTransactions.tsx` (или в `switch`-case `AllTransactionsUncategorized.tsx`, где монтируется pending) заменить рендер легаси `PendingTransactionsDataTable` на `PendingTransactionsDataTableV2`. Одна строка импорта + одна строка JSX.

### Тесты

В 4a нет чистой логики (только конфиг колонок + проводка данных) → новых vitest-тестов нет (как слайс 2 добавил spec только для `TransactionStatusBadge`, где была логика). Проверка — typecheck + живой прогон в браузере (стек поднимается скиллом `run-bigfin`; есть тестовый аккаунт).

### Гейты (4a)

- `pnpm --filter @bigfin/webapp typecheck` — чисто (полный `pnpm typecheck` на Windows медленный; server/sdk-ts слайс не трогает).
- `node packages/webapp/scripts/lang-check.js` — `EN === RU` (если добавляли ключи — парно).
- `pnpm --filter @bigfin/webapp exec vitest run` — прежние тесты зелёные.
- Живой прогон: вкладка «без категории» → под-вкладка Pending рендерит строки в новом стиле, виртуализация работает, шапка липкая.

### Откат (4a)

Вернуть одну строку переключения в точке рендера → мгновенный фолбэк на легаси. Новые файлы `v2/` остаются неиспользуемыми (или `git revert` коммита).

---

## i18n: связанный, но отдельный баг

`AccountTransactionsUncategorizeFilter.tsx` хардкодит англоязычные подписи вкладок-фильтров («All», «Recognized», «Excluded», «Pending») — это легаси-баг (нашли в слайсе 2). Он в навигации НАД таблицами, но не относится к миграции представления таблиц. **Не смешиваю** с 4a (правило «одно логическое изменение»). Вынесен отдельной задачей; чинить парными ключами EN+RU.

## Вне объёма (следующие слайсы)

- Каркас страницы вкладки «без категории»: бар балансов, фильтр-вкладки в новом стиле, панель массовых действий, фильтр дат, согласование общей прокрутки страницы.
- Замена «умных» Blueprint-селектов на нативные Radix-комбобоксы.
- Под-слайсы 4b–4c–4d детализируются в своих планах (общий билдер колонок выносится в 4b).

## Принятые решения

- **Дробление 4a→4d** по сложности, отдельный PR на под-слайс (паттерн «маленькие шаги»).
- **Внутренний скролл-бокс** таблицы вместо window-scroller страницы (примитивный путь виртуализации); общий скролл — в слайсе каркаса.
- **Локализация заголовков** при переносе (легаси-хардкод английского не тащим).
- **Общий билдер колонок** вводим в 4b (когда появляется дубликат), не в 4a (YAGNI).
