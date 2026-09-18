// © 2026 Bigfin
import { isApiDocsEnabled } from './apiDocsFlag';

/**
 * Этап 15 ТЗ: «Смонтировать Swagger UI на `/api/docs` (закрыть для production
 * за флагом)».
 *
 * Главное здесь — что значит МОЛЧАНИЕ. Забытая переменная не должна открывать
 * наружу полный список ручек боевого сервера.
 */
describe('isApiDocsEnabled', () => {
  it('на бою без флага — ЗАКРЫТО', () => {
    // Самая важная проверка этапа: молчание = закрыто.
    expect(isApiDocsEnabled({ NODE_ENV: 'production' })).toBe(false);
  });

  it('на бою открывается только осознанно', () => {
    expect(
      isApiDocsEnabled({ NODE_ENV: 'production', API_DOCS_ENABLED: 'true' }),
    ).toBe(true);
  });

  it('вне боя открыто без настроек', () => {
    // Иначе разработчик не увидит собственных ручек.
    expect(isApiDocsEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(isApiDocsEnabled({})).toBe(true);
  });

  it('явный запрет сильнее окружения', () => {
    expect(
      isApiDocsEnabled({ NODE_ENV: 'development', API_DOCS_ENABLED: 'false' }),
    ).toBe(false);
  });

  it('понимает 1/0 и yes/no', () => {
    // Переменные окружения пишут по-разному, и «0» не должно означать «да».
    expect(isApiDocsEnabled({ NODE_ENV: 'production', API_DOCS_ENABLED: '1' })).toBe(true);
    expect(isApiDocsEnabled({ API_DOCS_ENABLED: '0' })).toBe(false);
    expect(isApiDocsEnabled({ API_DOCS_ENABLED: 'no' })).toBe(false);
    expect(isApiDocsEnabled({ NODE_ENV: 'production', API_DOCS_ENABLED: 'yes' })).toBe(true);
  });

  it('мусор во флаге не открывает документацию на бою', () => {
    // Опечатка вроде «ture» не должна трактоваться как разрешение.
    expect(
      isApiDocsEnabled({ NODE_ENV: 'production', API_DOCS_ENABLED: 'ture' }),
    ).toBe(false);
  });

  it('регистр и пробелы не мешают', () => {
    expect(
      isApiDocsEnabled({ NODE_ENV: 'PRODUCTION', API_DOCS_ENABLED: ' TRUE ' }),
    ).toBe(true);
    expect(isApiDocsEnabled({ NODE_ENV: ' Production ' })).toBe(false);
  });
});
