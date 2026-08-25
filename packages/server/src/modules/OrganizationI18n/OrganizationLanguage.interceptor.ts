import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { I18nContext } from 'nestjs-i18n';
import { TenancyContext } from '../Tenancy/TenancyContext.service';

/**
 * Языки, для которых у сервера есть словарь (`src/i18n/<язык>`).
 * Держится сторожем `OrganizationLanguage.interceptor.spec.ts`: появится
 * новая папка перевода, а список забудут — тест покраснеет.
 */
export const SUPPORTED_LANGUAGES = ['en', 'ru'];

/**
 * Р2 карты v21 (вторая попытка). Сервер не полагается на клиента в вопросе
 * языка.
 *
 * Зачем. Витрина годами слала `Accept-Language: 'ar'` — забытая отладочная
 * строка. Словаря `ar` нет, `nestjs-i18n` откатывался на английский, и
 * русская организация получала отчёты со строками «Assets» и «Accounts
 * Receivable», хотя весь русский перевод был готов. Одна строка в клиенте
 * обнуляла работу целой приёмки.
 *
 * Почему именно перехватчик, а не резолвер. Первая попытка (PR #322) была
 * резолвером `nestjs-i18n` — и уронила ВЕСЬ сервер. Резолверы работают в
 * middleware, то есть ДО гвардов, которые готовят контекст организации и
 * привязывают модели к её базе; обращение к организации оттуда ломало
 * привязку, и каждый следующий запрос падал с «undefined ... for 'where'».
 * Перехватчики же выполняются ПОСЛЕ гвардов — здесь контекст организации
 * уже готов, и спрашивать её язык безопасно.
 *
 * Что делает. Смотрит, о каком языке ПРОСИЛ клиент (заголовок, `?lang=`,
 * cookie):
 *
 *  - попросил язык, который мы умеем (`en`, `ru`) — не трогаем;
 *  - попросил незнакомый или не попросил ничего — подставляем язык
 *    организации (`tenants_metadata.language`), тот же, на котором уходят
 *    её письма и печатные формы;
 *  - организации в запросе нет (вход, регистрация) — оставляем как было.
 *
 * Контекст перевода создаётся на каждый запрос отдельно, поэтому правка
 * языка в нём никого больше не задевает.
 */
@Injectable()
export class OrganizationLanguageInterceptor implements NestInterceptor {
  constructor(private readonly tenancyContext: TenancyContext) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    if (context.getType() === 'http') {
      await this.applyOrganizationLanguage(context);
    }
    return next.handle();
  }

  private async applyOrganizationLanguage(
    context: ExecutionContext,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const asked = this.askedLanguage(request);

    // Клиент явно попросил язык, который мы умеем — его слово главнее.
    if (asked && SUPPORTED_LANGUAGES.includes(asked)) return;

    const language = await this.organizationLanguage();
    if (!language) return;

    const i18nContext = I18nContext.current() ?? request?.i18nContext;

    if (i18nContext) {
      i18nContext.lang = language;
    }
    if (request) {
      request.i18nLang = language;
    }
  }

  /**
   * О каком языке ПРОСИЛ клиент: заголовок `Accept-Language`, параметр
   * `?lang=` или cookie — то есть то же, что читает `nestjs-i18n`.
   *
   * Смотрим именно исходную просьбу, а не выбранный библиотекой язык:
   * когда клиент не просит ничего, библиотека ставит английский по
   * умолчанию, и «клиент попросил английский» становится неотличимо от
   * «клиент промолчал». Русской организации во втором случае надо отвечать
   * по-русски.
   */
  private askedLanguage(request: any): string | undefined {
    const raw =
      request?.query?.lang ??
      request?.query?.l ??
      request?.headers?.['accept-language'] ??
      request?.cookies?.lang;

    if (typeof raw !== 'string' || !raw.length) return undefined;

    // `ru-RU,ru;q=0.9` → `ru`
    return raw.split(',')[0].split(';')[0].split('-')[0].trim().toLowerCase();
  }

  /**
   * Язык организации из запроса. Если организации нет или её метаданные
   * недоступны — `undefined`: тогда ничего не меняем.
   */
  private async organizationLanguage(): Promise<string | undefined> {
    try {
      const metadata = await this.tenancyContext.getTenantMetadata();
      const language = (metadata as any)?.language;

      return language && SUPPORTED_LANGUAGES.includes(language)
        ? language
        : undefined;
    } catch {
      // Запрос без организации (вход, регистрация, служебные ручки) — это не
      // ошибка, просто языка организации здесь нет.
      return undefined;
    }
  }
}
