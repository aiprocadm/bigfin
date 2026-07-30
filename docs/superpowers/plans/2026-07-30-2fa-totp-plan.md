# ㉚ 2FA (TOTP + резервные коды) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Двухфакторная аутентификация аккаунта: TOTP-коды из приложения-аутентификатора + одноразовые резервные коды, двухшаговый вход, страница «Безопасность» в настройках.

**Architecture:** Новый модуль `TwoFactor` на сервере (утилиты на `node:crypto`, сервисы-команды по образцу Auth), правка двухшагового входа в `Auth`, миграция system-схемы. На фронте — второй шаг LoginPage и новая страница Preferences. Спека: `docs/superpowers/specs/2026-07-30-2fa-totp-design.md`.

**Tech Stack:** NestJS 10, Objection/Knex (MySQL), Jest; React 18 + shadcn + RHF/Zod; без новых npm-зависимостей (TOTP свой, QR — вендоренный qrcodegen MIT).

## Global Constraints

- **Никаких новых npm-пакетов**; `pnpm-lock.yaml` не трогать (защищён хуком), `pnpm install` не запускать.
- Node 24 на сервере (jest/tsc работают), команды из корня worktree.
- Миграция ТОЛЬКО в `packages/server/src/database/system/migrations/` с рабочим `down()`.
- Бренд строго `Bigfin`. Новый auth-UI (D-redesign) пишется по-русски захардкоженно (как весь `LoginPage.tsx`); страницы Preferences — через `intl.get(...)` с парными ключами en/ru + `node packages/webapp/scripts/lang-check.js`.
- Ответы API на фронт приходят в snake_case (`access_token`) — новые поля читать как `requires_two_factor`, `two_factor_token`; проверить вживую по network.
- Тесты сервера: `pnpm --filter @bigfin/server test -- <путь>` (полный прогон ~10 с). Typecheck: `pnpm typecheck`.
- Коммиты мелкие; PR базировать на `develop` (ветки `main` нет!), `gh pr create --head <branch>`.

---

## Срез 1 — Backend-ядро (PR A)

### Task 1: Миграция system: 2FA-колонки в `users`

**Files:**
- Create: `packages/server/src/database/system/migrations/20260730100000_add_two_factor_to_users.js`

**Interfaces:**
- Produces: колонки `two_factor_enabled` (bool, def false), `two_factor_secret` (string 512), `two_factor_backup_codes` (text), `two_factor_enabled_at` (datetime).

- [ ] **Step 1: Написать миграцию**

```js
exports.up = (knex) =>
  knex.schema.table('users', (table) => {
    table.boolean('two_factor_enabled').notNullable().defaultTo(false);
    table.string('two_factor_secret', 512);
    table.text('two_factor_backup_codes');
    table.datetime('two_factor_enabled_at');
  });

exports.down = (knex) =>
  knex.schema.table('users', (table) => {
    table.dropColumn('two_factor_enabled');
    table.dropColumn('two_factor_secret');
    table.dropColumn('two_factor_backup_codes');
    table.dropColumn('two_factor_enabled_at');
  });
```

- [ ] **Step 2: Прогнать оба направления на живой БД** (`pnpm system:migrate:latest` → `rollback` → `latest`; если живой БД в окружении нет — отметить в PR, что прогон на стенде)
- [ ] **Step 3: Commit** `feat: миграция 2FA-колонок users (system)`

### Task 2: Утилиты base32 + TOTP (RFC 6238) с тестами на эталонных векторах

**Files:**
- Create: `packages/server/src/modules/TwoFactor/utils/base32.ts`
- Create: `packages/server/src/modules/TwoFactor/utils/totp.ts`
- Test: `packages/server/src/modules/TwoFactor/utils/totp.spec.ts`

