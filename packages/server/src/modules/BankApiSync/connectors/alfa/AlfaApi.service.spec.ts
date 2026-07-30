import axios from 'axios';
import { AlfaApiService, ALFA_ERRORS } from './AlfaApi.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const creds = {
  kind: 'oauth' as const,
  clientId: 'cid',
  clientSecret: 'secret',
  refreshToken: 'rt',
};

describe('AlfaApiService', () => {
  let service: AlfaApiService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AlfaApiService();
  });

  it('меняет refresh-токен на access-токен и ходит с ним за операциями', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { access_token: 'AT', expires_in: 3600 },
    });
    mockedAxios.get.mockResolvedValue({
      data: {
        operations: [
          {
            id: 'a-1',
            date: '2026-06-01',
            amount: 100,
            direction: 'CREDIT',
          },
        ],
      },
    });

    const ops = await service.fetchOperations(
      creds,
      '40702810000000000001',
      '2026-06-01',
      '2026-06-30',
    );

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const [, body] = mockedAxios.post.mock.calls[0];
    expect(String(body)).toContain('grant_type=refresh_token');

    const [, config] = mockedAxios.get.mock.calls[0];
    expect((config as any).headers.Authorization).toBe('Bearer AT');

    expect(ops).toHaveLength(1);
    expect(ops[0].externalId).toBe('alfa:a-1');
    expect(ops[0].amount).toBe(100);
  });

  it('кэширует access-токен между вызовами, пока он не истёк', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { access_token: 'AT', expires_in: 3600 },
    });
    mockedAxios.get.mockResolvedValue({ data: { operations: [] } });

    await service.fetchOperations(creds, 'acc', '2026-06-01', '2026-06-30');
    await service.fetchOperations(creds, 'acc', '2026-06-01', '2026-06-30');

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it('401 при обмене токена → доменная ошибка о неверных данных', async () => {
    mockedAxios.post.mockRejectedValue({ response: { status: 401 } });

    await expect(service.ping(creds)).rejects.toMatchObject({
      errorType: ALFA_ERRORS.INVALID_CREDENTIALS,
    });
  });

  it('прочая ошибка API → ALFA_API_ERROR', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { access_token: 'AT', expires_in: 3600 },
    });
    mockedAxios.get.mockRejectedValue({ response: { status: 500 } });

    await expect(service.ping(creds)).rejects.toMatchObject({
      errorType: ALFA_ERRORS.API_ERROR,
    });
  });

  it('отвергает учётные данные не того вида', async () => {
    await expect(
      service.ping({ kind: 'token', token: 'x' } as any),
    ).rejects.toMatchObject({ errorType: ALFA_ERRORS.INVALID_CREDENTIALS });
  });
});
