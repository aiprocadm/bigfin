# Страница «Модули» (тумблер фич) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать владельцу организации страницу Настройки → Модули с переключателями, которая включает/выключает 25 готовых модулей (флаги хранятся пер-тенант, выключение прячет экран, данные сохраняются).

**Architecture:** Чиним скрытый блокер (`FeaturesSettingsDriver` не сохраняет флаг) → добавляем серверный контроллер `/features` с белым списком и правом «Настройки» → строим фронт-страницу (клон легаси `InterfaceModePage`, Blueprint `Switch`), которая после переключения сбрасывает кэш `DASHBOARD_META`, и весь UI обновляется без перезагрузки.

**Tech Stack:** NestJS + Jest (server), React 18 + Blueprint + react-query + Redux (webapp), react-intl-universal (i18n).

Спека: [../specs/2026-06-29-feature-toggle-modules-design.md](../specs/2026-06-29-feature-toggle-modules-design.md).

**Отклонение от спеки (зафиксировано):** легаси-меню Настроек (`PreferencesSidebar`) не поддерживает фильтр по правам, поэтому пункт «Модули» показывается всем пользователям (как «Пользователи»/«Роли»). Границу доступа держит сервер (`@RequirePermission` на `turn-on`/`turn-off`). Ролевое скрытие пункта меню — в бэклоге.

---

## Шаг 0 — Фикс блокера: `FeaturesSettingsDriver` не сохраняет флаг

### Task 0: persist feature toggles

**Files:**
- Test: `packages/server/src/modules/Features/FeaturesSettingsDriver.spec.ts` (создать)
- Modify: `packages/server/src/modules/Features/FeaturesSettingsDriver.ts` (методы `turnOn` ~стр. 26, `turnOff` ~стр. 37)

- [ ] **Step 1: Написать падающий тест**

Создать `packages/server/src/modules/Features/FeaturesSettingsDriver.spec.ts`:

```ts
// © 2026 Bigfin
import { FeaturesSettingsDriver } from './FeaturesSettingsDriver';

describe('FeaturesSettingsDriver — persistence', () => {
  const makeDriver = () => {
    const set = jest.fn();
    const save = jest.fn().mockResolvedValue(undefined);
    const store = { set, save };
    // конструктор: (configure, featuresConfigure, settingsFactory)
    const driver = new FeaturesSettingsDriver(null as any, null as any, () => store as any);
    return { driver, set, save };
  };

  it('turnOn записывает флаг И сохраняет стор', async () => {
    const { driver, set, save } = makeDriver();
    await driver.turnOn('deals');
    expect(set).toHaveBeenCalledWith({ group: 'features', key: 'deals', value: true });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('turnOff сбрасывает флаг И сохраняет стор', async () => {
    const { driver, set, save } = makeDriver();
    await driver.turnOff('deals');
    expect(set).toHaveBeenCalledWith({ group: 'features', key: 'deals', value: false });
    expect(save).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Прогнать тест — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/Features/FeaturesSettingsDriver.spec.ts`
Expected: FAIL — `save` вызван 0 раз (метод сейчас не сохраняет).

- [ ] **Step 3: Показать основателю текущий код и внести правку**

Показать `turnOn`/`turnOff` (стр. 23–38) основателю (правило «показать до правки»). Затем в `packages/server/src/modules/Features/FeaturesSettingsDriver.ts`:

В `turnOn` после `settingsStore.set(...)` добавить `await settingsStore.save();`:

```ts
  async turnOn(feature: string) {
    const settingsStore = await this.settings();

    settingsStore.set({ group: 'features', key: feature, value: true });
    await settingsStore.save();
  }
```

В `turnOff` аналогично:

```ts
  async turnOff(feature: string) {
    const settingsStore = await this.settings();

    settingsStore.set({ group: 'features', key: feature, value: false });
    await settingsStore.save();
  }
```

- [ ] **Step 4: Прогнать тест — убедиться, что проходит**

Run: `pnpm --filter @bigfin/server test -- src/modules/Features/FeaturesSettingsDriver.spec.ts`
Expected: PASS (2 теста).

- [ ] **Step 5: Проверить, что никто не полагался на no-op**

Run: `git grep -n "featuresManager.turnOn\|featuresManager.turnOff\|\.turnOn(\|\.turnOff(" packages/server/src`
Expected: вызовы только внутри модуля Features (новый контроллер появится в Task 2). Если найдётся внешний вызов, опирающийся на «несохранение» — остановиться и обсудить с основателем.

