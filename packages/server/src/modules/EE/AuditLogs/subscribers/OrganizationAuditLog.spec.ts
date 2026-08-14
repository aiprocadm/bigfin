import { FinancialAuditLogSubscriber } from './FinancialAuditLog.subscriber';
import { AuditLogService } from '../AuditLog.service';
import { AbilitySubject } from '@/modules/Roles/Roles.types';

/**
 * Ж2 (карта v11): журнал действий должен фиксировать смену реквизитов
 * организации. Обычная правка реквизитов раньше не поднимала никакого события —
 * его завели, а смену базовой валюты (у неё событие уже было) журнал пишет
 * отдельной, особо заметной записью.
 */
describe('FinancialAuditLogSubscriber — реквизиты организации (Ж2)', () => {
  let subscriber: FinancialAuditLogSubscriber;
  let record: jest.Mock;

  beforeEach(() => {
    record = jest.fn().mockResolvedValue(undefined);
    const auditLog = { record } as unknown as AuditLogService;
    subscriber = new FinancialAuditLogSubscriber(auditLog);
  });

  it('изменены реквизиты → запись «Организация / изменено» со списком затронутых полей', async () => {
    await subscriber.onOrganizationUpdated({
      organizationDTO: { name: 'ООО «Новое»', industry: 'IT' } as any,
      oldMetadata: { name: 'ООО «Старое»', industry: 'IT' } as any,
    });
    expect(record).toHaveBeenCalledTimes(1);
    const arg = record.mock.calls[0][0];
    expect(arg).toEqual(
      expect.objectContaining({
        action: 'edited',
        subject: AbilitySubject.Organization,
      }),
    );
    // изменилось только название (industry прежний)
    expect(arg.metadata.fields).toEqual(['name']);
    expect(arg.metadata.name).toBe('ООО «Новое»');
  });

  it('изменён вложенный адрес → адрес попадает в список полей', async () => {
    await subscriber.onOrganizationUpdated({
      organizationDTO: { address: { city: 'Москва' } } as any,
      oldMetadata: { address: { city: 'Тверь' } } as any,
    });
    expect(record.mock.calls[0][0].metadata.fields).toContain('address');
  });

  it('изменилась только базовая валюта → общая запись НЕ пишется (у валюты своя)', async () => {
    await subscriber.onOrganizationUpdated({
      organizationDTO: { baseCurrency: 'USD' } as any,
      oldMetadata: { baseCurrency: 'RUB' } as any,
    });
    expect(record).not.toHaveBeenCalled();
  });

  it('ничего фактически не изменилось → запись не пишется', async () => {
    await subscriber.onOrganizationUpdated({
      organizationDTO: { name: 'ООО «Тест»' } as any,
      oldMetadata: { name: 'ООО «Тест»' } as any,
    });
    expect(record).not.toHaveBeenCalled();
  });

  it('смена базовой валюты → запись «Организация / базовая валюта изменена»', async () => {
    await subscriber.onOrganizationBaseCurrencyChanged({
      organizationDTO: { baseCurrency: 'USD' } as any,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'base_currency_changed',
        subject: AbilitySubject.Organization,
        metadata: expect.objectContaining({ baseCurrency: 'USD' }),
      }),
    );
  });

  it('сбой записи в журнал не пробрасывается наружу (правка организации важнее)', async () => {
    record.mockRejectedValueOnce(new Error('audit down'));
    await expect(
      subscriber.onOrganizationUpdated({
        organizationDTO: { name: 'ООО «Новое»' } as any,
        oldMetadata: { name: 'ООО «Старое»' } as any,
      }),
    ).resolves.toBeUndefined();
  });
});
