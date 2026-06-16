// © 2026 Bigfin
jest.mock('axios');
import axios from 'axios';
import { TelegramApiService } from './TelegramApi.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS } from '../constants';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TelegramApiService', () => {
  let service: TelegramApiService;
  beforeEach(() => {
    service = new TelegramApiService();
    jest.clearAllMocks();
  });

  it('getUpdates возвращает data при 200', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { ok: true, result: [] } } as any);
    const res = await service.getUpdates('TOKEN');
    expect(res).toEqual({ ok: true, result: [] });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.telegram.org/botTOKEN/getUpdates',
    );
  });

  it('getUpdates маппит 401 → TELEGRAM_INVALID_TOKEN', async () => {
    mockedAxios.get.mockRejectedValueOnce({ response: { status: 401 } });
    await expect(service.getUpdates('BAD')).rejects.toMatchObject({
      errorType: ERRORS.TELEGRAM_INVALID_TOKEN,
    });
    expect(ServiceError).toBeDefined();
  });

  it('getUpdates маппит 409 → TELEGRAM_WEBHOOK_SET', async () => {
    mockedAxios.get.mockRejectedValueOnce({ response: { status: 409 } });
    await expect(service.getUpdates('TOKEN')).rejects.toMatchObject({
      errorType: ERRORS.TELEGRAM_WEBHOOK_SET,
    });
  });

  it('sendMessage POST-ит chat_id и text', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { ok: true } } as any);
    await service.sendMessage('TOKEN', '222', 'привет');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.telegram.org/botTOKEN/sendMessage',
      { chat_id: '222', text: 'привет' },
    );
  });
});
