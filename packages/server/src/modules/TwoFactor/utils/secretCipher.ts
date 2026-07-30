// Шифрование TOTP-секрета в БД: AES-256-GCM, ключ выводится из секрета приложения.
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

function deriveKey(appSecret: string): Buffer {
  return scryptSync(appSecret, 'bigfin-2fa', 32);
}

/** Формат результата: `iv:tag:ciphertext`, каждая часть — base64. */
export function encryptTwoFactorSecret(
  plain: string,
  appSecret: string,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(appSecret), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);

  return [iv, cipher.getAuthTag(), encrypted]
    .map((b) => b.toString('base64'))
    .join(':');
}

export function decryptTwoFactorSecret(
  payload: string,
  appSecret: string,
): string {
  const [iv, tag, data] = payload
    .split(':')
    .map((p) => Buffer.from(p, 'base64'));

  if (!iv?.length || !tag?.length || !data) {
    throw new Error('Malformed 2FA secret payload');
  }
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(appSecret), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}
