import axios from 'axios';
import { OzonApiService, OZON_ERRORS } from './OzonApi.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const page = (operations: any[], pageCount = 1) => ({
  data: { result: { operations, page_count: pageCount, row_count: operations.length } },
});

describe('OzonApiService', () => {
  let service: OzonApiService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OzonApiService();
  });

  it('ходит с парой заголовков Client-Id и Api-Key', async () => {
    mockedAxios.post.mockResolvedValue(page([{ amount: 1 }]));

    await service.financeTransactions('CID', 'KEY', '2026-06-01', '2026-06-30');

    const [, , config] = mockedAxios.post.mock.calls[0];
    expect((config as any).headers['Client-Id']).toBe('CID');
    expect((config as any).headers['Api-Key']).toBe('KEY');
  });

  it('передаёт период фильтром по датам', async () => {
    mockedAxios.post.mockResolvedValue(page([]));

    await service.financeTransactions('CID', 'KEY', '2026-06-01', '2026-06-30');

    const [, body] = mockedAxios.post.mock.calls[0];
    expect((body as any).filter.date.from).toContain('2026-06-01');
    expect((body as any).filter.date.to).toContain('2026-06-30');
  });

  it('собирает все страницы ответа', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => ({ amount: i }));
    mockedAxios.post
      .mockResolvedValueOnce(page(full, 2))
      .mockResolvedValueOnce(page([{ amount: 'last' }], 2));

    const rows = await service.financeTransactions(
      'CID',
      'KEY',
      '2026-06-01',
      '2026-06-30',
    );

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(rows).toHaveLength(1001);
  });

  it('останавливается на пустой странице', async () => {
    mockedAxios.post.mockResolvedValue(page([]));

    const rows = await service.financeTransactions(
      'CID',
      'KEY',
      '2026-06-01',
      '2026-06-30',
    );

    expect(rows).toEqual([]);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('401 → доменная ошибка о неверных ключах', async () => {
    mockedAxios.post.mockRejectedValue({ response: { status: 401 } });

    await expect(service.ping('CID', 'KEY')).rejects.toMatchObject({
      errorType: OZON_ERRORS.INVALID_KEY,
    });
  });

  it('прочая ошибка → OZON_API_ERROR', async () => {
    mockedAxios.post.mockRejectedValue({ response: { status: 500 } });

    await expect(service.ping('CID', 'KEY')).rejects.toMatchObject({
      errorType: OZON_ERRORS.API_ERROR,
    });
  });
});
