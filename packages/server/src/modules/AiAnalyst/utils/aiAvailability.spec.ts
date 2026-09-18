// © 2026 Bigfin
import {
  AI_UNAVAILABLE_MESSAGES,
  AiAvailabilityInput,
  getAiAvailability,
} from './aiAvailability';

/**
 * Этап 13 ТЗ, §13.1 пп. 4–5.
 *
 * Главное здесь — «недоступен, а не деградирует молча»: пустой блок «Что
 * говорят цифры» выглядит точно так же, как блок, которому нечего сказать.
 */
const base: AiAvailabilityInput = {
  featureEnabled: true,
  forbidExternalData: false,
  provider: 'yandex_gpt',
  providerConfigured: true,
  providerIsLocal: false,
};

describe('getAiAvailability', () => {
  it('всё включено и настроено — доступен', () => {
    expect(getAiAvailability(base)).toEqual({ available: true, reason: null });
  });

  it('флаг выключен — недоступен', () => {
    // По умолчанию флаг выключен, это требование §13.1 п. 4.
    expect(getAiAvailability({ ...base, featureEnabled: false })).toEqual({
      available: false,
      reason: 'feature_disabled',
    });
  });

  it('ЗАПРЕТ на внешние сервисы закрывает раздел', () => {
    // §13.1 п. 5 дословно: «раздел недоступен, а не деградирует молча».
    expect(getAiAvailability({ ...base, forbidExternalData: true })).toEqual({
      available: false,
      reason: 'external_data_forbidden',
    });
  });

  it('локальная модель запретом не перекрывается', () => {
    // Запрет не отменяется локальной моделью, он ЕЮ УДОВЛЕТВОРЯЕТСЯ:
    // локальная модель никуда данные не отправляет.
    expect(
      getAiAvailability({
        ...base,
        forbidExternalData: true,
        provider: 'openai_compatible',
        providerIsLocal: true,
      }),
    ).toEqual({ available: true, reason: null });
  });

  it('провайдер не выбран — недоступен', () => {
    expect(getAiAvailability({ ...base, provider: null }).reason).toBe(
      'provider_not_configured',
    );
    expect(getAiAvailability({ ...base, provider: 'off' }).reason).toBe(
      'provider_not_configured',
    );
  });

  it('провайдер выбран, но без ключа — недоступен', () => {
    // Иначе раздел «работал» бы, каждый раз молча возвращая пустоту.
    expect(
      getAiAvailability({ ...base, providerConfigured: false }).reason,
    ).toBe('provider_not_configured');
  });

  it('выключенный флаг важнее прочих причин', () => {
    // Если раздела нет вовсе, говорить о настройках провайдера бессмысленно.
    expect(
      getAiAvailability({
        featureEnabled: false,
        forbidExternalData: true,
        provider: null,
        providerConfigured: false,
        providerIsLocal: false,
      }).reason,
    ).toBe('feature_disabled');
  });

  it('запрет важнее ненастроенного провайдера', () => {
    // Организация уже сказала «наружу нельзя» — это ответ сильнее.
    expect(
      getAiAvailability({
        ...base,
        forbidExternalData: true,
        providerConfigured: false,
      }).reason,
    ).toBe('external_data_forbidden');
  });

  it('у каждой причины есть объяснение для человека', () => {
    // Вместо пустого блока экран показывает, какой выключатель не тронут.
    (
      ['feature_disabled', 'external_data_forbidden', 'provider_not_configured'] as const
    ).forEach((reason) => {
      expect(AI_UNAVAILABLE_MESSAGES[reason].length).toBeGreaterThan(20);
    });
  });
});
