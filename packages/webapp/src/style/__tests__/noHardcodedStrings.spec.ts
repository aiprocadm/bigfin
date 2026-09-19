import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Сторож: видимый текст не зашит в разметку.
 *
 * Зачем. Зашитая подпись не переводится. В английской локали человек видел
 * русские слова — «Пароль», «Подтвердите пароль», «Уведомления». Поймать это
 * глазами почти невозможно: разработчик смотрит на русский интерфейс, и там
 * всё выглядит правильно.
 *
 * Сторож смотрит два места: текстовый узел между тегами и подписи-атрибуты
 * (`aria-label`, `placeholder`, `title`, `label`, `alt`). Комментарии кода не
 * в счёт — пояснения по-русски писать не только можно, но и нужно.
 */
const SRC = path.resolve(__dirname, '../..');

/**
 * Файлы, где русский текст в разметке оставлен намеренно.
 *
 * Правовые страницы — это документы, а не подписи интерфейса. Их перевод
 * решает владелец вместе с юристом: машинный перевод соглашения об оказании
 * услуг опаснее русского оригинала, потому что выглядит официально и при
 * этом не имеет силы.
 */
const ALLOWED = [
  'components/legal/PrivacyPage.tsx',
  'components/legal/TermsPage.tsx',
];

const SKIP = /node_modules|\/lang\/|\.spec\.|\.stories\.|__tests__/;
const CYR = '[А-Яа-яЁё]';

/**
 * Текстовый узел между тегами.
 *
 * ВАЖНО: без `\n` в отрицании. Сначала здесь стояло `[^<>{}\n]*`, и проверка
 * шла ПОСТРОЧНО — а разметка после форматирования почти всегда кладёт текст на
 * СВОЮ строку:
 *
 *     >
 *       Забыли пароль?
 *     </Link>
 *
 * `>` на одной строке, текст на другой, `<` на третьей — построчная проверка
 * такое не видит вовсе. Сторож был зелёным, пока вся форма входа говорила
 * зашитыми словами. Теперь читается файл целиком.
 */
const NODE_RE = new RegExp('>\\s*([^<>{}]*' + CYR + '[^<>{}]*?)\\s*<', 'g');
const ATTR_RE = new RegExp(
  '\\b(aria-label|placeholder|title|label|alt)\\s*=\\s*"[^"]*' + CYR,
  'g',
);

/**
 * Английская фраза между тегами.
 *
 * ЗАЧЕМ ОТДЕЛЬНОЕ ПРАВИЛО. Проверка выше ищет КИРИЛЛИЦУ — она ловит русские
 * слова, оставленные в английской локали. Но у Bigfin родная локаль русская,
 * и опаснее обратное: английская подпись из старой кодовой базы, которую
 * русский предприниматель видит как есть. Окно приглашения коллег ГОВОРИЛО
 * ПО-АНГЛИЙСКИ, и ни один прогон этого не заметил.
 *
 * Ищем ДВА И БОЛЕЕ английских слова подряд. Одно слово — слишком шумно:
 * `<Tag>PRO</Tag>`, `<span>ID</span>`, названия валют и форматов пишутся
 * латиницей намеренно. Фраза из двух слов случайной уже не бывает.
 */
const EN_NODE_RE =
  />\s*([A-Za-z][A-Za-z'\u2019]*(?:[ ]+[A-Za-z][A-Za-z'\u2019.,!?]*){1,}[.!?]?)\s*</g;

/**
 * Ключевые слова TypeScript: `Foo<T> extends Bar` — это объявление типа,
 * а не подпись на экране. Уголки дженериков выглядят как теги, поэтому
 * без этой оговорки сторож ругался бы на объявления интерфейсов.
 */
const TS_KEYWORDS = /^(extends|implements|keyof|typeof|infer|readonly)\b/;

/**
 * Полоски-заглушки на время загрузки: `<Skeleton>XXXX XXXX</Skeleton>`.
 * Буквы там не видны вовсе — это серый прямоугольник нужной ширины.
 */
const PLACEHOLDER = /^(?:([A-Za-z])\1*)(?:[ ]+([A-Za-z])\2*)*$/;

