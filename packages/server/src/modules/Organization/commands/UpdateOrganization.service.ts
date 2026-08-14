import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { UpdateOrganizationDto } from '../dtos/Organization.dto';
import { throwIfTenantNotExists } from '../Organization/_utils';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { events } from '@/common/events/events';
import { CommandOrganizationValidators } from './CommandOrganizationValidators.service';
import { TenantRepository } from '@/modules/System/repositories/Tenant.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UpdateOrganizationService {
  constructor(
    private readonly tenancyContext: TenancyContext,
    private readonly eventEmitter: EventEmitter2,
    private readonly commandOrganizationValidators: CommandOrganizationValidators,
    private readonly tenantRepository: TenantRepository,
  ) { }

  /**
   * Updates organization information.
   * @param {UpdateOrganizationDto} organizationDTO
   */
  public async execute(organizationDTO: UpdateOrganizationDto): Promise<void> {
    const tenant = await this.tenancyContext.getTenant(true);

    // Throw error if the tenant not exists.
    throwIfTenantNotExists(tenant);

    // Validate organization transactions before mutate base currency.
    if (organizationDTO.baseCurrency) {
      await this.commandOrganizationValidators.validateMutateBaseCurrency(
        tenant,
        organizationDTO.baseCurrency,
        tenant.metadata?.baseCurrency,
      );
    }
    // Снимок реквизитов ДО сохранения — журнал сравнит, что реально изменилось.
    const oldMetadata = tenant.metadata;

    await this.tenantRepository.saveMetadata(tenant.id, organizationDTO);

    // Triggers `onOrganizationUpdated` event (Ж2: запись в журнал действий).
    await this.eventEmitter.emitAsync(events.organization.updated, {
      organizationDTO,
      oldMetadata,
    });

    // ВАЖНО: валюту меняем только если её ДЕЙСТВИТЕЛЬНО прислали и она другая.
    // Без первой проверки правка любого реквизита (когда baseCurrency не задан)
    // давала `undefined !== 'RUB'` → ложное событие и лишнее перестроение валюты
    // всех счетов организации (`UPDATE accounts SET currency_code = …`).
    if (
      organizationDTO.baseCurrency &&
      organizationDTO.baseCurrency !== tenant.metadata?.baseCurrency
    ) {
      // Triggers `onOrganizationBaseCurrencyUpdated` event.
      await this.eventEmitter.emitAsync(
        events.organization.baseCurrencyUpdated,
        {
          organizationDTO,
        },
      );
    }
  }
}
