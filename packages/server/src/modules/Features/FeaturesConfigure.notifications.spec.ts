// © 2026 Bigfin
import { FeaturesConfigure } from './FeaturesConfigure';
import { Features } from '@/common/types/Features';

/**
 * Г1 карты v20. Продукт умеет предупреждать — просрочен счёт, кончаются
 * деньги на счёте, впереди кассовый разрыв — и всё это молчало: модуль был
 * выключен по умолчанию. Предприниматель без бухгалтера узнавал о просрочке,
 * только если сам заходил и смотрел.
 *
 * Включать безопасно: письма уходят лишь через настроенный канал, а адрес
 * получателя по умолчанию пуст. Заработает лента в приложении.
 */
describe('FeaturesConfigure — уведомления', () => {
  const configure = () =>
    new FeaturesConfigure({ get: () => undefined } as any);

  it('уведомления включены по умолчанию', () => {
    const entry = configure()
      .getConfigure()
      .find((f) => f.name === Features.NOTIFICATIONS);

    expect(entry).toBeDefined();
    expect(entry!.defaultValue).toBe(true);
  });

  it('список включённых по умолчанию остаётся коротким и явным', () => {
    // Осознанный набор: справочник статей, режим интерфейса и уведомления.
    // Остальное владелец включает сам — иначе продукт зашумит новичка.
    const enabled = configure()
      .getConfigure()
      .filter((f) => f.defaultValue === true)
      .map((f) => f.name);

    expect(enabled).toEqual([
      Features.MGMT_ARTICLES,
      Features.NOTIFICATIONS,
      Features.INTERFACE_MODES,
    ]);
  });
});
