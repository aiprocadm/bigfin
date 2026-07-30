// TOTP (RFC 6238) на node:crypto, без внешних зависимостей.
// Параметры совместимы с Google Authenticator: SHA-1, 6 цифр, шаг 30 секунд.
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { base32Decode, base32Encode } from './base32';

const STEP_SECONDS = 30;
const DIGITS = 6;
// Допуск ±1 шаг: часы телефона и сервера могут расходиться на десятки секунд.
const WINDOW = 1;

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** HOTP (RFC 4226): HMAC-SHA1 по счётчику + динамическое усечение. */
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

export function generateTotpCode(
  secretBase32: string,
  timeMs: number = Date.now(),
): string {
  const counter = Math.floor(timeMs / 1000 / STEP_SECONDS);
  return hotp(base32Decode(secretBase32), counter);
}

export function verifyTotpCode(
  secretBase32: string,
  code: string,
  timeMs: number = Date.now(),
): boolean {
  if (!new RegExp(`^\\d{${DIGITS}}$`).test(code)) return false;

  const counter = Math.floor(timeMs / 1000 / STEP_SECONDS);
  const key = base32Decode(secretBase32);
  let valid = false;

  // Прогоняем все шаги окна без раннего выхода — константное время.
  for (let i = -WINDOW; i <= WINDOW; i += 1) {
    const expected = hotp(key, counter + i);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) {
      valid = true;
    }
  }
  return valid;
}

export function buildOtpAuthUri(secretBase32: string, email: string): string {
  return `otpauth://totp/Bigfin:${encodeURIComponent(email)}?secret=${secretBase32}&issuer=Bigfin&algorithm=SHA1&digits=6&period=30`;
}