- [ ] **Step 6: Коммит**

```bash
git add packages/server/src/modules/Features/FeaturesSettingsDriver.ts packages/server/src/modules/Features/FeaturesSettingsDriver.spec.ts
git commit -m "fix(server): сохранять feature-флаг при turnOn/turnOff (FeaturesSettingsDriver)"
```

Откат: `git revert HEAD` или `git checkout packages/server/src/modules/Features/FeaturesSettingsDriver.ts`.

---

## Шаг 1 — Сервер: контроллер `/features` с белым списком

### Task 1: MODULE_ALLOWLIST

**Files:**
- Create: `packages/server/src/modules/Features/Features.constants.ts`

- [ ] **Step 1: Создать константу белого списка**

```ts
// © 2026 Bigfin
import { Features } from '@/common/types/Features';

/**
 * Пользовательские продуктовые модули, переключаемые на странице Настройки → Модули.
 * Технические/под-флаги (customers_list_v2, vendors_list_v2, interface_modes, accrual_pnl,
 * payroll_kpi, deal_stages, bank_statement_import, BankSyncing) намеренно НЕ включены —
 * их переключение пользователем может сломать экран.
 */
export const MODULE_ALLOWLIST: string[] = [
  // Планирование
  Features.PAYMENT_CALENDAR, Features.BUDGETS, Features.FINANCIAL_MODEL,
  // Учёт и аналитика
  Features.MGMT_ARTICLES, Features.DEALS, Features.COST_ALLOCATION, Features.DEBTS,
  Features.PAYMENT_REQUESTS, Features.DIVIDENDS, Features.CREDITS, Features.FIXED_ASSETS,
  Features.PAYROLL, Features.VAT_ANALYSIS, Features.FINANCIAL_RATIOS, Features.DATA_QUALITY,
  // Интеграции
  Features.BANK_API_SYNC, Features.ACQUIRING, Features.ZENMONEY_IMPORT, Features.ONEC_EXPORT,
  Features.MOYSKLAD, Features.MARKETPLACES, Features.CRM_INTEGRATION,
  // Структура
  Features.BRANCHES, Features.WAREHOUSES,
  // Прочее
  Features.NOTIFICATIONS,
];
```

- [ ] **Step 2: Коммит**

```bash
git add packages/server/src/modules/Features/Features.constants.ts
git commit -m "feat(server): белый список переключаемых модулей (MODULE_ALLOWLIST)"
```

### Task 2: FeaturesController

**Files:**
- Test: `packages/server/src/modules/Features/Features.controller.spec.ts` (создать)
- Create: `packages/server/src/modules/Features/Features.controller.ts`
- Modify: `packages/server/src/modules/Features/Features.module.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `packages/server/src/modules/Features/Features.controller.spec.ts`:

```ts
// © 2026 Bigfin
import { BadRequestException } from '@nestjs/common';
import { FeaturesController } from './Features.controller';

