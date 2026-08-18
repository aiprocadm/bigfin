// © 2026 Bigfin
import 'reflect-metadata';
import { REQUIRED_FEATURE_KEY } from '@/modules/Features/RequireFeature.decorator';
import { FeatureGuard } from '@/modules/Features/Feature.guard';
import { Features } from '@/common/types/Features';
import { DealsController } from './Deals.controller';
import { DealStagesController } from './DealStages.controller';

/**
 * М2 карты v15: «Сделки» и «Этапы сделки» прятались только визуально —
 * выключенный модуль убирал пункт меню, а ручки отвечали всем. Это та же
 * дыра, что закрыта у 25 других модулей в фазе v8.
 */
describe('модуль «Сделки» проверяет флаг на сервере', () => {
  const guardsOf = (target: any): any[] =>
    Reflect.getMetadata('__guards__', target) ?? [];

  it.each([
    ['Deals', DealsController, Features.DEALS],
    ['DealStages', DealStagesController, Features.DEAL_STAGES],
  ])('%s помечен своим флагом', (_label, controller, feature) => {
    expect(Reflect.getMetadata(REQUIRED_FEATURE_KEY, controller)).toBe(feature);
  });

  it.each([
    ['Deals', DealsController],
    ['DealStages', DealStagesController],
  ])('%s пропущен через FeatureGuard', (_label, controller) => {
    // Пометки без стража мало: она станет мнимой защитой (грабля v8).
    expect(guardsOf(controller)).toContain(FeatureGuard);
  });
});
