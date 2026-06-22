/**
 * Декодирует буфер файла выписки. Файлы 1С обычно в windows-1251,
 * реже UTF-8 (с BOM). Используем встроенный TextDecoder (full-ICU в Node 18).
 */
export function decodeStatementBuffer(buf: Buffer): string {
  // UTF-8 BOM?
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString('utf8');
  }
  // UTF-16LE BOM?
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buf.slice(2));
  }
  return new TextDecoder('windows-1251').decode(buf);
}
