// © 2026 Bigfin
import { ConnectTelegramService } from './ConnectTelegram.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS, SETTINGS_GROUP, SETTINGS_KEYS } from '../constants';

// ---------- helpers -----------------------------------------------------------

function makeStore() {
  const calls: Array<{ group: string; key: string; value: string }> = [];
  return {
    set: jest.fn((args: { group: string; key: string; value: string }) =>
      calls.push(args),
    ),
    save: jest.fn().mockResolvedValue(undefined),
    _calls: calls,
  };
}

function makeApi(
  getUpdatesResult: any,
  sendMessageImpl?: () => Promise<void>,
) {
  return {
    getUpdates: jest.fn().mockResolvedValue(getUpdatesResult),
    sendMessage: jest.fn().mockImplementation(sendMessageImpl ?? (() => Promise.resolve())),
  };
}

function makeOrgI18n(translated = 'Вы подключены') {
  return { translate: jest.fn().mockResolvedValue(translated) };
}

/** Обёртка-фабрика `() => SettingsStore` как в реальном провайдере. */
function makeSettingsProvider(store: ReturnType<typeof makeStore>) {
  return jest.fn().mockResolvedValue(store);
}

function makeService(
  store: ReturnType<typeof makeStore>,
  api: ReturnType<typeof makeApi>,
  orgI18n: ReturnType<typeof makeOrgI18n>,
) {
  return new ConnectTelegramService(
    makeSettingsProvider(store) as any,
    api as any,
    orgI18n as any,
  );
}

/** Минимальный ответ getUpdates с одним сообщением. */
const updatesWith222 = {
  ok: true,
  result: [{ update_id: 1, message: { chat: { id: 222 } } }],
};

/** Ответ без сообщений (extractChatId вернёт null). */
const emptyUpdates = { ok: true, result: [] };

// ---------- тесты -------------------------------------------------------------

describe('ConnectTelegramService', () => {
  describe('connect()', () => {
    it('успешный connect: сохраняет токен и chat_id, шлёт подтверждение, возвращает { connected: true }', async () => {
      const store = makeStore();
      const api = makeApi(updatesWith222);
      const orgI18n = makeOrgI18n('Вы подключены');
      const svc = makeService(store, api, orgI18n);

      const result = await svc.connect('BOT_TOKEN');

      expect(result).toEqual({ connected: true });

      // токен должен быть сохранён
      expect(store.set).toHaveBeenCalledWith({
        group: SETTINGS_GROUP,
        key: SETTINGS_KEYS.TELEGRAM_BOT_TOKEN,
        value: 'BOT_TOKEN',
      });

      // chat_id должен быть сохранён как строка
      expect(store.set).toHaveBeenCalledWith({
        group: SETTINGS_GROUP,
        key: SETTINGS_KEYS.TELEGRAM_CHAT_ID,
        value: '222',
      });

      // save вызывался минимум дважды (после токена и после chat_id)
      expect(store.save.mock.calls.length).toBeGreaterThanOrEqual(2);

      // подтверждение отправлено
      expect(api.sendMessage).toHaveBeenCalledWith('BOT_TOKEN', '222', 'Вы подключены');
    });

    it('getUpdates вернул пустой список → бросает TELEGRAM_NO_CHAT, chat_id НЕ сохраняется', async () => {
      const store = makeStore();
      const api = makeApi(emptyUpdates);
      const orgI18n = makeOrgI18n();
      const svc = makeService(store, api, orgI18n);

      await expect(svc.connect('BOT_TOKEN')).rejects.toMatchObject({
        errorType: ERRORS.TELEGRAM_NO_CHAT,
      });

      // chat_id не сохранялся
      const chatIdCall = store.set.mock.calls.find(
        (c: any[]) => c[0]?.key === SETTINGS_KEYS.TELEGRAM_CHAT_ID,
      );
      expect(chatIdCall).toBeUndefined();

      // sendMessage не вызывался
      expect(api.sendMessage).not.toHaveBeenCalled();
    });

    it('подтверждение sendMessage падает → всё равно возвращает { connected: true } (Fix 1)', async () => {
      const store = makeStore();
      const api = makeApi(updatesWith222, () => Promise.reject(new Error('network')));
      const orgI18n = makeOrgI18n();
      const svc = makeService(store, api, orgI18n);

      // НЕ должно бросать
      const result = await svc.connect('BOT_TOKEN');
      expect(result).toEqual({ connected: true });

      // токен и chat_id всё равно сохранены
      expect(store.set).toHaveBeenCalledWith(
        expect.objectContaining({ key: SETTINGS_KEYS.TELEGRAM_BOT_TOKEN }),
      );
      expect(store.set).toHaveBeenCalledWith(
        expect.objectContaining({ key: SETTINGS_KEYS.TELEGRAM_CHAT_ID }),
      );
    });
  });

  describe('disconnect()', () => {
    it('очищает токен и chat_id, сохраняет, возвращает { connected: false }', async () => {
      const store = makeStore();
      const api = makeApi(emptyUpdates);
      const orgI18n = makeOrgI18n();
      const svc = makeService(store, api, orgI18n);

      const result = await svc.disconnect();

      expect(result).toEqual({ connected: false });

      expect(store.set).toHaveBeenCalledWith({
        group: SETTINGS_GROUP,
        key: SETTINGS_KEYS.TELEGRAM_BOT_TOKEN,
        value: '',
      });
      expect(store.set).toHaveBeenCalledWith({
        group: SETTINGS_GROUP,
        key: SETTINGS_KEYS.TELEGRAM_CHAT_ID,
        value: '',
      });
      expect(store.save).toHaveBeenCalled();
    });
  });
});
