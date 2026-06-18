# Режимы интерфейса «Бизнес»/«Бухгалтер» (③ MVP) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить организационный режим `interface_mode` (business/accountant), который за feature-флагом `interface_modes` (default off) прячет на фронте 6 легаси-бухгалтерских экранов (меню + редирект с прямых ссылок).

**Architecture:** Поле `interface_mode` в `tenants_metadata` (system schema), отдаётся фронту через `GET /organization/current` (нормализация пусто→`business`), сохраняется через существующий `PUT /organization`. Фронт: единственная чистая функция решает «прятать ли», её используют предикат бокового меню и гард маршрутов. Всё под флагом `interface_modes` (мягкий гейт, только UI).

**Tech Stack:** NestJS + Objection/Knex (backend), React 18 + Redux + Blueprint (webapp), Jest, react-intl-universal.

**Spec:** `docs/superpowers/specs/2026-06-17-interface-modes-business-accountant-design.md`

---

## Окружение и грабли (прочесть до старта)

- Node **18.16.1** обязателен. В каждом терминале сначала:
  `export PATH="$HOME/AppData/Roaming/fnm/node-versions/v18.16.1/installation:$PATH"`
- Пакет-менеджер только `pnpm`. **Не** запускать `pnpm install`.
- **commitlint:** subject коммита — со строчной буквы (`feat:`, `docs:`), тело — **строки ≤100 символов**. Хук `commit-msg` обязателен, `--no-verify` не использовать.
- Миграции локально могут не прогнаться (нет БД) — прогон `latest→rollback→latest` на CI/staging. Обязателен рабочий `down()`.
- Команды приёмки: `pnpm --filter @bigfin/server test` · `pnpm typecheck` · `node packages/webapp/scripts/lang-check.js`.

## Карта файлов

**Backend (создать/изменить):**
- Изменить: `packages/server/src/common/types/Features.ts` — добавить `INTERFACE_MODES`.
- Изменить: `packages/server/src/modules/Features/FeaturesConfigure.ts` — запись флага.
- Создать: `packages/server/src/modules/Features/FeaturesConfigure.interface-modes.spec.ts`.
- Создать: `packages/server/src/database/system/migrations/<ts>_add_interface_mode_to_tenants_metadata.js`.
- Изменить: `packages/server/src/modules/System/models/TenantMetadataModel.ts` — свойство + jsonSchema.
- Изменить: `packages/server/src/modules/Organization/Organization.constants.ts` — `INTERFACE_MODES`.
- Изменить: `packages/server/src/modules/Organization/dtos/Organization.dto.ts` — поле `interfaceMode`.
- Изменить: `packages/server/src/modules/Organization/queries/GetCurrentOrganizationMetadata.transformer.ts` — нормализация.
- Создать: `packages/server/src/modules/Organization/queries/GetCurrentOrganizationMetadata.transformer.spec.ts`.

**Frontend (создать/изменить):**
- Изменить: `packages/webapp/src/constants/features.tsx` — `InterfaceModes`.
- Создать: `packages/webapp/src/constants/interfaceMode.ts` — константы + чистые функции.
- Создать: `packages/webapp/src/constants/interfaceMode.spec.ts`.
- Создать: `packages/webapp/src/hooks/state/interfaceMode.tsx` — `useInterfaceMode` + `useAccountantOnlyRouteGuard`.
- Изменить: `packages/webapp/src/constants/sidebarMenu.tsx` — `accountantOnly: true` на 6 пунктах.
- Изменить: `packages/webapp/src/containers/Dashboard/Sidebar/hooks.tsx` — предикат режима.
- Изменить: `packages/webapp/src/components/Dashboard/DashboardContentRoute.tsx` — смонтировать гард.
- Создать: `packages/webapp/src/containers/Preferences/InterfaceMode/InterfaceModePage.tsx` — переключатель.
- Изменить: `packages/webapp/src/routes/preferences.tsx` — маршрут страницы.
- Изменить: `packages/webapp/src/constants/preferencesMenu.tsx` — пункт меню.
- Изменить: `packages/webapp/src/lang/en/index.json` + `packages/webapp/src/lang/ru/index.json` — ключи `interface_mode.*`.