describe('FeaturesController', () => {
  const makeCtrl = () => {
    const manager = {
      all: jest.fn().mockResolvedValue([{ name: 'deals', isAccessible: true, defaultAccessible: false }]),
      turnOn: jest.fn().mockResolvedValue(undefined),
      turnOff: jest.fn().mockResolvedValue(undefined),
    };
    return { ctrl: new FeaturesController(manager as any), manager };
  };

  it('all() возвращает список фич менеджера', async () => {
    const { ctrl, manager } = makeCtrl();
    const res = await ctrl.all();
    expect(manager.all).toHaveBeenCalled();
    expect(res).toEqual([{ name: 'deals', isAccessible: true, defaultAccessible: false }]);
  });

  it('turnOn разрешённого модуля вызывает manager.turnOn', async () => {
    const { ctrl, manager } = makeCtrl();
    await ctrl.turnOn('deals');
    expect(manager.turnOn).toHaveBeenCalledWith('deals');
  });

  it('turnOn технического флага отвергается (BadRequest)', async () => {
    const { ctrl, manager } = makeCtrl();
    await expect(ctrl.turnOn('customers_list_v2')).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.turnOn).not.toHaveBeenCalled();
  });

  it('turnOff неизвестного ключа отвергается (BadRequest)', async () => {
    const { ctrl, manager } = makeCtrl();
    await expect(ctrl.turnOff('nonsense')).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.turnOff).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Прогнать тест — убедиться, что падает**

Run: `pnpm --filter @bigfin/server test -- src/modules/Features/Features.controller.spec.ts`
Expected: FAIL — `Cannot find module './Features.controller'`.

- [ ] **Step 3: Создать контроллер**

`packages/server/src/modules/Features/Features.controller.ts`:

```ts
// © 2026 Bigfin
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FeaturesManager } from './FeaturesManager';
import { MODULE_ALLOWLIST } from './Features.constants';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { PreferencesAction } from '@/modules/Settings/Settings.types';

@Controller('features')
@ApiTags('features')
@UseGuards(AuthorizationGuard, PermissionGuard)
export class FeaturesController {
  constructor(private readonly featuresManager: FeaturesManager) {}

  @Get()
  @ApiOperation({ summary: 'Retrieves all features and their accessibility.' })
  async all() {
    return this.featuresManager.all();
  }

  @Post(':feature/turn-on')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Turns on the given module feature.' })
  async turnOn(@Param('feature') feature: string) {
    this.assertAllowed(feature);
    await this.featuresManager.turnOn(feature);
    return { feature, accessible: true };
  }

  @Post(':feature/turn-off')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Turns off the given module feature.' })
  async turnOff(@Param('feature') feature: string) {
    this.assertAllowed(feature);
    await this.featuresManager.turnOff(feature);
    return { feature, accessible: false };
  }

  private assertAllowed(feature: string) {
    if (!MODULE_ALLOWLIST.includes(feature)) {
      throw new BadRequestException(
        `Feature "${feature}" is not a toggleable module.`,
      );
    }
  }
}
```

- [ ] **Step 4: Зарегистрировать контроллер в модуле**

В `packages/server/src/modules/Features/Features.module.ts` добавить импорт и массив `controllers`:

```ts
import { Module } from '@nestjs/common';
import { FeaturesConfigureManager } from './FeaturesConfigureManager';
import { FeaturesManager } from './FeaturesManager';
import { FeaturesSettingsDriver } from './FeaturesSettingsDriver';
import { FeaturesConfigure } from './FeaturesConfigure';
import { FeaturesController } from './Features.controller';

@Module({
  providers: [
    FeaturesManager,
    FeaturesSettingsDriver,
    FeaturesConfigureManager,
    FeaturesConfigure,
  ],
  controllers: [FeaturesController],
  exports: [FeaturesManager],
})
export class FeaturesModule {}
```

> Примечание: `AuthorizationGuard`/`PermissionGuard` резолвят свои зависимости из глобальных провайдеров (Tenancy и Cls — `@Global`), как и в `Settings.module.ts`, где контроллер подключён без дополнительных импортов. Доп. wiring не нужен; корректность проверяется загрузкой сервера в Task 8.

- [ ] **Step 5: Прогнать тесты — убедиться, что проходят**

Run: `pnpm --filter @bigfin/server test -- src/modules/Features/Features.controller.spec.ts`
Expected: PASS (4 теста).

- [ ] **Step 6: Прогнать typecheck**

Run: `pnpm typecheck`
Expected: без ошибок.

- [ ] **Step 7: Коммит**

```bash
git add packages/server/src/modules/Features/Features.controller.ts packages/server/src/modules/Features/Features.controller.spec.ts packages/server/src/modules/Features/Features.module.ts
git commit -m "feat(server): эндпоинт /features (turn-on/off + all) с правом «Настройки» и белым списком"
```

Откат: `git revert HEAD`.

---

## Шаг 2 — Фронт: страница «Модули»

### Task 3: мутационный хук фич

**Files:**
- Create: `packages/webapp/src/hooks/query/features.tsx`

- [ ] **Step 1: Создать хук**

```tsx
// @ts-nocheck
import { useQueryClient, useMutation } from 'react-query';
import useApiRequest from '../useRequest';
import t from './types';

/** Включает модуль (feature) и обновляет состояние фич в дашборде. */
export function useTurnOnFeature(props) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((feature) => apiRequest.post(`features/${feature}/turn-on`), {
    onSuccess: () => {
      queryClient.invalidateQueries(t.DASHBOARD_META);
    },
    ...props,
  });
}

/** Выключает модуль (feature) и обновляет состояние фич в дашборде. */
export function useTurnOffFeature(props) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation((feature) => apiRequest.post(`features/${feature}/turn-off`), {
    onSuccess: () => {
      queryClient.invalidateQueries(t.DASHBOARD_META);
    },
    ...props,
  });
}
```

- [ ] **Step 2: Коммит**

```bash
git add packages/webapp/src/hooks/query/features.tsx
git commit -m "feat(webapp): хуки useTurnOnFeature/useTurnOffFeature (+ инвалидация DASHBOARD_META)"
```

### Task 4: страница ModulesPage

**Files:**
- Create: `packages/webapp/src/containers/Preferences/Modules/ModulesPage.tsx`

- [ ] **Step 1: Создать страницу (клон InterfaceModePage, Blueprint Switch)**

```tsx
// @ts-nocheck
import React, { useEffect } from 'react';
import intl from 'react-intl-universal';
import { Switch, Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { useFeatureCan } from '@/hooks/state/feature';
import { useTurnOnFeature, useTurnOffFeature } from '@/hooks/query/features';
import { compose } from '@/utils';

const MODULE_GROUPS = [
  { group: 'planning', features: ['payment_calendar', 'budgets', 'financial_model'] },
  {
    group: 'accounting',
    features: [
      'mgmt_articles', 'deals', 'cost_allocation', 'debts', 'payment_requests',
      'dividends', 'credits', 'fixed_assets', 'payroll', 'vat_analysis',
      'financial_ratios', 'data_quality',
    ],
  },
  {
    group: 'integrations',
    features: [
      'bank_api_sync', 'acquiring', 'zenmoney_import', 'onec_export',
      'moysklad', 'marketplaces', 'crm_integration',
    ],
  },
  { group: 'structure', features: ['branches', 'warehouses'] },
  { group: 'other', features: ['notifications'] },
];

function ModulesPage({ changePreferencesPageTitle }) {
  const { featureCan } = useFeatureCan();
  const { mutateAsync: turnOn, isLoading: turningOn } = useTurnOnFeature();
  const { mutateAsync: turnOff, isLoading: turningOff } = useTurnOffFeature();
  const busy = turningOn || turningOff;

  useEffect(() => {
    changePreferencesPageTitle(intl.get('preferences.modules.title'));
  }, [changePreferencesPageTitle]);

  const handleToggle = (feature, nextEnabled) => {
    const action = nextEnabled ? turnOn : turnOff;
    action(feature)
      .then(() => {
        AppToaster.show({
          message: intl.get('preferences.modules.saved'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(() => {
        AppToaster.show({
          message: intl.get('preferences.modules.save_failed'),
          intent: Intent.DANGER,
        });
      });
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <p>{intl.get('preferences.modules.description')}</p>
      <p style={{ color: '#5c7080' }}>
        {intl.get('preferences.modules.note_interface_mode')}
      </p>

      {MODULE_GROUPS.map(({ group, features }) => (
        <div key={group} style={{ marginBottom: 24 }}>
          <h4>{intl.get(`modules.group.${group}`)}</h4>
          {features.map((feature) => (
            <Switch
              key={feature}
              checked={featureCan(feature)}
              disabled={busy}
              labelElement={
                <span>
                  <strong>{intl.get(`modules.${feature}.label`)}</strong>
                  <span style={{ display: 'block', color: '#5c7080', fontSize: 12 }}>
                    {intl.get(`modules.${feature}.desc`)}
                  </span>
                </span>
              }
              onChange={(e) => handleToggle(feature, e.currentTarget.checked)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default compose(withDashboardActions)(ModulesPage);
```

- [ ] **Step 2: Коммит**

```bash
git add packages/webapp/src/containers/Preferences/Modules/ModulesPage.tsx
git commit -m "feat(webapp): страница «Модули» с переключателями фич (Blueprint)"
```

### Task 5: маршрут + пункт меню

**Files:**
- Modify: `packages/webapp/src/routes/preferences.tsx` (перед хвостовым `${BASE_URL}/`)
- Modify: `packages/webapp/src/constants/preferencesMenu.tsx`

- [ ] **Step 1: Добавить маршрут**

В `packages/webapp/src/routes/preferences.tsx`, ВЫШЕ записи `{ path: \`${BASE_URL}/\`, ... }` (она должна остаться последней) вставить:

```js
  {
    path: `${BASE_URL}/modules`,
    component: lazy(() => import('@/containers/Preferences/Modules/ModulesPage')),
    exact: true,
  },
```

- [ ] **Step 2: Добавить пункт меню**

В `packages/webapp/src/constants/preferencesMenu.tsx`, сразу после записи `interface_mode.menu`:

```jsx
  {
    text: <T id={'preferences.modules.menu'} />,
    href: '/preferences/modules',
  },
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: без ошибок (ключи i18n добавим в Task 6 — на typecheck не влияют, т.к. `intl.get` принимает строку).

- [ ] **Step 4: Коммит**

```bash
git add packages/webapp/src/routes/preferences.tsx packages/webapp/src/constants/preferencesMenu.tsx
git commit -m "feat(webapp): маршрут и пункт меню «Модули» в Настройках"
```

### Task 6: i18n-ключи EN + RU

**Files:**
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Добавить ключи парно (EN + RU)**

Использовать скилл `i18n-add-string` или добавить вручную. Полный набор (ключ · EN · RU):

Служебные:
| key | EN | RU |
|---|---|---|
| `preferences.modules.menu` | Modules | Модули |
| `preferences.modules.title` | Modules | Модули |
| `preferences.modules.description` | Turn product modules on or off for your organization. | Включайте и выключайте модули продукта для вашей организации. |
| `preferences.modules.note_interface_mode` | Interface mode (business/accountant) hides accounting screens and is configured separately. | Режим интерфейса (бизнес/бухгалтер) скрывает бухгалтерские экраны и настраивается отдельно. |
| `preferences.modules.saved` | Module updated | Модуль обновлён |
| `preferences.modules.save_failed` | Couldn't update the module | Не удалось обновить модуль |
| `modules.group.planning` | Planning | Планирование |
| `modules.group.accounting` | Accounting & analytics | Учёт и аналитика |
| `modules.group.integrations` | Integrations | Интеграции |
| `modules.group.structure` | Structure | Структура |
| `modules.group.other` | Other | Прочее |

Метки и описания модулей (`modules.<flag>.label` / `modules.<flag>.desc`):
| flag | label EN | label RU | desc EN | desc RU |
|---|---|---|---|---|
| payment_calendar | Payment calendar | Платёжный календарь | Cash balance forecast and cash-gap alerts | Прогноз остатка денег и кассовых разрывов |
| budgets | Budgets | Бюджеты | Cash-flow & P&L budgets, scenarios, plan vs actual | БДДС/БДиР, сценарии, план-факт |
| financial_model | Financial model | Финансовая модель | Unit economics: margin, LTV, CAC | Юнит-экономика: маржа, LTV, CAC |
| mgmt_articles | Management articles | Управленческие статьи | Article tree for management reports | Дерево статей учёта для отчётов |
| deals | Deals | Сделки | Profitability by project and client | Прибыльность по проектам и клиентам |
| cost_allocation | Cost allocation | Распределение затрат | Spread shared costs across deals | Разнос общих расходов по сделкам |
| debts | Debts | Долги | Receivables and payables, ageing | Дебиторка и кредиторка, старение |
| payment_requests | Payment requests | Заявки на оплату | Payment approval workflow | Согласование платежей |
| dividends | Dividends | Дивиденды | Owner payouts | Вывод средств собственнику |
| credits | Loans | Кредиты и займы | Schedules, principal and interest | Графики, тело и проценты |
| fixed_assets | Fixed assets | Основные средства | Register and depreciation | Учёт и амортизация |
| payroll | Payroll | Зарплата | Wages, taxes, payouts | ФОТ, налоги, выплаты |
| vat_analysis | VAT analysis | Анализ НДС | VAT charged, deductible, payable | НДС начислен, к вычету, к уплате |
| financial_ratios | Financial ratios | Финансовые показатели | Profitability, liquidity, leverage | Рентабельность, ликвидность, нагрузка |
| data_quality | Data quality | Качество данных | Unmapped operations, duplicates, mismatches | Операции без статьи, дубли, расхождения |
| bank_api_sync | Bank APIs | Банковские API | Auto-import bank statements | Автозагрузка выписки из банка |
| acquiring | Acquiring | Эквайринг | Import ЮKassa operations | Импорт операций ЮKassa |
| zenmoney_import | Zenmoney import | Импорт из Дзенмани | Import operations from Zenmoney | Загрузка операций из Дзенмани |
| onec_export | 1C export | Выгрузка в 1С | Export operations to 1C | Экспорт операций для 1С |
| moysklad | MoySklad | МойСклад | Sync goods and sales | Синхронизация товаров и продаж |
| marketplaces | Marketplaces | Маркетплейсы | Wildberries finances | Финансы Wildberries |
| crm_integration | CRM | CRM | Deals from Bitrix24 and amoCRM | Сделки из Битрикс24 и amoCRM |
| branches | Branches | Филиалы | Accounting by division | Учёт по подразделениям |
| warehouses | Warehouses | Склады | Multiple warehouses and transfers | Несколько складов и перемещения |
| notifications | Notifications | Уведомления | Alerts for cash gaps and overdue invoices | Оповещения о разрывах и просрочках |

- [ ] **Step 2: Проверить парность EN↔RU**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: 0 missing keys (парность соблюдена).

- [ ] **Step 3: Ревью RU-переводов**

Запустить сабагент `ru-translation-reviewer` на изменённые ключи `ru/index.json` (натуральность, термины, бренд). Поправить замечания, повторить `lang-check.js`.

- [ ] **Step 4: Коммит**

```bash
git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "i18n(webapp): строки страницы «Модули» (EN+RU)"
```

---

## Шаг 3 — Проверка и приёмка

### Task 7: статическая проверка

- [ ] **Step 1: Полный typecheck + серверные тесты + парность**

Run:
```bash
pnpm typecheck
pnpm --filter @bigfin/server test -- src/modules/Features
node packages/webapp/scripts/lang-check.js
```
Expected: typecheck без ошибок; тесты Features — PASS (Task 0: 2 + Task 2: 4 = 6); lang-check — 0 missing.

### Task 8: живая приёмка (run-bigfin)

- [ ] **Step 1: Поднять стек**

Через скилл `run-bigfin`: `start-local.ps1 -NoWebapp` + webapp через preview. Войти `founder@bigfin.local` / `Bigfin2026!dev`.

- [ ] **Step 2: Проверить страницу и тумблер**

Открыть `Настройки → Модули`. Выключить флаг `mgmt_articles`, ранее включённый напрямую в БД (`DELETE FROM SETTINGS WHERE \`group\`='features' AND \`key\`='mgmt_articles'` НЕ нужен — выключим тумблером). Включить «Сделки» (`deals`) переключателем.
Expected: тост «Модуль обновлён»; пункт «Сделки» появляется в сайдбаре **без перезагрузки**.

- [ ] **Step 3: Проверить выключение (данные целы)**

Выключить «Сделки» → пункт исчез из сайдбара. Включить снова → пункт вернулся (данные сделок, если были, на месте — hide-not-delete).

- [ ] **Step 4: Проверить границу прав (сервер)**

Дев-проверка: `POST /api/features/customers_list_v2/turn-on` (через консоль браузера с `Authorization: Bearer`) → `400 Bad Request` (не в белом списке).
Expected: технический флаг переключить нельзя.

- [ ] **Step 5: Финальный коммит-метка (если нужны мелкие правки приёмки)**

Если в ходе приёмки нашлись баги — править маленькими шагами с отдельными коммитами.

---

## Self-review (выполнено при написании плана)

**Покрытие спеки:** §3 Шаг 0 → Task 0; §3 Шаг 1 → Task 1–2; §3 Шаг 2 → Task 3–5; §4 список модулей → Task 1 (allowlist) + Task 4 (группы) + Task 6 (метки); §5 права → Task 2 (декоратор) + отклонение по меню задокументировано; §6 поведение (hide-not-delete, подпись) → Task 4 + Task 8; §7 i18n → Task 6; §9 тесты/приёмка → Task 0/2/7/8. Анти-скоуп §8 — соблюдён (нет под-переключателей, онбординга, shadcn, диалогов).

**Плейсхолдеры:** нет — весь код и значения i18n приведены.

**Согласованность типов:** ключи флагов одинаковы в `MODULE_ALLOWLIST` (enum-значения) и `MODULE_GROUPS`/i18n (строковые литералы, совпадают со значениями enum). Хуки `useTurnOnFeature/useTurnOffFeature` названы одинаково в Task 3 и используются в Task 4. Ключ кэша `t.DASHBOARD_META` совпадает с паттерном `warehouses.tsx`.

---

## Execution Handoff

После сохранения плана — выбор способа исполнения (см. навык). Рекомендация основателя: маленькие шаги с паузой после каждого Task и инструкцией отката.
