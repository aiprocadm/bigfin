import { FinancialAuditLogSubscriber } from './FinancialAuditLog.subscriber';
import { AuditLogService } from '../AuditLog.service';
import { AbilitySubject } from '@/modules/Roles/Roles.types';

/**
 * Ж1 (карта v11): журнал действий должен фиксировать управление участниками и
 * приглашениями — тем же приёмом `record(...)`, что уже работает для ролей.
 *
 * Тест ведёт себя как шина: зовёт обработчик и проверяет, что журнал получил
 * запись с верным предметом и действием. Запись участников идёт вне транзакции
 * документа (приглашение — не денежная операция), поэтому trx не ожидается.
 */
describe('FinancialAuditLogSubscriber — участники и приглашения (Ж1)', () => {
  let subscriber: FinancialAuditLogSubscriber;
  let record: jest.Mock;

  beforeEach(() => {
    record = jest.fn().mockResolvedValue(undefined);
    const auditLog = { record } as unknown as AuditLogService;
    subscriber = new FinancialAuditLogSubscriber(auditLog);
  });

  const member = {
    id: 7,
    firstName: 'Иван',
    lastName: 'Петров',
    email: 'ivan@example.com',
  };

  it('приглашение отправлено → запись «Приглашение / отправлено»', async () => {
    await subscriber.onTeamMemberInvited({
      inviteToken: 'tok',
      user: member as any,
      invitingUser: { id: 1 } as any,
    });
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'invited',
        subject: AbilitySubject.Invitation,
        subjectId: 7,
        metadata: expect.objectContaining({ email: 'ivan@example.com' }),
      }),
    );
  });

  it('приглашение переотправлено → запись «Приглашение / переотправлено»', async () => {
    await subscriber.onTeamMemberReinvited({
      inviteToken: 'tok',
      user: member as any,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'reinvited',
        subject: AbilitySubject.Invitation,
        subjectId: 7,
      }),
    );
  });

  it('приглашение принято → запись «Приглашение / принято»', async () => {
    await subscriber.onTeamMemberInviteAccepted({
      inviteToken: {} as any,
      user: { id: 99, email: 'ivan@example.com' } as any,
      inviteUserDTO: {} as any,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'invite_accepted',
        subject: AbilitySubject.Invitation,
      }),
    );
  });

  it('участник изменён → запись «Участник / изменено» с именем и почтой', async () => {
    await subscriber.onTeamMemberEdited({
      userId: 7,
      editUserDTO: {} as any,
      tenantUser: member as any,
      oldTenantUser: member as any,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'edited',
        subject: AbilitySubject.TeamMember,
        subjectId: 7,
        metadata: expect.objectContaining({
          email: 'ivan@example.com',
          name: 'Иван Петров',
        }),
      }),
    );
  });

  it('участник активирован → запись «Участник / активировано»', async () => {
    await subscriber.onTeamMemberActivated({
      userId: 7,
      tenantUser: member as any,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'activated',
        subject: AbilitySubject.TeamMember,
        subjectId: 7,
      }),
    );
  });

  it('участник заблокирован → запись «Участник / заблокировано»', async () => {
    await subscriber.onTeamMemberDeactivated({
      userId: 7,
      tenantUser: member as any,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'deactivated',
        subject: AbilitySubject.TeamMember,
        subjectId: 7,
      }),
    );
  });

  it('участник удалён → запись «Участник / удалено»', async () => {
    await subscriber.onTeamMemberDeleted({
      userId: 7,
      tenantUser: member as any,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'deleted',
        subject: AbilitySubject.TeamMember,
        subjectId: 7,
      }),
    );
  });

  it('сбой записи в журнал не пробрасывается наружу (приглашение важнее аудита)', async () => {
    record.mockRejectedValueOnce(new Error('audit down'));
    await expect(
      subscriber.onTeamMemberInvited({
        inviteToken: 'tok',
        user: member as any,
        invitingUser: { id: 1 } as any,
      }),
    ).resolves.toBeUndefined();
  });
});
