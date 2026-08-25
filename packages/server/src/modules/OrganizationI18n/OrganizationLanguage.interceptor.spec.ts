import * as fs from 'fs';
import * as path from 'path';
import { of } from 'rxjs';
import {
  OrganizationLanguageInterceptor,
  SUPPORTED_LANGUAGES,
} from './OrganizationLanguage.interceptor';

/**
 * Р2 карты v21 (вторая попытка) — сервер отвечает на языке организации,
 * когда клиент просит язык, которого мы не знаем.
 */
const contextWith = (request: any): any => ({
  getType: () => 'http',
  switchToHttp: () => ({ getRequest: () => request }),
});

const nextHandler = () => ({ handle: () => of('ответ') });

const buildInterceptor = (language: string | null | undefined) =>
  new OrganizationLanguageInterceptor({
    // null, а не отсутствие поля: значение по умолчанию у заглушки
    // перекрыло бы `undefined`, и тест бы врал.
    getTenantMetadata: async () => (language === null ? null : { language }),
  } as any);

describe('OrganizationLanguageInterceptor', () => {
  it('не трогает язык, если клиент попросил тот, что мы умеем', async () => {
    const request = {
      headers: { 'accept-language': 'en-US,en;q=0.9' },
      i18nLang: 'en',
      i18nContext: { lang: 'en' },
    };

    await buildInterceptor('ru').intercept(
      contextWith(request),
      nextHandler() as any,
    );

    expect(request.i18nContext.lang).toBe('en');
    expect(request.i18nLang).toBe('en');
  });

  it('на незнакомый язык клиента подставляет язык организации', async () => {
    // Ровно случай витрины: она годами слала 'ar', словаря нет, и
    // nestjs-i18n откатывался на английский.
    const request = {
      headers: { 'accept-language': 'ar' },
      i18nLang: 'ar',
      i18nContext: { lang: 'ar' },
    };

    await buildInterceptor('ru').intercept(
      contextWith(request),
      nextHandler() as any,
    );

    expect(request.i18nContext.lang).toBe('ru');
    expect(request.i18nLang).toBe('ru');
  });

  it('клиент промолчал — отвечаем на языке организации, а не по-английски', async () => {
    // Заголовка не было вовсе: nestjs-i18n уже поставил английский по
    // умолчанию. Отличить «просил английский» от «не просил ничего» можно
    // только по исходной просьбе — её и смотрим.
    const request = { headers: {}, i18nLang: 'en', i18nContext: { lang: 'en' } };

    await buildInterceptor('ru').intercept(
      contextWith(request),
      nextHandler() as any,
    );

    expect(request.i18nContext.lang).toBe('ru');
    expect(request.i18nLang).toBe('ru');
  });

  it('язык из ?lang= в адресе тоже считается просьбой клиента', async () => {
    const request = {
      query: { lang: 'en' },
      headers: {},
      i18nLang: 'en',
      i18nContext: { lang: 'en' },
    };

    await buildInterceptor('ru').intercept(
      contextWith(request),
      nextHandler() as any,
    );

    expect(request.i18nContext.lang).toBe('en');
  });

  it('если организации в запросе нет — язык остаётся прежним', async () => {
    const request = {
      headers: { 'accept-language': 'ar' },
      i18nLang: 'ar',
      i18nContext: { lang: 'ar' },
    };

    await buildInterceptor(null).intercept(
      contextWith(request),
      nextHandler() as any,
    );

    expect(request.i18nContext.lang).toBe('ar');
  });

  it('язык организации без словаря не подставляется', async () => {
    const request = {
      headers: { 'accept-language': 'ar' },
      i18nLang: 'ar',
      i18nContext: { lang: 'ar' },
    };

    await buildInterceptor('de').intercept(
      contextWith(request),
      nextHandler() as any,
    );

    expect(request.i18nContext.lang).toBe('ar');
  });

  it('падение при чтении метаданных не роняет запрос', async () => {
    const request = {
      headers: { 'accept-language': 'ar' },
      i18nLang: 'ar',
      i18nContext: { lang: 'ar' },
    };
    const interceptor = new OrganizationLanguageInterceptor({
      getTenantMetadata: async () => {
        throw new Error('организация не выбрана');
      },
    } as any);

    const result = await interceptor.intercept(
      contextWith(request),
      nextHandler() as any,
    );

    expect(request.i18nContext.lang).toBe('ar');
    await expect(
      new Promise((resolve) => result.subscribe(resolve)),
    ).resolves.toBe('ответ');
  });

  it('обработчик вызывается всегда — перехватчик ничего не глотает', async () => {
    const request = {
      headers: { 'accept-language': 'ar' },
      i18nLang: 'ar',
      i18nContext: { lang: 'ar' },
    };
    const result = await buildInterceptor('ru').intercept(
      contextWith(request),
      nextHandler() as any,
    );

    await expect(
      new Promise((resolve) => result.subscribe(resolve)),
    ).resolves.toBe('ответ');
  });

  it('не-http вызовы (очереди, крон) проходят мимо', async () => {
    const rpc: any = {
      getType: () => 'rpc',
      switchToHttp: () => {
        throw new Error('у очереди нет http-запроса');
      },
    };

    const result = await buildInterceptor('ru').intercept(
      rpc,
      nextHandler() as any,
    );

    await expect(
      new Promise((resolve) => result.subscribe(resolve)),
    ).resolves.toBe('ответ');
  });

  it('список поддерживаемых языков совпадает с папками переводов', () => {
    const dir = path.resolve(__dirname, '../../i18n');
    const folders = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    expect([...SUPPORTED_LANGUAGES].sort()).toEqual(folders);
  });
});
