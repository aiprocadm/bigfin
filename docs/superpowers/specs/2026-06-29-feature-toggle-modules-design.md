# Дизайн: страница «Модули» — пользовательский тумблер фич

**Дата:** 2026-06-29
**Тип:** Design (спецификация под-проекта «Пути к запуску»)
**Статус:** одобрено основателем 2026-06-29
**Контекст:** roadmap v5 [2026-06-29-roadmap-actualization-v5.md](2026-06-29-roadmap-actualization-v5.md) выявил: 23 модуля собраны в коде, но скрыты за feature-флагами `default off`, и **способа их включить нет** — ни UI, ни API. Это первый под-проект фазы «Путь к запуску».
**Карта кода:** получена workflow-разведкой (6 параллельных читателей + синтез) 2026-06-29.

---

## 1. Цель

Дать владельцу организации страницу **Настройки → Модули**, где он переключателями включает/выключает готовые модули продукта. Включение делает модуль видимым (сайдбар + маршруты), выключение — прячет, **сохраняя данные**.

Аудитория — непрофи-предприниматель. Поэтому: показываем только осмысленные «модули» (не технические флаги), натуральные русские названия, безопасные действия (выключение обратимо).

---

## 2. Ключевые факты из кода (что определяет дизайн)

1. **БЛОКЕР (чинить первым).** `packages/server/src/modules/Features/FeaturesSettingsDriver.ts` — методы `turnOn()` (~стр. 26) и `turnOff()` (~стр. 37) вызывают `settingsStore.set(...)`, но **не** `settingsStore.save()`. Значит, включение флага через `FeaturesManager` сейчас — **молчаливый no-op** (живёт в памяти запроса и теряется). Без фикса любой тумблер бесполезен.
2. **Путь чтения фич (единственный источник истины):** `GET /dashboard/boot` → `DashboardService.getBootMeta()` → `FeaturesManager.all()` → webapp `useDashboardMeta()` (`packages/webapp/src/hooks/query/users.tsx`, ключ React Query `'DASHBOARD_META'`) → Redux `state.dashboard.features` `{key: boolean}`. Рантайм-гейтинг читает Redux через `useFeatureCan()` / `withFeatureCan`.
3. **Обновление UI после переключения:** сбросить кэш **`DASHBOARD_META`** (НЕ `'SETTING'`) — `queryClient.invalidateQueries(t.DASHBOARD_META)`. Тогда `/dashboard/boot` перечитывается, Redux-фичи перезаписываются, сайдбар и гарды ре-рендерятся **без перезагрузки**. Паттерн уже используется в `hooks/query/warehouses.tsx` и `branches.tsx`.
4. **Канонический список флагов** — серверный enum `packages/server/src/common/types/Features.ts` (33 флага, все `defaultValue:false`, кроме `BankSyncing` = `config.bankfeed.enabled`). Фронтовый `constants/features.tsx` **неполный** — строить список тумблеров надо от серверного enum + белого списка.
5. **Зона Настроек — легаси Blueprint** (`// @ts-nocheck`). Лучший шаблон для клона — `packages/webapp/src/containers/Preferences/InterfaceMode/InterfaceModePage.tsx` (самодостаточная страница, без Formik). shadcn-`Switch` отсутствует, `@radix-ui/react-switch` не установлен → строить на D-редизайне = новый пакет + `pnpm install` (риск на Windows, CLAUDE.md). **Используем Blueprint `Switch`.**

---

## 3. Архитектура — 3 маленьких шага

### Шаг 0 — фикс блокера (сервер, 1 строка + тест)

В `FeaturesSettingsDriver.ts` добавить `await settingsStore.save();` после `.set(...)` в **обоих** методах `turnOn()` и `turnOff()`. Стор уже `await this.settings()` (фабрика делает `load()`), `save()` легален.

- **Тест:** Jest-спека (по образцу `FeaturesConfigure.*.spec.ts`): после `turnOn(feature)` строка переживает свежую загрузку стора.
- **Осторожно:** меняет поведение любого существующего программного вызова `FeaturesManager.turnOn/turnOff`. Перед правкой — показать диф основателю и проверить, что ни один текущий вызов не полагался на no-op (по карте — таких нет, но подтвердить).

### Шаг 1 — сервер: контроллер `/features`

Новый файл `packages/server/src/modules/Features/Features.controller.ts`:

```
@Controller('features')
@ApiTags('features')
@UseGuards(AuthorizationGuard, PermissionGuard)   // AuthorizationGuard ПЕРВЫМ (кладёт request.ability)
class FeaturesController {
  @Get()  all()                                    // чтение состояния, без @RequirePermission (как getSettings)
  @Post(':feature/turn-on')  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @Post(':feature/turn-off') @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
}
```

