import { child, childText, children, decodeXmlBuffer, parseXml } from './parseXml';

describe('parseXml', () => {
  it('разбирает вложенность, атрибуты и текст', () => {
    const root = parseXml(
      '<Каталог Ид="1"><Товары><Товар><Ид>abc</Ид><Наименование>Стул</Наименование></Товар></Товары></Каталог>',
    );

    expect(root.name).toBe('Каталог');
    expect(root.attrs.Ид).toBe('1');

    const tovar = child(child(root, 'Товары')!, 'Товар')!;
    expect(childText(tovar, 'Ид')).toBe('abc');
    expect(childText(tovar, 'Наименование')).toBe('Стул');
  });

  it('пропускает XML-декларацию и комментарии', () => {
    const root = parseXml(
      '<?xml version="1.0" encoding="UTF-8"?><!-- комментарий --><a><b>1</b></a>',
    );

    expect(root.name).toBe('a');
    expect(childText(root, 'b')).toBe('1');
  });

  it('понимает самозакрывающиеся теги', () => {
    const root = parseXml('<a><b/><c>x</c></a>');

    expect(children(root, 'b')).toHaveLength(1);
    expect(childText(root, 'c')).toBe('x');
  });

  it('читает CDATA как обычный текст', () => {
    const root = parseXml('<a><b><![CDATA[Стул & стол <лучший>]]></b></a>');

    expect(childText(root, 'b')).toBe('Стул & стол <лучший>');
  });

  it('разворачивает стандартные и числовые сущности', () => {
    const root = parseXml(
      '<a><b>&lt;тег&gt; &amp; &quot;кавычки&quot; &#1041;</b></a>',
    );

    expect(childText(root, 'b')).toBe('<тег> & "кавычки" Б');
  });

  it('собирает список одноимённых узлов по порядку', () => {
    const root = parseXml('<Товары><Товар>1</Товар><Товар>2</Товар></Товары>');

    expect(children(root, 'Товар').map((n) => n.text)).toEqual(['1', '2']);
  });

  it('атрибуты в одинарных кавычках и с пробелами', () => {
    const root = parseXml("<a b = 'два слова' c=\"3\" />");

    expect(root.attrs).toEqual({ b: 'два слова', c: '3' });
  });

  it('понятно ругается на незакрытый и несовпадающий тег', () => {
    expect(() => parseXml('<a><b></a>')).toThrow(/b/);
    expect(() => parseXml('<a><b>')).toThrow();
  });

  it('отказывается разбирать DTD вместо тихой порчи данных', () => {
    expect(() => parseXml('<!DOCTYPE a><a/>')).toThrow(/DTD/i);
  });

  it('childText возвращает null, когда узла нет', () => {
    const root = parseXml('<a><b>1</b></a>');
    expect(childText(root, 'нет')).toBeNull();
  });
});

describe('decodeXmlBuffer', () => {
  it('UTF-8 по объявлению в декларации', () => {
    const xml = '<?xml version="1.0" encoding="UTF-8"?><a>Стул</a>';
    expect(decodeXmlBuffer(Buffer.from(xml, 'utf8'))).toContain('Стул');
  });

  it('windows-1251 по объявлению в декларации', () => {
    const xml = '<?xml version="1.0" encoding="windows-1251"?><a>Стул</a>';
    // Кириллица в CP1251: С=D1, т=F2, у=F3, л=EB; остальное — ASCII.
    const head = Buffer.from(xml.slice(0, xml.indexOf('Стул')), 'latin1');
    const word = Buffer.from([0xd1, 0xf2, 0xf3, 0xeb]);
    const tail = Buffer.from('</a>', 'latin1');

    expect(decodeXmlBuffer(Buffer.concat([head, word, tail]))).toContain(
      'Стул',
    );
  });

  it('UTF-8 BOM снимается', () => {
    const buf = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('<a>Стул</a>', 'utf8'),
    ]);
    expect(decodeXmlBuffer(buf).startsWith('<a>')).toBe(true);
  });

  it('без декларации считаем UTF-8 (умолчание XML)', () => {
    expect(decodeXmlBuffer(Buffer.from('<a>Стул</a>', 'utf8'))).toContain(
      'Стул',
    );
  });
});
