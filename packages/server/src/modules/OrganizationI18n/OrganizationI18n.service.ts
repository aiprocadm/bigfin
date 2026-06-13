import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { TenancyContext } from '../Tenancy/TenancyContext.service';

/**
 * OrganizationI18nService — перевод серверных строк на языке организации.
 *
 * В отличие от обычного `I18nService`/`I18nContext`, который определяет язык
 * по HTTP-заголовкам запроса (Accept-Language, cookie и т.п.), этот сервис
 * берёт язык из метаданных организации (`tenants_metadata.language`, system
 * schema). Это нужно для текста, который генерирует сам сервер и который НЕ
 * привязан к языку браузера пользователя: email-уведомления и PDF-документы
 * (этапы 3–4 русификации).
 *
 * Если у организации язык не задан — откатываемся на `'en'` (совпадает с
 * `fallbackLanguage` в `I18nModule.forRootAsync`).
 *
 * Синглтон: обе зависимости (`TenancyContext`, `I18nService`) — синглтоны,
 * а организация берётся из CLS (`nestjs-cls`), который изолирует контекст на
 * каждый запрос/задачу. Поэтому request-scope не нужен, и инъекция этого
 * сервиса не «всплывает» request-scope в сервисы-потребители.
 */
@Injectable()
export class OrganizationI18nService {
  constructor(
    private readonly i18n: I18nService,
    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * Переводит ключ на языке текущей организации.
   *
   * @param {string} key - Ключ перевода (например, `'email.invoice.subject'`).
   * @param {object} [options] - Опции перевода.
   * @param {Record<string, any>} [options.args] - Аргументы для подстановки в шаблон.
   * @returns {Promise<string>} Переведённая строка.
   */
  async translate(
    key: string,
    options?: { args?: Record<string, any> },
  ): Promise<string> {
    const lang = await this.getLanguage();

    const translated = await this.i18n.translate(key, {
      lang,
      args: options?.args,
    });

    return String(translated);
  }

  /**
   * Возвращает язык текущей организации (`tenants_metadata.language`),
   * либо `'en'`, если язык не задан.
   *
   * Нужно для случаев, когда перевод выполняется не здесь, а в трансформере
   * email-шаблона (через `context.i18n.t(key, { lang })`), — туда прокидывается
   * именно этот язык, чтобы лейблы письма были на языке организации.
   *
   * @returns {Promise<string>} Код языка организации (`'ru'` | `'en'` | …).
   */
  async getLanguage(): Promise<string> {
    const metadata = await this.tenancyContext.getTenantMetadata();
    return metadata?.language ?? 'en';
  }
}
