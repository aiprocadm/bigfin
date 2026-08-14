import 'reflect-metadata';
import { OnEvent } from '@nestjs/event-emitter';
import { FinancialAuditLogSubscriber } from './FinancialAuditLog.subscriber';
import { events } from '@/common/events/events';

/**
 * Ж4 (карта v11) — сторож полноты журнала действий.
 *
 * Реестр ниже — это перечень чувствительных действий (управление доступом,
 * состав команды, реквизиты организации, вход), каждое из которых ОБЯЗАНО
 * попадать в журнал. Сторож проверяет, что подписчик журнала действительно
 * слушает каждое такое событие. Если кто-то уберёт обработку (снимет @OnEvent
 * или удалит метод) — тест покраснеет.
 *
 * При добавлении нового чувствительного действия его событие нужно завести и
 * здесь, и в подписчике — тогда журнал не «забудут» по недосмотру.
 */

// Ключ, под которым @OnEvent хранит подписки, находим динамически — не
// завязываемся на приватную константу библиотеки.
class Probe {
  @OnEvent('__probe_event__')
  onProbe() {}
}
const LISTENER_KEY = Reflect.getMetadataKeys(
  (Probe.prototype as any).onProbe,
).find((key) => {
  const value = Reflect.getMetadata(key, (Probe.prototype as any).onProbe);
  return Array.isArray(value) && value.some((e: any) => e?.event === '__probe_event__');
});

function listenedEvents(cls: any): Set<string> {
  const proto = cls.prototype;
  const set = new Set<string>();
  for (const name of Object.getOwnPropertyNames(proto)) {
    if (name === 'constructor') continue;
    const fn = proto[name];
    if (typeof fn !== 'function') continue;
    const meta = LISTENER_KEY ? Reflect.getMetadata(LISTENER_KEY, fn) : undefined;
    if (Array.isArray(meta)) meta.forEach((e: any) => set.add(e.event));
  }
  return set;
}

const SENSITIVE_EVENTS: Array<[string, string]> = [
  // роли
  ['роль создана', events.roles.onCreated],
  ['роль изменена', events.roles.onEdited],
  ['роль удалена', events.roles.onDeleted],
  // состав команды
  ['участник изменён', events.tenantUser.onEdited],
  ['участник активирован', events.tenantUser.onActivated],
  ['участник заблокирован', events.tenantUser.onInactivated],
  ['участник удалён', events.tenantUser.onDeleted],
  // приглашения
  ['приглашение отправлено', events.inviteUser.sendInvite],
  ['приглашение переотправлено', events.inviteUser.resendInvite],
  ['приглашение принято', events.inviteUser.acceptInvite],
  // реквизиты организации
  ['реквизиты организации изменены', events.organization.updated],
  ['базовая валюта изменена', events.organization.baseCurrencyUpdated],
  // вход
  ['вход в систему', events.auth.signIn],
];

describe('сторож полноты журнала действий (Ж4)', () => {
  const listened = listenedEvents(FinancialAuditLogSubscriber);

  it('ключ метаданных @OnEvent найден (иначе сторож слеп)', () => {
    expect(LISTENER_KEY).toBeTruthy();
  });

  it.each(SENSITIVE_EVENTS)(
    'журнал обязан слушать чувствительное действие: %s',
    (_label, event) => {
      expect(listened.has(event)).toBe(true);
    },
  );
});
