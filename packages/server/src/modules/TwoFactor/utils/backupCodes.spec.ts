import {
  consumeBackupCode,
  generateBackupCodes,
  hashBackupCodes,
} from './backupCodes';

describe('backupCodes', () => {
  it('генерирует 10 уникальных кодов формата XXXX-XXXX', () => {
    const codes = generateBackupCodes();

    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    codes.forEach((c) =>
      expect(c).toMatch(
        /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/,
      ),
    );
  });

  it('расходует код ровно один раз', async () => {
    const codes = generateBackupCodes();
    const hashes = await hashBackupCodes(codes);

    const rest = await consumeBackupCode(hashes, codes[3]);
    expect(rest).toHaveLength(9);
    // Повторно тот же код не проходит.
    expect(await consumeBackupCode(rest!, codes[3])).toBeNull();
    // Неизвестный код не проходит.
    expect(await consumeBackupCode(hashes, 'ZZZZ-ZZZZ')).toBeNull();
  });

  it('не чувствителен к регистру и пробелам вокруг', async () => {
    const codes = generateBackupCodes();
    const hashes = await hashBackupCodes(codes);

    expect(
      await consumeBackupCode(hashes, ` ${codes[0].toLowerCase()} `),
    ).toHaveLength(9);
  });
});
