// Резервные коды 2FA: одноразовые, хранятся только bcrypt-хэшами.
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

// Без похожих символов (0/O, 1/I/L и т.п.) — коды вводят руками.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const COUNT = 10;

export function generateBackupCodes(): string[] {
  const codes = new Set<string>();

  while (codes.size < COUNT) {
    const chars = Array.from(
      { length: 8 },
      () => ALPHABET[randomInt(ALPHABET.length)],
    );
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

/** null — код не подошёл; иначе список хэшей БЕЗ использованного. */
export async function consumeBackupCode(
  hashes: string[],
  code: string,
): Promise<string[] | null> {
  const normalized = normalize(code);

  for (let i = 0; i < hashes.length; i += 1) {
    if (await bcrypt.compare(normalized, hashes[i])) {
      return [...hashes.slice(0, i), ...hashes.slice(i + 1)];
    }
  }
  return null;
}
