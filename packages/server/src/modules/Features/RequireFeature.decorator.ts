// © 2026 Bigfin
import { SetMetadata } from '@nestjs/common';
import { Features } from '@/common/types/Features';

export const REQUIRED_FEATURE_KEY = 'requiredFeature';

/**
 * Помечает контроллер (или отдельную ручку) модулем, за флагом которого он
 * живёт: если модуль выключен, ответом будет 403.
 *
 * Зачем это нужно. Приёмка на свежей организации показала расхождение: пункт
 * меню спрятан за флагом, а ручки того же модуля отвечают всем подряд. Для
 * чтения это просто непоследовательно, а для записи уже неприятно — в
 * организации с выключенным модулем можно было изменить данные.
 *
 * @example
 * ```typescript
 * @Controller('budgets')
 * @UseGuards(FeatureGuard)
 * @RequireFeature(Features.BUDGETS)
 * export class BudgetsController { ... }
 * ```
 */
export const RequireFeature = (feature: Features) =>
  SetMetadata(REQUIRED_FEATURE_KEY, feature);
