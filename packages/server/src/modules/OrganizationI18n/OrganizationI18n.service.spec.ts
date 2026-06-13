// © 2026 Bigfin
import { OrganizationI18nService } from './OrganizationI18n.service';

describe('OrganizationI18nService', () => {
  /**
   * Создаёт сервис с замоканными зависимостями.
   * `translate` возвращает строку, в которой видно, на каком языке его позвали,
   * чтобы можно было проверять выбор языка.
   */
  function setup(metadata: any) {
    const i18nTranslate = jest
      .fn()
      .mockImplementation((key: string, opts: { lang: string }) => {
        return Promise.resolve(`translated:${key}:${opts.lang}`);
      });

    const i18n = { translate: i18nTranslate } as any;
    const tenancyContext = {
      getTenantMetadata: jest.fn().mockResolvedValue(metadata),
    } as any;

    const service = new OrganizationI18nService(i18n, tenancyContext);

    return { service, i18nTranslate, tenancyContext };
  }

  it('переводит на языке организации (ru)', async () => {
    const { service, i18nTranslate } = setup({ language: 'ru' });

    const result = await service.translate('email.invoice.subject');

    expect(i18nTranslate).toHaveBeenCalledWith(
      'email.invoice.subject',
      expect.objectContaining({ lang: 'ru' }),
    );
    expect(result).toBe('translated:email.invoice.subject:ru');
  });

  it('откатывается на en, когда метаданные отсутствуют', async () => {
    const { service, i18nTranslate } = setup(undefined);

    const result = await service.translate('email.invoice.subject');

    expect(i18nTranslate).toHaveBeenCalledWith(
      'email.invoice.subject',
      expect.objectContaining({ lang: 'en' }),
    );
    expect(result).toBe('translated:email.invoice.subject:en');
  });

  it('откатывается на en, когда у метаданных нет поля language', async () => {
    const { service, i18nTranslate } = setup({});

    await service.translate('some.key');

    expect(i18nTranslate).toHaveBeenCalledWith(
      'some.key',
      expect.objectContaining({ lang: 'en' }),
    );
  });

  it('пробрасывает args в I18nService', async () => {
    const { service, i18nTranslate } = setup({ language: 'ru' });
    const args = { amount: 1000, name: 'ООО Ромашка' };

    await service.translate('email.invoice.body', { args });

    expect(i18nTranslate).toHaveBeenCalledWith(
      'email.invoice.body',
      expect.objectContaining({ lang: 'ru', args }),
    );
  });

  it('передаёт args=undefined, когда опции не заданы', async () => {
    const { service, i18nTranslate } = setup({ language: 'ru' });

    await service.translate('plain.key');

    expect(i18nTranslate).toHaveBeenCalledWith(
      'plain.key',
      expect.objectContaining({ lang: 'ru', args: undefined }),
    );
  });
});
