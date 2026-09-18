import { TwoFactorSetupService } from './TwoFactorSetup.service';
import { TwoFactorEnableService } from './TwoFactorEnable.service';
import { TwoFactorDisableService } from './TwoFactorDisable.service';
import { TwoFactorRegenerateBackupCodesService } from './TwoFactorRegenerateBackupCodes.service';
import { TwoFactorVerifyService } from './TwoFactorVerify.service';
import { encryptTwoFactorSecret } from '../utils/secretCipher';
import { generateTotpCode, generateTotpSecret } from '../utils/totp';
import { hashBackupCodes } from '../utils/backupCodes';

/**
 * Проверки двухфакторного входа честно хешируют резервные коды: десять кодов
 * через bcrypt с фактором 10. В одиночку это укладывается в секунды, но в
 * полном прогоне (346 наборов разом) машина занята, и стандартных пяти секунд
 * не хватает — тест падал по таймауту через раз, хотя код исправен.
 *
 * Поднимаем срок ожидания, а не стойкость хеширования: она защищает
 * настоящие коды и снижать её нельзя.
 */
jest.setTimeout(30_000);

const APP_SECRET = 'test-app-secret';

/** Заглушка ConfigService: отдаёт jwt.secret. */
const configService = { get: (key: string) => (key === 'jwt.secret' ? APP_SECRET : undefined) } as any;

/**
 * Заглушка модели SystemUser: держит одного пользователя в памяти,
 * поддерживает query().findById(...).patch(...) и throwIfNotFound().
 */
function fakeUserModel(user: any) {
  const state = { user: { ...user }, patches: [] as any[] };

  const model: any = {
    query: () => ({
      findById: (_id: number) => {
        const promise: any = Promise.resolve(state.user);
        promise.throwIfNotFound = () => Promise.resolve(state.user);
        promise.patch = (attrs: any) => {
          state.patches.push(attrs);
          Object.assign(state.user, attrs);
          return Promise.resolve(1);
        };
        return promise;
      },
    }),
  };
  return { model, state };
}

const baseUser = {
  id: 7,
  email: 'founder@bigfin.ru',
  twoFactorEnabled: false,
  twoFactorSecret: null,
  twoFactorBackupCodes: null,
  twoFactorEnabledAt: null,
  checkPassword: async (p: string) => p === 'правильный-пароль',
};

