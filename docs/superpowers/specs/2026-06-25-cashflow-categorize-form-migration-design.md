# Миграция формы категоризации транзакции на D-redesign (слайс 1 «Денежного потока»)

**Дата:** 2026-06-25
**Ветка:** `feat/d-redesign-cashflow-categorize-form`
**Статус:** дизайн одобрен, спек на ревью

## Контекст

Вебапп Bigfin переходит с легаси-стека (Blueprint.js + Formik + Yup) на новую
дизайн-систему D-redesign (Radix/shadcn-примитивы в `components/ui/` + React Hook
Form + Zod). Авторизация и экран «Сводка» уже мигрированы. Остаётся ~120 легаси-файлов.

Это **первый под-проект** программы миграции. Цель — не только мигрировать один
экран, но и задать **эталонный шаблон** перехода «Formik+Yup → RHF+Zod» внутри
дровера/панели, который потом переиспользуют десятки других форм.

Область «Денежный поток» (`containers/CashFlow/`) выбрана основателем как
ежедневно используемая (dogfooding). Внутри неё первым слайсом выбрана **форма
категоризации транзакции** — самое частое ежедневное действие, самоизолированное,
с максимальным рычагом переиспользования.

## Что строим и границы слайса

Новая форма категоризации банковской транзакции на стеке D-redesign:
- движок формы — React Hook Form + Zod (вместо Formik + Yup);
- раскладка **в столбик** (подпись над полем), пары полей в ряд где уместно
  (вариант B, выбран основателем) — согласуется с авторизацией и «Сводкой»,
  лучше на мобильном;
- примитивы из `components/ui/`;
- покрываем **все 6 типов операций** (приход: прочий доход / вклад собственника /
  перевод; расход: прочий расход / изъятие / перевод) — они делят одну оболочку
  и отличаются лишь набором полей, половинчатая форма путала бы пользователя.

### Не входит (явно, для маленького слайса)
- Вкладка «Сопоставление со счётом/актом» (③ matching/reconcile aside).
- Список транзакций (① таблица, панель действий, вкладки).
- Диалоги ручного ввода Money In / Money Out.
- Построение нового универсального searchable-дропдауна (отложено: в этом слайсе
  переиспользуем существующие селекты — «маленький шаг», выбор основателя).

Каждый пункт — отдельный будущий слайс.

## Архитектура: параллельный безопасный режим

Раскатка выбрана **безопасной/параллельной** (как прецедент `CustomersLandingV2`):
новые файлы создаются рядом со старыми, старый код **не правится**, кроме одной
строки-переключателя. В вебаппе нет системы фич-флагов, поэтому безопасность
обеспечивается параллельным компонентом + мгновенным откатом на одну строку.

### Новые файлы
Каталог: `containers/CashFlow/CategorizeTransaction/drawers/CategorizeTransactionDrawer/v2/`
(точное размещение уточняется на этапе плана)

| Файл | Роль |
|---|---|
| `CategorizeTransactionContentV2.tsx` | Оболочка контента: бутстрап данных через `useCategorizeTransactionBoot` |
| `CategorizeTransactionFormV2.tsx` | RHF-форма (`useForm` + `zodResolver`) + обработчик сабмита |
| `categorize-transaction.schema.ts` | Zod-схема (перенос правил из старой Yup-схемы) |
| `fields/` (подкаталог) | Наборы полей под 6 типов операций, раскладка в столбик |
| `ControlledAccountsSelect.tsx` | Тонкий контролируемый адаптер над существующим `AccountsSelect` (value/onChange для RHF `Controller`) |
| `components/ui/textarea.tsx` | Недостающий примитив (поле «Описание») |

### Переиспользуем без изменений
- `useCategorizeTransaction` (`hooks/query/cashflowAccounts.tsx`) — мутация сохранения.
- `useCategorizeTransactionBoot` — данные (счета, контрагенты, автозаполнение).
- `ContactSelectField` (`components/Contacts/ContactSelectField.tsx`) — **уже
  контролируемый** (`selectedContactId` + `onContactSelected`), встаёт в RHF
  `Controller` без переделок.
- `tranformToRequest` и `useCategorizeTransactionFormInitialValues` (`_utils.ts`).
- Логика «создать контрагента из выписки» (имя + ИНН → клиент/поставщик).
- Redux-экшены `withBankingActions` (`closeMatchingTransactionAside`).
- `useCategorizeTransactionTabsBoot` (`uncategorizedTransactionIds`).

