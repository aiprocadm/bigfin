// © 2026 Bigfin

/**
 * Доступен ли ИИ-аналитик (этап 13 ТЗ, §13.1 пп. 4–5).
 *
 * ТЗ требует двух выключателей и одной важной мелочи: при запрете передавать
 * данные во внешние сервисы раздел **недоступен, а не деградирует молча**.
 *
 * Разница принципиальная. «Молча деградирует» — это когда раздел на месте,
 * но выводов в нём нет, и человек думает, что у него в делах всё ровно.
 * Пустой блок «Что говорят цифры» выглядит точно так же, как блок, которому
 * нечего сказать.
 */

export type AiUnavailableReason =
  /** Флаг `ai_analyst` выключен (по умолчанию так и есть). */
  | 'feature_disabled'
  /** Организация запретила отправку данных во внешние сервисы. */
  | 'external_data_forbidden'
  /** Провайдер не выбран или не настроен. */
  | 'provider_not_configured';

export interface AiAvailabilityInput {
  /** Флаг `ai_analyst`. */
  featureEnabled: boolean;
  /** Настройка организации «не передавать данные во внешние сервисы». */
  forbidExternalData: boolean;
  /** Что выбрано в настройках: `yandex_gpt`, `gigachat`, `openai_compatible`, `off`. */
  provider: string | null | undefined;
  /** Настроен ли выбранный провайдер (ключ, адрес). */
  providerConfigured: boolean;
  /** Работает ли провайдер внутри контура организации. */
  providerIsLocal: boolean;
}

export interface AiAvailability {
  available: boolean;
  reason: AiUnavailableReason | null;
}

/** Понятные человеку объяснения — их показывает экран вместо пустоты. */
export const AI_UNAVAILABLE_MESSAGES: Record<AiUnavailableReason, string> = {
  feature_disabled:
    'ИИ-аналитик выключен. Включить: Настройки → Модули → ИИ-аналитик.',
  external_data_forbidden:
    'В настройках организации запрещена передача данных во внешние сервисы. ' +
    'ИИ-аналитик работает только с локальной моделью внутри вашего контура.',
  provider_not_configured:
    'Модель не настроена. Укажите провайдера и ключ доступа: ' +
    'Настройки → ИИ-аналитик.',
};

/**
 * Доступен ли раздел и, если нет, почему именно.
 *
 * Причина возвращается ВСЕГДА, а не просто «нет»: человеку, у которого раздел
 * не работает, нужно знать, какой из трёх выключателей он не тронул.
 *
 * Порядок проверок не случаен. Сначала флаг — если раздел выключен целиком,
 * говорить о запрете на внешние сервисы бессмысленно. Потом запрет — он
 * сильнее любых настроек провайдера: организация уже сказала «наружу нельзя».
 */
export function getAiAvailability(
  input: AiAvailabilityInput,
): AiAvailability {
  if (!input.featureEnabled) {
    return { available: false, reason: 'feature_disabled' };
  }

  // Запрет на внешние сервисы НЕ отменяется локальной моделью, он ею
  // удовлетворяется: локальная модель никуда данные не отправляет.
  if (input.forbidExternalData && !input.providerIsLocal) {
    return { available: false, reason: 'external_data_forbidden' };
  }

  if (
    !input.provider ||
    input.provider === 'off' ||
    !input.providerConfigured
  ) {
    return { available: false, reason: 'provider_not_configured' };
  }

  return { available: true, reason: null };
}
