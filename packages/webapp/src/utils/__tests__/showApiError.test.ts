import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/components/AppToaster', () => ({
  AppToaster: { show: vi.fn() },
}));
vi.mock('react-intl-universal', () => ({
  // intl.get возвращает ключ и подставленные значения — так видно и то,
  // какой текст выбран, и то, что числа из ответа сервера дошли.
  default: {
    get: (key: string, values?: any) =>
      values ? `${key}|${JSON.stringify(values)}` : key,
  },
}));

import { AppToaster } from '@/components/AppToaster';
import { showApiError } from '../showApiError';

const shown = () => (AppToaster.show as any).mock.calls.map((c: any) => c[0]);

const apiError = (errors: any[], status = 400) => ({
  response: { status, data: { errors } },
});

/**
 * С1 (карта v14): ошибки говорят словами, а не «что-то пошло не так».
 */
describe('showApiError', () => {
  beforeEach(() => {
    (AppToaster.show as any).mockClear();
  });

  it('известный код из общего словаря получает свой текст', () => {
    showApiError(apiError([{ type: 'CUSTOMER.HAS.SALES_INVOICES' }]));
    expect(shown()[0].message).toBe('customer_has_sales_invoices');
  });

  it('локальная карта добавляет и перекрывает коды', () => {
    showApiError(apiError([{ type: 'MY_LOCAL_CODE' }]), {
      MY_LOCAL_CODE: 'my.local.key',
    });
    expect(shown()[0].message).toBe('my.local.key');
  });

  it('неизвестный код падает в «что-то пошло не так»', () => {
    showApiError(apiError([{ type: 'TOTALLY_UNKNOWN' }]));
    expect(shown()[0].message).toBe('something_went_wrong');
  });

  it('обрыв сети — «нет связи», а не крах и не безликий текст', () => {
    showApiError({ message: 'Network Error' });
    expect(shown()[0].message).toBe('error.network');
  });

  it('если тост о сети уже показан перехватчиком — второго нет', () => {
    showApiError({ isNetworkError: true });
    expect(AppToaster.show).not.toHaveBeenCalled();
  });

  it('403 без разобранного кода — «недостаточно прав»', () => {
    showApiError({ response: { status: 403, data: { message: 'Forbidden' } } });
    expect(shown()[0].message).toBe('error.forbidden');
  });
  it('числа из ответа сервера подставляются в текст', () => {
    // Потолок строк отчёта без чисел — «слишком много» без единого ориентира
    // (М3 срез 3 карты v15).
    showApiError(
      apiError([
        {
          type: 'REPORT_ROWS_LIMIT_EXCEEDED',
          payload: { rowsCount: 123456, limit: 50000 },
        },
      ]),
    );
    expect(shown()[0].message).toContain('123456');
    expect(shown()[0].message).toContain('50000');
  });
  it('ошибка, пришедшая файлом, всё равно объясняется', async () => {
    // Выгрузка и PDF просят файл, поэтому и отказ приезжает файлом. Без
    // разбора человек видел бы вечный «идёт загрузка» (М3 срез 3 карты v15).
    const asFile = {
      text: () =>
        Promise.resolve(
          JSON.stringify({
            errors: [
              {
                type: 'REPORT_ROWS_LIMIT_EXCEEDED',
                payload: { rowsCount: 5, limit: 2 },
              },
            ],
          }),
        ),
    };
    showApiError({ response: { status: 400, data: asFile } });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(shown()[0].message).toContain('error.report_rows_limit_exceeded');
  });

  it('файл с непонятным содержимым не роняет показ ошибки', async () => {
    const asFile = { text: () => Promise.resolve('не json') };

    showApiError({ response: { status: 400, data: asFile } });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(shown()[0].message).toBe('something_went_wrong');
  });
});
