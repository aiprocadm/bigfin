import { FinancialAuditLogSubscriber } from './FinancialAuditLog.subscriber';
import { AuditLogService } from '../AuditLog.service';
import { AbilitySubject } from '@/modules/Roles/Roles.types';

/**
 * Ж3 (карта v11): журнал действий должен фиксировать вход в систему. События
 * входа раньше не было — его завели; запись пишется в ту организацию, в которую
 * пользователь вошёл (её контекст к этому моменту уже установлен).
 */
describe('FinancialAuditLogSubscriber — вход в систему (Ж3)', () => {
  let subscriber: FinancialAuditLogSubscriber;
  let record: jest.Mock;

  beforeEach(() => {
    record = jest.fn().mockResolvedValue(undefined);
    const auditLog = { record } as unknown as AuditLogService;
    subscriber = new FinancialAuditLogSubscriber(auditLog);
  });

  it('успешный вход → запись «Вход / выполнен» с именем и почтой', async () => {
    await subscriber.onUserSignedIn({
      user: {
        id: 42,
        firstName: 'Иван',
        lastName: 'Петров',
        email: 'ivan@example.com',
      } as any,
      tenant: { id: 3, organizationId: 'org-3' } as any,
    });
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'signed_in',
        subject: AbilitySubject.Session,
        subjectId: 42,
        metadata: expect.objectContaining({
          email: 'ivan@example.com',
          name: 'Иван Петров',
        }),
      }),
    );
  });

  it('сбой записи в журнал не пробрасывается наружу (вход важнее записи)', async () => {
    record.mockRejectedValueOnce(new Error('audit down'));
    await expect(
      subscriber.onUserSignedIn({
        user: { id: 42, email: 'ivan@example.com' } as any,
        tenant: { id: 3, organizationId: 'org-3' } as any,
      }),
    ).resolves.toBeUndefined();
  });
});
