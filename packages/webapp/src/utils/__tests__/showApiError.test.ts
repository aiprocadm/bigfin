import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/components/AppToaster', () => ({
  AppToaster: { show: vi.fn() },
}));
vi.mock('react-intl-universal', () => ({
  // intl.get возвращает сам ключ — так видно, какой текст выбран.
  default: { get: (key: string) => key },
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
});
