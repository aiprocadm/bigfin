# In-app уведомления (㉒-2) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показать пользователю in-app ленту уведомлений (колокольчик в шапке со счётчиком непрочитанных + выпадающий список) поверх уже сохраняемой таблицы `notifications`, с персональной отметкой «прочитано».

**Architecture:** Read-модель поверх существующих строк `notifications`. Новая tenant-таблица `notification_reads` хранит персональный статус прочтения. Чистые функции в `utils/inAppRead.ts` считают флаги/непрочитанные; тонкий сервис-оркестратор отдаёт их через 4 новых эндпоинта существующего `NotificationsController`. Фронт: колокольчик в `DashboardTopbar` за флагом `Features.Notifications`, поллинг счётчика раз в 60с.

**Tech Stack:** NestJS + Objection/Knex + MySQL/MariaDB (backend), React 18 + Blueprint + react-query (webapp), Jest, react-intl-universal.

**Spec:** `docs/superpowers/specs/2026-06-20-in-app-notifications-design.md`

---

## Окружение и грабли (прочесть до старта)

- Node **18.16.1** обязателен. В каждом терминале сначала:
  `export PATH="$HOME/AppData/Roaming/fnm/node-versions/v18.16.1/installation:$PATH"`
- Пакет-менеджер только `pnpm`. **Не** запускать `pnpm install`.
- **commitlint:** subject коммита — со строчной буквы; тело — строки ≤100 символов. `--no-verify` не использовать.
- **БД — MySQL/MariaDB** (не Postgres): идемпотентность отметки прочтения делаем
  на уровне приложения (проверка-затем-вставка) + UNIQUE как backstop. **Нет**
  `ON CONFLICT`.
- **Грабля relationMappings:** в этой задаче `relationMappings` НЕ используем
  (сервис делает джойны вручную) — значит, и риска `@/`-алиаса в `require()` нет.
- Миграции локально могут не прогнаться (нет БД) — прогон `latest→rollback→latest`
  на CI/staging. Обязателен рабочий `down()`.
- Команды приёмки: `pnpm --filter @bigfin/server test` · `pnpm typecheck` ·
  `node packages/webapp/scripts/lang-check.js`.

## Карта файлов

**Backend (создать):**
- `packages/server/src/database/tenant/migrations/20260620120000_create_notification_reads_table.ts`
- `packages/server/src/modules/Notifications/models/NotificationRead.model.ts`
- `packages/server/src/modules/Notifications/utils/inAppRead.ts`
- `packages/server/src/modules/Notifications/utils/inAppRead.spec.ts`
- `packages/server/src/modules/Notifications/queries/InAppNotifications.service.ts`

**Backend (изменить):**
- `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts` — регистрация модели.
- `packages/server/src/modules/Notifications/Notifications.application.ts` — методы.
- `packages/server/src/modules/Notifications/Notifications.controller.ts` — 4 эндпоинта.
- `packages/server/src/modules/Notifications/Notifications.module.ts` — провайдер сервиса.

**Frontend (создать):**
- `packages/webapp/src/containers/Notifications/InApp/NotificationBell.tsx`
- `packages/webapp/src/containers/Notifications/InApp/NotificationsList.tsx`

**Frontend (изменить):**
- `packages/webapp/src/hooks/query/types.tsx` — 2 токена.
- `packages/webapp/src/hooks/query/notifications.tsx` — 4 хука.
- `packages/webapp/src/components/Dashboard/DashboardTopbar/DashboardTopbar.tsx` — смонтировать колокольчик.
- `packages/webapp/src/lang/en/index.json` + `packages/webapp/src/lang/ru/index.json` — ключи `notifications.inapp.*`.

---

## Task 1: Миграция `notification_reads` (tenant)

**Files:**
- Create: `packages/server/src/database/tenant/migrations/20260620120000_create_notification_reads_table.ts`

- [ ] **Step 1: Создать файл миграции**

Содержимое (CommonJS-в-`.ts`, как соседняя `20260615120100_create_notifications_table.ts`):

