import { decryptTwoFactorSecret, encryptTwoFactorSecret } from './secretCipher';

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
