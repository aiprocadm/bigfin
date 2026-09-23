import {
  ITenantUserInactivatedPayload,
  ITenantUserActivatedPayload,
  ITenantUserDeletedPayload,
  ITenantUserEditedPayload,
} from '../Users.types';
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { events } from '@/common/events/events';
import { ABILITIES_CACHE, purgeUserAbilities } from '@/modules/Roles/TenantAbilities';

@Injectable()
export class PurgeUserAbilityCacheSubscriber {
  /**
   * Purges authorized user ability once the user mutate.
   */
  @OnEvent(events.tenantUser.onEdited)
  @OnEvent(events.tenantUser.onActivated)
  @OnEvent(events.tenantUser.onInactivated)
  purgeAuthorizedUserAbility({
    tenantUser,
  }:
    | ITenantUserInactivatedPayload
    | ITenantUserActivatedPayload
    | ITenantUserDeletedPayload
    | ITenantUserEditedPayload) {
    purgeUserAbilities(tenantUser.systemUserId);
  }

  /**
   * Правка или удаление роли меняет права всех её участников. Раньше кеш
   * это не замечал, и новые права действовали только после вытеснения из
   * кеша. Кого затронула роль, кешу не известно — сбрасываем целиком: это
   * редкое действие, а цена — один запрос прав на пользователя.
   */
  @OnEvent(events.roles.onEdited)
  @OnEvent(events.roles.onDeleted)
  purgeAllOnRoleChange() {
    ABILITIES_CACHE.reset();
  }
}