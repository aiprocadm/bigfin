import { ExecutionContext, Injectable } from '@nestjs/common';
import { I18nResolver } from 'nestjs-i18n';
import { TenancyContext } from '../Tenancy/TenancyContext.service';

/**
 * Языки, для которых у сервера есть словарь (`src/i18n/<язык>`).
 * Держится сторожем `OrganizationLanguage.resolver.spec.ts`: если появится
 * новая папка перевода, а список забудут — тест покраснеет.
 */
export const SUPPORTED_LANGUAGES = ['en', 'ru'];

/**
 * Р2 карты v21. Сервер не полагается на клиента в вопросе языка.
 *
 * Раньше язык ответа определялся только заголовком запроса. Витрина годами
 * слала `Accept-Language: 'ar'` (забытая отладочная строка), словаря такого
 * нет — и `nestjs-i18n` откатывался на английский. Русская организация
 * получала отчёты со строками «Assets» и «Accounts Receivable», хотя весь
 * русский перевод был готов. Одна строка в клиенте обнуляла работу целой
 * приёмки.
 *
 * Теперь правило такое:
 *
 *  - клиент попросил язык, который мы умеем (`en`, `ru`) — отвечаем на нём;
 *  - попросил что-то другое или не попросил ничего — отвечаем на языке
 *    организации (`tenants_metadata.language`), тем же, на котором уходят
 *    её письма и печатные формы;
 *  - организации в запросе нет (вход, регистрация) — решает обычная
 *    цепочка `nestjs-i18n`, как раньше.
 *
 * В горячем пути лишних запросов не появляется: пока заголовок понятный,
 * до базы дело не доходит.
 */
@Injectable()
export class OrganizationLanguageResolver implements I18nResolver {
  constructor(private readonly tenancyContext: TenancyContext) {}

  async resolve(context: ExecutionContext): Promise<string | undefined> {
    const requested = this.requestedLanguage(context);

    if (requested && SUPPORTED_LANGUAGES.includes(requested)) {
      return requested;
    }
    return this.organizationLanguage();
  }

  /**
   * Язык, о котором просит клиент: первый тег из `Accept-Language`
   * (`ru-RU,ru;q=0.9` → `ru`).
   */
  private requestedLanguage(context: ExecutionContext): string | undefined {
    if (context.getType() !== 'http') return undefined;

    const request = context.switchToHttp().getRequest();
    const header = request?.headers?.['accept-language'];

    if (typeof header !== 'string' || !header.length) return undefined;

    return header.split(',')[0].split(';')[0].split('-')[0].trim().toLowerCase();
  }

  /**
   * Язык организации из запроса. Если организации нет или её метаданные
   * недоступны — `undefined`: пусть решает обычная цепочка резолверов.
   */
  private async organizationLanguage(): Promise<string | undefined> {
    try {
      const metadata = await this.tenancyContext.getTenantMetadata();
      const language = metadata?.language;

      return language && SUPPORTED_LANGUAGES.includes(language)
        ? language
        : undefined;
    } catch {
      // Запрос без организации (вход, регистрация, служебные ручки) — это
      // не ошибка, просто языка организации здесь нет.
      return undefined;
    }
  }
}
