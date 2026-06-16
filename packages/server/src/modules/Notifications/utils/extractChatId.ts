// © 2026 Bigfin

/**
 * Извлекает chat_id из ответа Telegram getUpdates.
 * Берёт последний апдейт, у которого есть message.chat.id; иначе null.
 */
export function extractChatId(updatesResponse: {
  ok?: boolean;
  result?: Array<{ message?: { chat?: { id?: number } } }>;
}): number | null {
  const result = updatesResponse?.result;
  if (!Array.isArray(result) || result.length === 0) return null;
  for (let i = result.length - 1; i >= 0; i -= 1) {
    const id = result[i]?.message?.chat?.id;
    if (typeof id === 'number') return id;
  }
  return null;
}
