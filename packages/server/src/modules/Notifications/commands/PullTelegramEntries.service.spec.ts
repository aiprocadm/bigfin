import { PullTelegramEntriesService } from './PullTelegramEntries.service';
import { SETTINGS_GROUP, SETTINGS_KEYS } from '../constants';

const CHAT_ID = '555';

/** Заглушка настроек тенанта (key-value в памяти). */
function fakeSettings(initial: Record<string, any> = {}) {
  const data: Record<string, any> = {
    [`${SETTINGS_GROUP}.${SETTINGS_KEYS.TELEGRAM_BOT_TOKEN}`]: 'BOT-TOKEN',
    [`${SETTINGS_GROUP}.${SETTINGS_KEYS.TELEGRAM_CHAT_ID}`]: CHAT_ID,
    [`${SETTINGS_GROUP}.${SETTINGS_KEYS.TELEGRAM_ENTRY_ACCOUNT_ID}`]: '1000',
    ...initial,
  };
  const store = {
    get: ({ group, key }: any, def: any) => data[`${group}.${key}`] ?? def,
    set: ({ group, key, value }: any) => {
      data[`${group}.${key}`] = value;
    },
    save: jest.fn().mockResolvedValue(undefined),
  };
  return { store, data };
}

const message = (updateId: number, text: string, chatId = CHAT_ID) => ({
  update_id: updateId,
  message: { chat: { id: Number(chatId) }, text },
});

function makeDeps(updates: any[], settingsOverride = {}) {
  const { store, data } = fakeSettings(settingsOverride);
  const rows: any[] = [];

  const api = {
    getUpdates: jest.fn().mockResolvedValue({ ok: true, result: updates }),
    sendMessage: jest.fn().mockResolvedValue(undefined),
  };
  const createUncategorized = {
    create: jest.fn(async (dto: any) => {
      rows.push(dto);
      return { id: rows.length };
    }),
  };
  const uncategorizedModel = () => ({
    query: () => ({
      findOne: (where: any) =>
        Promise.resolve(
          rows.find((r) => r.externalId === where.externalId) ?? undefined,
        ),
    }),
  });
  const uow = { withTransaction: (fn: any) => fn({} as any) };

  const service = new PullTelegramEntriesService(
    (() => store) as any,
    api as any,
    uow as any,
    createUncategorized as any,
    uncategorizedModel as any,
  );
  return { service, api, createUncategorized, rows, data, store };
}

describe('PullTelegramEntriesService', () => {
  it('создаёт операцию из сообщения и отвечает подтверждением', async () => {
    const deps = makeDeps([message(101, '-1500 такси')]);

    const result = await deps.service.pull();

    expect(result).toMatchObject({ imported: 1, skipped: 0 });
    expect(deps.rows[0]).toMatchObject({
      accountId: 1000,
      amount: -1500,
      description: 'такси',
      externalId: 'telegram:101',
    });
    // Сумма форматируется по-русски («1 500 ₽») — так читаемее в чате.
    const [token, chat, text] = deps.api.sendMessage.mock.calls[0];
    expect([token, chat]).toEqual(['BOT-TOKEN', CHAT_ID]);
    expect(text).toContain('расход');
    expect(text).toContain('такси');
    expect(text.replace(/[\s ]/g, '')).toContain('1500');
  });

  // Д3 карты v86: раньше ставился день чтения ботом, а не день сообщения.
  it('дата операции — день сообщения, а не день, когда его прочитал бот', async () => {
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 86400;
    const update = message(101, '-1500 такси');
    update.message = { ...update.message, date: twoDaysAgo } as any;
    const deps = makeDeps([update]);

    await deps.service.pull();

    expect(deps.rows[0].date).toBe(
      new Date(twoDaysAgo * 1000).toISOString().slice(0, 10),
    );
  });

  it('без даты в сообщении операция датируется сегодняшним днём', async () => {
    const deps = makeDeps([message(101, '-1500 такси')]);

    await deps.service.pull();

    expect(deps.rows[0].date).toBe(new Date().toISOString().slice(0, 10));
  });

  it('запоминает смещение, чтобы не обработать сообщение дважды', async () => {
    const deps = makeDeps([message(101, '-1500 такси')]);
    await deps.service.pull();

    expect(
      deps.data[`${SETTINGS_GROUP}.${SETTINGS_KEYS.TELEGRAM_LAST_UPDATE_ID}`],
    ).toBe('101');
    // Смещение уходит в запрос как offset = last + 1.
    const deps2 = makeDeps([], {
      [`${SETTINGS_GROUP}.${SETTINGS_KEYS.TELEGRAM_LAST_UPDATE_ID}`]: '101',
    });
    await deps2.service.pull();
    expect(deps2.api.getUpdates).toHaveBeenCalledWith('BOT-TOKEN', 102);
  });

  it('повторный апдейт с тем же id не задваивает операцию', async () => {
    const deps = makeDeps([message(101, '-1500 такси')]);
    await deps.service.pull();
    const again = await deps.service.pull();

    expect(again.skipped).toBeGreaterThan(0);
    expect(deps.createUncategorized.create).toHaveBeenCalledTimes(1);
  });

  it('сообщения из чужого чата игнорируются молча', async () => {
    const deps = makeDeps([message(200, '-100 чужой', '999')]);

    const result = await deps.service.pull();

    expect(result.imported).toBe(0);
    expect(deps.createUncategorized.create).not.toHaveBeenCalled();
    expect(deps.api.sendMessage).not.toHaveBeenCalled();
  });

  it('без выбранного счёта операция не создаётся, но пользователю отвечаем', async () => {
    const deps = makeDeps([message(101, '-1500 такси')], {
      [`${SETTINGS_GROUP}.${SETTINGS_KEYS.TELEGRAM_ENTRY_ACCOUNT_ID}`]: '',
    });

    const result = await deps.service.pull();

    expect(result.imported).toBe(0);
    expect(deps.createUncategorized.create).not.toHaveBeenCalled();
    expect(deps.api.sendMessage).toHaveBeenCalled();
  });

  it('на /help отвечает подсказкой, операцию не создаёт', async () => {
    const deps = makeDeps([message(102, '/help')]);

    const result = await deps.service.pull();

    expect(result.imported).toBe(0);
    expect(deps.api.sendMessage).toHaveBeenCalled();
    expect(deps.createUncategorized.create).not.toHaveBeenCalled();
  });

  it('непонятное сообщение — ответ с примером, без операции', async () => {
    const deps = makeDeps([message(103, 'привет')]);

    await deps.service.pull();

    expect(deps.createUncategorized.create).not.toHaveBeenCalled();
    const [, , text] = deps.api.sendMessage.mock.calls[0];
    expect(text).toContain('1500');
  });

  it('без подключённого бота просто ничего не делает', async () => {
    const deps = makeDeps([], {
      [`${SETTINGS_GROUP}.${SETTINGS_KEYS.TELEGRAM_BOT_TOKEN}`]: '',
    });

    const result = await deps.service.pull();

    expect(result).toMatchObject({ imported: 0, skipped: 0 });
    expect(deps.api.getUpdates).not.toHaveBeenCalled();
  });
});