---

## Task 1: Feature-флаг `interface_modes` (backend)

**Files:**
- Modify: `packages/server/src/common/types/Features.ts`
- Modify: `packages/server/src/modules/Features/FeaturesConfigure.ts`
- Test: `packages/server/src/modules/Features/FeaturesConfigure.interface-modes.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `packages/server/src/modules/Features/FeaturesConfigure.interface-modes.spec.ts`:

```ts
// © 2026 Bigfin
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

describe('FeaturesConfigure — interface_modes', () => {
  it('флаг interface_modes присутствует и по умолчанию выключен', () => {
    const configure = new FeaturesConfigure({ get: () => undefined } as any);
    const entry = configure
      .getConfigure()
      .find((f) => f.name === Features.INTERFACE_MODES);
    expect(entry).toBeDefined();
    expect(entry.defaultValue).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `pnpm --filter @bigfin/server test -- FeaturesConfigure.interface-modes`
Expected: FAIL (`Features.INTERFACE_MODES` undefined / entry undefined).

- [ ] **Step 3: Добавить значение в enum**

В `packages/server/src/common/types/Features.ts`, в конец enum (после `NOTIFICATIONS = 'notifications',`):

```ts
  INTERFACE_MODES = 'interface_modes',
```

- [ ] **Step 4: Добавить запись в конфиг**

В `packages/server/src/modules/Features/FeaturesConfigure.ts`, в конец массива `getConfigure()` (после записи `NOTIFICATIONS`):

```ts
      {
        name: Features.INTERFACE_MODES,
        defaultValue: false,
      },
```

- [ ] **Step 5: Запустить тест — должен пройти**

Run: `pnpm --filter @bigfin/server test -- FeaturesConfigure.interface-modes`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/common/types/Features.ts packages/server/src/modules/Features/FeaturesConfigure.ts packages/server/src/modules/Features/FeaturesConfigure.interface-modes.spec.ts
git commit -m "feat(features): флаг interface_modes (default off)"
```

---

## Task 2: Миграция — колонка `interface_mode` (system)

**Files:**
- Create: `packages/server/src/database/system/migrations/<ts>_add_interface_mode_to_tenants_metadata.js`

- [ ] **Step 1: Создать миграцию через скилл make-migration**

Использовать скилл `make-migration` (схема **system**, имя `add_interface_mode_to_tenants_metadata`) для корректного timestamp. Заполнить файл:

```js
/**
 * Режим интерфейса организации (business/accountant) — хранится в системной
 * таблице tenants_metadata (одна строка на тенанта). UpdateOrganizationService
 * уже пишет сюда через tenantRepository.saveMetadata({ ...dto }) — нужна
 * только колонка. Пустое значение трактуется как 'business' при чтении.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table('tenants_metadata', (table) => {
    table.string('interface_mode', 20).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table('tenants_metadata', (table) => {
    table.dropColumn('interface_mode');
  });
};
```

- [ ] **Step 2: Проверить типы (миграция не ломает сборку)**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: PASS (миграции `.js` не типизируются, но сборка не должна падать).

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/database/system/migrations/
git commit -m "feat(db): колонка interface_mode в tenants_metadata (system)"
```

> Примечание: прогон `system:migrate:latest → rollback → latest` — на CI/staging (локально БД может отсутствовать). Отметить в описании PR.

---

## Task 3: Модель TenantMetadata — свойство и jsonSchema

**Files:**
- Modify: `packages/server/src/modules/System/models/TenantMetadataModel.ts`

- [ ] **Step 1: Добавить свойство класса**

В `TenantMetadataModel.ts`, после `public bankCorrespondentAccount!: string;` (строка ~33):

```ts

  // Режим интерфейса: 'business' | 'accountant' (пусто → business при чтении).
  public interfaceMode!: string;
```

- [ ] **Step 2: Добавить в jsonSchema**

В объект `properties` (после `bankCorrespondentAccount: { type: 'string', maxLength: 20 },`):

```ts
        interfaceMode: { type: 'string', maxLength: 20 },
```

- [ ] **Step 3: Проверить типы**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/modules/System/models/TenantMetadataModel.ts
git commit -m "feat(models): поле interfaceMode в TenantMetadata"
```

---

## Task 4: Константа режимов + поле DTO

**Files:**
- Modify: `packages/server/src/modules/Organization/Organization.constants.ts`
- Modify: `packages/server/src/modules/Organization/dtos/Organization.dto.ts`

- [ ] **Step 1: Добавить константу допустимых режимов**

В конец `packages/server/src/modules/Organization/Organization.constants.ts` добавить:

```ts
export const INTERFACE_MODES = ['business', 'accountant'] as const;
```

- [ ] **Step 2: Импортировать константу в DTO**

В `Organization.dto.ts` в импорте из `'../Organization.constants'` добавить `INTERFACE_MODES`:

```ts
import { ACCEPTED_LOCALES, DATE_FORMATS, INTERFACE_MODES } from '../Organization.constants';
```

- [ ] **Step 3: Добавить поле в `UpdateOrganizationDto`**

В классе `UpdateOrganizationDto`, перед закрывающей `}` класса, добавить:

```ts

  @IsOptional()
  @IsIn(INTERFACE_MODES)
  @ApiPropertyOptional({
    description: 'Interface mode: business (hides bookkeeping screens) or accountant',
    enum: INTERFACE_MODES,
    example: 'business',
  })
  interfaceMode?: string;
```

(`IsIn`, `IsOptional`, `ApiPropertyOptional` уже импортированы в файле.)

- [ ] **Step 4: Проверить типы**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Organization/Organization.constants.ts packages/server/src/modules/Organization/dtos/Organization.dto.ts
git commit -m "feat(organization): interfaceMode в update-dto с валидацией"
```

> Сохранение работает «бесплатно»: `UpdateOrganizationService.execute` → `tenantRepository.saveMetadata(tenant.id, dto)` патчит `interface_mode` в `tenants_metadata` (как RU-реквизиты). Правок сервиса не нужно.

---

## Task 5: Нормализация при чтении (transformer) + тест

**Files:**
- Modify: `packages/server/src/modules/Organization/queries/GetCurrentOrganizationMetadata.transformer.ts`
- Test: `packages/server/src/modules/Organization/queries/GetCurrentOrganizationMetadata.transformer.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `GetCurrentOrganizationMetadata.transformer.spec.ts`:

```ts
import { GetCurrentOrganizationMetadataTransformer } from './GetCurrentOrganizationMetadata.transformer';

function transform(metadata: Record<string, any>) {
  const t = new GetCurrentOrganizationMetadataTransformer();
  t.setOptions({});
  t.setContext({} as any);
  return t.work(metadata);
}

describe('GetCurrentOrganizationMetadataTransformer — interfaceMode', () => {
  it('пустой режим нормализуется в business', () => {
    expect(transform({ name: 'Acme' }).interfaceMode).toBe('business');
  });

  it('null нормализуется в business', () => {
    expect(transform({ interfaceMode: null }).interfaceMode).toBe('business');
  });

  it('accountant сохраняется', () => {
    expect(transform({ interfaceMode: 'accountant' }).interfaceMode).toBe(
      'accountant',
    );
  });

  it('любое чужое значение → business', () => {
    expect(transform({ interfaceMode: 'whatever' }).interfaceMode).toBe(
      'business',
    );
  });
});
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `pnpm --filter @bigfin/server test -- GetCurrentOrganizationMetadata.transformer`
Expected: FAIL (`interfaceMode` undefined в ответе).

- [ ] **Step 3: Реализовать нормализацию**

Заменить содержимое `GetCurrentOrganizationMetadata.transformer.ts` на:

```ts
import { Transformer } from '@/modules/Transformer/Transformer';

export class GetCurrentOrganizationMetadataTransformer extends Transformer {
  /**
   * Include these attributes in the metadata response.
   * @returns {string[]}
   */
  public includeAttributes = (): string[] => {
    return ['logoUri', 'interfaceMode'];
  };

  /**
   * Logo URI (presigned or public URL) for display.
   * Provided via options from the service after resolving logoKey.
   * @param metadata
   * @returns {string | null}
   */
  public logoUri = (metadata: Record<string, any>): string | null => {
    return this.options?.logoUri ?? null;
  };

  /**
   * Interface mode — normalizes empty/unknown value to 'business'.
   * Only 'accountant' stays accountant.
   * @param metadata
   * @returns {string}
   */
  public interfaceMode = (metadata: Record<string, any>): string => {
    return metadata?.interfaceMode === 'accountant' ? 'accountant' : 'business';
  };
}
```

(Базовый `Transformer.includeAttributesTransformed` делает `{ ...item, ...virtualAttrs }` — метод `interfaceMode` перекрывает сырое значение колонки.)

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `pnpm --filter @bigfin/server test -- GetCurrentOrganizationMetadata.transformer`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Organization/queries/GetCurrentOrganizationMetadata.transformer.ts packages/server/src/modules/Organization/queries/GetCurrentOrganizationMetadata.transformer.spec.ts
git commit -m "feat(organization): отдавать interfaceMode (пусто→business)"
```

---

## Task 6: Фронт — константы режима и чистые функции + тест

**Files:**
- Modify: `packages/webapp/src/constants/features.tsx`
- Create: `packages/webapp/src/constants/interfaceMode.ts`
- Test: `packages/webapp/src/constants/interfaceMode.spec.ts`

- [ ] **Step 1: Добавить фронт-флаг**

В `packages/webapp/src/constants/features.tsx`, в объект `Features` (после `Notifications: ...`):

```ts
  InterfaceModes: 'interface_modes',
```

- [ ] **Step 2: Написать падающий тест**

Создать `packages/webapp/src/constants/interfaceMode.spec.ts`:

```ts
import {
  INTERFACE_MODE,
  isAccountantOnlyHidden,
  isAccountantOnlyPath,
} from './interfaceMode';

describe('isAccountantOnlyHidden', () => {
  it('флаг выключен → не прячем', () => {
    expect(isAccountantOnlyHidden(INTERFACE_MODE.Business, false)).toBe(false);
  });
  it('флаг включён + режим business → прячем', () => {
    expect(isAccountantOnlyHidden(INTERFACE_MODE.Business, true)).toBe(true);
  });
  it('флаг включён + режим accountant → не прячем', () => {
    expect(isAccountantOnlyHidden(INTERFACE_MODE.Accountant, true)).toBe(false);
  });
});

describe('isAccountantOnlyPath', () => {
  it.each([
    '/manual-journals',
    '/manual-journals/import',
    '/manual-journals/5/edit',
    '/make-journal-entry',
    '/transactions-locking',
    '/financial-reports/general-ledger',
    '/financial-reports/trial-balance-sheet',
    '/financial-reports/journal-sheet',
  ])('accountant-only: %s', (p) => {
    expect(isAccountantOnlyPath(p)).toBe(true);
  });

  it.each([
    '/',
    '/invoices',
    '/financial-reports/balance-sheet',
    '/accounts',
    '/tax-rates',
  ])('обычный: %s', (p) => {
    expect(isAccountantOnlyPath(p)).toBe(false);
  });
});
```

- [ ] **Step 3: Запустить тест — должен упасть**

Run: `pnpm --filter @bigfin/webapp test -- interfaceMode`
Expected: FAIL (модуль не найден).

> Если у webapp нет jest-конфига для одиночного файла — запускать весь набор webapp-тестов командой из `package.json` webapp; ключевое — увидеть падение до реализации.

- [ ] **Step 4: Реализовать модуль**

Создать `packages/webapp/src/constants/interfaceMode.ts`:

```ts
export const INTERFACE_MODE = {
  Business: 'business',
  Accountant: 'accountant',
} as const;

export type InterfaceModeValue =
  (typeof INTERFACE_MODE)[keyof typeof INTERFACE_MODE];

/**
 * Базовые пути экранов, скрываемых в режиме «Бизнес»
 * (чисто-бухгалтерские: проводки, книги, ОСВ, закрытие периодов).
 */
export const ACCOUNTANT_ONLY_ROUTE_BASES = [
  '/manual-journals',
  '/make-journal-entry',
  '/transactions-locking',
  '/financial-reports/general-ledger',
  '/financial-reports/trial-balance-sheet',
  '/financial-reports/journal-sheet',
];

/**
 * Прятать ли accountant-only экраны.
 * Прячем только когда фича включена И режим = business.
 */
export function isAccountantOnlyHidden(
  mode: string | undefined,
  isFeatureOn: boolean,
): boolean {
  return !!isFeatureOn && mode === INTERFACE_MODE.Business;
}

/**
 * Является ли путь accountant-only (учитывает вложенные пути вроде /import).
 */
export function isAccountantOnlyPath(pathname: string): boolean {
  return ACCOUNTANT_ONLY_ROUTE_BASES.some(
    (base) => pathname === base || pathname.startsWith(base + '/'),
  );
}
```

- [ ] **Step 5: Запустить тест — должен пройти**

Run: `pnpm --filter @bigfin/webapp test -- interfaceMode`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/webapp/src/constants/features.tsx packages/webapp/src/constants/interfaceMode.ts packages/webapp/src/constants/interfaceMode.spec.ts
git commit -m "feat(webapp): константы и чистые функции режима интерфейса"
```

---

## Task 7: Фронт — хук режима и гард маршрутов

**Files:**
- Create: `packages/webapp/src/hooks/state/interfaceMode.tsx`

- [ ] **Step 1: Создать хуки**

Создать `packages/webapp/src/hooks/state/interfaceMode.tsx`:

```tsx
// @ts-nocheck
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useCurrentOrganization } from '@/hooks/state/organizations';
import { useFeatureCan } from '@/hooks/state/feature';
import { Features } from '@/constants/features';
import {
  INTERFACE_MODE,
  isAccountantOnlyHidden,
  isAccountantOnlyPath,
} from '@/constants/interfaceMode';

/**
 * Текущий режим интерфейса организации (пусто → business).
 */
export const useInterfaceMode = () => {
  const organization = useCurrentOrganization();
  return organization?.metadata?.interfaceMode ?? INTERFACE_MODE.Business;
};

/**
 * Редиректит на главную, если открыт accountant-only маршрут,
 * а режим = business (и фича включена). Монтируется один раз в дашборде.
 */
export const useAccountantOnlyRouteGuard = () => {
  const history = useHistory();
  const location = useLocation();
  const mode = useInterfaceMode();
  const { featureCan } = useFeatureCan();

  React.useEffect(() => {
    const hidden = isAccountantOnlyHidden(
      mode,
      featureCan(Features.InterfaceModes),
    );
    if (hidden && isAccountantOnlyPath(location.pathname)) {
      history.replace('/');
    }
  }, [location.pathname, mode]);
};
```

- [ ] **Step 2: Проверить типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/hooks/state/interfaceMode.tsx
git commit -m "feat(webapp): хук useInterfaceMode и гард accountant-only маршрутов"
```

---

## Task 8: Фронт — пометить пункты меню и добавить предикат

**Files:**
- Modify: `packages/webapp/src/constants/sidebarMenu.tsx`
- Modify: `packages/webapp/src/containers/Dashboard/Sidebar/hooks.tsx`

- [ ] **Step 1: Пометить 6 пунктов меню `accountantOnly: true`**

В `packages/webapp/src/constants/sidebarMenu.tsx` добавить `accountantOnly: true,` к этим пунктам (рядом с `href`):

1. «Ручные проводки» — пункт с `href: '/manual-journals'` (раздел Учёт → Финансы).
2. «Закрытие периодов» — пункт с `href: '/transactions-locking'`.
3. «Сделать проводку» — пункт с `href: '/make-journal-entry'`.
4. «Оборотно-сальдовая» — пункт с `href: '/financial-reports/trial-balance-sheet'`.
5. «Журнал» — пункт с `href: '/financial-reports/journal-sheet'`.
6. «Главная книга» — пункт с `href: '/financial-reports/general-ledger'`.

Пример для первого (остальные по аналогии — добавить только строку `accountantOnly: true,`):

```tsx
              {
                text: <T id={'sidebar.manual_journals'} />,
                href: '/manual-journals',
                type: ISidebarMenuItemType.Link,
                accountantOnly: true,
                permission: {
                  subject: AbilitySubject.ManualJournal,
                  ability: ManualJournalAction.View,
                },
              },
```

- [ ] **Step 2: Добавить предикат режима в фильтр меню**

В `packages/webapp/src/containers/Dashboard/Sidebar/hooks.tsx`:

(a) В импорты добавить:

```tsx
import { Features } from '@/constants/features';
import { isAccountantOnlyHidden } from '@/constants/interfaceMode';
import { useInterfaceMode } from '@/hooks/state/interfaceMode';
```

(b) После `useFilterSidebarItemFeaturePredicater` добавить новый предикат:

```tsx
/**
 * Предикат: прячет accountant-only пункты в режиме «Бизнес» (под флагом).
 */
function useFilterSidebarItemModePredicater() {
  const mode = useInterfaceMode();
  const { featureCan } = useFeatureCan();
  const hidden = isAccountantOnlyHidden(mode, featureCan(Features.InterfaceModes));

  return {
    predicate: (item) => {
      if (item.accountantOnly && hidden) {
        return false;
      }
      return true;
    },
  };
}
```

(c) В `useFilterSidebarMenuAbility` подключить предикат:

```tsx
function useFilterSidebarMenuAbility(menu) {
  const { predicate: predFeature } = useFilterSidebarItemFeaturePredicater();
  const { predicate: predAbility } = useFilterSidebarItemAbilityPredicater();
  const { predicate: predMode } = useFilterSidebarItemModePredicater();
  const { predicate: predSubscription } =
    useFilterSidebarItemSubscriptionPredicater();

  return deepdash.filterDeep(
    menu,
    (item) => predFeature(item) && predAbility(item) && predMode(item),
    deepDashConfig,
  );
}
```

- [ ] **Step 3: Проверить типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/constants/sidebarMenu.tsx packages/webapp/src/containers/Dashboard/Sidebar/hooks.tsx
git commit -m "feat(webapp): прятать бух-пункты меню в режиме Бизнес"
```

---

## Task 9: Фронт — смонтировать гард маршрутов

**Files:**
- Modify: `packages/webapp/src/components/Dashboard/DashboardContentRoute.tsx`

- [ ] **Step 1: Вызвать гард в рендере роутов**

В `DashboardContentRoute.tsx`:

(a) Добавить импорт:

```tsx
import { useAccountantOnlyRouteGuard } from '@/hooks/state/interfaceMode';
```

(b) В начале функции `DashboardContentRoute` вызвать хук:

```tsx
export default function DashboardContentRoute() {
  useAccountantOnlyRouteGuard();
  const routes = getDashboardRoutes();
  // ...без изменений
```

- [ ] **Step 2: Проверить типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/components/Dashboard/DashboardContentRoute.tsx
git commit -m "feat(webapp): редирект с accountant-only маршрутов в режиме Бизнес"
```

---

## Task 10: Фронт — страница-переключатель в Настройках

**Files:**
- Create: `packages/webapp/src/containers/Preferences/InterfaceMode/InterfaceModePage.tsx`
- Modify: `packages/webapp/src/routes/preferences.tsx`
- Modify: `packages/webapp/src/constants/preferencesMenu.tsx`

- [ ] **Step 1: Создать страницу-переключатель**

Создать `packages/webapp/src/containers/Preferences/InterfaceMode/InterfaceModePage.tsx`:

```tsx
// @ts-nocheck
import React, { useEffect, useState } from 'react';
import intl from 'react-intl-universal';
import { RadioGroup, Radio, Button, Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { useCurrentOrganization } from '@/hooks/state/organizations';
import { useUpdateOrganization } from '@/hooks/query/organization';
import { INTERFACE_MODE } from '@/constants/interfaceMode';
import { compose } from '@/utils';

function InterfaceModePage({ changePreferencesPageTitle }) {
  const organization = useCurrentOrganization();
  const { mutateAsync: updateOrganization, isLoading } = useUpdateOrganization();

  const currentMode =
    organization?.metadata?.interfaceMode ?? INTERFACE_MODE.Business;
  const [mode, setMode] = useState(currentMode);

  useEffect(() => {
    changePreferencesPageTitle(intl.get('interface_mode.title'));
  }, [changePreferencesPageTitle]);

  useEffect(() => {
    setMode(currentMode);
  }, [currentMode]);

  const handleSave = () => {
    updateOrganization({ interfaceMode: mode })
      .then(() => {
        AppToaster.show({
          message: intl.get('interface_mode.saved'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(() => {
        AppToaster.show({
          message: intl.get('interface_mode.save_failed'),
          intent: Intent.DANGER,
        });
      });
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <p>{intl.get('interface_mode.description')}</p>

      <RadioGroup onChange={(e) => setMode(e.currentTarget.value)} selectedValue={mode}>
        <Radio
          label={intl.get('interface_mode.business')}
          value={INTERFACE_MODE.Business}
        />
        <Radio
          label={intl.get('interface_mode.accountant')}
          value={INTERFACE_MODE.Accountant}
        />
      </RadioGroup>

      <Button
        intent={Intent.PRIMARY}
        loading={isLoading}
        disabled={mode === currentMode}
        onClick={handleSave}
      >
        {intl.get('interface_mode.save')}
      </Button>
    </div>
  );
}

export default compose(withDashboardActions)(InterfaceModePage);
```

- [ ] **Step 2: Зарегистрировать маршрут**

В `packages/webapp/src/routes/preferences.tsx`, в массив `getPreferenceRoutes()` (перед записью с `path: \`${BASE_URL}/\``) добавить:

```tsx
  {
    path: `${BASE_URL}/interface-mode`,
    component: lazy(
      () =>
        import('@/containers/Preferences/InterfaceMode/InterfaceModePage'),
    ),
    exact: true,
  },
```

- [ ] **Step 3: Добавить пункт меню настроек**

В `packages/webapp/src/constants/preferencesMenu.tsx`, в массив `PreferencesMenu` (например, сразу после пункта `general`) добавить:

```tsx
  {
    text: <T id={'interface_mode.menu'} />,
    href: '/preferences/interface-mode',
  },
```

- [ ] **Step 4: Проверить типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/containers/Preferences/InterfaceMode/ packages/webapp/src/routes/preferences.tsx packages/webapp/src/constants/preferencesMenu.tsx
git commit -m "feat(webapp): страница переключения режима интерфейса в настройках"
```

---

## Task 11: i18n-ключи

**Files:**
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Добавить ключи (парно EN+RU)**

Использовать скилл `i18n-add-string` ИЛИ добавить вручную в оба файла одинаковые ключи.

В `packages/webapp/src/lang/en/index.json`:

```json
  "interface_mode.menu": "Interface mode",
  "interface_mode.title": "Interface mode",
  "interface_mode.description": "Business mode hides bookkeeping screens (manual journals, ledgers, trial balance, period locking). Accountant mode shows everything.",
  "interface_mode.business": "Business",
  "interface_mode.accountant": "Accountant",
  "interface_mode.save": "Save",
  "interface_mode.saved": "Interface mode saved.",
  "interface_mode.save_failed": "Failed to save interface mode."
```

В `packages/webapp/src/lang/ru/index.json`:

```json
  "interface_mode.menu": "Режим интерфейса",
  "interface_mode.title": "Режим интерфейса",
  "interface_mode.description": "Режим «Бизнес» прячет бухгалтерские экраны (ручные проводки, книги, оборотно-сальдовую, закрытие периодов). Режим «Бухгалтер» показывает всё.",
  "interface_mode.business": "Бизнес",
  "interface_mode.accountant": "Бухгалтер",
  "interface_mode.save": "Сохранить",
  "interface_mode.saved": "Режим интерфейса сохранён.",
  "interface_mode.save_failed": "Не удалось сохранить режим интерфейса."
```

- [ ] **Step 2: Проверить парность ключей**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: «✅ OK: парность ключей en↔ru соблюдена.»

- [ ] **Step 3: Commit**

```bash
git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(i18n): ключи interface_mode (en+ru)"
```

---

## Task 12: Финальная приёмка

- [ ] **Step 1: Серверные тесты**

Run: `pnpm --filter @bigfin/server test -- FeaturesConfigure GetCurrentOrganizationMetadata`
Expected: PASS (флаг + 4 теста transformer).

- [ ] **Step 2: Типы всех пакетов**

Run: `pnpm typecheck`
Expected: PASS (3 пакета, exit 0).

- [ ] **Step 3: Парность переводов**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: парность соблюдена.

- [ ] **Step 4: Ревью русских строк**

Запустить сабагент `ru-translation-reviewer` по `interface_mode.*` ключам — проверить «Бизнес/Бухгалтер», описание (без калек, бренд Bigfin).

- [ ] **Step 5: Чек-лист ручной приёмки (staging/CI, когда поднят стек)**

- [ ] Флаг `interface_modes` **off** → 6 экранов на месте, поведение прежнее.
- [ ] Флаг **on**, режим `business` → 6 пунктов исчезли из меню; заход по `/manual-journals` редиректит на `/`.
- [ ] В Настройках переключить на `accountant` → сохранить → 6 экранов вернулись.
- [ ] Существующая организация без значения режима ведёт себя как `business`.
- [ ] Миграция `system:migrate:latest → rollback → latest` зелёная на CI.

---

## Самопроверка плана (выполнено при написании)

- **Покрытие спеки:** хранение (T2/T3), чтение с нормализацией (T5), запись (T4), флаг (T1), меню (T8), редирект (T7/T9), переключатель (T10), i18n (T11), тесты (T1/T5/T6), критерии (T12). Все разделы спеки покрыты.
- **Anti-scope соблюдён:** нет онбординга, нет per-user режима, план счетов/налоги не трогаются, API не блокируется.
- **Согласованность имён:** `interfaceMode` (camel) на фронте/в DTO/модели/трансформере; `interface_mode` (snake) в колонке/флаге; чистая функция `isAccountantOnlyHidden(mode, isFeatureOn)` используется и в предикате меню (T8), и в гарде (T7) одинаково; `Features.InterfaceModes` (webapp) / `Features.INTERFACE_MODES` (server).
