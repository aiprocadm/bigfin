# ㉓ Telegram Notification Channel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Telegram as a second notification delivery channel on the existing ㉒-1 engine: each organization connects its own bot (token in tenant settings), the chat is auto-linked via `getUpdates`, and risk-event notifications are delivered through direct `axios` calls to the Telegram Bot API — behind the existing `notifications` flag.

**Architecture:** Generalize the `DeliveryChannel` interface so each channel owns its own addressing (`isConfigured()` + `deliver(candidate)`), turn the processor's hardcoded email call into a channel-registry dispatch loop, and add a `TelegramChannel` strategy plus a connect/disconnect command. Per-org bot token + chat_id live in the `notifications` settings group (mirrors `recipient_email`). No new dependency — `axios ^1.6.0` is already used in `LoopsEvents.subscriber.ts`.

**Tech Stack:** NestJS 10, Objection/Knex (MySQL/MariaDB), BullMQ, `axios`, nestjs-i18n + `OrganizationI18nService`, Jest; React 18 + React Query (v3) + RHF + Zod + shadcn, react-intl-universal.

**Spec:** [docs/superpowers/specs/2026-06-16-telegram-notification-channel-design.md](../specs/2026-06-16-telegram-notification-channel-design.md)

**Branch:** `feat/telegram-notifications` (already created from `origin/develop`; spec already committed as `6558f1570`).

> **Node:** all server commands need Node 18.16.1. On this machine prepend PATH:
> `export PATH="$HOME/AppData/Roaming/fnm/node-versions/v18.16.1/installation:$PATH"`

---

## Parallelization map

- **Track A — Foundation** (T1 extractChatId, T2 TelegramApi, T3 constants): no deps, parallel-safe.
- **Track B — Interface rework** (T4 DeliveryChannel+Candidate, T5 EmailChannel refactor): T5 depends on T4.
- **Track C — Telegram delivery + connect** (T6 settings getters, T7 TelegramChannel, T8 ConnectTelegram, T9 DTO): T7 needs T2+T4+T6; T8 needs T1+T2+T6.
- **Track D — Dispatch + wiring** (T10 processor, T11 GetPreferences, T12 controller/app, T13 module+i18n): depend on B+C.
- **Track E — Frontend** (T14 hooks, T15 page+lang): depends on T12 API.
- **Track F — Verify** (T16): last.

Safe order: A → B → C → D → E → F.

---

## File Structure

**Server — new** (`packages/server/src/modules/Notifications/`):
- `utils/extractChatId.ts` (+ `.spec.ts`) — pure: getUpdates response → latest chat id or null.
- `delivery/TelegramApi.service.ts` (+ `.spec.ts`) — axios wrapper: `getUpdates`, `sendMessage`, error mapping.
- `delivery/TelegramChannel.service.ts` — `DeliveryChannel` for Telegram.
- `commands/ConnectTelegram.service.ts` — `connect(botToken)` / `disconnect()`.
- `dtos/ConnectTelegram.dto.ts` — `{ botToken }`.

**Server — modified:**
- `delivery/DeliveryChannel.ts` — interface v2 (`isConfigured` + `deliver(candidate)`).
- `delivery/EmailChannel.service.ts` — implement v2, self-address.
- `utils/selectToFire.ts` — `Candidate.channels?: string[]`.
- `NotificationsSettings.service.ts` — `getTelegram()`.
- `jobs/NotificationEvaluation.processor.ts` — channel-registry dispatch.
- `queries/GetNotificationPreferences.service.ts` — return `telegram: { connected }`.
- `Notifications.application.ts` — `connectTelegram` / `disconnectTelegram`.
- `Notifications.controller.ts` — `POST telegram/connect`, `POST telegram/disconnect`.
- `Notifications.module.ts` — register new providers.
- `constants.ts` — telegram settings keys + `ERRORS.TELEGRAM_*`.
- `i18n/{en,ru}/notifications.json` — `telegram.connected_message`.

**Webapp:**
- `hooks/query/notifications.tsx` — `useConnectTelegram`, `useDisconnectTelegram`, extend response type.
- `containers/Notifications/NotificationsSettingsPage.tsx` — Telegram connect section + per-event channel checkboxes.
- `lang/{en,ru}/index.json` — `notifications.telegram.*` + `notifications.channel.*`.

---

# TRACK A — Foundation

## Task 1: `extractChatId` pure util

**Files:**
- Create: `packages/server/src/modules/Notifications/utils/extractChatId.ts`
- Test: `packages/server/src/modules/Notifications/utils/extractChatId.spec.ts`

- [ ] **Step 1: Write failing test**

