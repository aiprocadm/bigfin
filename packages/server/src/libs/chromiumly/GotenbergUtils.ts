import * as FormData from 'form-data';
import { Axios } from 'axios';
import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Н3 карты v38. Сбой печати не выглядит успехом.
 *
 * Раньше ответ службы печати уходил человеку как есть, без проверки: когда
 * служба отвечала «404: Not Found», продукт отдавал код 200 и файл, внутри
 * которого лежал этот текст вместо PDF. Скачанный «счёт» не открывался ни
 * одной программой, и понять почему было неоткуда.
 *
 * А если служба недоступна, ошибка запроса уходила в `console.error`,
 * наружу возвращалось `undefined`, и человек видел «Internal server error»
 * без единого слова о причине.
 */
export class GotenbergUtils {
  public static assert(condition: boolean, message: string): asserts condition {
    if (!condition) {
      throw new Error(message);
    }
  }

  public static async fetch(endpoint: string, data: FormData): Promise<Buffer> {
    let response: { status?: number; data?: Buffer };

    try {
      response = await new Axios({
        headers: {
          ...data.getHeaders(),
        },
        responseType: 'arraybuffer', // This ensures you get a Buffer back
      }).post(endpoint, data);
    } catch (error) {
      // 503, а не 500: причина внешняя и человеку понятная — документ не
      // напечатан, потому что служба печати не отвечает.
      throw new ServiceUnavailableException(
        `Не удалось напечатать документ: служба печати не отвечает (${
          error instanceof Error ? error.message : String(error)
        })`,
      );
    }

    const status = response?.status ?? 0;

    if (status < 200 || status >= 300) {
      // Тело ответа службы печати — это её объяснение, а не документ.
      const reason = response?.data ? String(response.data).slice(0, 200) : '';

      throw new ServiceUnavailableException(
        `Не удалось напечатать документ: служба печати ответила ошибкой ${status}${
          reason ? `. ${reason}` : ''
        }`,
      );
    }

    if (!response?.data) {
      throw new ServiceUnavailableException(
        'Не удалось напечатать документ: служба печати вернула пустой ответ',
      );
    }

    return response.data;
  }
}