```ts
// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema.createTable('notification_reads', (table) => {
    table.increments('id');
    table.integer('notification_id').unsigned().notNullable().index();
    table.integer('user_id').unsigned().notNullable().index();
    table.dateTime('read_at').notNullable();
    table.timestamps();
    table.unique(['notification_id', 'user_id']);
  });

exports.down = (knex) =>
  knex.schema.dropTableIfExists('notification_reads');
```

- [ ] **Step 2: Проверить типы (сборка не падает)**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/database/tenant/migrations/20260620120000_create_notification_reads_table.ts
git commit -m "feat(db): таблица notification_reads (tenant)"
```

> Примечание: прогон `tenants:migrate:latest → rollback → latest` — на CI/staging. Отметить в PR.

---

## Task 2: Модель `NotificationRead` + регистрация в тенант-реестре

**Files:**
- Create: `packages/server/src/modules/Notifications/models/NotificationRead.model.ts`
- Modify: `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts`

- [ ] **Step 1: Создать модель**

Зеркалит `Notification.model.ts` (тот же базовый класс, timestamps):

```ts
// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class NotificationRead extends TenantBaseModel {
  notificationId!: number;
  userId!: number;
  readAt!: string;

  static get tableName() {
    return 'notification_reads';
  }
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
```

- [ ] **Step 2: Зарегистрировать модель в тенант-реестре**

В `packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts`:

Рядом со строкой (≈64) `import { Notification } from '@/modules/Notifications/models/Notification.model';` добавить:

```ts
import { NotificationRead } from '@/modules/Notifications/models/NotificationRead.model';
```

В массиве `models` (≈125), после `Notification,` добавить строку:

```ts
  NotificationRead,
```

- [ ] **Step 3: Проверить типы**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/modules/Notifications/models/NotificationRead.model.ts packages/server/src/modules/Tenancy/TenancyModels/Tenancy.module.ts
git commit -m "feat(models): модель NotificationRead и регистрация в тенант-реестре"
```

---

## Task 3: Чистые функции `inAppRead` + тесты (TDD)

**Files:**
- Create: `packages/server/src/modules/Notifications/utils/inAppRead.ts`
- Test: `packages/server/src/modules/Notifications/utils/inAppRead.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `packages/server/src/modules/Notifications/utils/inAppRead.spec.ts`:

```ts
// © 2026 Bigfin
import {
  markReadFlags,
  countUnread,
  selectUnreadIds,
  NotificationRow,
} from './inAppRead';

const rows: NotificationRow[] = [
  { id: 1, eventType: 'cash_gap', title: 'A', body: 'a', payload: null, firedAt: '2026-06-20 10:00:00' },
  { id: 2, eventType: 'overdue', title: 'B', body: 'b', payload: null, firedAt: '2026-06-20 11:00:00' },
  { id: 3, eventType: 'low_balance', title: 'C', body: 'c', payload: null, firedAt: '2026-06-20 12:00:00' },
];

describe('inAppRead — markReadFlags', () => {
  it('помечает read=true только для прочитанных id, остальные false', () => {
    const result = markReadFlags(rows, [2]);
    expect(result.map((r) => [r.id, r.read])).toEqual([
      [1, false],
      [2, true],
      [3, false],
    ]);
  });
});

describe('inAppRead — countUnread', () => {
  it('считает уведомления, чьего id нет в прочитанных', () => {
    expect(countUnread([1, 2, 3], [2])).toBe(2);
  });
  it('ноль, когда всё прочитано', () => {
    expect(countUnread([1, 2, 3], [1, 2, 3])).toBe(0);
  });
});

