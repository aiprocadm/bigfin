// © 2026 Bigfin
import {
  DisabledAiProvider,
  GigaChatProvider,
  OpenAiCompatibleProvider,
  YandexGptProvider,
  createAiProvider,
  isLocalEndpoint,
} from './providers';

/**
 * Этап 13 ТЗ, §13.2. Провайдер за интерфейсом: YandexGPT, GigaChat, локальная
 * OpenAI-совместимая модель, «выключено».
 *
 * Ключи и адреса — из настроек организации, не из кода.
 */
describe('createAiProvider', () => {
  it('собирает провайдера по настройке', () => {
    expect(createAiProvider({ provider: 'yandex_gpt' })).toBeInstanceOf(
      YandexGptProvider,
    );
    expect(createAiProvider({ provider: 'gigachat' })).toBeInstanceOf(
      GigaChatProvider,
    );
    expect(createAiProvider({ provider: 'openai_compatible' })).toBeInstanceOf(
      OpenAiCompatibleProvider,
    );
  });

  it('«выключено» — это заглушка', () => {
    expect(createAiProvider({ provider: 'off' })).toBeInstanceOf(
      DisabledAiProvider,
    );
  });

  it('опечатка в настройке не роняет главную страницу', () => {
    // Неизвестный провайдер трактуется как «выключено», а не как ошибка.
    expect(createAiProvider({ provider: 'yandexgpt' })).toBeInstanceOf(
      DisabledAiProvider,
    );
    expect(createAiProvider({})).toBeInstanceOf(DisabledAiProvider);
  });
});

describe('настроенность', () => {
  it('YandexGPT нужен ключ И каталог', () => {
    expect(new YandexGptProvider({ apiKey: 'k' }).isConfigured()).toBe(false);
    expect(
      new YandexGptProvider({ apiKey: 'k', folderId: 'f' }).isConfigured(),
    ).toBe(true);
  });

  it('GigaChat нужен ключ', () => {
    expect(new GigaChatProvider({}).isConfigured()).toBe(false);
    expect(new GigaChatProvider({ apiKey: 'k' }).isConfigured()).toBe(true);
  });

  it('локальной модели нужен адрес, ключ не обязателен', () => {
    // У модели, поднятой рядом, ключа обычно и нет.
    expect(new OpenAiCompatibleProvider({}).isConfigured()).toBe(false);
    expect(
      new OpenAiCompatibleProvider({
        endpoint: 'http://llm:8000/v1',
      }).isConfigured(),
    ).toBe(true);
  });

  it('заглушка никогда не настроена', () => {
    expect(new DisabledAiProvider().isConfigured()).toBe(false);
  });

  it('заглушка ГОВОРИТ, что выключена, а не молчит', () => {
    // Пустая строка была бы неотличима от «модели нечего сказать».
    return expect(new DisabledAiProvider().complete()).rejects.toThrow(
      /выключен/,
    );
  });
});

describe('isLocalEndpoint', () => {
  it('облачные провайдеры не локальные', () => {
    expect(new YandexGptProvider({}).isLocal).toBe(false);
    expect(new GigaChatProvider({}).isLocal).toBe(false);
  });

  it('модель рядом — локальная', () => {
    expect(isLocalEndpoint('http://localhost:8000/v1')).toBe(true);
    expect(isLocalEndpoint('http://127.0.0.1:8000/v1')).toBe(true);
    expect(isLocalEndpoint('http://10.0.0.5:8000/v1')).toBe(true);
    expect(isLocalEndpoint('http://192.168.1.5:8000/v1')).toBe(true);
  });

  it('имя контейнера без точек — локальное', () => {
    expect(isLocalEndpoint('http://llm:8000/v1')).toBe(true);
  });

  it('ЧУЖОЙ адрес не выдаёт себя за локальную модель', () => {
    // Иначе под видом «своей модели» данные уехали бы наружу в обход
    // запрета из §13.1 п. 5.
    expect(isLocalEndpoint('https://api.openai.com/v1')).toBe(false);
    expect(
      new OpenAiCompatibleProvider({ endpoint: 'https://api.openai.com/v1' })
        .isLocal,
    ).toBe(false);
  });

  it('кривой адрес НЕ считается локальным', () => {
    // Ошибка разбора — не повод разрешить отправку при запрете.
    expect(isLocalEndpoint('не адрес')).toBe(false);
    expect(isLocalEndpoint('')).toBe(false);
    expect(isLocalEndpoint(null)).toBe(false);
  });
});

describe('ненастроенный провайдер', () => {
  it('говорит об этом, а не возвращает пустоту', () => {
    // Пустой ответ выглядел бы так же, как «модели нечего сказать».
    return expect(
      new YandexGptProvider({}).complete('что-нибудь'),
    ).rejects.toThrow(/не настроен/);
  });
});
