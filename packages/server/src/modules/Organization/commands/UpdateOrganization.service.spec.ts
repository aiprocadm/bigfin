import { UpdateOrganizationService } from './UpdateOrganization.service';
import { events } from '@/common/events/events';

/**
 * Ж2 (карта v11): при обновлении реквизитов организации журнал получает событие
 * `onOrganizationUpdated`. Отдельно закреплён найденный дефект ядра: событие
 * смены базовой валюты (запускающее перестроение остатков всех счетов) должно
 * подниматься ТОЛЬКО когда валюту действительно прислали и она другая — а не при
 * любой правке названия/адреса (`undefined !== 'RUB'`).
 */
describe('UpdateOrganizationService — событие обновления и защита валюты (Ж2)', () => {
  const buildService = (metadata: Record<string, any>) => {
    const emitted: Array<{ name: string; payload: any }> = [];
    const tenancyContext = {
      getTenant: jest.fn().mockResolvedValue({ id: 1, metadata }),
    };
    const eventEmitter = {
      emitAsync: jest.fn((name: string, payload: any) => {
        emitted.push({ name, payload });
        return Promise.resolve([]);
      }),
    };
    const commandOrganizationValidators = {
      validateMutateBaseCurrency: jest.fn().mockResolvedValue(undefined),
    };
    const tenantRepository = { saveMetadata: jest.fn().mockResolvedValue(undefined) };
    const service = new UpdateOrganizationService(
      tenancyContext as any,
      eventEmitter as any,
      commandOrganizationValidators as any,
      tenantRepository as any,
    );
    return { service, emitted };
  };

  const names = (emitted: Array<{ name: string }>) => emitted.map((e) => e.name);

  it('правка названия без валюты → есть onUpdated, НЕТ смены валюты', async () => {
    const { service, emitted } = buildService({ baseCurrency: 'RUB', name: 'Старое' });
    await service.execute({ name: 'Новое' } as any);
    expect(names(emitted)).toContain(events.organization.updated);
    expect(names(emitted)).not.toContain(events.organization.baseCurrencyUpdated);
  });

  it('валюта прислана и отличается → поднимается смена валюты', async () => {
    const { service, emitted } = buildService({ baseCurrency: 'RUB' });
    await service.execute({ baseCurrency: 'USD' } as any);
    expect(names(emitted)).toContain(events.organization.baseCurrencyUpdated);
  });

  it('валюта прислана, но та же → смены валюты нет', async () => {
    const { service, emitted } = buildService({ baseCurrency: 'RUB' });
    await service.execute({ baseCurrency: 'RUB', name: 'Новое' } as any);
    expect(names(emitted)).not.toContain(events.organization.baseCurrencyUpdated);
    expect(names(emitted)).toContain(events.organization.updated);
  });
});
