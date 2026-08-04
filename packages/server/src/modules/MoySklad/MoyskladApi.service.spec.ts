import axios from 'axios';
import { MoyskladApiService } from './MoyskladApi.service';

jest.mock('axios');
const mockedGet = axios.get as unknown as jest.Mock;

/** Страница ответа МойСклад из n строк. */
const page = (n: number) => ({
  data: { rows: Array.from({ length: n }, (_, i) => ({ id: `p-${i}` })) },
});

describe('MoyskladApiService.listAll', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    delete process.env.MOYSKLAD_API_BASE;
  });

  it('забирает все страницы, а не только первую сотню', async () => {
    mockedGet
      .mockResolvedValueOnce(page(100))
      .mockResolvedValueOnce(page(100))
      .mockResolvedValueOnce(page(7));

    const rows = await new MoyskladApiService().listAll('T', 'product');

    expect(rows).toHaveLength(207);
    expect(mockedGet).toHaveBeenCalledTimes(3);
    expect(mockedGet.mock.calls[1][0]).toContain('offset=100');
  });

  it('останавливается на неполной странице', async () => {
    mockedGet.mockResolvedValueOnce(page(3));

    const rows = await new MoyskladApiService().listAll('T', 'product');

    expect(rows).toHaveLength(3);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('адрес API берётся из переменной окружения во время вызова', async () => {
    process.env.MOYSKLAD_API_BASE = 'http://127.0.0.1:9099/api/remap/1.2';
    mockedGet.mockResolvedValueOnce(page(0));

    await new MoyskladApiService().listAll('T', 'product');

    expect(mockedGet.mock.calls[0][0]).toContain('http://127.0.0.1:9099');
  });
});