**Interfaces:**
- Produces: `base32Encode(buf: Buffer): string`, `base32Decode(s: string): Buffer`;
  `generateTotpSecret(): string` (base32, 20 байт), `generateTotpCode(secretBase32: string, timeMs: number): string` (6 цифр), `verifyTotpCode(secretBase32: string, code: string, timeMs?: number): boolean` (окно ±1 шаг 30 с, `timingSafeEqual`), `buildOtpAuthUri(secretBase32: string, email: string): string`.

- [ ] **Step 1: Написать падающий тест** (векторы RFC 6238 для SHA-1: секрет ASCII `12345678901234567890` = base32 `GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ`; 8-значные эталоны усечены до 6 последних цифр)

```ts
import { base32Decode, base32Encode } from './base32';
import { generateTotpCode, verifyTotpCode, generateTotpSecret, buildOtpAuthUri } from './totp';

const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('base32', () => {
  it('кодирует и декодирует туда-обратно', () => {
    expect(base32Decode(SECRET).toString('ascii')).toBe('12345678901234567890');
    expect(base32Encode(Buffer.from('12345678901234567890', 'ascii'))).toBe(SECRET);
  });
});

describe('generateTotpCode (векторы RFC 6238, SHA-1)', () => {
  it.each([
    [59_000, '287082'],          // RFC: 94287082
    [1_111_111_109_000, '081804'], // RFC: 07081804
    [1_234_567_890_000, '005924'], // RFC: 89005924
    [2_000_000_000_000, '279037'], // RFC: 69279037
  ])('t=%i → %s', (timeMs, expected) => {
    expect(generateTotpCode(SECRET, timeMs)).toBe(expected);
  });
});

describe('verifyTotpCode', () => {
  it('принимает код текущего шага и соседних (±30 с)', () => {
    const t = 1_234_567_890_000;
    expect(verifyTotpCode(SECRET, generateTotpCode(SECRET, t), t)).toBe(true);
    expect(verifyTotpCode(SECRET, generateTotpCode(SECRET, t - 30_000), t)).toBe(true);
    expect(verifyTotpCode(SECRET, generateTotpCode(SECRET, t + 30_000), t)).toBe(true);
  });
  it('отклоняет код из далёкого прошлого и мусор', () => {
    const t = 1_234_567_890_000;
    expect(verifyTotpCode(SECRET, generateTotpCode(SECRET, t - 120_000), t)).toBe(false);
    expect(verifyTotpCode(SECRET, '000000', t)).toBe(false);
    expect(verifyTotpCode(SECRET, '12345a', t)).toBe(false);
  });
});

describe('generateTotpSecret / buildOtpAuthUri', () => {
  it('секрет — валидный base32 на 20 байт, uri — стандартный', () => {
    const s = generateTotpSecret();
    expect(base32Decode(s).length).toBe(20);
    expect(buildOtpAuthUri(s, 'a@b.ru')).toBe(
      `otpauth://totp/Bigfin:${encodeURIComponent('a@b.ru')}?secret=${s}&issuer=Bigfin&algorithm=SHA1&digits=6&period=30`,
    );
  });
});
```

- [ ] **Step 2: Прогнать — убедиться, что падает** (`pnpm --filter @bigfin/server test -- src/modules/TwoFactor`)
- [ ] **Step 3: Реализовать**

```ts
// base32.ts (RFC 4648, без паддинга при декоде — паддинг '=' допускаем на входе)
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}
```

```ts
// totp.ts
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { base32Decode, base32Encode } from './base32';

const STEP_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1; // ±1 шаг

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(key: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

export function generateTotpCode(secretBase32: string, timeMs: number = Date.now()): string {
  const counter = Math.floor(timeMs / 1000 / STEP_SECONDS);
  return hotp(base32Decode(secretBase32), counter);
}

export function verifyTotpCode(secretBase32: string, code: string, timeMs: number = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(timeMs / 1000 / STEP_SECONDS);
  const key = base32Decode(secretBase32);
  let valid = false;
  for (let i = -WINDOW; i <= WINDOW; i += 1) {
    const expected = hotp(key, counter + i);
    // timingSafeEqual по буферам одинаковой длины
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) valid = true;
  }
  return valid;
}

