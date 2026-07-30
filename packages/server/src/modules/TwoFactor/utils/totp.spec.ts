import { base32Decode, base32Encode } from './base32';
import {
  buildOtpAuthUri,
  generateTotpCode,
  generateTotpSecret,
  verifyTotpCode,
} from './totp';

// Секрет из RFC 6238 (ASCII «12345678901234567890»).
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('base32', () => {
  it('кодирует и декодирует туда-обратно', () => {
    expect(base32Decode(SECRET).toString('ascii')).toBe(
      '12345678901234567890',
    );
    expect(base32Encode(Buffer.from('12345678901234567890', 'ascii'))).toBe(
      SECRET,
    );
  });

  it('терпит паддинг, пробелы и нижний регистр', () => {
    expect(base32Decode('gezd gnbv gy3t qojq ====').toString('ascii')).toBe(
      '1234567890',
    );
  });

  it('падает на недопустимом символе', () => {
    expect(() => base32Decode('ABC!')).toThrow();
  });
});

describe('generateTotpCode (векторы RFC 6238, SHA-1, 6 последних цифр)', () => {
  it.each([
    [59_000, '287082'], // RFC: 94287082
    [1_111_111_109_000, '081804'], // RFC: 07081804
    [1_234_567_890_000, '005924'], // RFC: 89005924
    [2_000_000_000_000, '279037'], // RFC: 69279037
  ])('t=%i → %s', (timeMs, expected) => {
    expect(generateTotpCode(SECRET, timeMs)).toBe(expected);
  });
});

describe('verifyTotpCode', () => {
  const t = 1_234_567_890_000;

  it('принимает код текущего шага и соседних (±30 с)', () => {
    expect(verifyTotpCode(SECRET, generateTotpCode(SECRET, t), t)).toBe(true);
    expect(
      verifyTotpCode(SECRET, generateTotpCode(SECRET, t - 30_000), t),
    ).toBe(true);
    expect(
      verifyTotpCode(SECRET, generateTotpCode(SECRET, t + 30_000), t),
    ).toBe(true);
  });

  it('отклоняет код из далёкого прошлого и мусор', () => {
    expect(
      verifyTotpCode(SECRET, generateTotpCode(SECRET, t - 120_000), t),
    ).toBe(false);
    expect(verifyTotpCode(SECRET, '000000', t)).toBe(false);
    expect(verifyTotpCode(SECRET, '12345a', t)).toBe(false);
    expect(verifyTotpCode(SECRET, '', t)).toBe(false);
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

  it('секреты не повторяются', () => {
    expect(generateTotpSecret()).not.toBe(generateTotpSecret());
  });
});
