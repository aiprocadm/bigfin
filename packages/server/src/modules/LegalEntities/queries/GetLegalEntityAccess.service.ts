// © 2026 Bigfin
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenantUser } from '@/modules/Tenancy/TenancyModels/models/TenantUser.model';
import {
  requestsForbiddenLegalEntity,
  visibleLegalEntityIds,
} from '../utils/visibleLegalEntities';

/**
 * Какие юрлица видно текущему пользователю (этап 8 ТЗ, §8.4, остаток К6).
 *
 * ТЗ формулирует правило одной фразой: «бухгалтеру ИП видно только ИП,
 * владельцу — всё». Само правило давно написано и проверено
 * (`visibleLegalEntities.ts`), но его НИКТО НЕ ЗВАЛ: хранить список было
 * негде, а спросить роль — неоткуда. Возможность существовала на бумаге.
 *
 * Ошибка здесь — это показанные чужие деньги, поэтому спрашиваем роль на
 * каждый отчёт, а не кешируем «на всякий случай»: устаревший кеш прав хуже
 * отсутствующего.
 */
@Injectable()
export class GetLegalEntityAccessService {
  constructor(
    private readonly cls: ClsService,

    @Inject(TenantUser.name)
    private readonly tenantUserModel: TenantModelProxy<typeof TenantUser>,
  ) {}

  /** Юрлица роли текущего пользователя. Пусто — допущен ко всем. */
  public async allowedLegalEntityIds(): Promise<number[]> {
    const userId = this.cls.get('userId');

    if (!userId) return [];

    const user: any = await this.tenantUserModel()
      .query()
      .findOne('systemUserId', userId)
      .withGraphFetched('role');

    const allowed = user?.role?.allowedLegalEntityIds;

    return Array.isArray(allowed) ? allowed.map(Number) : [];
  }

  /**
   * Сужает запрошенный отбор до разрешённого.
   *
   * ЗАПРОС ЧУЖОГО ЮРЛИЦА — ОТКАЗ, А НЕ ПУСТОЙ ОТЧЁТ. Молча вернуть пустоту
   * значит сказать человеку «у этого юрлица нет операций». Он поверит и
   * будет неправ — а это хуже, чем честное «нельзя».
   */
  public async narrowToAllowed(
    requested: number[] | null | undefined,
  ): Promise<number[]> {
    const allowed = await this.allowedLegalEntityIds();
    const access = { allowedLegalEntityIds: allowed };

    if (requestsForbiddenLegalEntity(requested, access)) {
      throw new ForbiddenException('LEGAL_ENTITY_NOT_ALLOWED');
    }
    return visibleLegalEntityIds(requested, access);
  }
}
