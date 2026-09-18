// © 2026 Bigfin
import {
  AI_PROVIDER_OFF,
  AiCompleteOptions,
  AiProvider,
  AiProviderSettings,
} from './AiProvider';

/**
 * Реализации провайдеров (этап 13 ТЗ, §13.2).
 *
 * Ключи и адреса берутся ИЗ НАСТРОЕК ОРГАНИЗАЦИИ, а не из кода — прямое
 * требование ТЗ. Ключ в коде означал бы, что все покупатели ходят в модель
 * через наш счёт, а тот, кто ставит продукт на свой сервер, не может
 * подключить свою.
 */

const DEFAULT_TIMEOUT_MS = 30_000;

/** Общая часть: как ходить по HTTP и что считать ответом. */
abstract class HttpAiProvider implements AiProvider {
  abstract readonly key: string;
  abstract readonly isLocal: boolean;

  constructor(protected readonly settings: AiProviderSettings) {}

  abstract isConfigured(): boolean;

  protected abstract buildRequest(
    prompt: string,
    options: AiCompleteOptions,
  ): { url: string; headers: Record<string, string>; body: unknown };

  protected abstract readAnswer(payload: any): string;

  public async complete(
    prompt: string,
    options: AiCompleteOptions = {},
  ): Promise<string> {
    if (!this.isConfigured()) {
      // Внятная ошибка вместо пустого ответа: пустота выглядела бы так же,
      // как «модели нечего сказать».
      throw new Error(`Провайдер ${this.key} не настроен.`);
    }
    const { url, headers, body } = this.buildRequest(prompt, options);

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Тело ответа НЕ пишем в ошибку целиком: в нём может оказаться эхо
        // нашего же промпта, а ошибки попадают в журналы.
        throw new Error(
          `Модель ответила ошибкой ${response.status} (${this.key}).`,
        );
      }
      return this.readAnswer(await response.json());
    } finally {
      clearTimeout(timer);
    }
  }
}

/** YandexGPT — облачный вариант. */
export class YandexGptProvider extends HttpAiProvider {
  readonly key = 'yandex_gpt';
  readonly isLocal = false;

  isConfigured(): boolean {
    return Boolean(this.settings.apiKey && this.settings.folderId);
  }

  protected buildRequest(prompt: string, options: AiCompleteOptions) {
    const model = this.settings.model || 'yandexgpt-lite';

    return {
      url: 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
      headers: { Authorization: `Api-Key ${this.settings.apiKey}` },
      body: {
        modelUri: `gpt://${this.settings.folderId}/${model}/latest`,
        completionOptions: {
          temperature: options.temperature ?? 0.2,
          maxTokens: String(options.maxTokens ?? 800),
        },
        messages: [{ role: 'user', text: prompt }],
      },
    };
  }

  protected readAnswer(payload: any): string {
    return String(payload?.result?.alternatives?.[0]?.message?.text ?? '');
  }
}

/** GigaChat — второй облачный вариант из ТЗ. */
export class GigaChatProvider extends HttpAiProvider {
  readonly key = 'gigachat';
  readonly isLocal = false;

  isConfigured(): boolean {
    return Boolean(this.settings.apiKey);
  }

  protected buildRequest(prompt: string, options: AiCompleteOptions) {
    return {
      url:
        this.settings.endpoint ||
        'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
      headers: { Authorization: `Bearer ${this.settings.apiKey}` },
      body: {
        model: this.settings.model || 'GigaChat',
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 800,
        messages: [{ role: 'user', content: prompt }],
      },
    };
  }

  protected readAnswer(payload: any): string {
    return String(payload?.choices?.[0]?.message?.content ?? '');
  }
}

/**
 * Любая OpenAI-совместимая модель, в том числе своя, поднятая рядом.
 *
 * Считается ЛОКАЛЬНОЙ только тогда, когда её адрес — внутренний. Иначе под
 * видом «своей модели» данные уехали бы наружу в обход запрета из §13.1 п. 5.
 */
export class OpenAiCompatibleProvider extends HttpAiProvider {
  readonly key = 'openai_compatible';

  get isLocal(): boolean {
    return isLocalEndpoint(this.settings.endpoint);
  }

  isConfigured(): boolean {
    return Boolean(this.settings.endpoint);
  }

  protected buildRequest(prompt: string, options: AiCompleteOptions) {
    const base = String(this.settings.endpoint ?? '').replace(/\/+$/, '');

    return {
      url: `${base}/chat/completions`,
      headers: this.settings.apiKey
        ? { Authorization: `Bearer ${this.settings.apiKey}` }
        : {},
      body: {
        model: this.settings.model || 'local-model',
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 800,
        messages: [{ role: 'user', content: prompt }],
      },
    };
  }

  protected readAnswer(payload: any): string {
    return String(payload?.choices?.[0]?.message?.content ?? '');
  }
}

/**
 * Заглушка «выключено».
 *
 * Не молчит, а ГОВОРИТ, что выключена. Провайдер, который возвращает пустую
 * строку, неотличим от модели, которой нечего сказать.
 */
export class DisabledAiProvider implements AiProvider {
  readonly key = AI_PROVIDER_OFF;
  readonly isLocal = true;

  isConfigured(): boolean {
    return false;
  }

  async complete(): Promise<string> {
    throw new Error('ИИ-аналитик выключен.');
  }
}

/**
 * Внутренний ли это адрес.
 *
 * Тот же вопрос, что и у вебхуков, но с обратным знаком: там внутренний адрес
 * запрещён, здесь — наоборот, он и есть признак «данные не покидают контур».
 */
export function isLocalEndpoint(endpoint: string | null | undefined): boolean {
  if (!endpoint) return false;

  let host: string;

  try {
    host = new URL(endpoint).hostname.toLowerCase();
  } catch {
    // Кривой адрес НЕ считается локальным: ошибка разбора не повод
    // разрешить отправку при запрете на внешние сервисы.
    return false;
  }

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return true;
  }
  // Имя без точек — это имя внутри сети (например, контейнер `llm`).
  if (!host.includes('.')) return true;

  const parts = host.split('.').map(Number);

  if (parts.length === 4 && parts.every((n) => Number.isInteger(n))) {
    const [a, b] = parts;

    if (a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  return false;
}

/** Собирает провайдера по настройкам организации. */
export function createAiProvider(settings: AiProviderSettings): AiProvider {
  switch (settings.provider) {
    case 'yandex_gpt':
      return new YandexGptProvider(settings);
    case 'gigachat':
      return new GigaChatProvider(settings);
    case 'openai_compatible':
      return new OpenAiCompatibleProvider(settings);
    default:
      // Неизвестный провайдер трактуется как «выключено», а не как ошибка:
      // опечатка в настройке не должна ронять главную страницу.
      return new DisabledAiProvider();
  }
}