### Точка переключения (1 строка)
Контент формы используется в двух оболочках:
1. Standalone-дровер `CategorizeTransactionDrawer` (зарегистрирован в
   `components/DrawersContainer.tsx:77` как `DRAWERS.CATEGORIZE_TRANSACTION`).
2. **Правая панель** при выборе транзакции в списке —
   `CategorizeTransactionAside` → `CategorizeTransactionTabs.tsx:21`, вкладка
   «Категоризировать». **Это основной ежедневный путь.**

Переключение: в `CategorizeTransactionTabs.tsx:21` заменить
`<CategorizeTransactionContent />` на `<CategorizeTransactionContentV2 />`
(и при желании — импорт в дровере). Откат — вернуть строку.

## Детали полей формы

Общие поля (всегда):
- **Сумма** — только показ (`formattedAmount`), не редактируется.
- **Категория** (`transactionType`) — select из фиксированного списка
  (приход/расход), переключает подтиповые поля. Примитив `ui/select.tsx` + RHF.
- **Контрагент** (`contactId`) — `ContactSelectField` в `Controller` + кнопка
  «создать контрагента» (видна при наличии ИНН и имени из выписки).
- Подсказка «предложено по контрагенту» (`suggestedByContact`).

Подтиповые поля (пример «Прочий расход»):
- **Дата** (`date`) — `ui/date-picker.tsx` + RHF.
- **Счёт оплаты** (`debitAccountId`) — `ControlledAccountsSelect`, disabled (счёт банка).
- **Счёт расхода** (`creditAccountId`) — `ControlledAccountsSelect`, фильтр по
  корневому типу (`expense`), с созданием на лету.
- **Номер документа** (`referenceNo`) — `ui/input.tsx`.
- **Описание** (`description`) — `ui/textarea.tsx`.
- **Подразделение** (`branchId`) — условное поле для мультифилиальных организаций.

Остальные 5 подтипов — аналогичный набор с вариациями счетов/полей (перенос 1:1 из
существующих `MoneyIn/*` и `MoneyOut/*` компонентов).

## Валидация (Zod, перенос из Yup)
- `amount` — required.
- `exchangeRate` — required.
- `transactionType` — required.
- `date` — required.
- `creditAccountId` — required.
- `referenceNo` — optional.
- `description` — optional.
- `contactId` — nullable / optional.

## Поведение — без изменений бизнес-логики
Сабмит, тосты успеха/ошибки, создание контрагента, обработка серверной ошибки
`BRANCH_ID_REQUIRED` (подсветка поля «Подразделение»), закрытие панели после
сохранения — ведут себя ровно как сейчас. Меняется только внешний вид и движок
формы, не логика и не API.

## Безопасность и откат
- Старая форма (`CategorizeTransactionContent` и её дерево) остаётся в коде.
- Откат — одна строка в `CategorizeTransactionTabs.tsx`.
- Нет миграций БД, нет изменений серверного API, нет изменений хуков данных.

## Проверка
- `pnpm typecheck` (3 пакета) — зелёный.
- `node packages/webapp/scripts/lang-check.js` — если добавляются/меняются строки
  (новые ключи правятся парно EN+RU).
- Локальный запуск стека (docker: mariadb+redis, API:3000, webapp:4000) и
  визуальная проверка дровера на реальной транзакции — все 6 типов сохраняются.
- Новые файлы пишутся **строго типизированно, без `// @ts-nocheck`** (старые
  легаси-файлы были `@ts-nocheck`; новые не наследуют это).

## Риски и допущения
- `AccountsSelect` завязан на Formik через `FSelect`; адаптер `ControlledAccountsSelect`
  должен переиспользовать рендереры/предикат/`usePreprocessingAccounts` — возможно,
  потребуется экспортировать локальные рендереры из `AccountsSelect.tsx`
  (небольшая правка, но затрагивает старый файл — допустимо, т.к. аддитивно).
- Точное местоположение standalone-дровера в потоке открытия (`openDrawer(
  DRAWERS.CATEGORIZE_TRANSACTION)`) уточнить на этапе плана; основной путь —
  через aside-вкладку, он первичен.
- `ui/textarea.tsx` отсутствует — добавляется как новый примитив (тривиальный shadcn).
