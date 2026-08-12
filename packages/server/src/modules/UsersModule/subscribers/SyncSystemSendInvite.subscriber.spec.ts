// © 2026 Bigfin
import { SyncSystemSendInviteSubscriber } from './SyncSystemSendInvite.subscriber';
import { events } from '@/common/events/events';

/**
 * Переотправка приглашения обязана заканчиваться письмом.
 *
 * Найдено на разведке шага В2 карты v9: ветка переотправки заводила новый
 * токен, но не эмитила `sendInviteTenantSynced` — а почтовый подписчик слушает
 * только его. Владелец жал «переотправить приглашение», получал успех, письмо
 * не уходило.
 */
const buildSubscriber = () => {
  const emitted: Array<{ event: string; payload: any }> = [];
  const inserted = { id: 42, token: 'token-2', email: 'staff@bigfin.local' };

  const inviteModel = {
    query: () => ({
      where: () => ({ delete: async () => 1 }),
      insert: async () => inserted,
    }),
  };

  // Тенантный пользователь того, кто жмёт переотправку, — от его имени письмо.
  const invitingUser = { id: 5, firstName: 'Иван', email: 'owner@bigfin.local' };
  const tenantUserModel = () => ({
    query: () => ({ findOne: async () => invitingUser }),
  });

  const eventEmitter = {
    emitAsync: async (event: string, payload: any) => {
      emitted.push({ event, payload });
    },
  };

  const tenancyContext = {
    getSystemUser: async () => ({ id: 7, tenantId: 1 }),
  };

  const subscriber = new SyncSystemSendInviteSubscriber(
    tenantUserModel as any,
    {} as any,
    inviteModel as any,
    eventEmitter as any,
    tenancyContext as any,
  );

  return { subscriber, emitted, inserted, invitingUser };
};

describe('переотправка приглашения', () => {
  it('после нового токена уходит событие для почтового подписчика', async () => {
    const { subscriber, emitted, inserted, invitingUser } = buildSubscriber();

    await subscriber.syncResendInviteSystemUser({
      inviteToken: 'token-2',
      user: { id: 3, systemUserId: 9, email: 'staff@bigfin.local' },
    } as any);

    const mailEvent = emitted.find(
      (item) => item.event === events.inviteUser.sendInviteTenantSynced,
    );

    expect(mailEvent).toBeDefined();
    // Почтовик кладёт в джобу сам invite (с токеном) и от чьего имени письмо.
    expect(mailEvent!.payload.invite).toBe(inserted);
    expect(mailEvent!.payload.invitingUser).toBe(invitingUser);
  });
});
