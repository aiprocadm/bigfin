// © 2026 Bigfin
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { events } from '@/common/events/events';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenantUser } from '@/modules/Tenancy/TenancyModels/models/TenantUser.model';

/**
 * Начало проверки доступа (FT-081 ТЗ-3): «посмотреть, что видит этот
 * пользователь».
 *
 * Состояния на сервере нет — дальше витрина сама прикладывает заголовок
 * режима, а сервер проверяет его на каждом запросе
 * (`Roles/utils/accessPreview.ts`). Эта ручка нужна для двух вещей: убедиться
 * до перехода, что такой сотрудник есть, и оставить запись в журнале — смотреть
 * чужими глазами без следа нельзя даже владельцу.
 */
@Injectable()
export class CreatePreviewSessionService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(TenantUser.name)
    private readonly tenantUserModel: TenantModelProxy<typeof TenantUser>,
  ) {}

  public async start(tenantUserId: number) {
    const user: any = await this.tenantUserModel().query().findById(tenantUserId);
    if (!user?.systemUserId) {
      throw new NotFoundException({
        errors: [{ type: 'ACCESS_PREVIEW_USER_NOT_FOUND', message: 'Такого сотрудника в организации нет.' }],
      });
    }
    const name = user.fullName?.trim() || user.email || '';
    await this.eventEmitter.emitAsync(events.roles.onAccessPreviewStarted, {
      tenantUserId: user.id,
      name,
    });
    return { userId: user.id, name };
  }
}