export function buildOtpAuthUri(secretBase32: string, email: string): string {
  return `otpauth://totp/Bigfin:${encodeURIComponent(email)}?secret=${secretBase32}&issuer=Bigfin&algorithm=SHA1&digits=6&period=30`;
}
```

- [ ] **Step 4: Прогнать — зелёные**
- [ ] **Step 5: Commit** `feat: TOTP и base32 утилиты 2FA (RFC 6238, без зависимостей)`

### Task 3: Резервные коды + шифрование секрета

**Files:**
- Create: `packages/server/src/modules/TwoFactor/utils/backupCodes.ts`
- Create: `packages/server/src/modules/TwoFactor/utils/secretCipher.ts`
- Test: `packages/server/src/modules/TwoFactor/utils/backupCodes.spec.ts`
- Test: `packages/server/src/modules/TwoFactor/utils/secretCipher.spec.ts`

**Interfaces:**
- Produces: `generateBackupCodes(): string[]` (10 кодов `XXXX-XXXX`, алфавит `23456789ABCDEFGHJKMNPQRSTUVWXYZ`);
  `hashBackupCodes(codes: string[]): Promise<string[]>` (bcrypt);
  `consumeBackupCode(hashes: string[], code: string): Promise<string[] | null>` — null, если код не подошёл; иначе список БЕЗ использованного хэша;
  `encryptTwoFactorSecret(plain: string, appSecret: string): string` (формат `iv:tag:ciphertext`, base64) и `decryptTwoFactorSecret(payload: string, appSecret: string): string` (AES-256-GCM, ключ `scryptSync(appSecret, 'bigfin-2fa', 32)`).

- [ ] **Step 1: Падающие тесты**

```ts
// backupCodes.spec.ts
import { generateBackupCodes, hashBackupCodes, consumeBackupCode } from './backupCodes';

describe('backupCodes', () => {
  it('генерирует 10 уникальных кодов формата XXXX-XXXX', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    codes.forEach((c) => expect(c).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/));
  });
  it('расходует код ровно один раз', async () => {
    const codes = generateBackupCodes();
    const hashes = await hashBackupCodes(codes);
    const rest = await consumeBackupCode(hashes, codes[3]);
    expect(rest).toHaveLength(9);
    expect(await consumeBackupCode(rest!, codes[3])).toBeNull(); // повторно не проходит
    expect(await consumeBackupCode(hashes, 'ZZZZ-ZZZZ')).toBeNull();
  });
  it('не чувствителен к регистру и пробелам вокруг', async () => {
    const codes = generateBackupCodes();
    const hashes = await hashBackupCodes(codes);
    expect(await consumeBackupCode(hashes, ` ${codes[0].toLowerCase()} `)).toHaveLength(9);
  });
});
```

```ts
// secretCipher.spec.ts
import { encryptTwoFactorSecret, decryptTwoFactorSecret } from './secretCipher';

describe('secretCipher', () => {
  it('шифрует и расшифровывает (roundtrip), шифртексты недетерминированы', () => {
    const a = encryptTwoFactorSecret('GEZDGNBV', 'app-secret');
    const b = encryptTwoFactorSecret('GEZDGNBV', 'app-secret');
    expect(a).not.toBe(b);
    expect(decryptTwoFactorSecret(a, 'app-secret')).toBe('GEZDGNBV');
  });
  it('падает на чужом ключе и битых данных', () => {
    const a = encryptTwoFactorSecret('GEZDGNBV', 'app-secret');
    expect(() => decryptTwoFactorSecret(a, 'other')).toThrow();
    expect(() => decryptTwoFactorSecret('мусор', 'app-secret')).toThrow();
  });
});
```

- [ ] **Step 2: Прогнать — падают**
- [ ] **Step 3: Реализовать**

```ts
// backupCodes.ts
import * as bcrypt from 'bcrypt'; // через pnpm.overrides это bcryptjs
import { randomInt } from 'crypto';

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const COUNT = 10;