/** Английская фраза, которую человек и правда увидит. */
function isVisibleEnglish(text: string): boolean {
  if (TS_KEYWORDS.test(text)) return false;
  if (PLACEHOLDER.test(text)) return false;

  return true;
}

function collect(dir: string, acc: string[] = []): string[] {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);

    if (SKIP.test(full.replace(/\\/g, '/'))) return;
    if (entry.isDirectory()) {
      collect(full, acc);
      return;
    }
    if (entry.name.endsWith('.tsx')) acc.push(full);
  });

  return acc;
}

/**
 * Исходник без комментариев, но ТОЙ ЖЕ длины.
 *
 * Комментарии заменяются пробелами, а не вырезаются: так номера строк в
 * сообщении остаются настоящими, и найденное место можно открыть.
 *
 * Пояснения по-русски в комментариях писать не только можно, но и нужно —
 * иначе следующий не поймёт, почему нельзя.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(
      /(^|[^:])\/\/[^\n]*/g,
      (m, prefix) => prefix + ' '.repeat(m.length - prefix.length),
    );
}

/** Номер строки по положению в тексте. */
function lineAt(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

/** Места с зашитым текстом в одном файле. */
function findHardcoded(source: string): Array<{ line: number; text: string }> {
  const clean = withoutComments(source);
  const found: Array<{ line: number; text: string }> = [];

  [NODE_RE, ATTR_RE].forEach((re) => {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = re.exec(clean)) !== null) {
      found.push({
        line: lineAt(clean, match.index),
        text: (match[1] ?? match[0]).trim().slice(0, 60),
      });
    }
  });

  EN_NODE_RE.lastIndex = 0;
  let english: RegExpExecArray | null;

  while ((english = EN_NODE_RE.exec(clean)) !== null) {
    const text = english[1].trim();

    if (!isVisibleEnglish(text)) continue;

    found.push({ line: lineAt(clean, english.index), text: text.slice(0, 60) });
  }

  return found;
}

describe('видимый текст не зашит в разметку', () => {
  const files = collect(SRC);

  it('исходники витрины читаются', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(files.length).toBeGreaterThan(500);
  });

  it('новых зашитых подписей не появилось', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      const rel = path.relative(SRC, file).replace(/\\/g, '/');

      if (ALLOWED.includes(rel)) return;

      findHardcoded(fs.readFileSync(file, 'utf8')).forEach(({ line, text }) => {
        offenders.push(`${rel}:${line} — ${text}`);
      });
    });

    expect(offenders).toEqual([]);
  });

  it('проверка и правда видит текст на своей строке', () => {
    // Ради этого сторож и переписан: именно так разметка выглядит после
    // форматирования, и именно этого он раньше не видел.
    const sample = ['<Link>', '  Забыли пароль?', '</Link>'].join('\n');

    expect(findHardcoded(sample)).toHaveLength(1);
  });

  it('пояснения в комментариях не считаются', () => {
    const sample = ['// Забыли пароль?', '<Link>{intl.get("x")}</Link>'].join(
      '\n',
    );

    expect(findHardcoded(sample)).toEqual([]);
  });

  it('английская фраза в разметке тоже считается', () => {
    // Ради этого правило и добавлено: русский предприниматель видел
    // английские подписи, и ни один прогон об этом не говорил.
    const sample = ['<Button>', '  Send Mail', '</Button>'].join('\n');

    expect(findHardcoded(sample)).toHaveLength(1);
  });

  it('объявление типа не считается подписью', () => {
    // Уголки дженериков выглядят как теги.
    const sample = 'interface A<T> extends BaseProps<T> {}';

    expect(findHardcoded(sample)).toEqual([]);
  });

  it('полоска-заглушка не считается подписью', () => {
    const sample = '<Skeleton>XXXX XXXX</Skeleton>';

    expect(findHardcoded(sample)).toEqual([]);
  });

  it('одно английское слово не считается', () => {
    // `PRO`, `ID`, `Email` — намеренно латиницей, это стандарт.
    const sample = '<Tag>PRO</Tag>';

    expect(findHardcoded(sample)).toEqual([]);
  });

  it('список исключений не разрастается', () => {
    // Исключение — это долг, а не разрешение. Два файла правовых документов
    // и ни одного больше.
    expect(ALLOWED).toHaveLength(2);
  });
});