- `turn-on/turn-off`: сначала валидировать `:feature` против **`MODULE_ALLOWLIST`** (константа — подмножество enum, см. §5), иначе `BadRequest`; затем `featuresManager.turnOn/turnOff(feature)`.
- Зарегистрировать `controllers: [FeaturesController]` в `Features.module.ts`. `FeaturesManager` уже провайдер; `SETTINGS_PROVIDER` и `TENANCY_DB_CONNECTION` — `@Global`. Но для `AuthorizationGuard` нужно дотянуть его зависимости (`TenantUser` модель + `ClsService`) — скопировать импорты из `Settings.module.ts`.
- **Тенант-скоуп автоматический:** `MixedAuthGuard` (JWT) + `TenancyGlobalGuard` — глобальные `APP_GUARD`; `organizationId` кладётся в CLS из заголовка `organization-id` middleware'ом `ClsModule` (`App.module.ts` ~стр. 206). Флаги тенант-скоупные (`bigfin_tenant_${organizationId}`) → тумблеры **по умолчанию пер-организация**.
- **КРИТИЧНО:** `@RequirePermission` обязателен — `PermissionGuard` пропускает (ALLOW), если метаданных прав нет. Без декоратора эндпоинт открыт любому авторизованному участнику орг. Фронтовый `<Can>` — косметика; серверный декоратор — настоящая граница.

### Шаг 2 — фронт: страница «Модули»

- **Страница:** `packages/webapp/src/containers/Preferences/Modules/ModulesPage.tsx` — клон `InterfaceModePage.tsx` (оставить `// @ts-nocheck`, легаси-стиль зоны). Курированный массив `MODULE_TOGGLES` (`{ feature, groupKey, labelKey, descKey }`) от ключей серверного enum (§5), рендер Blueprint `<Switch>` по группам.
  - Состояние: `const { featureCan } = useFeatureCan(); checked={featureCan(feature)}`.
  - Запись: новый react-query мутационный хук `packages/webapp/src/hooks/query/features.tsx`, `POST /features/:feature/turn-on|turn-off`. **Немедленное сохранение по каждому переключателю** (не батч), переключатель `disabled` пока запрос в полёте.
- **Обновление (несущая деталь):** в `onSuccess` мутации — `queryClient.invalidateQueries(t.DASHBOARD_META)` (`t` из `@/hooks/query/types`). Это перечитывает `/dashboard/boot`, его `onSuccess` (`users.tsx` ~стр. 184) ре-диспатчит `setFeatureDashboardMeta`, перезаписывает Redux `state.dashboard.features`, ре-рендерит все `useFeatureCan`/`withFeatureCan` (сайдбар, гарды) **без перезагрузки**. НЕ полагаться на `'SETTING'`.
- **Маршрут:** в `getPreferenceRoutes()` (`routes/preferences.tsx`) **выше** хвостового catch-all `${BASE_URL}/`: `{ path: '${BASE_URL}/modules', component: lazy(() => import('@/containers/Preferences/Modules/ModulesPage')), exact: true }`.
- **Пункт меню:** в `PreferencesMenu` (`constants/preferencesMenu.tsx`): `{ text: <T id='preferences.modules.menu'/>, href: '/preferences/modules', permission: { subject: AbilitySubject.Preferences, ability: PreferencesAbility.Mutate } }` (скрывает у не-админов через `useAbilitiesFilter`).
- `PreferencesPage`/`Sidebar`/`ContentRoute` править НЕ нужно (они data-driven).

---

## 4. Список модулей и курация

**Показываем (25 модулей, 5 групп):**

| Группа (`modules.group.*`) | Флаги (ключи enum) |
|---|---|
| **Планирование** | `payment_calendar`, `budgets`, `financial_model` |
| **Учёт и аналитика** | `mgmt_articles`, `deals`, `cost_allocation`, `debts`, `payment_requests`, `dividends`, `credits`, `fixed_assets`, `payroll`, `vat_analysis`, `financial_ratios`, `data_quality` |
| **Интеграции** | `bank_api_sync`, `acquiring`, `zenmoney_import`, `onec_export`, `moysklad`, `marketplaces`, `crm_integration` |
| **Структура** | `branches`, `warehouses` |
| **Прочее** | `notifications` |

RU-метки (`modules.<flag>.label`): Платёжный календарь · Бюджеты · Финансовая модель · Управленческие статьи · Сделки · Распределение затрат · Долги · Заявки на оплату · Дивиденды · Кредиты и займы · Основные средства · Зарплата · Анализ НДС · Финансовые показатели · Качество данных · Банковские API · Эквайринг · Импорт из Дзенмани · Выгрузка в 1С · МойСклад · Маркетплейсы · CRM (Битрикс24) · Филиалы · Склады · Уведомления.