```typescript
// © 2026 Bigfin
import { extractChatId } from './extractChatId';

describe('extractChatId', () => {
  it('пустой результат → null', () => {
    expect(extractChatId({ ok: true, result: [] })).toBeNull();
  });
  it('нет поля result → null', () => {
    expect(extractChatId({ ok: true } as any)).toBeNull();
  });
  it('берёт chat.id последнего апдейта с сообщением', () => {
    const res = {
      ok: true,
      result: [
        { update_id: 1, message: { chat: { id: 111 } } },
        { update_id: 2, message: { chat: { id: 222 } } },
      ],
    };
    expect(extractChatId(res)).toBe(222);
  });
  it('пропускает апдейты без message.chat.id, берёт последний валидный', () => {
    const res = {
      ok: true,
      result: [
        { update_id: 1, message: { chat: { id: 111 } } },
        { update_id: 2, edited_message: { foo: 'bar' } },
      ],
    };
    expect(extractChatId(res)).toBe(111);
  });
  it('групповой чат (отрицательный id) поддержан', () => {
    const res = { ok: true, result: [{ update_id: 1, message: { chat: { id: -1009 } } }] };
    expect(extractChatId(res)).toBe(-1009);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @bigfin/server test -- extractChatId`
- [ ] **Step 3: Implement**

```typescript
// © 2026 Bigfin

/**
 * Извлекает chat_id из ответа Telegram getUpdates.
 * Берёт последний апдейт, у которого есть message.chat.id; иначе null.
 */
export function extractChatId(updatesResponse: {
  ok?: boolean;
  result?: Array<{ message?: { chat?: { id?: number } } }>;
}): number | null {
  const result = updatesResponse?.result;
  if (!Array.isArray(result) || result.length === 0) return null;
  for (let i = result.length - 1; i >= 0; i -= 1) {
    const id = result[i]?.message?.chat?.id;
    if (typeof id === 'number') return id;
  }
  return null;
}
```

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** — `git add packages/server/src/modules/Notifications/utils/extractChatId.* && git commit -m "feat(notifications): чистый extractChatId из ответа getUpdates"`

---

## Task 2: `TelegramApiService` (axios transport)

**Files:**
- Create: `packages/server/src/modules/Notifications/delivery/TelegramApi.service.ts`
- Test: `packages/server/src/modules/Notifications/delivery/TelegramApi.service.spec.ts`

Depends on T3 for `ERRORS` — do T3 first or inline the strings; the code below imports from `../constants`.

- [ ] **Step 1: Write failing test** (mock axios)

```typescript
// © 2026 Bigfin
jest.mock('axios');
import axios from 'axios';
import { TelegramApiService } from './TelegramApi.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS } from '../constants';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TelegramApiService', () => {
  let service: TelegramApiService;
  beforeEach(() => {
    service = new TelegramApiService();
    jest.clearAllMocks();
  });

  it('getUpdates возвращает data при 200', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { ok: true, result: [] } } as any);
    const res = await service.getUpdates('TOKEN');
    expect(res).toEqual({ ok: true, result: [] });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.telegram.org/botTOKEN/getUpdates',
    );
  });

  it('getUpdates маппит 401 → TELEGRAM_INVALID_TOKEN', async () => {
    mockedAxios.get.mockRejectedValueOnce({ response: { status: 401 } });
    await expect(service.getUpdates('BAD')).rejects.toMatchObject({
      errorType: ERRORS.TELEGRAM_INVALID_TOKEN,
    });
    expect(ServiceError).toBeDefined();
  });

  it('getUpdates маппит 409 → TELEGRAM_WEBHOOK_SET', async () => {
    mockedAxios.get.mockRejectedValueOnce({ response: { status: 409 } });
    await expect(service.getUpdates('TOKEN')).rejects.toMatchObject({
      errorType: ERRORS.TELEGRAM_WEBHOOK_SET,
    });
  });

  it('sendMessage POST-ит chat_id и text', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { ok: true } } as any);
    await service.sendMessage('TOKEN', '222', 'привет');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.telegram.org/botTOKEN/sendMessage',
      { chat_id: '222', text: 'привет' },
    );
  });
});
```

> Note: `ServiceError`'s property holding the code — confirm the field name by opening `packages/server/src/modules/Items/ServiceError.ts`. The test uses `errorType`; if the class stores it under a different name (e.g. `errorCode`), adjust the `toMatchObject` key AND the implementation throws `new ServiceError(code)` regardless.

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @bigfin/server test -- TelegramApi.service`
- [ ] **Step 3: Implement**

```typescript
// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS } from '../constants';

const API_BASE = 'https://api.telegram.org';

@Injectable()
export class TelegramApiService {
  private baseFor(token: string) {
    return `${API_BASE}/bot${token}`;
  }

  /** Опрашивает входящие апдейты бота (для авто-привязки chat_id). */
  public async getUpdates(token: string): Promise<any> {
    try {
      const res = await axios.get(`${this.baseFor(token)}/getUpdates`);
      return res.data;
    } catch (err: any) {
      throw this.mapError(err);
    }
  }

  /** Отправляет текстовое сообщение в чат. */
  public async sendMessage(
    token: string,
    chatId: string,
    text: string,
  ): Promise<void> {
    try {
      await axios.post(`${this.baseFor(token)}/sendMessage`, {
        chat_id: chatId,
        text,
      });
    } catch (err: any) {
      throw this.mapError(err);
    }
  }

