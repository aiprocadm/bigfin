import * as fs from 'fs';
import * as path from 'path';
import {
  OrganizationLanguageResolver,
  SUPPORTED_LANGUAGES,
} from './OrganizationLanguage.resolver';

/**
 * Р2 карты v21 — сервер отвечает на языке организации, когда клиент просит
 * язык, которого мы не знаем.
 */
const contextWith = (acceptLanguage?: string): any => ({
  getType: () => 'http',
  switchToHttp: () => ({
    getRequest: () => ({
      headers: acceptLanguage ? { 'accept-language': acceptLanguage } : {},
    }),
  }),
});

const resolverWith = (language: string | null | undefined) =>
  new OrganizationLanguageResolver({
    // null, а не отсутствие поля: значение по умолчанию у заглушки перекрыло
    // бы `undefined` и тест бы врал.
    getTenantMetadata: async () => (language === null ? null : { language }),
  } as any);

describe('OrganizationLanguageResolver', () => {
  it('отдаёт язык, о котором просит клиент, если словарь такой есть', async () => {
    const resolver = resolverWith('ru');

    await expect(resolver.resolve(contextWith('en-US,en;q=0.9'))).resolves.toBe(
      'en',
    );
  });

  it('на неизвестный язык клиента отвечает языком организации', async () => {
    const resolver = resolverWith('ru');

    // Ровно случай витрины: она годами слала 'ar', словаря нет.
    await expect(resolver.resolve(contextWith('ar'))).resolves.toBe('ru');
  });

  it('без заголовка тоже берёт язык организации', async () => {
    const resolver = resolverWith('ru');

    await expect(resolver.resolve(contextWith())).resolves.toBe('ru');
  });

  it('регистр и региональный суффикс не мешают', async () => {
    const resolver = resolverWith('ru');

    await expect(resolver.resolve(contextWith('RU-ru'))).resolves.toBe('ru');
  });

  it('если организации в запросе нет — решает обычная цепочка', async () => {
    const resolver = resolverWith(null);

    await expect(resolver.resolve(contextWith('ar'))).resolves.toBeUndefined();
  });

  it('падение при чтении метаданных не роняет запрос', async () => {
    const resolver = new OrganizationLanguageResolver({
      getTenantMetadata: async () => {
        throw new Error('организация не выбрана');
      },
    } as any);

    await expect(resolver.resolve(contextWith('ar'))).resolves.toBeUndefined();
  });

  it('язык организации, для которого нет словаря, не подставляется', async () => {
    const resolver = resolverWith('de');

    await expect(resolver.resolve(contextWith('ar'))).resolves.toBeUndefined();
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
