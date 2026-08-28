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
    const required = this.reflector.getAllAndOverride<
      string | string[] | undefined
    >(REQUIRED_FEATURE_KEY, [context.getHandler(), context.getClass()]);
    if (!required) return true;

    // Ручка может жить за несколькими флагами сразу (под-модуль + родитель).
    for (const feature of Array.isArray(required) ? required : [required]) {
      const accessible = await this.featuresManager.accessible(feature);

      if (!accessible) {
        // Выключенный модуль — не отказ в правах: человек сам может включить
        // его в настройках. Витрина различает эти два случая по типу, иначе
        // на выключенный раздел она показывала «у вас нет прав» (П1 v36).
        throw new ForbiddenException({
          errors: [
            {
              statusCode: 403,
              type: 'FEATURE_DISABLED',
              message: `Модуль «${feature}» выключен`,
              payload: { feature },
            },
          ],
        });
      }
    }
    return true;
  }
}