  private mapError(err: any): ServiceError {
    const status = err?.response?.status;
    if (status === 401 || status === 404) {
      return new ServiceError(ERRORS.TELEGRAM_INVALID_TOKEN);
    }
    if (status === 409) {
      return new ServiceError(ERRORS.TELEGRAM_WEBHOOK_SET);
    }
    return new ServiceError(ERRORS.TELEGRAM_API_ERROR);
  }
}
```

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** — `git add packages/server/src/modules/Notifications/delivery/TelegramApi.service.* && git commit -m "feat(notifications): axios-обёртка Telegram Bot API (getUpdates/sendMessage)"`

---

## Task 3: Constants — telegram settings keys + errors

**Files:** Modify `packages/server/src/modules/Notifications/constants.ts`

- [ ] **Step 1: Add keys** — replace the `ERRORS` block and add settings-key constants:

```typescript
// © 2026 Bigfin
export const NOTIFICATION_EVENTS = ['cash_gap', 'low_balance', 'overdue'] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const NOTIFICATIONS_QUEUE = 'notifications-evaluation';
export const NOTIFICATIONS_EVAL_JOB = 'evaluate-tenant';

export const DEFAULT_COOLDOWN_HOURS = 24;
export const DEFAULT_CASH_GAP_HORIZON_DAYS = 7;

export const SETTINGS_GROUP = 'notifications';

// Settings keys (group `notifications`).
export const SETTINGS_KEYS = {
  RECIPIENT_EMAIL: 'recipient_email',
  COOLDOWN_HOURS: 'cooldown_hours',
  TELEGRAM_BOT_TOKEN: 'telegram_bot_token',
  TELEGRAM_CHAT_ID: 'telegram_chat_id',
};

export const ERRORS = {
  INVALID_EVENT_TYPE: 'INVALID_EVENT_TYPE',
  TELEGRAM_INVALID_TOKEN: 'TELEGRAM_INVALID_TOKEN',
  TELEGRAM_NO_CHAT: 'TELEGRAM_NO_CHAT',
  TELEGRAM_WEBHOOK_SET: 'TELEGRAM_WEBHOOK_SET',
  TELEGRAM_API_ERROR: 'TELEGRAM_API_ERROR',
};
```

- [ ] **Step 2: Typecheck** — `pnpm --filter @bigfin/server exec tsc --noEmit` (expect exit 0)
- [ ] **Step 3: Commit** — `git commit -am "feat(notifications): константы telegram-настроек и коды ошибок"`

---

# TRACK B — Interface rework

## Task 4: `DeliveryChannel` v2 + `Candidate.channels`

**Files:** Modify `packages/server/src/modules/Notifications/delivery/DeliveryChannel.ts`, `packages/server/src/modules/Notifications/utils/selectToFire.ts`

- [ ] **Step 1: New interface**

```typescript
// © 2026 Bigfin
import { Candidate } from '../utils/selectToFire';

export interface DeliveryChannel {
  /** Идентификатор канала: 'email' | 'telegram' | (позже) 'in_app'. */
  readonly key: string;
  /** Настроен ли канал для текущей организации (адрес/токен есть). */
  isConfigured(): Promise<boolean>;
  /** Доставляет уведомление; адрес канал резолвит сам (из настроек/CLS). */
  deliver(candidate: Candidate): Promise<void>;
}
```

- [ ] **Step 2: Add `channels` to `Candidate`** — in `utils/selectToFire.ts`, extend the interface (do not change `selectToFire` logic — it passes objects through unchanged):

```typescript
export interface Candidate {
  eventType: string;
  dedupKey: string;
  title: string;
  body: string;
  payload: any;
  channels?: string[]; // каналы из preference; проставляет процессор
}
```

- [ ] **Step 3: Typecheck — expect FAIL** — `pnpm --filter @bigfin/server exec tsc --noEmit` will now error in `EmailChannel.service.ts` (old `deliver(candidate, recipient)` signature) and `NotificationEvaluation.processor.ts` (calls `email.deliver(c, recipient)`). That is expected; T5 + T10 fix them. Note the errors and proceed.
- [ ] **Step 4: Commit** — `git commit -am "feat(notifications): DeliveryChannel v2 (isConfigured + deliver(candidate)) + Candidate.channels"`

---

## Task 5: `EmailChannel` self-addressing

**Files:** Modify `packages/server/src/modules/Notifications/delivery/EmailChannel.service.ts`

- [ ] **Step 1: Rewrite to implement v2** (inject settings + reuse `resolveRecipient`)

```typescript
// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';
import { MailTransporter } from '@/modules/Mail/MailTransporter.service';
import { Mail } from '@/modules/Mail/Mail';
import { DeliveryChannel } from './DeliveryChannel';
import { Candidate } from '../utils/selectToFire';
import { NotificationsSettingsService } from '../NotificationsSettings.service';
import { resolveRecipient } from '../utils/resolveRecipient';

@Injectable()
export class EmailChannelService implements DeliveryChannel {
  readonly key = 'email';

  constructor(
    private readonly orgI18n: OrganizationI18nService,
    private readonly mailTransporter: MailTransporter,
    private readonly settings: NotificationsSettingsService,
  ) {}

  public async isConfigured(): Promise<boolean> {
    const { recipientEmail } = await this.settings.get();
    return resolveRecipient(recipientEmail) !== null;
  }

