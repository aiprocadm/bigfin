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
export const RequireFeature = (...features: Features[]) =>
  // Один флаг храним как есть, несколько — списком: пометка на ручке
  // ПЕРЕКРЫВАЕТ пометку класса, поэтому под-модуль обязан назвать и свой
  // флаг, и родительский, иначе откроется при выключенном родителе.
  SetMetadata(
    REQUIRED_FEATURE_KEY,
    features.length === 1 ? features[0] : features,
  );
