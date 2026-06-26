# Миграция таблицы «Все транзакции» на D-redesign (слайс 2 «Денежного потока»)

**Дата:** 2026-06-26
**Ветка:** `feat/d-redesign-cashflow-transactions-table`
**Статус:** дизайн одобрен, спек на ревью

## Контекст

Второй под-проект программы миграции вебаппа на D-redesign (см. эталонный паттерн:
`docs/superpowers/specs/2026-06-25-cashflow-categorize-form-migration-design.md`).
Слайс 1 (форма категоризации) влит в develop (PR #115).

Экран «Движение по счёту» (`containers/CashFlow/AccountTransactions/`) — ~2500 строк,
тесно сросшихся с Blueprint. Он разбит на под-слайсы: ① таблица/каркас, панель действий,
фильтр дат, подвкладки «без категории». **Этот слайс берёт таблицу вкладки «Все
транзакции»** — самую видимую часть экрана.

Выбран движок: **новый примитив `components/ui/data-table.tsx`** (TanStack react-table),
а не перекраска легаси-таблицы (решение основателя). Это настоящая миграция к
дизайн-системе; второстепенные функции (ресайз колонок, виртуализация) отложены.

## Что строим и границы

Перевод таблицы вкладки «Все» с легаси-`DataTable` (кастомный Blueprint-движок:
react-window виртуализация, ресайз, контекстное меню) на `components/ui/data-table.tsx`.
Параллельный V2-компонент + переключение одной строкой.

### Не входит (явно)
- 4 другие таблицы вкладки «без категории» (uncategorized / recognized / excluded /
  pending) — отдельные слайсы.
- Каркас страницы, бар балансов, фильтр-вкладки, панель действий, фильтр дат.
- Виртуализация строк и ресайз колонок (см. «Отложено»).

## Архитектура: параллельный безопасный режим

Как в слайсе 1: новые файлы рядом со старыми, старый код не правится (кроме одной
строки-переключателя). Системы фич-флагов нет — безопасность даёт параллельный
компонент + мгновенный откат.

### Новые файлы
Каталог: `containers/CashFlow/AccountTransactions/v2/`

| Файл | Роль |
|---|---|
| `AccountTransactionsDataTableV2.tsx` | Обёртка: данные из `useAccountTransactionsAllContext`, выбор→Redux, клик→дровер, рендер `<DataTable>` + колонка-действий |
| `useAccountTransactionsColumnsV2.tsx` | 8 колонок под примитив (intl-заголовки, деньги вправо, статус-Badge, кебаб-меню) |
| `TransactionStatusBadge.tsx` | Статус транзакции → `Badge` нужного варианта |

### Правка общего примитива (аддитивно)
- `components/ui/badge.tsx` — добавить вариант `success` (зелёный). Аддитивно,
  не ломает существующие использования; пригодится другим экранам.

### Переиспользуем без изменений
- `AccountTransactionsAllProvider` / `useAccountTransactionsAllContext`
  (`AccountTransactionsAllBoot.tsx`) — **данные + бесконечная подгрузка**: провайдер
  сам рендерит `<IntersectionObserver>` после детей и зовёт `fetchNextPage`. При замене
  только таблицы подгрузка продолжает работать без переподключения.
- `AccountTransactionsProvider` — `scrollableRef`, `accountId`.
- `handleCashFlowTransactionType` (`./utils`) + `withDrawerActions` — клик строки → дровер.
- `withBankingActions` → `setCategorizedTransactionsSelected` — выбор строк в Redux.
- `useUncategorizeTransaction`, `useUnmatchMatchedUncategorizedTransaction` — действия строки.
- intl-ключи (все есть): `date`, `type`, `transaction_number`, `reference_no`, `status`,
  `banking.label.deposit`, `banking.label.withdrawal`, `banking.label.running_balance`.

### Точка переключения (1 строка)
`AccountsTransactionsAll.tsx:26` — заменить `<AccountTransactionsDataTable />` на
`<AccountTransactionsDataTableV2 />` (+ импорт). Старый файл остаётся, откат = вернуть строку.

## Колонки (8, react-table v7 shape, под `data-table.tsx`)

| id | Заголовок (intl) | accessor | Примечание |
|---|---|---|---|
| date | `date` | `formatted_date` | |
| type | `type` | `formatted_transaction_type` | |
| transaction_number | `transaction_number` | `transaction_number` | заменяет хардкод "Transaction #" |
| reference_number | `reference_no` | `reference_number` | заменяет хардкод "Ref.#" |
| status | `status` | функция → `<TransactionStatusBadge>` | заменяет хардкод "Status" |
| deposit | `banking.label.deposit` | `formatted_deposit` | `align:'right'` |
| withdrawal | `banking.label.withdrawal` | `formatted_withdrawal` | `align:'right'` |
| running_balance | `banking.label.running_balance` | `formatted_running_balance` | `align:'right'` |

Плюс колонка-действий (кебаб `dropdown-menu`): «Разкатегоризировать» (при
`status==='categorized'`), «Отвязать» (при `status==='matched'`) — переносит пункты
легаси `ActionsMenu` из правого клика в видимое меню.

Колонку выбора рисует сам примитив (`enableSelection`).

## Паритет поведения
- Те же 8 колонок и данные; денежные — вправо, `tabular-nums`.
- Статус: зелёный `Badge variant="success"` для `categorized`/`matched`,
  `secondary` (нейтральный) для `manual`/прочего — соответствует легаси `Tag`
  (`Intent.SUCCESS` / minimal).
- Клик по строке → детальный дровер (`handleCashFlowTransactionType`).
- Выбор строк (`getRowId` = `String(row.id)`) → маппинг выбранных строк в их
  `uncategorized_transaction_id` → `setCategorizedTransactionsSelected` (для массового
  «разкатегоризировать» в панели действий). Контролируемый выбор: `selectedIds`
  выводится из Redux, чтобы внешний сброс выбора отражался в таблице.
- Действия строки (разкатегоризировать/отвязать) с теми же тостами успеха/ошибки.
- Бесконечная подгрузка — без изменений (наблюдатель в провайдере).
- Пустое состояние — текущее сообщение «нет результатов».

## Отложено (следующие слайсы)
- **Виртуализация строк**: примитив рендерит все загруженные строки плоско. Для обычных
  объёмов (десятки-сотни) ок; для тысяч — добавить виртуализацию в `data-table.tsx`
  отдельным слайсом (вариант C из брейншторминга).
- **Ресайз колонок** (легаси `useMemorizedColumnsWidths`) — не переносим.

## Безопасность и откат
Старая таблица (`AccountTransactionsDataTable.tsx`) остаётся в дереве. Откат — одна
строка в `AccountsTransactionsAll.tsx`. Нет миграций БД, нет изменений API/хуков данных.

## Проверка
- `pnpm typecheck` (3 пакета).
- `node packages/webapp/scripts/lang-check.js` (новых ключей не ожидается).
- `pnpm --filter @bigfin/webapp exec vitest run` — юнит-тесты маппинга статуса в Badge-вариант
  и формы колонок (чистые функции).
- Живой прогон: рендер в новом стиле, подгрузка прокруткой, выбор + массовое
  «разкатегоризировать», клик→дровер, действия строки (разкатегоризировать/отвязать).
- Новые файлы — строго типизированы, без `// @ts-nocheck`.

## Риски и допущения
- **Без виртуализации** рост DOM при длинной прокрутке — приемлемо для обычных объёмов;
  отслеживать на больших счетах, при необходимости — слайс на виртуализацию примитива.
- **Контролируемый выбор**: нужно корректно сопоставить `row.id` ↔
  `uncategorized_transaction_id` (в Redux хранятся последние). Уточнить на этапе плана,
  что у всех строк вкладки «Все» есть стабильный `id`.
- **Badge `success`**: добавление варианта в общий примитив — проверить, что не
  конфликтует с токеном `--success`/классом `bg-success` (есть в системе, используется
  в форме категоризации).