  public async deliver(candidate: Candidate): Promise<void> {
    const { recipientEmail } = await this.settings.get();
    const recipient = resolveRecipient(recipientEmail);
    if (!recipient) return;

    const args = candidate.payload ?? {};
    const subject = await this.orgI18n.translate(
      `notifications.${candidate.eventType}.title`,
    );
    const body = await this.orgI18n.translate(
      `notifications.${candidate.eventType}.body`,
      { args },
    );
    const footer = await this.orgI18n.translate('notifications.email_footer');

    const mail = new Mail()
      .setSubject(subject)
      .setTo(recipient)
      .setView('mail/Notification.html')
      .setData({ title: subject, body, footer } as any);

    await this.mailTransporter.send(mail);
  }
}
```

- [ ] **Step 2: Typecheck** — `pnpm --filter @bigfin/server exec tsc --noEmit`. `EmailChannel` errors clear; the processor still errors (fixed in T10). OK to proceed.
- [ ] **Step 3: Commit** — `git commit -am "feat(notifications): EmailChannel сам резолвит получателя (DeliveryChannel v2)"`

---

# TRACK C — Telegram delivery + connect

## Task 6: `NotificationsSettings.getTelegram()`

**Files:** Modify `packages/server/src/modules/Notifications/NotificationsSettings.service.ts`

- [ ] **Step 1: Add getter** (append method; reuse `SETTINGS_KEYS`)

```typescript
// add import:
import { SETTINGS_GROUP, DEFAULT_COOLDOWN_HOURS, SETTINGS_KEYS } from './constants';

// add method inside the class:
  public async getTelegram(): Promise<{ botToken: string | null; chatId: string | null }> {
    const store = await this.settingsStore();
    const botToken = store.get(
      { group: SETTINGS_GROUP, key: SETTINGS_KEYS.TELEGRAM_BOT_TOKEN },
      null,
    ) as string | null;
    const chatId = store.get(
      { group: SETTINGS_GROUP, key: SETTINGS_KEYS.TELEGRAM_CHAT_ID },
      null,
    ) as string | null;
    // Пустая строка (после disconnect) трактуется как «не задано».
    return {
      botToken: botToken || null,
      chatId: chatId || null,
    };
  }
```

> The existing `get()` uses string literals `'cooldown_hours'`/`'recipient_email'`; you may optionally switch them to `SETTINGS_KEYS.*` for consistency, but it is not required.

- [ ] **Step 2: Typecheck** — `pnpm --filter @bigfin/server exec tsc --noEmit`
- [ ] **Step 3: Commit** — `git commit -am "feat(notifications): чтение telegram-настроек (getTelegram)"`

---

## Task 7: `TelegramChannelService`

**Files:** Create `packages/server/src/modules/Notifications/delivery/TelegramChannel.service.ts`

- [ ] **Step 1: Implement**

```typescript
// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';
import { DeliveryChannel } from './DeliveryChannel';
import { TelegramApiService } from './TelegramApi.service';
import { Candidate } from '../utils/selectToFire';
import { NotificationsSettingsService } from '../NotificationsSettings.service';

@Injectable()
export class TelegramChannelService implements DeliveryChannel {
  readonly key = 'telegram';

  constructor(
    private readonly orgI18n: OrganizationI18nService,
    private readonly api: TelegramApiService,
    private readonly settings: NotificationsSettingsService,
  ) {}

  public async isConfigured(): Promise<boolean> {
    const { botToken, chatId } = await this.settings.getTelegram();
    return Boolean(botToken && chatId);
  }

  public async deliver(candidate: Candidate): Promise<void> {
    const { botToken, chatId } = await this.settings.getTelegram();
    if (!botToken || !chatId) return;

    const args = candidate.payload ?? {};
    const title = await this.orgI18n.translate(
      `notifications.${candidate.eventType}.title`,
    );
    const body = await this.orgI18n.translate(
      `notifications.${candidate.eventType}.body`,
      { args },
    );
    const footer = await this.orgI18n.translate('notifications.email_footer');

    const text = `${title}\n\n${body}\n\n${footer}`;
    await this.api.sendMessage(botToken, chatId, text);
  }
}
```

- [ ] **Step 2: Typecheck** — `pnpm --filter @bigfin/server exec tsc --noEmit`
- [ ] **Step 3: Commit** — `git add packages/server/src/modules/Notifications/delivery/TelegramChannel.service.ts && git commit -m "feat(notifications): TelegramChannel (DeliveryChannel) — доставка через Bot API"`

---

## Task 8: `ConnectTelegramService` + DTO

**Files:**
- Create: `packages/server/src/modules/Notifications/dtos/ConnectTelegram.dto.ts`
- Create: `packages/server/src/modules/Notifications/commands/ConnectTelegram.service.ts`

- [ ] **Step 1: DTO**

```typescript
// © 2026 Bigfin
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConnectTelegramDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '123456:ABC-DEF...' })
  botToken: string;
}
```

- [ ] **Step 2: ConnectTelegram service**

```typescript
// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TelegramApiService } from '../delivery/TelegramApi.service';
import { extractChatId } from '../utils/extractChatId';
import { SETTINGS_GROUP, SETTINGS_KEYS, ERRORS } from '../constants';

