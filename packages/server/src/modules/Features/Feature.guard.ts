// © 2026 Bigfin
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeaturesManager } from './FeaturesManager';
import { REQUIRED_FEATURE_KEY } from './RequireFeature.decorator';

/**
 * Пропускает запрос, только если модуль включён у организации.
 *
 * Флаг ищется сначала на самой ручке, затем на контроллере: обычно достаточно
 * пометить контроллер целиком. Если пометки нет — страж не вмешивается.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featuresManager: FeaturesManager,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRED_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!feature) return true;

    const accessible = await this.featuresManager.accessible(feature);

    if (!accessible) {
      throw new ForbiddenException(`Модуль «${feature}» выключен`);
    }
    return true;
  }
}
