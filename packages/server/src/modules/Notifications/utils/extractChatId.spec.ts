// © 2026 Bigfin
import { extractChatId } from './extractChatId';

describe('extractChatId', () => {
  it('пустой результат → null', () => {
    expect(extractChatId({ ok: true, result: [] })).toBeNull();
  });
  it('нет поля result → null', () => {
    expect(extractChatId({ ok: true } as any)).toBeNull();
  });
  it('берёт chat.id последнего апдейта с сообщением', () => {
    const res = {
      ok: true,
      result: [
        { update_id: 1, message: { chat: { id: 111 } } },
        { update_id: 2, message: { chat: { id: 222 } } },
      ],
    };
    expect(extractChatId(res)).toBe(222);
  });
  it('пропускает апдейты без message.chat.id, берёт последний валидный', () => {
    const res = {
      ok: true,
      result: [
        { update_id: 1, message: { chat: { id: 111 } } },
        { update_id: 2, edited_message: { foo: 'bar' } },
      ],
    };
    expect(extractChatId(res)).toBe(111);
  });
  it('групповой чат (отрицательный id) поддержан', () => {
    const res = { ok: true, result: [{ update_id: 1, message: { chat: { id: -1009 } } }] };
    expect(extractChatId(res)).toBe(-1009);
  });
});