**Скрываем (8 технических флагов — НЕ в `MODULE_ALLOWLIST`):**
`customers_list_v2`, `vendors_list_v2` (Strangler-Fig: подмена реализации одного экрана — показ позволит «сломать» экран), `interface_modes` (мета-флаг режима бизнес/бухгалтер — управляется отдельной страницей), `accrual_pnl` (внутри-экранный тумблер кассовый/начисление в ОПиУ, не модуль), `payroll_kpi` (под-функция Зарплаты), `deal_stages` (под-функция Сделок), `bank_statement_import` (низкоуровневая возможность импорта), `bank_syncing` (зависит от серверного `config.bankfeed.enabled`).

25 показываем + 8 скрываем = 33 (весь enum).

---

## 5. Права доступа

Переиспользуем существующий субъект **`Preferences`** (новый не вводим в v1).

- **Сервер:** `@UseGuards(AuthorizationGuard, PermissionGuard)` на классе + `@RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)` на `turn-on`/`turn-off`. `GET /features` — без гейта (как `getSettings`), чтобы не-админы видели текущее состояние.
- **Фронт:** контролы под `<Can I={PreferencesAbility.Mutate} a={AbilitySubject.Preferences}>`; пункт меню — с `permission`. Строки субъекта/действия уже совпадают в сервере (`Roles.types.ts` / `Settings.types.ts`) и вебаппе (`constants/abilityOption.tsx`) — новых констант не нужно.
- Предопределённая роль `admin` (`role.slug==='admin'`) авто-получает `manage:all` → админ работает без донастройки.
- Примечание: `ABILITIES_CACHE` в `Authorization.guard.ts` кэширует по `userId` — при тесте свежевыданного права возможна устарелость до вытеснения/рестарта.

---

## 6. Поведение

- **Включение** → `turn-on` → флаг сохранён в БД орг → `DASHBOARD_META` сброшен → модуль появился в сайдбаре сразу.
- **Выключение** → `turn-off` → экран спрятан из сайдбара/маршрутов, **данные сохранены** (hide-not-delete). Включил обратно — всё на месте. Без диалогов подтверждения (v1).
- **Подпись на странице:** «Режим интерфейса (бизнес/бухгалтер) скрывает бухгалтерские экраны и настраивается отдельно» — две независимые оси видимости (модуль вкл/выкл vs режим интерфейса).

---

## 7. i18n

Парные EN+RU ключи (скилл `i18n-add-string`, затем `node packages/webapp/scripts/lang-check.js`):
- `preferences.modules.menu`, `preferences.modules.title`, `preferences.modules.description`, `preferences.modules.note_interface_mode`, `preferences.modules.saved`, `preferences.modules.save_failed`
- `modules.group.planning|accounting|integrations|structure|other`
- `modules.<flag>.label` и `modules.<flag>.desc` для 25 флагов.

Натуральный русский (CLAUDE.md): журнал/проводка/контрагент, без калек.

---

## 8. Анти-скоуп (НЕ входит в v1)

- Вложенные под-переключатели (`payroll_kpi` в Зарплате, `deal_stages` в Сделках, `accrual_pnl` в ОПиУ) — позже, с правилами «родитель выкл → дети выкл».
- Мастер-выбор модулей в онбординге новой орг.
- Глобальные (инстанс-уровневые) флаги поверх пер-орг.
- Диалоги подтверждения при выключении модуля с данными.
- Отдельный субъект прав `FeatureToggle` (независимый от прочих настроек) — только если понадобится не-владельческая роль «может тумблить модули, но не другие настройки».
- Перестройка страницы на shadcn/D-редизайн (нужен новый пакет + `pnpm install`).

---

## 9. Тестирование и приёмка

- **Сервер:** Jest-спека на фикс `save()` (флаг переживает перезагрузку стора); спека `FeaturesController` (белый список отвергает чужой ключ → `BadRequest`; `turn-on` без права → `403`/`401`; с правом → флаг сохранён).
- **Проверки:** `pnpm typecheck` · `pnpm --filter @bigfin/server test` · `node packages/webapp/scripts/lang-check.js`.
- **Приёмка вживую (`run-bigfin`):** открыть Настройки → Модули → включить «Сделки» → пункт «Сделки» появился в сайдбаре **без перезагрузки**; выключить → исчез, при повторном включении данные на месте.

---

## 10. Pre-flight / правила

- Маленькие шаги: Шаг 0 → Шаг 1 → Шаг 2, пауза и ревью после каждого. Перед правкой существующего файла — показать фрагмент.
- Миграций нет (флаги — строки в существующей таблице `SETTINGS`). Additive.
- Бренд — только `Bigfin`. Все строки экрана — через `intl.get` / `<T>`.
- Откат каждого шага — `git checkout` затронутых файлов.

---

## 11. Следующий шаг

После одобрения этой спеки — `superpowers:writing-plans`: детальный план PR-за-PR (Шаг 0 → 1 → 2) с конкретными файлами, командами проверки и инструкциями отката.