export function generateBackupCodes(): string[] {
  const codes = new Set<string>();
  while (codes.size < COUNT) {
    const chars = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]);
    codes.add(`${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`);
  }
  return [...codes];
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
}

function normalize(code: string): string {
  return code.trim().toUpperCase();
}

/** null — код не подошёл; иначе список хэшей без использованного. */
export async function consumeBackupCode(hashes: string[], code: string): Promise<string[] | null> {
  const normalized = normalize(code);
  for (let i = 0; i < hashes.length; i += 1) {
    if (await bcrypt.compare(normalized, hashes[i])) {
      return [...hashes.slice(0, i), ...hashes.slice(i + 1)];
    }
  }
  return null;
}
```

```ts
// secretCipher.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

function deriveKey(appSecret: string): Buffer {
  return scryptSync(appSecret, 'bigfin-2fa', 32);
}

export function encryptTwoFactorSecret(plain: string, appSecret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(appSecret), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString('base64')).join(':');
}

export function decryptTwoFactorSecret(payload: string, appSecret: string): string {
  const [iv, tag, data] = payload.split(':').map((p) => Buffer.from(p, 'base64'));
  if (!iv?.length || !tag?.length || !data) throw new Error('Malformed 2FA secret payload');
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(appSecret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
```

- [ ] **Step 4: Прогнать — зелёные**
- [ ] **Step 5: Commit** `feat: резервные коды и шифрование секрета 2FA`

### Task 4: Модель + сервисы TwoFactor

**Files:**
- Modify: `packages/server/src/modules/System/models/SystemUser.ts` (поля `twoFactorEnabled: boolean`, `twoFactorSecret: string | null`, `twoFactorBackupCodes: string | null`, `twoFactorEnabledAt: Date | null` — readonly-декларации по образцу существующих)
- Create: `packages/server/src/modules/TwoFactor/TwoFactor.constants.ts` (ERRORS: `TWO_FACTOR_ALREADY_ENABLED`, `TWO_FACTOR_NOT_ENABLED`, `TWO_FACTOR_INVALID_CODE`, `TWO_FACTOR_INVALID_PASSWORD`, `TWO_FACTOR_NOT_CONFIGURED`)
- Create: `packages/server/src/modules/TwoFactor/exceptions/*.exception.ts` (по образцу `InvalidEmailPassword.exception.ts`: `TwoFactorInvalidCodeException` (401), `TwoFactorAlreadyEnabledException` (400), `TwoFactorNotEnabledException` (400), `TwoFactorInvalidPasswordException` (401))
- Create: `packages/server/src/modules/TwoFactor/commands/TwoFactorSetup.service.ts`
- Create: `packages/server/src/modules/TwoFactor/commands/TwoFactorEnable.service.ts`
- Create: `packages/server/src/modules/TwoFactor/commands/TwoFactorDisable.service.ts`
- Create: `packages/server/src/modules/TwoFactor/commands/TwoFactorRegenerateBackupCodes.service.ts`
- Create: `packages/server/src/modules/TwoFactor/commands/TwoFactorVerify.service.ts`
- Create: `packages/server/src/modules/TwoFactor/queries/GetTwoFactorState.service.ts`
- Create: `packages/server/src/modules/TwoFactor/TwoFactor.module.ts`
- Test: `packages/server/src/modules/TwoFactor/commands/TwoFactor.services.spec.ts`

**Interfaces:**
- Consumes: утилиты Task 2–3; `SystemUser` через DI-токен `SystemUser.name` (как в `AuthSigninService`); `ClsService.get('userId')` — текущий пользователь; `ConfigService.get('jwt.secret')` — ключ шифрования.
- Produces:
  - `TwoFactorSetupService.setup(userId): Promise<{ secret: string; otpauthUri: string }>`
  - `TwoFactorEnableService.enable(userId, code): Promise<{ backupCodes: string[] }>`
  - `TwoFactorDisableService.disable(userId, password): Promise<void>`
  - `TwoFactorRegenerateBackupCodesService.regenerate(userId, code): Promise<{ backupCodes: string[] }>`
  - `TwoFactorVerifyService.verify(user: SystemUser, code: string): Promise<boolean>` — TOTP ИЛИ резервный код (расходует его); только проверка, без исключений.
  - `GetTwoFactorStateService.getState(userId): Promise<{ enabled: boolean; enabledAt: Date | null; backupCodesRemaining: number }>`

Логика сервисов:
- `setup`: если `twoFactorEnabled` → `TwoFactorAlreadyEnabledException`. Секрет `generateTotpSecret()`, сохранить `encryptTwoFactorSecret(secret, jwtSecret)`, вернуть `{ secret, otpauthUri: buildOtpAuthUri(secret, user.email) }`. Повторный вызов до enable — молча перегенерирует.
- `enable`: если включена → AlreadyEnabled; если секрета нет → `TwoFactorNotEnabledException` с кодом `TWO_FACTOR_NOT_CONFIGURED`; расшифровать секрет, `verifyTotpCode` → при неверном коде `TwoFactorInvalidCodeException`. Сгенерировать коды, сохранить хэши JSON-ом, `two_factor_enabled=true`, `two_factor_enabled_at=now`, вернуть коды открытым текстом.
- `disable`: если не включена → NotEnabled; `user.checkPassword(password)` → при неверном `TwoFactorInvalidPasswordException`; занулить все 4 поля (`enabled=false`, secret/codes/enabledAt = null).
- `regenerate`: если не включена → NotEnabled; проверить TOTP-код; новые 10 кодов, перезаписать хэши, вернуть коды.
- `verify`: не включена → false; TOTP прошёл → true; иначе `consumeBackupCode` по хэшам из JSON; если сработал — сохранить укороченный список и true; иначе false.

- [ ] **Step 1: Падающие тесты** (мок `systemUserModel` в стиле существующих unit-тестов Auth; проверить: happy path каждого сервиса, неверный код, повторное включение, расход резервного кода при verify)

```ts
// Каркас: собрать сервисы напрямую (new Service(mockModel, mockConfig, ...)),
// mockModel.query().findById().patch() — jest.fn() c fluent-заглушками.
// Ключевые кейсы:
it('setup у включённого пользователя кидает ALREADY_ENABLED', ...);
it('enable с верным кодом включает 2FA и возвращает 10 кодов', ...);
it('enable с неверным кодом кидает INVALID_CODE и не включает', ...);
it('disable с верным паролем зануляет секрет и коды', ...);
it('verify принимает TOTP-код', ...);
it('verify принимает резервный код один раз и удаляет его', ...);
it('regenerate заменяет старые коды новыми', ...);
```

- [ ] **Step 2: Прогнать — падают**
- [ ] **Step 3: Реализовать сервисы + модуль** (`TwoFactor.module.ts` — providers: все сервисы; imports: ничего лишнего; модели через существующий системный providers-механизм, как импортируется `SystemUser.name` в Auth.module — скопировать паттерн)
- [ ] **Step 4: Прогнать — зелёные; `pnpm typecheck`**
- [ ] **Step 5: Commit** `feat: модуль TwoFactor — сервисы настройки и проверки 2FA`

### Task 5: Эндпоинты `/auth/2fa/*` (авторизованные)

**Files:**
- Create: `packages/server/src/modules/TwoFactor/TwoFactor.controller.ts`
- Create: `packages/server/src/modules/TwoFactor/dtos/TwoFactorEnable.dto.ts` (`code: string`, `@IsNotEmpty @IsString`), `TwoFactorDisable.dto.ts` (`password`), `TwoFactorRegenerate.dto.ts` (`code`)
- Modify: `packages/server/src/modules/TwoFactor/TwoFactor.module.ts` (controllers)
- Modify: `packages/server/src/app.module.ts` (подключить `TwoFactorModule` — по образцу соседних модулей)

**Interfaces:**
- Produces (все под JWT, `@TenantAgnosticRoute()` + `@Throttle({ auth: {} })`, по образцу `Authed.controller.ts`; userId — из `ClsService`):
  - `GET /auth/2fa` → `{ enabled, enabledAt, backupCodesRemaining }`
  - `POST /auth/2fa/setup` → `{ secret, otpauthUri }`
  - `POST /auth/2fa/enable` → `{ backupCodes }`
  - `POST /auth/2fa/disable` → `{ code: 200, message }`
  - `POST /auth/2fa/backup-codes/regenerate` → `{ backupCodes }`

- [ ] **Step 1: Контроллер + DTO + подключение модуля** (Swagger-аннотации по образцу Auth.controller)
- [ ] **Step 2: `pnpm typecheck` + полный серверный jest**
- [ ] **Step 3: Commit** `feat: эндпоинты управления 2FA /auth/2fa/*`

### Task 6: Двухшаговый вход

**Files:**
- Modify: `packages/server/src/modules/Auth/Auth.controller.ts` (signin + новый эндпоинт)
- Modify: `packages/server/src/modules/Auth/commands/AuthSignin.service.ts` (полу-токен + verifyPayload отклоняет scope)
- Create: `packages/server/src/modules/Auth/dtos/AuthSigninTwoFactor.dto.ts` (`twoFactorToken: string`, `code: string`)
- Modify: `packages/server/src/modules/Auth/dtos/AuthSigninResponse.dto.ts` (опциональные `requiresTwoFactor?: boolean`, `twoFactorToken?: string`; `accessToken` и др. — опциональными их НЕ делать, вместо этого union-ответ описать в Swagger через `@ApiResponse` schema `oneOf` — либо, проще, отдельный `AuthSigninTwoFactorRequiredResponseDto`; выбрать отдельный DTO)
- Create: `packages/server/src/modules/Auth/dtos/AuthSigninTwoFactorRequiredResponse.dto.ts` (`requiresTwoFactor: true`, `twoFactorToken: string`)
- Test: `packages/server/src/modules/Auth/commands/AuthSigninTwoFactor.spec.ts`

**Interfaces:**
- Consumes: `TwoFactorVerifyService.verify(user, code)` (импорт `TwoFactorModule` в `Auth.module` или экспорт сервиса — сделать `TwoFactorModule` с `exports: [TwoFactorVerifyService]` и импортом в AuthModule).
- Produces:
  - `AuthSigninService.signPendingToken(user): string` — `jwtService.sign({ sub: user.email, scope: 'two-factor' }, { expiresIn: '5m' })`
  - `AuthSigninService.verifyPendingToken(token): Promise<SystemUser>` — бросает `UnauthorizedException` c `code: 'TWO_FACTOR_TOKEN_INVALID'` на битый/просроченный/чужой scope.
  - `POST /auth/signin` при `user.twoFactorEnabled` → `{ requiresTwoFactor: true, twoFactorToken }` (HTTP 200).
  - `POST /auth/signin/2fa` (`@PublicRoute`, троттлинг auth): валидирует полу-токен + код (`TwoFactorVerifyService`), при неверном коде — `TwoFactorInvalidCodeException`; успех → тот же ответ, что обычный signin (resolveSigninTenant + accessToken).
  - `verifyPayload` (обычный JWT-гард): payload с `scope === 'two-factor'` → `UnauthorizedException` (полу-токен не годится как access-токен).

- [ ] **Step 1: Падающие тесты** (signin с 2FA возвращает полу-токен, а не access; `/signin/2fa` с верным кодом отдаёт access; с неверным — 401; полу-токен в verifyPayload отвергается; просроченный полу-токен — 401)
- [ ] **Step 2: Прогнать — падают**
- [ ] **Step 3: Реализовать**
- [ ] **Step 4: Полный серверный jest + `pnpm typecheck` — зелёные**
- [ ] **Step 5: Commit** `feat: двухшаговый вход с 2FA (полу-токен + /auth/signin/2fa)`

### Task 7: PR среза 1

- [ ] Полный прогон: серверный jest целиком + `pnpm typecheck`; вывод — в описание PR честно.
- [ ] `git push -u origin <ветка>` + `gh pr create --draft --base develop --head <ветка>` с описанием по-русски (что, зачем, как проверить: curl-сценарий setup→enable→signin→signin/2fa).

---

## Срез 2 — Вход с кодом (webapp, PR B)

### Task 8: Хук + второй шаг LoginPage

**Files:**
- Modify: `packages/webapp/src/hooks/query/authentication.tsx` (маршрут `Signin2FA: 'auth/signin/2fa'`, хук `useAuthSigninTwoFactor` — копия `useAuthLogin` с тем же `onSuccess` (куки+state), но POST на signin/2fa)
- Modify: `packages/webapp/src/components/auth/LoginPage.tsx`
- Modify: `packages/webapp/src/components/auth/schemas.ts` (схема `twoFactorCodeSchema`: `code` — строка, `/^\d{6}$/` или `/^[a-z0-9]{4}-?[a-z0-9]{4}$/i` для резервного)
- Test: `packages/webapp/src/components/auth/__tests__/LoginPage.test.tsx` — если тестов страницы нет, добавить рядом с существующими `__tests__` по их образцу; если инфраструктуры рендер-тестов нет — ограничиться Zod-тестом схемы кода.

**Interfaces:**
- Consumes: ответ signin `{ requires_two_factor: true, two_factor_token }` (snake_case! проверить по network на живом стенде; при camelCase читать оба).
- Produces: состояние `step: 'credentials' | 'twoFactor'`; при `requires_two_factor` — переключение на форму кода: поле «Код из приложения» (6 цифр, `inputMode="numeric"`, автофокус), переключатель «Использовать резервный код», кнопка «Назад», сабмит → `useAuthSigninTwoFactor({ twoFactorToken, code })`. Ошибка 401 → «Неверный код, попробуйте ещё раз»; истёкший токен (401 с кодом `TWO_FACTOR_TOKEN_INVALID`) → вернуть на шаг пароля с сообщением «Время вышло, войдите заново». Тексты — по-русски захардкоженно, как весь LoginPage.

- [ ] **Step 1: Тест схемы кода (падает)** → **Step 2: реализация** → **Step 3: `pnpm typecheck`** → **Step 4: Commit** `feat: шаг ввода кода 2FA на странице входа`
- [ ] **Step 5: PR B** (draft, base develop)

---

## Срез 3 — Настройки «Безопасность» (webapp, PR C)

### Task 9: Вендоринг QR-генератора

**Files:**
- Create: `packages/webapp/src/lib/qrcodegen.ts` — однофайловый QR Code generator (Project Nayuki, MIT, https://www.nayuki.io/page/qr-code-generator-library, TypeScript-версия) с сохранённой лицензионной шапкой; забрать через WebFetch с официального GitHub `nayuki/QR-Code-generator` (файл `typescript-javascript/qrcodegen.ts`), адаптировать экспорты под ES-модуль.
- Create: `packages/webapp/src/components/ui/QrCode.tsx` — React-компонент: `props { value: string; size?: number }`, строит `QrCode.encodeText(value, Ecc.MEDIUM)` и рендерит SVG (`<path>` по модулям, `shape-rendering="crispEdges"`).

- [ ] **Step 1: Скачать и вендорить файл, зафиксировать версию/коммит источника в шапке**
- [ ] **Step 2: Компонент + смоук-тест рендера SVG (или Storybook story по образцу соседних)**
- [ ] **Step 3: `pnpm typecheck`; Commit** `feat: вендоренный QR-генератор (qrcodegen, MIT) + компонент QrCode`

### Task 10: Хуки 2FA API

**Files:**
- Create: `packages/webapp/src/hooks/query/twoFactor.tsx`

**Interfaces:**
- Produces (react-query, по образцу `authentication.tsx`, но авторизованный `useApiRequest`):
  `useTwoFactorState()` → GET `auth/2fa`; `useTwoFactorSetup()`, `useTwoFactorEnable()`, `useTwoFactorDisable()`, `useTwoFactorRegenerateBackupCodes()` — мутации на соответствующие POST; после enable/disable/regenerate — инвалидация ключа состояния.

- [ ] **Step 1: Реализовать; `pnpm typecheck`; Commit** `feat: хуки API 2FA`

### Task 11: Страница `/preferences/security`

**Files:**
- Create: `packages/webapp/src/containers/Preferences/Security/PreferencesSecurityPage.tsx` (+ подкомпоненты `TwoFactorCard.tsx`, `TwoFactorEnableWizard.tsx`, `BackupCodesList.tsx` в той же папке)
- Modify: `packages/webapp/src/routes/preferences.tsx` (route `/preferences/security`)
- Modify: `packages/webapp/src/constants/preferencesMenu.tsx` (пункт `{ labelId: 'preferences.security.menu', href: '/preferences/security', icon: ShieldCheck }` в секцию organization после users)
- Modify: `packages/webapp/src/lang/en/index.json`, `packages/webapp/src/lang/ru/index.json` (ключи `preferences.security.*`, `two_factor.*` — парно)

**Interfaces:**
- Consumes: хуки Task 10, `QrCode` Task 9. Стиль — General/shadcn (см. `Preferences/General`), строки через `intl.get(...)`.
- Поведение:
  - 2FA выключена: карточка со статусом и кнопкой «Включить». Мастер: шаг 1 — QR (`otpauthUri` из setup) + секрет текстом с кнопкой «Скопировать»; шаг 2 — поле кода + «Подтвердить» (enable); шаг 3 — список резервных кодов, кнопки «Скопировать все», предупреждение «показываются один раз», кнопка «Готово».
  - 2FA включена: дата включения, «Осталось резервных кодов: N», кнопка «Перегенерировать коды» (диалог с полем кода → новые коды тем же экраном шага 3), кнопка «Отключить» (диалог с полем пароля, деструктивный стиль).
  - Ошибки мутаций → `AppToaster`/`toast` с сообщением из ответа.

- [ ] **Step 1: Страница + мастер + меню + роут**
- [ ] **Step 2: i18n парно; `node packages/webapp/scripts/lang-check.js` — зелёный**
- [ ] **Step 3: `pnpm typecheck`; Commit** `feat: страница настроек «Безопасность» с мастером 2FA`
- [ ] **Step 4: PR C** (draft, base develop)

### Task 12: Живая проверка (после мержа PR A на стенде или локального бэкенда)

- [ ] Полный цикл: включить 2FA через UI (реальное приложение-аутентификатор или `generateTotpCode` скриптом) → выйти → войти с кодом → войти с резервным кодом → перегенерировать коды → отключить.
- [ ] Итоги — комментарием в PR C.

## Self-review плана

- Покрытие спеки: §3 → Task 1; §4.1 → Tasks 2–3; §4.2 → Task 4; §4.4 → Task 5; §4.3 → Task 6; §5.1 → Task 8; §5.2 → Tasks 9–11; §5.3 → Task 11; §7 → тесты в задачах + Task 12. Пробелов нет.
- Троттлинг (§6): `/auth/signin/2fa` и `/auth/2fa/*` — под `@Throttle({ auth: {} })` (Tasks 5–6). ✓
- Типы согласованы: `verify(user, code)` в Task 4 = использование в Task 6; snake_case ответов учтён в Task 8. ✓
