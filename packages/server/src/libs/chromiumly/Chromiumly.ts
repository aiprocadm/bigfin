import { ChromiumRoute, LibreOfficeRoute, PdfEngineRoute } from './_types';

/**
 * Н1 карты v38. Адрес службы печати спрашивается в момент обращения.
 *
 * Раньше он запоминался полем класса — то есть в момент ЗАГРУЗКИ модуля, а
 * `.env` к этому времени ещё не прочитан: его читает `ConfigModule` уже во
 * время запуска приложения. Адрес выходил пустым, и печать падала с
 * «Invalid URL» — 500 на счёте, счёте на оплату, акте и УПД. Стенд печатал
 * только потому, что его настройки подставляет systemd до старта процесса.
 */
export class Chromiumly {
  public static get GOTENBERG_ENDPOINT(): string {
    return process.env.GOTENBERG_URL || '';
  }

  public static readonly CHROMIUM_PATH = 'forms/chromium/convert';
  public static readonly PDF_ENGINES_PATH = 'forms/pdfengines';
  public static readonly LIBRE_OFFICE_PATH = 'forms/libreoffice';

  public static get GOTENBERG_DOCS_ENDPOINT(): string {
    return process.env.GOTENBERG_DOCS_URL || '';
  }

  public static readonly CHROMIUM_ROUTES = {
    url: ChromiumRoute.URL,
    html: ChromiumRoute.HTML,
    markdown: ChromiumRoute.MARKDOWN,
  };

  public static readonly PDF_ENGINE_ROUTES = {
    merge: PdfEngineRoute.MERGE,
  };

  public static readonly LIBRE_OFFICE_ROUTES = {
    convert: LibreOfficeRoute.CONVERT,
  };
}
