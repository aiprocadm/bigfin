jest.mock('axios');
import { Axios } from 'axios';
import * as FormData from 'form-data';
import { GotenbergUtils } from './GotenbergUtils';

/**
 * Н3 карты v38. Сбой печати не выглядит успехом.
 *
 * Живая проба: служба печати ответила «404: Not Found», а продукт отдал
 * человеку код **200** и файл, внутри которого лежал этот текст вместо
 * PDF. Скачанный «счёт» не открывается ни одной программой, и понять
 * почему — неоткуда.
 *
 * Второй случай: служба печати недоступна. Ошибка запроса уходила в
 * `console.error`, наружу возвращалось `undefined`, и человек получал
 * «Internal server error» без единого слова о причине.
 */
describe('печать: ответ службы проверяется', () => {
  const post = jest.fn();

  beforeEach(() => {
    post.mockReset();
    (Axios as unknown as jest.Mock).mockImplementation(() => ({ post }));
  });

  const запрос = () =>
    GotenbergUtils.fetch('http://gotenberg:3000/forms/chromium/convert/html', new FormData());

  it('успешный ответ отдаётся как есть', async () => {
    post.mockResolvedValue({ status: 200, data: Buffer.from('%PDF-1.4') });

    const pdf = await запрос();

    expect(pdf.toString()).toBe('%PDF-1.4');
  });

  it('ошибка службы печати НЕ отдаётся вместо документа', async () => {
    post.mockResolvedValue({
      status: 404,
      data: Buffer.from('Invalid HTTP status code from the main page: 404'),
    });

    await expect(запрос()).rejects.toThrow(/служб[аы] печати/i);
  });

  it('недоступная служба печати объясняет себя, а не молчит', async () => {
    post.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3999'));

    await expect(запрос()).rejects.toThrow(/служб[аы] печати/i);
  });

  it('пустой ответ службы печати — тоже отказ, а не пустой файл', async () => {
    post.mockResolvedValue({ status: 200, data: undefined });

    await expect(запрос()).rejects.toThrow(/служб[аы] печати/i);
  });
});