@Injectable()
export class ConnectTelegramService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,
    private readonly api: TelegramApiService,
    private readonly orgI18n: OrganizationI18nService,
  ) {}

  /** Привязывает бота организации: сохраняет токен, авто-резолвит chat_id, шлёт подтверждение. */
  public async connect(botToken: string): Promise<{ connected: true }> {
    const store = await this.settingsStore();

    // 1. Сохраняем токен.
    store.set({ group: SETTINGS_GROUP, key: SETTINGS_KEYS.TELEGRAM_BOT_TOKEN, value: botToken });
    await store.save();

    // 2. Достаём chat_id из входящих (пользователь должен был написать /start).
    const updates = await this.api.getUpdates(botToken);
    const chatId = extractChatId(updates);
    if (chatId === null) {
      throw new ServiceError(ERRORS.TELEGRAM_NO_CHAT);
    }

    // 3. Сохраняем chat_id.
    store.set({ group: SETTINGS_GROUP, key: SETTINGS_KEYS.TELEGRAM_CHAT_ID, value: String(chatId) });
    await store.save();

    // 4. Подтверждение в чат (на языке организации).
    const text = await this.orgI18n.translate('notifications.telegram.connected_message');
    await this.api.sendMessage(botToken, String(chatId), text);

    return { connected: true };
  }

  /** Отвязывает бота: очищает токен и chat_id. */
  public async disconnect(): Promise<{ connected: false }> {
    const store = await this.settingsStore();
    store.set({ group: SETTINGS_GROUP, key: SETTINGS_KEYS.TELEGRAM_BOT_TOKEN, value: '' });
    store.set({ group: SETTINGS_GROUP, key: SETTINGS_KEYS.TELEGRAM_CHAT_ID, value: '' });
    await store.save();
    return { connected: false };
  }
}
```

> Confirm `SettingsStore.set`/`save` signatures match `commands/UpdateNotificationPreferences.service.ts` (they do: `store.set({ group, key, value }); await store.save();`).

- [ ] **Step 3: Typecheck** — `pnpm --filter @bigfin/server exec tsc --noEmit`
- [ ] **Step 4: Commit** — `git add packages/server/src/modules/Notifications/commands/ConnectTelegram.service.ts packages/server/src/modules/Notifications/dtos/ConnectTelegram.dto.ts && git commit -m "feat(notifications): команда привязки/отвязки telegram-бота"`

---

# TRACK D — Dispatch + wiring

## Task 9: Processor channel-registry dispatch

**Files:** Modify `packages/server/src/modules/Notifications/jobs/NotificationEvaluation.processor.ts`

- [ ] **Step 1: Inject Telegram channel + build registry.** Add import and constructor param:

```typescript
import { TelegramChannelService } from '../delivery/TelegramChannel.service';
import { DeliveryChannel } from '../delivery/DeliveryChannel';
```

Add to constructor (after `private readonly email: EmailChannelService,`):

```typescript
    private readonly telegram: TelegramChannelService,
```

- [ ] **Step 2: Attach `channels` to candidates.** In the evaluator loop, parse each preference's channels and tag the candidates it produced. Replace the existing candidate-collection block with:

```typescript
    const candidates: Candidate[] = [];
    for (const pref of prefs) {
      const threshold = pref.threshold ? JSON.parse(pref.threshold) : {};
      let prefChannels: string[] = ['email'];
      try {
        prefChannels = pref.channels ? JSON.parse(pref.channels) : ['email'];
      } catch {
        prefChannels = ['email'];
      }

      let produced: Candidate[] = [];
      if (pref.eventType === 'cash_gap') {
        produced = await this.cashGap.evaluate(threshold);
      } else if (pref.eventType === 'low_balance') {
        produced = await this.lowBalance.evaluate(threshold);
      } else if (pref.eventType === 'overdue') {
        produced = await this.overdue.evaluate(threshold);
      }
      produced.forEach((c) => {
        c.channels = prefChannels;
      });
      candidates.push(...produced);
    }
```

- [ ] **Step 3: Replace the delivery block** (the per-candidate insert + hardcoded email) with a channel-registry dispatch. Replace the `for (const candidate of toFire) { ... }` loop body's delivery part:

```typescript
    const registry: Record<string, DeliveryChannel> = {
      [this.email.key]: this.email,
      [this.telegram.key]: this.telegram,
    };

    let posted = 0;
    for (const candidate of toFire) {
      const firedAt = moment().toMySqlDateTime();

      const inserted: any = await this.notifModel().query().insertAndFetch({
        eventType: candidate.eventType,
        title: candidate.title,
        body: candidate.body,
        dedupKey: candidate.dedupKey,
        payload: JSON.stringify(candidate.payload ?? {}),
        firedAt,
        channelsSent: JSON.stringify([]),
      } as any);

      const channelsSent: string[] = [];
      const wanted = candidate.channels?.length ? candidate.channels : ['email'];
      for (const key of wanted) {
        const channel = registry[key];
        if (!channel) continue;
        if (!(await channel.isConfigured())) continue;
        try {
          await channel.deliver(candidate);
          channelsSent.push(key);
        } catch (err) {
          console.error(
            `[notifications] ${key} delivery failed for ${candidate.eventType}:`,
            err,
          );
        }
      }

      await this.notifModel()
        .query()
        .findById(inserted.id)
        .patch({ channelsSent: JSON.stringify(channelsSent) } as any);

      posted++;
    }

    return { posted };