describe('inAppRead — selectUnreadIds', () => {
  it('возвращает только ещё не прочитанные id', () => {
    expect(selectUnreadIds([1, 2, 3], [2])).toEqual([1, 3]);
  });
  it('пусто, когда всё прочитано (идемпотентность mark-all)', () => {
    expect(selectUnreadIds([1, 2, 3], [1, 2, 3])).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `pnpm --filter @bigfin/server test -- inAppRead`
Expected: FAIL (модуль `./inAppRead` не найден).

- [ ] **Step 3: Реализовать чистые функции**

Создать `packages/server/src/modules/Notifications/utils/inAppRead.ts`:

```ts
// © 2026 Bigfin

export interface NotificationRow {
  id: number;
  eventType: string;
  title: string;
  body: string;
  payload: string | null;
  firedAt: string;
}

export interface NotificationView extends NotificationRow {
  read: boolean;
}

/** Помечает каждое уведомление флагом read по множеству прочитанных id. */
export const markReadFlags = (
  notifications: NotificationRow[],
  readIds: number[],
): NotificationView[] => {
  const read = new Set(readIds);
  return notifications.map((n) => ({ ...n, read: read.has(n.id) }));
};

/** Считает непрочитанные: уведомления, чьего id нет в прочитанных. */
export const countUnread = (
  notificationIds: number[],
  readIds: number[],
): number => {
  const read = new Set(readIds);
  return notificationIds.filter((id) => !read.has(id)).length;
};

/** id уведомлений, ещё не прочитанных пользователем (для mark-all). */
export const selectUnreadIds = (
  notificationIds: number[],
  readIds: number[],
): number[] => {
  const read = new Set(readIds);
  return notificationIds.filter((id) => !read.has(id));
};
```

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `pnpm --filter @bigfin/server test -- inAppRead`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/Notifications/utils/inAppRead.ts packages/server/src/modules/Notifications/utils/inAppRead.spec.ts
git commit -m "feat(notifications): чистые функции in-app чтения + тесты"
```

---

## Task 4: Сервис `InAppNotificationsService` (тонкий оркестратор)

**Files:**
- Create: `packages/server/src/modules/Notifications/queries/InAppNotifications.service.ts`

- [ ] **Step 1: Создать сервис**

Зеркалит DI-паттерн `GetNotificationPreferencesService` (`@Inject(Model.name)` +
`TenantModelProxy`). Текущий пользователь — из `ClsService.get('userId')` (как в
`TenancyContext.getSystemUser`). Время — `moment().toMySqlDateTime()` (как в
`NotificationEvaluation.processor`).

```ts
// © 2026 Bigfin
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import * as moment from 'moment';
import '@/utils/moment-mysql';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Notification } from '../models/Notification.model';
import { NotificationRead } from '../models/NotificationRead.model';
import {
  markReadFlags,
  countUnread,
  selectUnreadIds,
  NotificationRow,
} from '../utils/inAppRead';

@Injectable()
export class InAppNotificationsService {
  constructor(
    private readonly cls: ClsService,
    @Inject(Notification.name)
    private readonly notifModel: TenantModelProxy<typeof Notification>,
    @Inject(NotificationRead.name)
    private readonly readModel: TenantModelProxy<typeof NotificationRead>,
  ) {}

  private userId(): number {
    return Number(this.cls.get('userId'));
  }

  /** Последние N уведомлений с персональным флагом read. */
  async list(limit = 20) {
    const userId = this.userId();
    const notifs: any[] = await this.notifModel()
      .query()
      .orderBy('firedAt', 'desc')
      .limit(limit);

    const ids = notifs.map((n) => n.id);
    const reads: any[] = ids.length
      ? await this.readModel()
          .query()
          .where('userId', userId)
          .whereIn('notificationId', ids)
      : [];

    const rows: NotificationRow[] = notifs.map((n) => ({
      id: n.id,
      eventType: n.eventType,
      title: n.title,
      body: n.body,
      payload: n.payload,
      firedAt: n.firedAt,
    }));

    return {
      notifications: markReadFlags(
        rows,
        reads.map((r) => r.notificationId),
      ),
    };
  }

  /** Число непрочитанных текущим пользователем. */
  async unreadCount() {
    const userId = this.userId();
    const notifs: any[] = await this.notifModel().query().select('id');
    const reads: any[] = await this.readModel()
      .query()
      .where('userId', userId)
      .select('notificationId');
    return {
      count: countUnread(
        notifs.map((n) => n.id),
        reads.map((r) => r.notificationId),
      ),
    };
  }

  /** Отметить одно уведомление прочитанным (идемпотентно). */
  async markRead(id: number) {
    const userId = this.userId();
    const notif = await this.notifModel().query().findById(id);
    if (!notif) throw new NotFoundException('notification_not_found');

    const existing = await this.readModel()
      .query()
      .where('userId', userId)
      .andWhere('notificationId', id)
      .first();

    if (!existing) {
      await this.readModel().query().insert({
        notificationId: id,
        userId,
        readAt: moment().toMySqlDateTime(),
      } as any);
    }
    return { success: true };
  }

  /** Отметить все ещё непрочитанные текущим пользователем. */
  async markAllRead() {
    const userId = this.userId();
    const notifs: any[] = await this.notifModel().query().select('id');
    const reads: any[] = await this.readModel()
      .query()
      .where('userId', userId)
      .select('notificationId');

    const now = moment().toMySqlDateTime();
    const toInsert = selectUnreadIds(
      notifs.map((n) => n.id),
      reads.map((r) => r.notificationId),
    ).map((notificationId) => ({ notificationId, userId, readAt: now }));

    if (toInsert.length) {
      await this.readModel().query().insert(toInsert as any);
    }
    return { success: true };
  }
}
```

- [ ] **Step 2: Проверить типы**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/modules/Notifications/queries/InAppNotifications.service.ts
git commit -m "feat(notifications): сервис in-app ленты (list/unread/mark)"
```

---

## Task 5: Проводка — application, контроллер, модуль

**Files:**
- Modify: `packages/server/src/modules/Notifications/Notifications.application.ts`
- Modify: `packages/server/src/modules/Notifications/Notifications.controller.ts`
- Modify: `packages/server/src/modules/Notifications/Notifications.module.ts`

- [ ] **Step 1: Добавить сервис в провайдеры модуля**

В `Notifications.module.ts`: добавить импорт после строки импорта
`GetNotificationPreferencesService` (≈24):

```ts
import { InAppNotificationsService } from './queries/InAppNotifications.service';
```

В массив `providers` (после `UpdateNotificationPreferencesService,`) добавить:

```ts
    InAppNotificationsService,
```

- [ ] **Step 2: Прокинуть методы через application**

В `Notifications.application.ts`: добавить импорт после строки импорта
`ConnectTelegramService` (≈5):

```ts
import { InAppNotificationsService } from './queries/InAppNotifications.service';
```

В конструктор добавить параметр (после `connectTelegramService`):

```ts
    private readonly inAppService: InAppNotificationsService,
```

В класс (после метода `disconnectTelegram`) добавить:

```ts
  listNotifications() {
    return this.inAppService.list();
  }

  unreadCount() {
    return this.inAppService.unreadCount();
  }

  markNotificationRead(id: number) {
    return this.inAppService.markRead(id);
  }

  markAllNotificationsRead() {
    return this.inAppService.markAllRead();
  }
```

- [ ] **Step 3: Добавить эндпоинты в контроллер**

В `Notifications.controller.ts`: расширить импорт из `@nestjs/common` (строка 2)
— добавить `Param`:

```ts
import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
```

В класс `NotificationsController` (после метода `disconnectTelegram`) добавить:

```ts
  @Get()
  @ApiOperation({ summary: 'List recent in-app notifications for the current user.' })
  listNotifications() {
    return this.app.listNotifications();
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count unread notifications for the current user.' })
  unreadCount() {
    return this.app.unreadCount();
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for the current user.' })
  markAllRead() {
    return this.app.markAllNotificationsRead();
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read for the current user.' })
  markRead(@Param('id') id: string) {
    return this.app.markNotificationRead(Number(id));
  }
```

> Порядок важен: `@Put('read-all')` объявлен ДО `@Put(':id/read')`, чтобы
> литеральный путь не перехватывался параметром. Read-эндпоинты намеренно без
> `@RequirePermission('manage','all')` — лента персональная.

- [ ] **Step 4: Проверить типы**

Run: `pnpm --filter @bigfin/server typecheck`
Expected: PASS.

- [ ] **Step 5: Прогнать серверные тесты модуля (регрессия)**

Run: `pnpm --filter @bigfin/server test -- Notifications inAppRead`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/modules/Notifications/Notifications.application.ts packages/server/src/modules/Notifications/Notifications.controller.ts packages/server/src/modules/Notifications/Notifications.module.ts
git commit -m "feat(notifications): эндпоинты in-app ленты (list/unread/read)"
```

---

## Task 6: Фронт — query-токены и хуки

**Files:**
- Modify: `packages/webapp/src/hooks/query/types.tsx`
- Modify: `packages/webapp/src/hooks/query/notifications.tsx`

- [ ] **Step 1: Добавить токены ключей запросов**

В `packages/webapp/src/hooks/query/types.tsx`, рядом со строкой (≈331)
`NOTIFICATION_PREFERENCES: 'NOTIFICATION_PREFERENCES',` добавить:

```ts
  NOTIFICATIONS_LIST: 'NOTIFICATIONS_LIST',
  NOTIFICATIONS_UNREAD: 'NOTIFICATIONS_UNREAD',
```

- [ ] **Step 2: Добавить хуки**

В `packages/webapp/src/hooks/query/notifications.tsx`, в конец файла добавить:

```ts
// ---------------------------------------------------------------------------
// In-app лента
// ---------------------------------------------------------------------------

/** Список последних in-app уведомлений (GET notifications). */
export function useNotifications(props?: any) {
  return useRequestQuery(
    [t.NOTIFICATIONS_LIST],
    { method: 'get', url: 'notifications' },
    {
      select: (res: any) =>
        res.data?.data?.notifications ?? res.data?.notifications ?? [],
      defaultData: [],
      ...props,
    },
  );
}

/** Число непрочитанных (GET notifications/unread-count), поллинг 60с. */
export function useUnreadCount(props?: any) {
  return useRequestQuery(
    [t.NOTIFICATIONS_UNREAD],
    { method: 'get', url: 'notifications/unread-count' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: { count: 0 },
      refetchInterval: 60_000,
      ...props,
    },
  );
}

/** Отметить одно уведомление прочитанным (PUT notifications/:id/read). */
export function useMarkNotificationRead(
  props?: UseMutationOptions<any, any, number>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (id) => api.put(`notifications/${id}/read`, {}),
    {
      onSuccess: () => {
        client.invalidateQueries(t.NOTIFICATIONS_LIST);
        client.invalidateQueries(t.NOTIFICATIONS_UNREAD);
      },
      ...props,
    },
  );
}

/** Отметить все прочитанными (PUT notifications/read-all). */
export function useMarkAllNotificationsRead(
  props?: UseMutationOptions<any, any, void>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, void>(
    () => api.put('notifications/read-all', {}),
    {
      onSuccess: () => {
        client.invalidateQueries(t.NOTIFICATIONS_LIST);
        client.invalidateQueries(t.NOTIFICATIONS_UNREAD);
      },
      ...props,
    },
  );
}
```

- [ ] **Step 3: Проверить типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/hooks/query/types.tsx packages/webapp/src/hooks/query/notifications.tsx
git commit -m "feat(webapp): query-хуки in-app ленты уведомлений"
```

---

## Task 7: Фронт — компоненты колокольчика и списка

**Files:**
- Create: `packages/webapp/src/containers/Notifications/InApp/NotificationsList.tsx`
- Create: `packages/webapp/src/containers/Notifications/InApp/NotificationBell.tsx`

- [ ] **Step 1: Создать список уведомлений**

`packages/webapp/src/containers/Notifications/InApp/NotificationsList.tsx`:

```tsx
// © 2026 Bigfin
import React from 'react';
import { Menu, MenuItem, MenuDivider } from '@blueprintjs/core';
import intl from 'react-intl-universal';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/query/notifications';

export function NotificationsList() {
  const { data: notifications = [] } = useNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  if (!notifications.length) {
    return (
      <Menu>
        <MenuItem disabled text={intl.get('notifications.inapp.empty')} />
      </Menu>
    );
  }

  return (
    <Menu style={{ maxWidth: 360 }}>
      <MenuItem
        text={intl.get('notifications.inapp.mark_all_read')}
        onClick={() => markAllRead()}
      />
      <MenuDivider />
      {notifications.map((n: any) => (
        <MenuItem
          key={n.id}
          text={
            <div>
              <strong>{n.title}</strong>
              <div style={{ opacity: 0.7, fontSize: 12 }}>{n.body}</div>
            </div>
          }
          labelElement={
            !n.read ? <span style={{ color: '#f5a623' }}>●</span> : undefined
          }
          onClick={() => markRead(n.id)}
        />
      ))}
    </Menu>
  );
}
```

- [ ] **Step 2: Создать колокольчик**

`packages/webapp/src/containers/Notifications/InApp/NotificationBell.tsx`:

```tsx
// © 2026 Bigfin
import React from 'react';
import { Button, Classes } from '@blueprintjs/core';
import { Popover2 } from '@blueprintjs/popover2';
import { Position } from '@blueprintjs/core';
import { Icon } from '@/components';
import { useFeatureCan } from '@/hooks/state/feature';
import { Features } from '@/constants/features';
import { useUnreadCount } from '@/hooks/query/notifications';
import { NotificationsList } from './NotificationsList';

export function NotificationBell() {
  const { featureCan } = useFeatureCan();
  const enabled = featureCan(Features.Notifications);
  const { data } = useUnreadCount({ enabled });
  const count = data?.count ?? 0;

  if (!enabled) {
    return null;
  }

  return (
    <Popover2 content={<NotificationsList />} position={Position.BOTTOM}>
      <Button className={Classes.MINIMAL} icon={<Icon icon={'notification-24'} iconSize={20} />}>
        {count > 0 && (
          <span
            style={{
              marginLeft: 4,
              background: '#f5a623',
              color: '#fff',
              borderRadius: 8,
              padding: '0 5px',
              fontSize: 11,
            }}
          >
            {count}
          </span>
        )}
      </Button>
    </Popover2>
  );
}
```

> Гейтинг здесь двойной: при выключенной фиче компонент возвращает `null` И
> `useUnreadCount` получает `enabled: false` — поллинг не стартует, лишних
> запросов нет.

- [ ] **Step 3: Проверить типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/containers/Notifications/InApp/
git commit -m "feat(webapp): компоненты колокольчика и списка in-app уведомлений"
```

---

## Task 8: Фронт — смонтировать колокольчик в шапке

**Files:**
- Modify: `packages/webapp/src/components/Dashboard/DashboardTopbar/DashboardTopbar.tsx`

- [ ] **Step 1: Импортировать колокольчик**

После строки импорта `QuickNewDropdown` (≈29) добавить:

```tsx
import { NotificationBell } from '@/containers/Notifications/InApp/NotificationBell';
```

- [ ] **Step 2: Заменить статичную кнопку колокольчика**

Найти существующий мёртвый блок (≈124–132):

```tsx
            <Tooltip
              content={<T id={'notifications'} />}
              position={Position.BOTTOM}
            >
              <Button
                className={Classes.MINIMAL}
                icon={<Icon icon={'notification-24'} iconSize={20} />}
              />
            </Tooltip>
```

Заменить целиком на:

```tsx
            <NotificationBell />
```

- [ ] **Step 3: Проверить типы**

Run: `pnpm --filter @bigfin/webapp typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/components/Dashboard/DashboardTopbar/DashboardTopbar.tsx
git commit -m "feat(webapp): колокольчик уведомлений в шапке дашборда"
```

---

## Task 9: i18n-ключи `notifications.inapp.*`

**Files:**
- Modify: `packages/webapp/src/lang/en/index.json`
- Modify: `packages/webapp/src/lang/ru/index.json`

- [ ] **Step 1: Добавить ключи в EN**

В `packages/webapp/src/lang/en/index.json` добавить (рядом с другими
`notifications.*` ключами, парно по алфавиту/блоку):

```json
  "notifications.inapp.empty": "No notifications",
  "notifications.inapp.mark_all_read": "Mark all as read",
```

- [ ] **Step 2: Добавить ключи в RU**

В `packages/webapp/src/lang/ru/index.json` добавить парно:

```json
  "notifications.inapp.empty": "Нет уведомлений",
  "notifications.inapp.mark_all_read": "Прочитать всё",
```

- [ ] **Step 3: Проверить парность**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: парность en↔ru соблюдена (0 missing / 0 extra).

- [ ] **Step 4: Commit**

```bash
git add packages/webapp/src/lang/en/index.json packages/webapp/src/lang/ru/index.json
git commit -m "feat(i18n): ключи notifications.inapp (en+ru)"
```

---

## Task 10: Финальная приёмка

- [ ] **Step 1: Серверные тесты**

Run: `pnpm --filter @bigfin/server test -- inAppRead Notifications`
Expected: PASS (6 тестов inAppRead + регрессия модуля).

- [ ] **Step 2: Типы всех пакетов**

Run: `pnpm typecheck`
Expected: PASS (exit 0). Если `lerna` не найден локально — прогнать пер-пакетно:
`pnpm -r --filter @bigfin/server --filter @bigfin/webapp typecheck`.

- [ ] **Step 3: Парность переводов**

Run: `node packages/webapp/scripts/lang-check.js`
Expected: парность соблюдена.

- [ ] **Step 4: Ревью русских строк**

Запустить сабагент `ru-translation-reviewer` по ключам `notifications.inapp.*`
(«Прочитать всё», «Нет уведомлений») — без калек, бренд Bigfin.

- [ ] **Step 5: Чек-лист ручной приёмки (staging/CI, когда поднят стек)**

- [ ] Флаг `notifications` **off** → колокольчика нет в шапке, поллинга нет (Network).
- [ ] Флаг **on** → колокольчик виден; бейдж = числу непрочитанных.
- [ ] Открыть выпадашку → список последних; клик по элементу гасит его точку и
  уменьшает бейдж.
- [ ] «Прочитать всё» → бейдж 0; после перезагрузки остаётся 0.
- [ ] Второй пользователь той же организации видит свой счётчик независимо.
- [ ] Миграция `tenants:migrate:latest → rollback → latest` зелёная на CI.

---

## Самопроверка плана (выполнено при написании)

- **Покрытие спеки:** миграция (T1), модель+реестр (T2), чистые функции+тесты (T3),
  сервис list/unread/mark (T4), application+контроллер+модуль (T5), фронт-хуки (T6),
  компоненты (T7), монтаж в шапке (T8), i18n (T9), критерии (T10). Все разделы
  спеки покрыты.
- **Анти-скоуп соблюдён:** нет реалтайма, нет отдельной страницы, нет deep-link,
  нет канала `in_app`, эвалуаторы/каналы/настройки/cron не трогаются.
- **Согласованность имён:** сервис `InAppNotificationsService`; методы application
  `listNotifications`/`unreadCount`/`markNotificationRead`/`markAllNotificationsRead`;
  чистые функции `markReadFlags`/`countUnread`/`selectUnreadIds`; токены
  `NOTIFICATIONS_LIST`/`NOTIFICATIONS_UNREAD`; хуки `useNotifications`/`useUnreadCount`/
  `useMarkNotificationRead`/`useMarkAllNotificationsRead`; флаг `Features.Notifications`
  (webapp) / `Features.NOTIFICATIONS` (server, существующий). Эндпоинты: `GET /notifications`,
  `GET /notifications/unread-count`, `PUT /notifications/read-all`, `PUT /notifications/:id/read`.
- **MySQL-корректность:** идемпотентность отметки — проверка-затем-вставка на уровне
  приложения + UNIQUE как backstop (без Postgres `ON CONFLICT`).
