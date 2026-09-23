import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  REQUIRED_PERMISSION_KEY,
  RequiredPermission,
} from './RequirePermission.decorator';
import { REQUIRED_ANY_PERMISSION_KEY } from './RequireAnyPermission.decorator';
import { AbilitySubject, ExportAction } from './Roles.types';
import {
  asksForSpreadsheet,
  EXPORT_NOT_ALLOWED_MESSAGE,
} from './utils/exportRight';

/**
 * Guard that checks CASL `ability` on the request (attached by AuthorizationGuard).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredAnyPermission = this.reflector.getAllAndOverride<
      RequiredPermission[]
    >(REQUIRED_ANY_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    const request = context.switchToHttp().getRequest<Request>();
    const ability = (request as any).ability;

    // Таблица (Excel, CSV) — это унос данных, и на него нужно отдельное
    // право поверх права на просмотр (FT-082 ТЗ-3). Проверка здесь, а не в
    // каждом отчёте: новый отчёт не должен открыть выгрузку молча.
    if (
      ability &&
      asksForSpreadsheet(request.headers?.accept) &&
      !ability.can(ExportAction.Run, AbilitySubject.Export)
    ) {
      throw new ForbiddenException(EXPORT_NOT_ALLOWED_MESSAGE);
    }

    if (!requiredPermission && !requiredAnyPermission?.length) {
      return true;
    }

    if (!ability) {
      throw new ForbiddenException(
        'Ability instance not found. Ensure AuthorizationGuard is applied.',
      );
    }

    if (requiredPermission) {
      const { ability: action, subject } = requiredPermission;

      if (!ability.can(action, subject)) {
        throw new ForbiddenException(
          `You do not have permission to ${action} ${subject}`,
        );
      }
    }

    // Достаточно любого из перечисленных прав: сущность, у которой в схеме
    // два предмета (контрагент — покупатель или поставщик).
    if (requiredAnyPermission?.length) {
      const granted = requiredAnyPermission.some((permission) =>
        ability.can(permission.ability, permission.subject),
      );

      if (!granted) {
        const options = requiredAnyPermission
          .map((permission) => `${permission.ability} ${permission.subject}`)
          .join(' or ');

        throw new ForbiddenException(
          `You do not have permission to ${options}`,
        );
      }
    }

    return true;
  }
}