```

> Remove the now-unused `recipient`/`resolveRecipient` lines and the `import { resolveRecipient }` from the processor (EmailChannel owns addressing now). Keep the `settings.get()` call only if `cooldownHours` is still read from it (it is — keep `const { cooldownHours } = await this.settings.get();`).

- [ ] **Step 4: Typecheck — expect PASS now** — `pnpm --filter @bigfin/server exec tsc --noEmit` (T4's processor error clears here).
- [ ] **Step 5: Commit** — `git commit -am "feat(notifications): диспетчер каналов в процессоре (email+telegram по preference)"`

---

## Task 10: `GetNotificationPreferences` returns telegram status

**Files:** Modify `packages/server/src/modules/Notifications/queries/GetNotificationPreferences.service.ts`

- [ ] **Step 1: Add telegram block** — change the tail of `getPreferences()`:

```typescript
    const { cooldownHours, recipientEmail } = await this.settings.get();
    const { botToken, chatId } = await this.settings.getTelegram();

    return {
      preferences,
      recipientEmail,
      cooldownHours,
      telegram: { connected: Boolean(botToken && chatId) },
    };
```

- [ ] **Step 2: Typecheck** — `pnpm --filter @bigfin/server exec tsc --noEmit`
- [ ] **Step 3: Commit** — `git commit -am "feat(notifications): GET preferences отдаёт статус подключения telegram"`

---

## Task 11: Application + controller endpoints

**Files:** Modify `packages/server/src/modules/Notifications/Notifications.application.ts`, `packages/server/src/modules/Notifications/Notifications.controller.ts`

- [ ] **Step 1: Application** — inject `ConnectTelegramService`, add two methods:

```typescript
// add import:
import { ConnectTelegramService } from './commands/ConnectTelegram.service';

// add constructor param:
    private readonly connectTelegramService: ConnectTelegramService,

// add methods:
  connectTelegram(botToken: string) {
    return this.connectTelegramService.connect(botToken);
  }

  disconnectTelegram() {
    return this.connectTelegramService.disconnect();
  }
```

- [ ] **Step 2: Controller** — add `Post` import, `ConnectTelegramDto` import, two routes:

```typescript
// update nest import:
import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
// add import:
import { ConnectTelegramDto } from './dtos/ConnectTelegram.dto';

// add inside the class:
  @Post('telegram/connect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Connect the organization Telegram bot (admin only).' })
  connectTelegram(@Body() dto: ConnectTelegramDto) {
    return this.app.connectTelegram(dto.botToken);
  }

  @Post('telegram/disconnect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Disconnect the organization Telegram bot (admin only).' })
  disconnectTelegram() {
    return this.app.disconnectTelegram();
  }
```

- [ ] **Step 3: Typecheck** — `pnpm --filter @bigfin/server exec tsc --noEmit`
- [ ] **Step 4: Commit** — `git commit -am "feat(notifications): эндпоинты telegram/connect и telegram/disconnect"`

---

## Task 12: Module registration + i18n message

**Files:** Modify `packages/server/src/modules/Notifications/Notifications.module.ts`, `packages/server/src/i18n/en/notifications.json`, `packages/server/src/i18n/ru/notifications.json`

- [ ] **Step 1: Register providers** — add imports and providers:

```typescript
// add imports:
import { TelegramApiService } from './delivery/TelegramApi.service';
import { TelegramChannelService } from './delivery/TelegramChannel.service';
import { ConnectTelegramService } from './commands/ConnectTelegram.service';

// add to providers array (after EmailChannelService):
    TelegramApiService,
    TelegramChannelService,
    ConnectTelegramService,
```

- [ ] **Step 2: Add i18n key** — in BOTH `i18n/en/notifications.json` and `i18n/ru/notifications.json`, add under the `telegram` object (create it if absent):

`en`:
```json
  "telegram": { "connected_message": "✅ Bigfin connected. Notifications will arrive here." }
```
`ru`:
```json
  "telegram": { "connected_message": "✅ Bigfin подключён. Уведомления будут приходить сюда." }
```

> Insert as a new top-level key inside the existing JSON object (mind the trailing comma on the preceding key). Keep keys identical EN↔RU.

- [ ] **Step 3: Parity + typecheck** — `node packages/server/scripts/i18n-parity-check.js` (expect 0 diffs); `pnpm --filter @bigfin/server exec tsc --noEmit`
- [ ] **Step 4: Commit** — `git commit -am "feat(notifications): регистрация telegram-провайдеров + i18n подтверждения"`

---

# TRACK E — Frontend

## Task 13: Query hooks

**Files:** Modify `packages/webapp/src/hooks/query/notifications.tsx`

- [ ] **Step 1: Extend response type** — add to `NotificationPreferencesResponse`:

```typescript
export interface NotificationPreferencesResponse {
  preferences: NotificationPreferenceItem[];
  recipientEmail: string | null;
  cooldownHours: number;
  telegram?: { connected: boolean };
}
```

- [ ] **Step 2: Add mutation hooks** — append:

```typescript
/** Подключить telegram-бота (POST notifications/telegram/connect). */
export function useConnectTelegram(
  props?: UseMutationOptions<any, any, { botToken: string }>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { botToken: string }>(
    (values) => api.post('notifications/telegram/connect', values),
    {
      onSuccess: () => {
        client.invalidateQueries(t.NOTIFICATION_PREFERENCES);
      },
      ...props,
    },
  );
}

