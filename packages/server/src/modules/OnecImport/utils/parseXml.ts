/**
 * Минимальный разбор XML под нужды CommerceML (⑩): элементы, атрибуты,
 * текст, CDATA, комментарии, самозакрывающиеся теги, XML-декларация.
 *
 * Своя реализация вместо библиотеки: в прямых зависимостях проекта нет
 * XML-парсера, а добавлять пакеты нельзя (lockfile под защитой).
 * DTD и внешние сущности намеренно НЕ поддерживаются — вместо тихой порчи
 * данных бросаем понятную ошибку (заодно нет и XXE-поверхности).
 */

export interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  /** Собственный текст узла (без текста детей). */
  text: string;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

const decodeEntities = (s: string): string =>
  s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body] ?? whole;
  });

/** Декодирует буфер XML: BOM → объявленная кодировка → UTF-8 по умолчанию. */
export function decodeXmlBuffer(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString('utf8');
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buf.slice(2));
  }
  // Декларация — только ASCII, читается любой однобайтовой кодировкой.
  const head = buf.slice(0, 200).toString('latin1');
  const declared = head.match(/<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/i);
  const encoding = (declared?.[1] || 'utf-8').toLowerCase();

  if (encoding === 'utf-8' || encoding === 'utf8') return buf.toString('utf8');

  try {
    return new TextDecoder(encoding).decode(buf);
  } catch {
    // Неизвестная кодировка — 1С почти всегда выгружает в 1251.
    return new TextDecoder('windows-1251').decode(buf);
  }
}

export function parseXml(source: string): XmlNode {
  if (/<!DOCTYPE/i.test(source)) {
    throw new Error(
      'Файл содержит DTD — такие XML не поддерживаются. Выгрузите файл из 1С без DTD.',
    );
  }
  let pos = 0;
  const stack: XmlNode[] = [];
  let root: XmlNode | null = null;

  const fail = (message: string): never => {
    throw new Error(`Разбор XML: ${message}`);
  };

  const pushText = (raw: string) => {
    const node = stack[stack.length - 1];
    if (!node) return;
    const text = decodeEntities(raw).trim();
    if (text) node.text += node.text ? ` ${text}` : text;
  };

  while (pos < source.length) {
    const lt = source.indexOf('<', pos);
    if (lt === -1) break;

    if (lt > pos) pushText(source.slice(pos, lt));

    // Комментарий / CDATA / декларация.
    if (source.startsWith('<!--', lt)) {
      const end = source.indexOf('-->', lt);
      if (end === -1) fail('незакрытый комментарий');
      pos = end + 3;
      continue;
    }
    if (source.startsWith('<![CDATA[', lt)) {
      const end = source.indexOf(']]>', lt);
      if (end === -1) fail('незакрытая секция CDATA');
      const node = stack[stack.length - 1];
      const raw = source.slice(lt + 9, end);
      if (node) node.text += node.text ? ` ${raw}` : raw;
      pos = end + 3;
      continue;
    }
    if (source.startsWith('<?', lt)) {
      const end = source.indexOf('?>', lt);
      if (end === -1) fail('незакрытаяXML-декларация');
      pos = end + 2;
      continue;
    }

    const gt = source.indexOf('>', lt);
    if (gt === -1) fail('незакрытый тег');

    const inner = source.slice(lt + 1, gt).trim();

    // Закрывающий тег.
    if (inner.startsWith('/')) {
      const name = inner.slice(1).trim();
      const open = stack.pop();
      if (!open) fail(`лишний закрывающий тег ${name}`);
      if (open!.name !== name) {
        fail(`тег ${open!.name} закрыт как ${name}`);
      }
      pos = gt + 1;
      continue;
    }

    const selfClosing = inner.endsWith('/');
    const body = selfClosing ? inner.slice(0, -1).trim() : inner;
    const nameMatch = body.match(/^([^\s/]+)/);
    if (!nameMatch) fail('тег без имени');

    const node: XmlNode = {
      name: nameMatch![1],
      attrs: {},
      children: [],
      text: '',
    };

    const attrsSource = body.slice(nameMatch![1].length);
    const attrRe = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(attrsSource)) !== null) {
      node.attrs[m[1]] = decodeEntities(m[3] ?? m[4] ?? '');
    }

    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else if (root) fail('в документе больше одного корневого элемента');
    else root = node;

    if (!selfClosing) stack.push(node);
    pos = gt + 1;
  }

  if (stack.length > 0) fail(`не закрыт тег ${stack[stack.length - 1].name}`);
  if (!root) fail('пустой документ');

  return root!;
}

export const children = (node: XmlNode, name: string): XmlNode[] =>
  node.children.filter((c) => c.name === name);

export const child = (node: XmlNode, name: string): XmlNode | null =>
  node.children.find((c) => c.name === name) ?? null;

export const childText = (node: XmlNode, name: string): string | null => {
  const found = child(node, name);
  return found ? found.text : null;
};
