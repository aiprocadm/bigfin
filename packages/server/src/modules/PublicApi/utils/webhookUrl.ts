// © 2026 Bigfin

/**
 * Проверка адреса вебхука (этап 15 ТЗ).
 *
 * Вебхук — это запрос, который НАШ сервер делает по адресу, который назвал
 * пользователь. Если адрес не проверять, пользователь может назвать адрес
 * внутри нашей же сети — и получить ответ оттуда, куда снаружи хода нет.
 * По-английски эту дыру называют SSRF; по-русски — «чужими руками загляни
 * туда, куда сам не дотянешься».
 */

/** Разрешены только обычные веб-адреса. */
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Имена и адреса, которые указывают внутрь машины или внутрь локальной сети.
 *
 * Список закрытый, а не «всё кроме»: угадывать «внешний ли это адрес» по
 * форме строки нельзя, а вот внутренние диапазоны известны и конечны.
 */
const PRIVATE_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  // Адрес метаданных облака: классическая цель такой атаки — по нему
  // отдаются ключи доступа виртуальной машины.
  '169.254.169.254',
]);

function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split('.');

  if (parts.length !== 4) return false;
  const nums = parts.map((part) => Number(part));

  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;

  const [a, b] = nums;

  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // сама машина
  if (a === 169 && b === 254) return true; // link-local, метаданные облака
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16

  return false;
}

export type WebhookUrlProblem =
  | 'malformed'
  | 'protocol_not_allowed'
  | 'private_address';

/**
 * Что не так с адресом. `null` — адрес годится.
 *
 * Возвращается ПРИЧИНА, а не просто «нельзя»: человек, который вписал
 * внутренний адрес по незнанию, должен понять, что именно поправить.
 */
export function checkWebhookUrl(url: string): WebhookUrlProblem | null {
  let parsed: URL;

  try {
    parsed = new URL(String(url ?? ''));
  } catch {
    return 'malformed';
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    // `file:`, `gopher:` и прочее — не адреса доставки, а способы заставить
    // сервер прочитать что-нибудь у себя.
    return 'protocol_not_allowed';
  }

  const hostname = parsed.hostname.toLowerCase();

  if (!hostname) return 'malformed';
  if (PRIVATE_HOSTNAMES.has(hostname)) return 'private_address';
  if (isPrivateIPv4(hostname)) return 'private_address';
  // IPv6 внутри квадратных скобок: адреса fc00::/7 и fe80::/10 — внутренние.
  if (/^\[(fc|fd|fe8|fe9|fea|feb)/i.test(parsed.host)) return 'private_address';

  return null;
}

export function isAllowedWebhookUrl(url: string): boolean {
  return checkWebhookUrl(url) === null;
}