describe('TwoFactorSetupService', () => {
  it('генерирует секрет, сохраняет зашифрованным, возвращает otpauth-URI', async () => {
    const { model, state } = fakeUserModel(baseUser);
    const service = new TwoFactorSetupService(model, configService);

    const result = await service.setup(7);

    expect(result.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(result.otpauthUri).toContain('otpauth://totp/Bigfin:');
    // В БД — не открытый секрет.
    expect(state.user.twoFactorSecret).not.toBe(result.secret);
    expect(state.user.twoFactorSecret).toContain(':');
    expect(state.user.twoFactorEnabled).toBe(false);
  });

  it('у включённого пользователя кидает ALREADY_ENABLED', async () => {
    const { model } = fakeUserModel({ ...baseUser, twoFactorEnabled: true });
    const service = new TwoFactorSetupService(model, configService);

    await expect(service.setup(7)).rejects.toMatchObject({
      response: { code: 'TWO_FACTOR_ALREADY_ENABLED' },
    });
  });
});

describe('TwoFactorEnableService', () => {
  const secret = generateTotpSecret();
  const userWithSecret = {
    ...baseUser,
    twoFactorSecret: encryptTwoFactorSecret(secret, APP_SECRET),
  };

  it('с верным кодом включает 2FA и возвращает 10 кодов', async () => {
    const { model, state } = fakeUserModel(userWithSecret);
    const service = new TwoFactorEnableService(model, configService);

    const { backupCodes } = await service.enable(7, generateTotpCode(secret));

    expect(backupCodes).toHaveLength(10);
    expect(state.user.twoFactorEnabled).toBe(true);
    expect(state.user.twoFactorEnabledAt).toBeTruthy();
    // Хэши, не открытые коды.
    expect(state.user.twoFactorBackupCodes).not.toContain(backupCodes[0]);
    expect(JSON.parse(state.user.twoFactorBackupCodes)).toHaveLength(10);
  });

  it('с неверным кодом кидает INVALID_CODE и не включает', async () => {
    const { model, state } = fakeUserModel(userWithSecret);
    const service = new TwoFactorEnableService(model, configService);

    await expect(service.enable(7, '000000')).rejects.toMatchObject({
      response: { code: 'TWO_FACTOR_INVALID_CODE' },
    });
    expect(state.user.twoFactorEnabled).toBe(false);
  });

  it('без setup кидает NOT_CONFIGURED', async () => {
    const { model } = fakeUserModel(baseUser);
    const service = new TwoFactorEnableService(model, configService);

    await expect(service.enable(7, '123456')).rejects.toMatchObject({
      response: { code: 'TWO_FACTOR_NOT_CONFIGURED' },
    });
  });
});

describe('TwoFactorDisableService', () => {
  const enabledUser = {
    ...baseUser,
    twoFactorEnabled: true,
    twoFactorSecret: 'x:y:z',
    twoFactorBackupCodes: '[]',
    twoFactorEnabledAt: new Date(),
  };

  it('с верным паролем зануляет секрет и коды', async () => {
    const { model, state } = fakeUserModel(enabledUser);
    const service = new TwoFactorDisableService(model);

    await service.disable(7, 'правильный-пароль');

    expect(state.user.twoFactorEnabled).toBe(false);
    expect(state.user.twoFactorSecret).toBeNull();
    expect(state.user.twoFactorBackupCodes).toBeNull();
    expect(state.user.twoFactorEnabledAt).toBeNull();
  });

  it('с неверным паролем кидает INVALID_PASSWORD', async () => {
    const { model, state } = fakeUserModel(enabledUser);
    const service = new TwoFactorDisableService(model);

    await expect(service.disable(7, 'не тот')).rejects.toMatchObject({
      response: { code: 'TWO_FACTOR_INVALID_PASSWORD' },
    });
    expect(state.user.twoFactorEnabled).toBe(true);
  });

  it('у выключенного пользователя кидает NOT_ENABLED', async () => {
    const { model } = fakeUserModel(baseUser);
    const service = new TwoFactorDisableService(model);

    await expect(service.disable(7, 'правильный-пароль')).rejects.toMatchObject(
      { response: { code: 'TWO_FACTOR_NOT_ENABLED' } },
    );
  });
});

describe('TwoFactorVerifyService', () => {
  const secret = generateTotpSecret();

  async function enabledUserWithCodes(codes: string[]) {
    return {
      ...baseUser,
      twoFactorEnabled: true,
      twoFactorSecret: encryptTwoFactorSecret(secret, APP_SECRET),
      twoFactorBackupCodes: JSON.stringify(await hashBackupCodes(codes)),
    };
  }

  it('принимает TOTP-код', async () => {
    const user = await enabledUserWithCodes(['AAAA-AAAA']);
    const { model } = fakeUserModel(user);
    const service = new TwoFactorVerifyService(model, configService);

    expect(await service.verify(user as any, generateTotpCode(secret))).toBe(
      true,
    );
    expect(await service.verify(user as any, '000000')).toBe(false);
  });

  it('принимает резервный код один раз и удаляет его', async () => {
    const user = await enabledUserWithCodes(['AAAA-AAAA', 'BBBB-BBBB']);
    const { model, state } = fakeUserModel(user);
    const service = new TwoFactorVerifyService(model, configService);

    expect(await service.verify(state.user as any, 'AAAA-AAAA')).toBe(true);
    expect(JSON.parse(state.user.twoFactorBackupCodes)).toHaveLength(1);
    expect(await service.verify(state.user as any, 'AAAA-AAAA')).toBe(false);
  });

  it('у выключенного пользователя всегда false', async () => {
    const { model } = fakeUserModel(baseUser);
    const service = new TwoFactorVerifyService(model, configService);

    expect(await service.verify(baseUser as any, '123456')).toBe(false);
  });
});

describe('TwoFactorRegenerateBackupCodesService', () => {
  const secret = generateTotpSecret();

  it('заменяет старые коды новыми по верному TOTP-коду', async () => {
    const user = {
      ...baseUser,
      twoFactorEnabled: true,
      twoFactorSecret: encryptTwoFactorSecret(secret, APP_SECRET),
      twoFactorBackupCodes: JSON.stringify(await hashBackupCodes(['AAAA-AAAA'])),
    };
    const { model, state } = fakeUserModel(user);
    const service = new TwoFactorRegenerateBackupCodesService(
      model,
      configService,
    );

    const { backupCodes } = await service.regenerate(
      7,
      generateTotpCode(secret),
    );

    expect(backupCodes).toHaveLength(10);
    expect(JSON.parse(state.user.twoFactorBackupCodes)).toHaveLength(10);
  });

  it('у выключенного пользователя кидает NOT_ENABLED', async () => {
    const { model } = fakeUserModel(baseUser);
    const service = new TwoFactorRegenerateBackupCodesService(
      model,
      configService,
    );

    await expect(service.regenerate(7, '123456')).rejects.toMatchObject({
      response: { code: 'TWO_FACTOR_NOT_ENABLED' },
    });
  });
});

describe('статусы ошибок настроек 2FA', () => {
  // Авторизованный http-клиент webapp разлогинивает на ЛЮБОЙ 401,
  // поэтому ошибки ввода в настройках обязаны быть 400.
  it('неверный код при включении → 400, а не 401', async () => {
    const secret = generateTotpSecret();
    const { model } = fakeUserModel({
      ...baseUser,
      twoFactorSecret: encryptTwoFactorSecret(secret, APP_SECRET),
    });
    const service = new TwoFactorEnableService(model, configService);

    await expect(service.enable(7, '000000')).rejects.toMatchObject({
      status: 400,
      response: { code: 'TWO_FACTOR_INVALID_CODE' },
    });
  });

  it('неверный пароль при отключении → 400, а не 401', async () => {
    const { model } = fakeUserModel({
      ...baseUser,
      twoFactorEnabled: true,
      twoFactorSecret: 'x:y:z',
      twoFactorBackupCodes: '[]',
    });
    const service = new TwoFactorDisableService(model);

    await expect(service.disable(7, 'не тот')).rejects.toMatchObject({
      status: 400,
      response: { code: 'TWO_FACTOR_INVALID_PASSWORD' },
    });
  });
});
