import { Injectable } from '@nestjs/common';
import { IFinancialSheetCommonMeta } from '../types/Report.types';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { InventoryComputeCostService } from '@/modules/InventoryCost/commands/InventoryComputeCost.service';
import { Inject } from '@nestjs/common';
import { LegalEntity } from '@/modules/LegalEntities/models/LegalEntity.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { describeGroupCurrency } from '@/modules/LegalEntities/utils/groupCurrency';

@Injectable()
export class FinancialSheetMeta {
  constructor(
    private readonly tenancyContext: TenancyContext,
    private readonly inventoryComputeCostService: InventoryComputeCostService,

    @Inject(LegalEntity.name)
    private readonly legalEntityModel: TenantModelProxy<typeof LegalEntity>,
  ) {}

  /**
   * Retrieves the common meta data of the financial sheet.
   * @returns {Promise<IFinancialSheetCommonMeta>}
   */
  async meta(): Promise<IFinancialSheetCommonMeta> {
    const tenantMetadata = await this.tenancyContext.getTenantMetadata();

    const organizationName = tenantMetadata.name;
    const baseCurrency = tenantMetadata.baseCurrency;
    const dateFormat = tenantMetadata.dateFormat;

    const isCostComputeRunning =
      await this.inventoryComputeCostService.isItemsCostComputeRunning();

    // Валюты юрлиц читаются ОДНИМ местом на все отчёты. Считать это в каждой
    // шапке порознь значило бы завести три правила, которые однажды
    // разойдутся, — а расхождение между страницами человек замечает сразу и
    // перестаёт верить обеим.
    const entities = await this.legalEntityModel()
      .query()
      .select('baseCurrency');

    return {
      organizationName,
      baseCurrency,
      dateFormat,
      isCostComputeRunning,
      sheetName: '',
      groupCurrency: describeGroupCurrency(baseCurrency, entities),
    };
  }
}
