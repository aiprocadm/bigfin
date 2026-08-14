import { JwtService } from '@nestjs/jwt';
import { AuthSigninService } from './AuthSignin.service';

const user = {
  id: 7,
  email: 'founder@bigfin.ru',
  twoFactorEnabled: true,
} as any;

function makeService(foundUser: any = user) {
  const systemUserModel: any = {
    query: () => ({
      findOne: (_q: any) => ({
        throwIfNotFound: () =>
          foundUser
            ? Promise.resolve(foundUser)
            : Promise.reject(new Error('NotFound')),
      }),
    }),
  };
  const jwtService = new JwtService({
    secret: 'test-secret',
    signOptions: { expiresIn: '1d', algorithm: 'HS384' },
    verifyOptions: { algorithms: ['HS384'] },
  });
  const clsService: any = { set: jest.fn() };

  return {
    service: new AuthSigninService(
      systemUserModel,
      {} as any,
      {} as any,
      jwtService,
      clsService,
      { emitAsync: jest.fn() } as any,
    ),
    jwtService,
  };
}

describe('полу-токен 2FA (signPendingToken / verifyPendingToken)', () => {
  it('подписывает токен со scope two-factor и сроком 5 минут', () => {
    const { service, jwtService } = makeService();

    const token = service.signPendingToken(user);
    const payload: any = jwtService.decode(token);

    expect(payload.sub).toBe(user.email);
    expect(payload.scope).toBe('two-factor');
    expect(payload.exp - payload.iat).toBe(5 * 60);
  });

  it('verifyPendingToken принимает свой токен и возвращает пользователя', async () => {
    const { service } = makeService();

    const token = service.signPendingToken(user);
    const resolved = await service.verifyPendingToken(token);

    expect(resolved.email).toBe(user.email);
  });

  it('отвергает обычный access-токен (без scope)', async () => {
    const { service } = makeService();

    const accessToken = service.signToken(user);

    await expect(service.verifyPendingToken(accessToken)).rejects.toMatchObject(
      { response: { code: 'TWO_FACTOR_TOKEN_INVALID' } },
    );
  });

  it('отвергает мусор и токен с чужой подписью', async () => {
    const { service } = makeService();
    const alien = new JwtService({ secret: 'other' }).sign({
      sub: user.email,
      scope: 'two-factor',
    });

    await expect(service.verifyPendingToken('мусор')).rejects.toMatchObject({
      response: { code: 'TWO_FACTOR_TOKEN_INVALID' },
    });
    await expect(service.verifyPendingToken(alien)).rejects.toMatchObject({
      response: { code: 'TWO_FACTOR_TOKEN_INVALID' },
    });
  });
});

describe('verifyPayload отвергает полу-токен как access-токен', () => {
  it('scope two-factor → UnauthorizedException', async () => {
    const { service } = makeService();

    await expect(
      service.verifyPayload({
        sub: user.email,
        scope: 'two-factor',
        iat: 0,
        exp: 9999999999,
      } as any),
    ).rejects.toThrow();
  });

  it('обычный payload по-прежнему проходит', async () => {
    const { service } = makeService();

    const payload: any = { sub: user.email, iat: 0, exp: 9999999999 };
    expect(await service.verifyPayload(payload)).toBe(payload);
  });
});
