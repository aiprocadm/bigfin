import { CreateWarehouse } from './CreateWarehouse.service';
import { Injectable } from '@nestjs/common';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';

@Injectable()
export class CreateInitialWarehouse {
  /**
   * @param {CreateWarehouse} createWarehouse - Create warehouse service.
   * @param {OrganizationI18nService} orgI18n - Перевод на языке организации.
   */
  constructor(
    private readonly createWarehouse: CreateWarehouse,
    private readonly orgI18n: OrganizationI18nService,
  ) {}

  /**
   * Creates a initial warehouse.
   * @param {number} tenantId
   */
  public createInitialWarehouse = async () => {
    // Имя основного склада — на языке организации (Р4 карты v18).
    const name = await this.orgI18n.translate('warehouses.primary_warehouse');

    return this.createWarehouse.createWarehouse({
      name,
      code: '10001',
      primary: true,
    });
  };
}