/** Отключить telegram-бота (POST notifications/telegram/disconnect). */
export function useDisconnectTelegram(props?: UseMutationOptions<any, any, void>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, void>(
    () => api.post('notifications/telegram/disconnect', {}),
    {
      onSuccess: () => {
        client.invalidateQueries(t.NOTIFICATION_PREFERENCES);
      },
      ...props,
    },
  );
}
```

- [ ] **Step 3: Typecheck** — `pnpm --filter @bigfin/webapp exec tsc --noEmit`
- [ ] **Step 4: Commit** — `git commit -am "feat(notifications): web-хуки connect/disconnect telegram"`

---

## Task 14: Settings page — Telegram section + channel checkboxes

**Files:** Modify `packages/webapp/src/containers/Notifications/NotificationsSettingsPage.tsx`; add lang keys to `packages/webapp/src/lang/{en,ru}/index.json`

- [ ] **Step 1: Add lang keys** (parity en+ru). EN values shown; RU equivalents in parentheses:

```
notifications.telegram.section        = "Telegram"            (RU: "Telegram")
notifications.telegram.help           = "Create a bot via @BotFather, copy the token, send /start to your bot, then paste the token here." (RU: "Создайте бота в @BotFather, скопируйте токен, напишите боту /start, затем вставьте токен сюда.")
notifications.telegram.token_label    = "Bot token"           (RU: "Токен бота")
notifications.telegram.connect        = "Connect"             (RU: "Подключить")
notifications.telegram.disconnect     = "Disconnect"          (RU: "Отключить")
notifications.telegram.connected      = "Connected"           (RU: "Подключено")
notifications.telegram.toast.connected = "Telegram connected" (RU: "Telegram подключён")
notifications.telegram.toast.disconnected = "Telegram disconnected" (RU: "Telegram отключён")
notifications.telegram.error.no_chat  = "Send /start to your bot in Telegram, then try again." (RU: "Напишите боту /start в Telegram и повторите.")
notifications.telegram.error.invalid_token = "Invalid bot token. Check the token from @BotFather." (RU: "Неверный токен бота. Проверьте токен от @BotFather.")
notifications.telegram.error.generic  = "Could not connect Telegram." (RU: "Не удалось подключить Telegram.")
notifications.channel.email           = "Email"               (RU: "Email")
notifications.channel.telegram        = "Telegram"            (RU: "Telegram")
notifications.settings.channels       = "Channels"            (RU: "Каналы")
```

Run `node packages/webapp/scripts/lang-check.js` (expect 0) after editing.

- [ ] **Step 2: Add imports + a reusable channel-checkbox row.** Near the top imports add hooks:

```typescript
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useConnectTelegram,
  useDisconnectTelegram,
} from '@/hooks/query/notifications';
```

Add a helper component above `NotificationsSettingsPage` that toggles a channel inside a `channels` string[] field via RHF:

```typescript
function ChannelToggles({
  control,
  name,
  telegramConnected,
}: {
  control: any;
  name: 'cashGap.channels' | 'lowBalance.channels' | 'overdue.channels';
  telegramConnected: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value: string[] = field.value ?? ['email'];
        const toggle = (key: string, on: boolean) => {
          const next = on
            ? Array.from(new Set([...value, key]))
            : value.filter((c) => c !== key);
          field.onChange(next.length ? next : ['email']);
        };
        return (
          <FormItem className="pl-6">
            <FormLabel>{intl.get('notifications.settings.channels')}</FormLabel>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={value.includes('email')}
                  onCheckedChange={(c) => toggle('email', Boolean(c))}
                />
                {intl.get('notifications.channel.email')}
              </label>
              {telegramConnected && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={value.includes('telegram')}
                    onCheckedChange={(c) => toggle('telegram', Boolean(c))}
                  />
                  {intl.get('notifications.channel.telegram')}
                </label>
              )}
            </div>
          </FormItem>
        );
      }}
    />
  );
}
```

- [ ] **Step 3: Wire hooks + telegram state in the component.** Inside `NotificationsSettingsPage`, after `const updatePreferences = ...`:

```typescript
  const connectTelegram = useConnectTelegram();
  const disconnectTelegram = useDisconnectTelegram();
  const [tokenInput, setTokenInput] = React.useState('');
  const telegramConnected = Boolean((data as any)?.telegram?.connected);

  const onConnectTelegram = async () => {
    try {
      await connectTelegram.mutateAsync({ botToken: tokenInput.trim() });
      setTokenInput('');
      toast.success(intl.get('notifications.telegram.toast.connected'));
    } catch (e: any) {
      const code = e?.response?.data?.errors?.[0]?.type;
      const msg =
        code === 'TELEGRAM_NO_CHAT'
          ? intl.get('notifications.telegram.error.no_chat')
          : code === 'TELEGRAM_INVALID_TOKEN'
          ? intl.get('notifications.telegram.error.invalid_token')
          : intl.get('notifications.telegram.error.generic');
      toast.error(msg);
    }
  };

  const onDisconnectTelegram = async () => {
    await disconnectTelegram.mutateAsync();
    toast.success(intl.get('notifications.telegram.toast.disconnected'));
  };
