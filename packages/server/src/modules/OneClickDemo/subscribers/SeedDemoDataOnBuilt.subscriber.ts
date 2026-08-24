import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { events } from '@/common/events/events';
import { OneClickDemo } from '@/modules/System/models/OneClickDemo.model';
import { IOrganizationBuiltEventPayload } from '@/modules/Organization/Organization.types';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { SeedOneClickDemoDataService } from '../commands/SeedOneClickDemoData.service';

@Injectable()
export class SeedDemoDataOnBuiltSubscriber {
  constructor(
    private readonly seedDemoData: SeedOneClickDemoDataService,
    private readonly tenancyContext: TenancyContext,

    @Inject(OneClickDemo.name)
    private readonly oneClickDemoModel: typeof OneClickDemo,
  ) {}

  /**
   * Наполняет демо-организацию данными сразу после её постройки (Д2 v18).
   *
   * Подписчик общий для всех организаций, поэтому первым делом проверяет,
   * что построенная организация — демо: обычная организация человека
   * должна остаться пустой, чужие «примерные» контрагенты в ней — мусор.
   */
  @OnEvent(events.organization.built)
  async handleOrganizationBuilt({ tenantId }: IOrganizationBuiltEventPayload) {
    const demo = await this.oneClickDemoModel.query().findOne({ tenantId });

    if (!demo) return;

    try {
      const metadata = await this.tenancyContext.getTenantMetadata();

      await this.seedDemoData.seedDemoData(metadata?.baseCurrency ?? 'RUB');
    } catch (error) {
      // Демо без данных всё же лучше, чем демо, которое не построилось:
      // организация уже готова, человек вот-вот войдёт.
      console.error('Failed to seed the one-click demo data:', error);
    }
  }
}