```

> Confirm the server error envelope shape (`errors[0].type`) against how the webapp reads other ServiceError responses (the ㉒-1 / Payroll pages detect `errors[].type`). Adjust the `code` path if the project uses a different field.

- [ ] **Step 4: Render `<ChannelToggles>` per event** — add directly under each event's description `<p>`:
  - Cash gap (after line with `cash_gap.description`): `<ChannelToggles control={form.control} name="cashGap.channels" telegramConnected={telegramConnected} />`
  - Low balance: `<ChannelToggles control={form.control} name="lowBalance.channels" telegramConnected={telegramConnected} />`
  - Overdue: `<ChannelToggles control={form.control} name="overdue.channels" telegramConnected={telegramConnected} />`

- [ ] **Step 5: Add the Telegram card** — insert a new `<Card>` after the Delivery section card (before the submit `<div>`):

```tsx
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {intl.get('notifications.telegram.section')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {telegramConnected ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-green-600">
                      {intl.get('notifications.telegram.connected')} ✅
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onDisconnectTelegram}
                      disabled={disconnectTelegram.isLoading}
                    >
                      {intl.get('notifications.telegram.disconnect')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {intl.get('notifications.telegram.help')}
                    </p>
                    <div className="flex items-end gap-3 max-w-lg">
                      <div className="flex flex-col gap-1 flex-1">
                        <label className="text-sm">
                          {intl.get('notifications.telegram.token_label')}
                        </label>
                        <Input
                          value={tokenInput}
                          onChange={(e) => setTokenInput(e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={onConnectTelegram}
                        disabled={!tokenInput.trim() || connectTelegram.isLoading}
                      >
                        {intl.get('notifications.telegram.connect')}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
```

> The connect/disconnect buttons are `type="button"` so they do NOT submit the RHF form. The token input is plain local state (`tokenInput`), intentionally outside the Zod schema.

- [ ] **Step 6: Typecheck + lang-check** — `pnpm --filter @bigfin/webapp exec tsc --noEmit`; `node packages/webapp/scripts/lang-check.js`
- [ ] **Step 7: Commit** — `git commit -am "feat(notifications): UI подключения telegram + выбор каналов на событие"`

---

# TRACK F — Verification

## Task 15: End-to-end static verification

- [ ] **Step 1: Full static suite** (Node 18):
  - `pnpm typecheck` (3 packages) — expect exit 0
  - `pnpm --filter @bigfin/server test -- Notifications extractChatId TelegramApi` — expect all PASS
  - `node packages/webapp/scripts/lang-check.js` — expect parity OK
  - `node packages/server/scripts/i18n-parity-check.js` — expect parity OK
- [ ] **Step 2: Live (staging / requires real bot)** — cannot complete locally (no real bot token; SMTP/local caveats per 㒂-1). On staging: create a bot in @BotFather, `/start` it, `POST /notifications/telegram/connect { botToken }` → expect confirmation message in Telegram + `{connected:true}`; enable an event with `channels:['telegram']`; trigger the processor (enqueue `{organizationId}` to `notifications-evaluation`) → expect a Telegram message + a `notifications` row with `channels_sent` containing `telegram`. Re-run → cooldown prevents duplicate.
- [ ] **Step 3: Report** — what passed statically; what is blocked on staging (live Telegram delivery).

---

## Self-Review (plan author)

- **Spec coverage:** §1 storage → T3,T6; §2 connect flow → T1,T8,T11; §3 dispatcher rework → T4,T5,T9; §4 transport → T2,T7; §5 errors/security/tests → T2,T8,T15; §6 frontend → T13,T14; §7 files → all tasks; §8 anti-scope respected (no webhook, no library, single chat, plaintext token, plain text). All covered.
- **Placeholder scan:** Two `> Confirm ...` notes (ServiceError field name in T2; webapp error-envelope shape in T14) point at REAL files for signatures not verifiable without running — concrete pointers, not vague TODOs. All code blocks are complete.
- **Type consistency:** `Candidate.channels?` (T4) consumed by processor (T9); `DeliveryChannel` v2 (`isConfigured`+`deliver(candidate)`) implemented identically by Email (T5) and Telegram (T7) and called via registry (T9); `SETTINGS_KEYS`/`ERRORS.TELEGRAM_*` (T3) used by T2/T6/T8; `getTelegram()` (T6) consumed by T7/T10; response `telegram:{connected}` (T10) read by web type (T13) and page (T14); hook names `useConnectTelegram`/`useDisconnectTelegram` consistent T13↔T14.

**Known assumption:** the executing agent verifies the two `> Confirm` items against real files (ServiceError property name; webapp ServiceError response envelope) before relying on them — both compile regardless, only the error-display mapping depends on the envelope shape.
